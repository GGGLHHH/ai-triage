import { describe, expect, it } from 'vitest'

import { departments } from '../mock-data'
import { regionById, regions, regionsFor, symptoms, symptomsOf, WHOLE_BODY } from './body-data'
import { bodyParts } from './body-parts'

describe('body data', () => {
  it('every symptom points at a known region and department', () => {
    const departmentIds = new Set(departments.map(d => d.id))
    for (const s of symptoms) {
      expect(regionById.has(s.regionId), s.id).toBe(true)
      expect(s.departmentIds.every(id => departmentIds.has(id)), s.id).toBe(true)
    }
  })

  it.each(['male', 'female'] as const)('%s: every region has a mesh and symptoms, and every mesh is a region', (sex) => {
    const meshRegions = new Set(bodyParts(sex).map(p => p.region))
    for (const region of regionsFor(sex)) {
      if (region.id !== WHOLE_BODY) {
        expect(meshRegions.has(region.id), region.id).toBe(true)
      }
      expect(symptomsOf(region.id, sex).length, region.id).toBeGreaterThan(0)
    }
    const allowed = new Set(regionsFor(sex).map(r => r.id))
    for (const id of meshRegions) {
      expect(allowed.has(id), id).toBe(true)
    }
  })

  it('has unique ids', () => {
    expect(new Set(regions.map(r => r.id)).size).toBe(regions.length)
    expect(new Set(symptoms.map(s => s.id)).size).toBe(symptoms.length)
  })
})
