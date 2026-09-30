import { toolDefinition } from '@gedatou/cadenza-ai/server'
import { z } from 'zod'

import { hisMode, searchDepartments, searchDoctors } from '../his/his.ts'
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

// HIS 不可达(内网不通、超时)同样不抛,把原因交给模型;结果截断,别把整院名单塞进上下文
const HIS_LIMIT = 20
// 细节(超时、HTTP 503…)只进服务端日志:原样给模型,它会照搬给患者
function hisError(error: unknown): string {
  console.error('[his]', error instanceof Error ? error.message : error)
  return '院内系统暂时查不到,请稍后再试'
}

async function hisDepartmentsTool({ keyword }: { keyword: string }) {
  try {
    const rows = await searchDepartments(keyword)
    return { total: rows.length, departments: rows.slice(0, HIS_LIMIT).map(d => ({ id: d.KSID, name: d.KSMC })) }
  }
  catch (error) {
    return { departments: [], error: hisError(error) }
  }
}

// 只给姓名和工号:登录账号(ZH)不出服务端
async function hisDoctorsTool({ keyword }: { keyword: string }) {
  try {
    const rows = await searchDoctors(keyword)
    return { total: rows.length, doctors: rows.slice(0, HIS_LIMIT).map(u => ({ id: u.RYID, name: u.XM, staffNo: u.GH })) }
  }
  catch (error) {
    return { doctors: [], error: hisError(error) }
  }
}

// 配了 HIS_MODE 才注册(见 his/his.ts);患者查询(JH3015)不给模型,免得按任意登记号查人
const hisTools = hisMode() === undefined
  ? []
  : [
      toolDefinition({
        name: TOOL.hisDepartments,
        description: '查院内 HIS 的门诊科室(实时数据,仅有效的门诊科室),按名称关键词过滤',
        inputSchema: z.object({ keyword: z.string().describe('科室名称关键词,如「美容」「皮肤」;空字符串列出全部') }),
      }).server(hisDepartmentsTool),
      toolDefinition({
        name: TOOL.hisDoctors,
        description: '查院内 HIS 的医生(实时数据,仅在职医生),按姓名或工号关键词过滤。HIS 人员信息不含所属科室',
        inputSchema: z.object({ keyword: z.string().describe('医生姓名或工号关键词') }),
      }).server(hisDoctorsTool),
    ]

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
  ...hisTools,
]
