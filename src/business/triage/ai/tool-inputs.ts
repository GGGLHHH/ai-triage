import type { ToolRendererProps, UIMessage } from '@gedatou/cadenza-ai'

import { parsePartialJSON } from '@gedatou/cadenza-ai'

import { TOOL } from './prompt'

export type ToolCallPart = ToolRendererProps['part']

export interface MarkInput { regionIds?: string[], symptomIds?: string[] }
export interface EmergencyInput { reason?: string }
export interface RecommendInput { departmentIds?: string[], reason?: string }
export interface SummaryInput { chiefComplaint?: string, presentIllness?: string, pastHistory?: string, riskFlags?: string }

// 参数还在流式输出时 input 为空,用残缺 JSON 兜底;解析不了就当还没有。
// 模型常把可选参数写成 null(而不是省略),统一当「没给」,卡片里的默认值才生效。
export function inputOf<T>(part: ToolCallPart): Partial<T> {
  let raw: unknown
  try {
    raw = part.input ?? parsePartialJSON(part.arguments)
  }
  catch {
    return {}
  }
  if (typeof raw !== 'object' || raw === null) {
    return {}
  }
  return Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== null)) as Partial<T>
}

// 对话里 AI 标过的部位,人体图据此高亮(与患者手点的合并)
export function aiMarkedRegions(messages: readonly UIMessage[]): Set<string> {
  const marked = new Set<string>()
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === 'tool-call' && part.name === TOOL.markBody) {
        for (const id of inputOf<MarkInput>(part).regionIds ?? []) {
          marked.add(id)
        }
      }
    }
  }
  return marked
}
