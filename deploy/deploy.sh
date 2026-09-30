#!/bin/sh
# 服务器一键部署(离线):加载镜像 → 起向量库并灌知识库 → 起 app 和 nginx。可重复运行,用于升级。
# 需要 docker 与 docker compose v2;不需要联网拉镜像。
set -eu
cd "$(dirname "$0")"

APP_VERSION=$(cat VERSION)
export APP_VERSION
compose() { docker compose -f compose.prod.yml "$@"; }

docker compose version >/dev/null 2>&1 || { echo "需要 docker compose v2"; exit 1; }

if [ ! -f .env ]; then
  cp .env.example .env
  password=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24)
  sed "s/^KB_DB_PASSWORD=.*/KB_DB_PASSWORD=${password}/" .env > .env.tmp && mv .env.tmp .env
  chmod 600 .env
  echo "已生成 .env(向量库密码已随机生成)。填好 DEEPSEEK_API_KEY / KB_EMBED_API_KEY(或院内模型地址)后重新运行 ./deploy.sh"
  exit 1
fi

value() { sed -n "s/^$1=//p" .env | tail -n 1; }
if [ -z "$(value DEEPSEEK_API_KEY)" ] && [ -z "$(value AI_BASE_URL)" ]; then
  echo ".env 里对话模型没配:填 DEEPSEEK_API_KEY,或 AI_BASE_URL/AI_MODEL/AI_API_KEY"; exit 1
fi
if [ -z "$(value KB_EMBED_API_KEY)" ] && [ -z "$(value KB_EMBED_URL)" ]; then
  echo ".env 里 embedding 没配:填 KB_EMBED_API_KEY,或 KB_EMBED_URL/KB_EMBED_MODEL"; exit 1
fi

echo "==> 加载镜像(版本 ${APP_VERSION})"
gunzip -c images.tar.gz | docker load

echo "==> 启动向量库,导入知识库"
compose up -d --wait kb-db
compose exec -T kb-db psql -q -v ON_ERROR_STOP=1 -U kb -d kb < kb-init.sql
echo "    知识库 $(compose exec -T kb-db psql -U kb -d kb -Atc 'select count(*) from kb_chunks') 块"

echo "==> 启动 app 与 nginx"
compose up -d --wait --remove-orphans

echo "==> 完成:http://<服务器地址>:$(value HTTP_PORT)/  (状态: docker compose -f compose.prod.yml ps)"
