import { describe, expect, it } from 'vitest'

import { departments } from '../mock-data'
import { renderSystemPrompt, TOOL, TRIAGE_SYSTEM_PROMPT } from './prompt'

describe('triage system prompt', () => {
  it('fills in every clinic and leaves no placeholder behind', () => {
    for (const { id, name } of departments) {
      expect(TRIAGE_SYSTEM_PROMPT).toContain(`- ${id} ${name}:`)
    }
    expect(TRIAGE_SYSTEM_PROMPT).not.toMatch(/\{\{.+?\}\}/)
    expect(TRIAGE_SYSTEM_PROMPT).toContain(TOOL.knowledge)
  })

  it('fails loudly on an unknown placeholder', () => {
    expect(() => renderSystemPrompt('{{科室清单}}')).toThrow(/不认识/)
  })
})
