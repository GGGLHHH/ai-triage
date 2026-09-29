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

  it.each(['male', 'female'] as const)('%s: every region has a mesh, every mesh is a region, every symptom sits in a region of that sex', (sex) => {
    const meshRegions = new Set(bodyParts(sex).map(p => p.region))
    for (const region of regionsFor(sex)) {
      if (region.id !== WHOLE_BODY) {
        expect(meshRegions.has(region.id), region.id).toBe(true)
      }
    }
    // 部位粒度跟文档走:每个部位都有诉求;诉求不能挂在该性别看不到的部位上
    for (const region of regionsFor(sex)) {
      expect(symptomsOf(region.id, sex).length, region.id).toBeGreaterThan(0)
    }
    for (const symptom of symptoms.filter(s => s.sex === undefined || s.sex === sex)) {
      expect(regionsFor(sex).some(r => r.id === symptom.regionId), symptom.id).toBe(true)
    }
    const allowed = new Set(regionsFor(sex).map(r => r.id))
    for (const id of meshRegions) {
      if (id === undefined) {
        continue
      }
      expect(allowed.has(id), id).toBe(true)
    }
  })

  it('has unique ids', () => {
    expect(new Set(regions.map(r => r.id)).size).toBe(regions.length)
    expect(new Set(symptoms.map(s => s.id)).size).toBe(symptoms.length)
  })
})
