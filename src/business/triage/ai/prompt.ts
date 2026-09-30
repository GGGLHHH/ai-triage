import { departments } from '../mock-data'
import template from './system-prompt.md?raw'

export const TOOL = {
  knowledge: 'search_knowledge',
  recommend: 'recommend_departments',
  hisDepartments: 'his_search_departments',
  hisDoctors: 'his_search_doctors',
} as const

// system-prompt.md 里的占位符由数据填:门诊来自 hospital.md,改门诊不用动提示词
const LISTS: Record<string, string[]> = {
  门诊清单: departments.map(d => `- ${d.id} ${d.name}:${d.intro}`),
}

export function renderSystemPrompt(md: string): string {
  return md.replace(/\{\{(.+?)\}\}/g, (_, key: string) => {
    const lines = LISTS[key]
    if (lines === undefined) {
      throw new Error(`system-prompt.md 里的占位符 {{${key}}} 不认识,可用:${Object.keys(LISTS).map(k => `{{${k}}}`).join('、')}`)
    }
    return lines.join('\n')
  })
}

export const TRIAGE_SYSTEM_PROMPT = renderSystemPrompt(template)
