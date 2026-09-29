import { createFileRoute } from '@tanstack/react-router'

// 诊前预分诊:宽屏单页(左 3D 人体 + 右 AI 对话),纯客户端渲染(WebGL + 流式对话)。
export const Route = createFileRoute('/frontend/triage')({
  ssr: false,
  staticData: {
    titleKey: 'titles.triage',
  },
})
