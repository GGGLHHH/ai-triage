import { deepseek } from '@gedatou/cadenza-ai/providers/deepseek'
import { createChatHandler } from '@gedatou/cadenza-ai/server'
import { createFileRoute } from '@tanstack/react-router'

import { TRIAGE_SYSTEM_PROMPT } from '#/business/triage/ai/prompt'
import { triageTools } from '#/business/triage/ai/tools'

// 不挂在 /api 下:dev 的 vite proxy 会把 /api/* 转去 baserust 后端。
// key 走服务端 env(DEEPSEEK_API_KEY),患者端不弹 BYOK 对话框。
const chat = createChatHandler({
  providers: [deepseek],
  defaultModel: 'deepseek/deepseek-v4-flash',
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
