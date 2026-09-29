import { describe, expect, it } from 'vitest'

import { regions, symptoms } from '../body/body-data'
import { departments } from '../mock-data'
import { renderSystemPrompt, TOOL, TRIAGE_SYSTEM_PROMPT } from './prompt'

describe('triage system prompt', () => {
  it('lists every id the tools accept, so the model can only pick from them', () => {
    for (const { id } of [...regions, ...symptoms, ...departments]) {
      expect(TRIAGE_SYSTEM_PROMPT).toContain(`- ${id}: `)
    }
    expect(TRIAGE_SYSTEM_PROMPT).not.toMatch(/\{\{.+?\}\}/)
  })

  it('names every tool it instructs the model to call', () => {
    for (const name of Object.values(TOOL)) {
      expect(TRIAGE_SYSTEM_PROMPT).toContain(name)
    }
  })

  it('fails loudly on a missing or unknown placeholder', () => {
    const all = '{{部位清单}}\n{{诉求清单}}\n{{门诊清单}}'
    expect(() => renderSystemPrompt(all.replace('{{门诊清单}}', ''))).toThrow(/缺少占位符 \{\{门诊清单\}\}/)
    expect(() => renderSystemPrompt(`${all}\n{{科室清单}}`)).toThrow(/不认识/)
  })
})
