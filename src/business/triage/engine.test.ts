import { describe, expect, it } from 'vitest'

import { doctorsWithSlots } from './engine'
import { departments } from './mock-data'

describe('doctorsWithSlots', () => {
  it('orders doctors by their earliest open slot, fully booked last', () => {
    const firstOpen = (slots: { dayOffset: number, remaining: number }[]) =>
      slots.find(s => s.remaining > 0)?.dayOffset ?? Number.POSITIVE_INFINITY
    for (const { id } of departments) {
      const days = doctorsWithSlots(id).map(d => firstOpen(d.slots))
      expect(days, id).toEqual([...days].sort((a, b) => a - b))
    }
  })
})
