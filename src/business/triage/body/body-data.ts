import type { BodyRegion, Sex, Symptom } from '../types'

import { parseConcerns } from '../concerns-md'
import concernsMd from '../concerns.md?raw'

// 部位与 3D 模型绑定,留在代码里;诉求表在 ../concerns.md,门诊在 ../hospital.md。

export const WHOLE_BODY = 'whole'

export const regions: BodyRegion[] = [
  { id: 'scalp', common: '头发 / 头皮', formal: '头皮与毛发', group: '头颈' },
  { id: 'face', common: '脸', formal: '面部(含五官)', group: '头颈' },
  { id: 'breast', common: '胸部', formal: '乳房 / 乳头乳晕', group: '躯干' },
  { id: 'abdomen', common: '肚子', formal: '腹部', group: '躯干' },
  { id: 'back', common: '后背', formal: '背部', group: '躯干' },
  { id: 'privateFemale', common: '私密处', formal: '女性私密部位', group: '躯干', sex: 'female' },
  { id: 'privateMale', common: '私密处', formal: '男性私密部位', group: '躯干', sex: 'male' },
  { id: 'arm', common: '胳膊', formal: '上肢', group: '四肢' },
  { id: 'hand', common: '手', formal: '手部', group: '四肢' },
  { id: 'leg', common: '腿', formal: '下肢', group: '四肢' },
  { id: WHOLE_BODY, common: '全身 / 其他', formal: '全身与其他诉求', group: '全身' },
]

// 诉求、门诊归属、标签、危急提示都在 ../concerns.md 里维护
export const symptoms: Symptom[] = parseConcerns(concernsMd)

const forSex = (sex: Sex) => (item: { sex?: Sex }) => item.sex === undefined || item.sex === sex

export function regionsFor(sex: Sex): BodyRegion[] {
  return regions.filter(forSex(sex))
}

export function symptomsOf(regionId: string, sex: Sex): Symptom[] {
  return symptoms.filter(s => s.regionId === regionId).filter(forSex(sex))
}

export const regionById = new Map(regions.map(r => [r.id, r]))
export const symptomById = new Map(symptoms.map(s => [s.id, s]))
