import type { DoctorWithSlots } from './types'

import { doctors, slots } from './mock-data'

const PERIOD_ORDER = ['am', 'pm', 'night']

// 有号的排前面,同样有号按最早可约排
export function doctorsWithSlots(departmentId: string): DoctorWithSlots[] {
  return doctors
    .filter(d => d.departmentId === departmentId)
    .map(doctor => ({
      doctor,
      slots: slots
        .filter(s => s.doctorId === doctor.id)
        .sort((a, b) => a.dayOffset - b.dayOffset || PERIOD_ORDER.indexOf(a.period) - PERIOD_ORDER.indexOf(b.period)),
    }))
    .sort((a, b) => firstOpen(a) - firstOpen(b))
}

function firstOpen({ slots }: DoctorWithSlots): number {
  return slots.find(s => s.remaining > 0)?.dayOffset ?? Number.POSITIVE_INFINITY
}
