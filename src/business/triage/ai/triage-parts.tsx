import type { ChatClientState, UIMessage } from '@gedatou/cadenza-ai'
import type { ReactNode } from 'react'
import type { ToolCallPart } from './tool-inputs'

import { isThinkingComplete, Markdown, Reasoning } from '@gedatou/cadenza-ai'

import { TOOL } from './prompt'
import { EmergencyCard, MarkBodyCard, RecommendCard, SummaryCard } from './tool-cards'

const CARDS: Partial<Record<string, (props: { part: ToolCallPart }) => ReactNode>> = {
  [TOOL.markBody]: MarkBodyCard,
  [TOOL.emergency]: EmergencyCard,
  [TOOL.recommend]: RecommendCard,
  [TOOL.summary]: SummaryCard,
}

// 代替 TranscriptParts:它会把连续 ≥2 个工具调用折成「Ran N tools」,急诊卡/科室卡/摘要会被藏起来。
// 这里的工具本身就是给患者看的卡片,逐个平铺;文字与思考的渲染照搬 TranscriptParts(Markdown / Reasoning)。
export function TriageParts({ message, streaming, status }: { message: UIMessage, streaming: boolean, status: ChatClientState }) {
  const last = message.parts.length - 1
  // 外层容器照搬 TranscriptParts(同一个 data-slot 与 gap-3),各部件之间的间距才和 cadenza 一致
  const nodes = message.parts.map((part, index) => {
    if (part.type === 'thinking') {
      const complete = isThinkingComplete(message, index, status)
      return (
        <Reasoning
          key={`thinking-${index}`}
          content={part.content}
          complete={complete}
        >
          {complete ? '思考了 ' : '思考中…'}
        </Reasoning>
      )
    }
    if (part.type === 'text') {
      return (
        <Markdown
          key={`text-${index}`}
          content={part.content}
          streaming={streaming && index === last}
        />
      )
    }
    // 参数解析失败的调用(模型会重试)不画空卡
    if (part.type === 'tool-call' && part.state !== 'error') {
      const Card = CARDS[part.name]
      return Card === undefined
        ? null
        : (
            <Card
              key={part.id}
              part={part}
            />
          )
    }
    return null
  })
  return (
    <div
      data-slot='transcript-parts'
      className='flex flex-col gap-3'
    >
      {nodes}
    </div>
  )
}
