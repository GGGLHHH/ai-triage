import { toolDefinition } from '@gedatou/cadenza-ai/server'
import { z } from 'zod'

import { searchKnowledge } from '../kb/kb.ts'
import { departments } from '../mock-data'
import { TOOL } from './prompt'

// 检索失败(知识库容器没起、没 ingest)不抛,把原因交给模型
async function searchKnowledgeTool({ query }: { query: string }) {
  try {
    const hits = await searchKnowledge(query)
    return { hits: hits.map(({ doc, title, content, score }) => ({ source: `${doc} · ${title}`, content, score: Number(score.toFixed(3)) })) }
  }
  catch (error) {
    return { hits: [], error: `知识库暂不可用:${error instanceof Error ? error.message : String(error)}` }
  }
}

// 卡片由前端按工具名渲染(见 renderers.tsx),服务端只回执
const ack = async () => ({ ok: true })

export const triageTools = [
  toolDefinition({
    name: TOOL.knowledge,
    description: '检索医疗美容科知识库:就诊须知、常见问题、诊疗项目、术后护理',
    inputSchema: z.object({
      query: z.string().describe('要查的问题'),
    }),
  }).server(searchKnowledgeTool),
  toolDefinition({
    name: TOOL.recommend,
    description: '推荐门诊,在对话里展示门诊卡片(医生与可约号源)',
    inputSchema: z.object({
      departmentIds: z.array(z.enum(departments.map(d => d.id) as [string, ...string[]])).min(1).max(3).describe('门诊编号,首个为首选'),
      reason: z.string().describe('推荐理由'),
    }),
  }).server(ack),
]
