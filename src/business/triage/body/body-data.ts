import type { BodyRegion, Sex, Symptom } from '../types'

import { parseConcerns } from '../concerns-md'
import concernsMd from '../concerns.md?raw'

// 部位与 3D 人脸分区绑定(face-mesh.ts 的 FACE_REGIONS),留在代码里;诉求表在 ../concerns.md,门诊在 ../hospital.md。

export const regions: BodyRegion[] = [
  { id: 'forehead', common: '额头', formal: '额部' },
  { id: 'eye', common: '眼睛周围', formal: '眼周(含眉)' },
  { id: 'nose', common: '鼻子', formal: '鼻部' },
  { id: 'cheek', common: '脸颊', formal: '面颊部' },
  { id: 'mouth', common: '嘴周 / 下巴', formal: '口周与下颌' },
]

// 诉求、门诊归属、标签、危急提示都在 ../concerns.md 里维护
export const symptoms: Symptom[] = parseConcerns(concernsMd)

const forSex = (sex: Sex) => (item: { sex?: Sex }) => item.sex === undefined || item.sex === sex

export function symptomsOf(regionId: string, sex: Sex): Symptom[] {
  return symptoms.filter(s => s.regionId === regionId).filter(forSex(sex))
}

export const regionById = new Map(regions.map(r => [r.id, r]))
export const symptomById = new Map(symptoms.map(s => [s.id, s]))
