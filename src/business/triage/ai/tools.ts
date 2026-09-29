import { toolDefinition } from '@gedatou/cadenza-ai/server'
import { z } from 'zod'

import { regions, symptoms } from '../body/body-data'
import { searchKnowledge } from '../kb/kb.ts'
import { departments } from '../mock-data'
import { TOOL } from './prompt'

// 编号用 enum 约束:模型编不出清单外的部位/科室,前端渲染时也不用再防御未知 id
const ids = <T extends { id: string }>(items: T[]) => z.enum(items.map(i => i.id) as [string, ...string[]])

// 这些工具的「效果」都在前端:人体高亮、急诊卡、科室卡、摘要卡由 renderers.tsx 按工具名渲染。
// 服务端 execute 只回执,让模型的工具循环继续往下说。
// 可选参数用 nullish:模型常传 null 而不是省略,optional 会判校验失败、让模型重试
const ack = async () => ({ ok: true })
// DeepSeek 常「先写追问 → 再调标记工具」,工具返回后又把追问重写一遍。回执里直接告诉它别重复:
// 模型决定下一步时一定读得到工具结果,比系统提示词里的规则管用。
const markAck = async () => ({ ok: true, note: '已在人体图标出。如果这一轮你已经对患者说过话或提过问题,直接结束本轮回复,不要再重复。' })

// 检索失败(知识库容器没起、没 ingest)不抛:告诉模型资料暂不可用,它按提示词引导面诊
async function searchKnowledgeTool({ query }: { query: string }) {
  try {
    const hits = await searchKnowledge(query)
    return { hits: hits.map(({ doc, title, content, score }) => ({ source: `${doc} · ${title}`, content, score: Number(score.toFixed(3)) })) }
  }
  catch (error) {
    return { hits: [], error: `知识库暂不可用:${error instanceof Error ? error.message : String(error)}` }
  }
}

export const triageTools = [
  toolDefinition({
    name: TOOL.knowledge,
    description: '检索医疗美容科知识库(就诊须知、常见问题、诊疗项目、术后护理),回答就诊流程、医保、项目科普、治疗次数、术后注意事项等咨询前调用',
    inputSchema: z.object({
      query: z.string().describe('要查的问题,用对方的意思改写成一句完整的中文问句'),
    }),
  }).server(searchKnowledgeTool),
  toolDefinition({
    name: TOOL.markBody,
    description: '对方提到身体部位或诉求时调用,在 3D 人体图上高亮对应部位',
    inputSchema: z.object({
      regionIds: z.array(ids(regions)).min(1).describe('部位编号'),
      symptomIds: z.array(ids(symptoms)).nullish().describe('能对上清单的诉求编号'),
    }),
  }).server(markAck),
  toolDefinition({
    name: TOOL.emergency,
    description: '出现危急情况时立即调用,提示患者去急诊或拨打 120',
    inputSchema: z.object({
      reason: z.string().describe('给患者看的一句话:为什么要立刻就医'),
    }),
  }).server(ack),
  toolDefinition({
    name: TOOL.recommend,
    description: '信息足够时调用,按优先级推荐 1-3 个门诊',
    inputSchema: z.object({
      departmentIds: z.array(ids(departments)).min(1).max(3).describe('门诊编号,首个为首选'),
      reason: z.string().describe('推荐理由,一两句话'),
    }),
  }).server(ack),
  toolDefinition({
    name: TOOL.summary,
    description: '推荐门诊后调用,生成给接诊医生看的预问诊摘要',
    inputSchema: z.object({
      chiefComplaint: z.string().describe('主诉:主要诉求 + 持续时间,20 字以内'),
      presentIllness: z.string().describe('现病史:部位、表现、持续多久、范围或程度、对方的期望'),
      pastHistory: z.string().nullish().describe('既往医美治疗、注射、手术史与过敏史,对方没提就省略'),
      // 用字符串不用数组:DeepSeek 流式输出中文字符串数组时偶发漏引号,整次调用 JSON 解析失败;前端 SummaryCard 也按字符串渲染
      riskFlags: z.string().nullish().describe('需要医生注意的危险信号,多条用分号隔开'),
    }),
  }).server(ack),
]
