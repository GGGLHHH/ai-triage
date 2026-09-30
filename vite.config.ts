import process from 'node:process'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { codeInspectorPlugin } from 'code-inspector-plugin'

import { nitro } from 'nitro/vite'
import UnoCSS from 'unocss/vite'

import { defineConfig, loadEnv } from 'vite'
import { openapiCodegen } from 'vite-plugin-openapi-codegen'

// 端口不写死:读仓库根的 .env(没有该文件也行,?? 后的兜底即原来的值)。见 .env.example。
// envDir 用本文件所在目录而非 cwd —— vitest.config.ts 也调本函数,不能假定 cwd。
// prefix 传 '' = 连非 VITE_ 前缀的也读到(只用于配 dev server / codegen,不进客户端产物)。
// react-three-fiber 场景:两个 dev 插件会往每个 JSX 元素注入 data-* 属性,R3F 把带 - 的 prop 当成
// 嵌套属性路径去设(mesh.data.insp.path),整个场景挂不上。约定场景文件以 -scene.tsx 结尾,统一跳过注入。
const R3F_SCENE_FILES = /-scene\.tsx$/

const config = defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '')
  const backend = env.BACKEND_ORIGIN ?? 'http://localhost:8137'
  // 服务端密钥只进 SSR 进程的 process.env(cadenza-ai 按 env 名兜底取 key),不进客户端产物。
  // dev 由这里从 .env 注入;生产由部署环境注入同名变量(或 node --env-file=.env)。
  for (const key of ['DEEPSEEK_API_KEY', 'AI_BASE_URL', 'AI_MODEL', 'AI_API_KEY', 'KB_DATABASE_URL', 'KB_EMBED_URL', 'KB_EMBED_MODEL', 'KB_EMBED_API_KEY']) {
    // 只注入 .env 里真有的:给 process.env 赋 undefined 会变成字符串 "undefined",代码里的默认值就失效了
    if (env[key] !== undefined) {
      process.env[key] ??= env[key]
    }
  }

  return {
    resolve: { tsconfigPaths: true },
    plugins: [
      // consolePiping 关掉:浏览器 console 转到终端、终端又回灌浏览器,一条日志在两边来回复制,
      // dev.log 一小时涨到上千万行。
      devtools({
        injectSource: { enabled: true, ignore: { files: [R3F_SCENE_FILES] } },
        consolePiping: { enabled: false },
      }),
      openapiCodegen({
        input: `${backend}/api-docs/openapi.json`,
        output: 'src/generated',
        pathPrefix: '/api/v1/',
        typeAliases: true,
        httpClient: {
          module: '#/lib/api-client',
        },
        generateOnDev: false,
        generateOnHmr: false,
      }),
      tailwindcss(),
      UnoCSS(),
      tanstackStart(),
      // Node/Docker 部署:官方要求经 Nitro 出自包含 server(.output/server/index.mjs,
      // 自带静态资产 + SSR + 监听 PORT)。见 docs/framework/react/guide/hosting。
      // 仅 build 期挂 Nitro:dev 用 TanStack Start(Vite)自带 dev server,才认下面
      // server.proxy 的 /api 转发到后端;Nitro dev server 不认 Vite proxy,挂了 /api
      // 就落到 SSR handler 返回 HTML(500 Only HTML requests are supported here)。
      // 测试环境也排除:nitro 会在 vitest teardown 时挂住句柄(close timed out)。
      ...(command === 'build' && process.env.VITEST !== 'true' ? [nitro()] : []),
      codeInspectorPlugin({
        bundler: 'vite',
        exclude: [R3F_SCENE_FILES],
        dev: () => process.env.NODE_ENV === 'development' && process.env.VITEST !== 'true',
      }),
      viteReact(),
    ],
    // 只为喂 UnoCSS:它的 build 插件在 renderChunk 里用 `cssPostPlugins.get(options.dir)`
    // 找 vite:css-post,而这张表只按顶层 build.outDir 建键(不认 Vite 6+ 的 environments)。
    // 本项目 outDir 由 environments 定(client=.output/public、ssr=node_modules/.nitro/...),
    // 顶层默认还是 'dist' → 查不中 → 放弃替换 → virtual:uno.css 只剩占位符
    // `#--unocss--{...}`,所有 i-* 图标 class 在产物里消失(dev 走另一条路径,看不出来)。
    // 对齐到 client 的 outDir 就能查中。三个 environment 都自带 outDir,顶层这个值不影响
    // 实际产物落盘位置(不会冒出 dist/)。UnoCSS 修好 environments 支持后即可删。
    build: { outDir: '.output/public' },
    server: {
      port: Number(env.FRONTEND_DEV_PORT ?? 7621),
      proxy: {
        '/api': {
          target: backend,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    test: {
      // Node 24+ 遮蔽 jsdom/happy-dom 的 Web Storage → 补内存版兜底(见 src/test-setup.ts)。
      setupFiles: ['./src/test-setup.ts'],
    },
  }
})

export default config
