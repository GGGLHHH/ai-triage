import process from 'node:process'

import { deepseek } from '@gedatou/cadenza-ai/providers/deepseek'
import { openaiCompatiblePreset } from '@gedatou/cadenza-ai/providers/openai-compatible'
import { createChatHandler } from '@gedatou/cadenza-ai/server'
import { createFileRoute } from '@tanstack/react-router'

import { TRIAGE_SYSTEM_PROMPT } from '#/business/triage/ai/prompt'
import { triageTools } from '#/business/triage/ai/tools'

// 模型走服务端 env,患者端不弹 BYOK 对话框:
// - 默认 DeepSeek(key 读 DEEPSEEK_API_KEY),AI_MODEL 可换同家其他型号(须在 cadenza 模型目录里)。
// - 设了 AI_BASE_URL 就改连任意 OpenAI 兼容服务(院内 vLLM 的 Qwen 等),key 读 AI_API_KEY;
//   内网服务没有 key 也要填个占位值,缺 key 会被当成未配置。
// ponytail: 自定义服务先按不带思考接(reasoning: false,不发 reasoning_effort);Qwen3 on vLLM 的思考开关
// 是 chat_template_kwargs.enable_thinking,实测后再给 preset 配 thinking。
const baseURL = process.env.AI_BASE_URL
const model = process.env.AI_MODEL

const provider = baseURL === undefined || baseURL === ''
  ? deepseek
  : openaiCompatiblePreset({
      id: 'custom',
      label: 'OpenAI 兼容服务',
      baseURL,
      env: 'AI_API_KEY',
      models: [{ id: model ?? 'default', name: model ?? 'default', provider: 'custom', input: ['text'], reasoning: false }],
    })

// 不挂在 /api 下:dev 的 vite proxy 会把 /api/* 转去 baserust 后端。
const chat = createChatHandler({
  providers: [provider],
  defaultModel: `${provider === deepseek ? 'deepseek' : 'custom'}/${model ?? 'deepseek-v4-flash'}`,
  systemPrompts: [TRIAGE_SYSTEM_PROMPT],
  tools: triageTools,
})

export const Route = createFileRoute('/ai/chat')({
  server: {
    handlers: {
      POST: ({ request }) => chat.POST(request),
    },
  },
})
