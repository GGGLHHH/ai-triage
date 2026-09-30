# AI 预分诊 · 部署文档

医疗美容科 AI 预分诊(3D 面部 + AI 对话)的离线部署说明。部署包自带全部镜像,服务器**不需要联网拉镜像**;运行时只需要能访问大模型 / embedding 服务(公网或院内)。

## 1. 架构

```
浏览器 ──► nginx(唯一对外端口 HTTP_PORT)──► app(Node,3000)──► kb-db(pgvector)
                                              │
                                              ├─► 大模型:DeepSeek 或院内 OpenAI 兼容服务(Qwen3)
                                              ├─► embedding:硅基流动 bge-m3 或院内 bge-m3
                                              └─► 院内 HIS(可选,只读科室 / 医生)
```

| 服务 | 镜像 | 网络 | 说明 |
|---|---|---|---|
| nginx | `nginx:1.28.3-alpine` | web | 对外唯一入口;`/` 跳到 `/frontend/triage`;`/ai/` 流式对话不缓冲 |
| app | `ai-triage:<版本>` | web + internal | 页面与 AI 对话接口 |
| kb-db | `pgvector/pgvector:pg18` | internal | 知识库向量。**不映射宿主机端口、不能出网**,只有 app 连得到 |

## 2. 服务器要求

- Linux x86_64(ARM 服务器用 arm64 包)
- Docker 与 Docker Compose v2(`docker compose version` 能输出版本)
- 磁盘:镜像约 700MB(解压后),另留 1GB 余量
- 防火墙放行 `HTTP_PORT`(默认 80)
- 出网:能访问所配的大模型与 embedding 地址;接 HIS 时能访问 HIS 地址。可在服务器上用 `curl` 先验证

## 3. 首次部署

```bash
tar xzf ai-triage-deploy-<版本>-amd64.tar.gz
cd ai-triage-deploy
./deploy.sh        # 首次:生成 .env(向量库密码自动随机生成),提示填 key 后退出
vi .env            # 按 §4 填写
./deploy.sh        # 加载镜像 → 起向量库并导入知识库 → 起 app 与 nginx
```

成功后输出 `==> 完成:http://<服务器地址>:<端口>/`,浏览器打开即可。

部署包内容:

| 文件 | 作用 |
|---|---|
| `images.tar.gz` | 三个镜像 |
| `compose.prod.yml` | 服务、网络定义 |
| `nginx.conf` | 反向代理配置 |
| `kb-init.sql` | 知识库数据(可重复导入,每次整表替换) |
| `deploy.sh` | 部署 / 升级脚本 |
| `.env.example` | 配置模板 |
| `VERSION` | 版本号(日期-提交号) |

## 4. 配置(.env)

`.env` 含密钥,权限为 600,**不要外传、不要提交**。改完配置重新运行 `./deploy.sh` 生效。

| 变量 | 必填 | 说明 |
|---|---|---|
| `HTTP_PORT` | 是 | 对外端口,默认 80 |
| `KB_DB_PASSWORD` | 是 | 向量库密码,首次自动生成。**库建好后不要再改**,改了 app 会连不上 |
| `DEEPSEEK_API_KEY` | 二选一 | 默认对话模型 DeepSeek 的 key |
| `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY` | 二选一 | 改连 OpenAI 兼容服务。设了 `AI_BASE_URL` 就不用 DeepSeek;内网服务没 key 也要给 `AI_API_KEY` 填占位值(如 `none`) |
| `KB_EMBED_API_KEY` | 二选一 | 默认 embedding(硅基流动 bge-m3)的 key |
| `KB_EMBED_URL` / `KB_EMBED_MODEL` | 二选一 | 改连其他 OpenAI 兼容 embedding 服务。**模型必须是 bge-m3**(与知识库生成时一致) |
| `HIS_MODE` | 否 | 不设 = 不接 HIS。`soap`:南山 JHIPLIB 服务总线;`rest`:接口文档的 `/login` + `/master/*` |
| `HIS_URL` | 接 HIS 时 | 如 `http://10.241.129.19/soap/JHIPLIB.SOAP.BS.Streambus.cls` |
| `HIS_USERNAME` / `HIS_PASSWORD` | `rest` 时 | REST 登录账号 |
| `HIS_TIMEOUT_MS` | 否 | 单次 HIS 请求超时,默认 15000 |

**切到院内模型(迈瑞算力)示例**,数据不出院:

```bash
AI_BASE_URL=http://10.240.242.30:6512/v1
AI_MODEL=qwen3
AI_API_KEY=none
KB_EMBED_URL=http://10.240.242.30:6509/v1
KB_EMBED_MODEL=bge-m3
```

> 院内 Qwen3 目前按「不开思考」接入;院内 bge-m3 需确认 TEI 已开放 OpenAI 兼容的 `/v1/embeddings`,不通时先保留硅基流动。

## 5. 升级

用新包解压**覆盖**原目录(`.env` 不在包里,会保留),再运行:

```bash
tar xzf ai-triage-deploy-<新版本>-amd64.tar.gz    # 在原目录的上一级执行
cd ai-triage-deploy && ./deploy.sh
```

只有变了的服务会重建(通常只有 app);知识库按新包重新导入。

**回退**:保留旧版本的部署包,解压覆盖后同样运行 `./deploy.sh`。旧镜像若还在本机,不影响。

## 6. 日常运维

以下命令都在部署目录执行,先设版本号:

```bash
export APP_VERSION=$(cat VERSION)
alias dc='docker compose -f compose.prod.yml'

dc ps                  # 状态(app、kb-db 应为 healthy)
dc logs -f app         # 应用日志;HIS 失败会打 [his] 开头的日志
dc logs -f nginx       # 访问日志
dc restart app         # 重启应用
dc down                # 停止全部(数据保留)
dc down -v             # 停止并删除向量库数据(下次 deploy.sh 会重新导入)
dc exec -T kb-db psql -U kb -d kb -Atc 'select count(*) from kb_chunks'   # 知识库条数
```

**备份**:只需备份 `.env`。知识库数据来自部署包里的 `kb-init.sql`,丢了重新 `./deploy.sh` 即可恢复。

## 7. 排查

| 现象 | 排查 |
|---|---|
| `./deploy.sh` 提示缺配置 | 按提示在 `.env` 填对话模型与 embedding(§4) |
| 页面打不开 | `dc ps` 看 nginx 是否在跑、端口是否被占用(`HTTP_PORT`);防火墙是否放行 |
| app 不是 healthy | `dc logs app` 看报错 |
| AI 不回答 / 报错 | key 是否正确;app 能否访问模型地址(见下方连通性检查) |
| AI 说「知识库暂不可用」 | embedding 配置或网络问题;`dc logs app` 看具体原因 |
| AI 说「院内系统暂时查不到」 | HIS 不通或超时;`dc logs app \| grep '\[his\]'` 看原因;用下方连通性检查确认 app 能到 `HIS_URL` |
| 回答一直不出来、最后整段出现 | 前面还有一层代理把流式响应缓冲了:该代理需对 `/ai/` 关闭缓冲 |
| 改了 `KB_DB_PASSWORD` 后 app 连不上库 | 改回原密码;或 `dc down -v` 清库后重新 `./deploy.sh` |

**连通性检查**(在 app 容器里测,和应用实际走的网络一致):

```bash
dc exec -T app wget -S -O /dev/null -T 5 <地址> 2>&1 | head -2
```

输出里出现 `HTTP/1.1 xxx`(哪怕是 401、404)= 网络通;`download timed out` / `Connection refused` / `bad address` = 不通(查路由、防火墙、DNS)。

**安全说明**:向量库只在容器内部网络,宿主机与外部都连不到;对外只有 nginx。部署包未配置 HTTPS,如需 HTTPS,建议在医院统一网关终止 TLS,或自行在 `nginx.conf` 加证书。本部署只含分诊页,不含模板自带的后台管理(依赖另外的后端服务)。
