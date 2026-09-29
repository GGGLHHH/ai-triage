import { describe, expect, it } from 'vitest'

import { parseConcerns } from './concerns-md'

const SAMPLE = `# 部位诉求表

## 脸 (face)

| 编号 | 诉求 | 门诊 | 标签 | 性别 | 危急提示 |
|---|---|---|---|---|---|
| spots | 色斑 | pigment | 黄褐斑、雀斑 | | |
| embolism | 注射后发白 | general | 血管栓塞 | 女 | 请立即就医 |
`

describe('parseConcerns', () => {
  it('reads concerns with region, clinics, tags, sex and red flag', () => {
    expect(parseConcerns(SAMPLE)).toEqual([
      { id: 'spots', regionId: 'face', name: '色斑', departmentIds: ['pigment'], tags: ['黄褐斑', '雀斑'] },
      { id: 'embolism', regionId: 'face', name: '注射后发白', departmentIds: ['general'], tags: ['血管栓塞'], sex: 'female', redFlag: '请立即就医' },
    ])
  })

  it('fails loudly with the line number on bad input', () => {
    expect(() => parseConcerns(SAMPLE.replace('| 女 |', '| 男女 |'))).toThrow(/第 8 行.*性别/)
    expect(() => parseConcerns(SAMPLE.replace('| pigment |', '| |'))).toThrow(/至少要填一个门诊/)
    expect(() => parseConcerns(SAMPLE.replace('| embolism |', '| spots |'))).toThrow(/重复/)
    expect(() => parseConcerns(SAMPLE.replace('(face)', ''))).toThrow(/## 部位名 \(编号\)/)
  })
})
