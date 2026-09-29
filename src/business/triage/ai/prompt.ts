import { regions, symptoms } from '../body/body-data'
import { departments } from '../mock-data'
import faqMd from './faq.md?raw'
import template from './system-prompt.md?raw'

// 工具名:服务端定义与前端渲染器按同一份常量对齐;system-prompt.md 里按同样的名字引用
export const TOOL = {
  markBody: 'mark_body_regions',
  emergency: 'flag_emergency',
  recommend: 'recommend_departments',
  summary: 'write_summary',
} as const

// 清单由数据生成,保证提示词里的编号与工具 enum、hospital.md 永远一致;措辞与规则都在 system-prompt.md
const LISTS: Record<string, string[]> = {
  部位清单: regions.map(r => `- ${r.id}: ${r.common}(${r.formal})${r.sex === undefined ? '' : `,仅${r.sex === 'male' ? '男' : '女'}性`}`),
  诉求清单: symptoms.map(s => `- ${s.id}: ${s.name} [部位 ${s.regionId}]${s.redFlag === undefined ? '' : ' [危急]'}${s.tags.length > 0 ? ` 标签:${s.tags.join('、')}` : ''}`),
  门诊清单: departments.map(d => `- ${d.id}: ${d.name}(${d.intro})`),
  常见问题: faqBody(faqMd),
}

// faq.md 去掉文件头(标题与给维护者看的 > 说明),标题降一级,嵌进提示词的「就诊须知与常见问题」一节
function faqBody(md: string): string[] {
  const lines = md.split('\n')
  const start = lines.findIndex(line => line.startsWith('## '))
  return lines.slice(start).map(line => (line.startsWith('#') ? `#${line}` : line))
}

export function renderSystemPrompt(md: string): string {
  const out = md.replace(/\{\{(.+?)\}\}/g, (_, key: string) => {
    const lines = LISTS[key]
    if (lines === undefined) {
      throw new Error(`system-prompt.md 里的占位符 {{${key}}} 不认识,可用:${Object.keys(LISTS).map(k => `{{${k}}}`).join('、')}`)
    }
    return lines.join('\n')
  })
  // 清单漏放会让模型乱编编号:宁可起不来
  for (const key of Object.keys(LISTS)) {
    if (!md.includes(`{{${key}}}`)) {
      throw new Error(`system-prompt.md 缺少占位符 {{${key}}}`)
    }
  }
  return out
}

export const TRIAGE_SYSTEM_PROMPT = renderSystemPrompt(template)
