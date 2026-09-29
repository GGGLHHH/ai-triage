import { describe, expect, it } from 'vitest'

import { inputOf } from './tool-inputs'

const part = (input: unknown, args = '') => ({ type: 'tool-call', id: 'c1', name: 'x', arguments: args, input, state: 'input-complete' }) as Parameters<typeof inputOf>[0]

describe('inputOf', () => {
  it('drops null values so card defaults apply', () => {
    expect(inputOf<{ regionIds?: string[], symptomIds?: string[] }>(part({ regionIds: ['arm'], symptomIds: null }))).toEqual({ regionIds: ['arm'] })
  })

  it('falls back to partial JSON while arguments stream', () => {
    expect(inputOf(part(undefined, '{"regionIds": ["arm"], "symptomIds": nu'))).toEqual({ regionIds: ['arm'] })
  })

  it('returns {} for non-object input', () => {
    expect(inputOf(part(undefined, '"oops"'))).toEqual({})
  })
})
