import { describe, expect, it } from 'vitest'

import { departments } from '../mock-data'
import { regionById, regions, symptoms, symptomsOf } from './body-data'
import { FACE_REGIONS } from './face-mesh'

describe('body data', () => {
  it('every symptom points at a known region and department', () => {
    const departmentIds = new Set(departments.map(d => d.id))
    for (const s of symptoms) {
      expect(regionById.has(s.regionId), s.id).toBe(true)
      expect(s.departmentIds.every(id => departmentIds.has(id)), s.id).toBe(true)
    }
  })

  it('regions match the 3D face regions, each with concerns for both sexes', () => {
    expect(regions.map(r => r.id).sort()).toEqual([...FACE_REGIONS].sort())
    for (const sex of ['male', 'female'] as const) {
      for (const region of regions) {
        expect(symptomsOf(region.id, sex).length, `${sex} ${region.id}`).toBeGreaterThan(0)
      }
    }
  })

  it('has unique ids', () => {
    expect(new Set(regions.map(r => r.id)).size).toBe(regions.length)
    expect(new Set(symptoms.map(s => s.id)).size).toBe(symptoms.length)
  })
})
