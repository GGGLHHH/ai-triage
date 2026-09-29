import { describe, expect, it } from 'vitest'

import { parseHospital } from './hospital-md'
import { departments, doctors, slots } from './mock-data'

const SAMPLE = `# 门诊安排

## 呼吸内科 (resp)

咳嗽、发热

| 医生 | 职称 | 擅长 | 号源 |
|---|---|---|---|
| 李明 | 主任医师 | 哮喘 | 今天下午 2、明天上午 0 |
| 王芳 | 副主任医师 | 肺部感染 | |
`

describe('parseHospital', () => {
  it('reads departments, doctors and slots', () => {
    const h = parseHospital(SAMPLE)
    expect(h.departments).toEqual([{ id: 'resp', name: '呼吸内科', intro: '咳嗽、发热' }])
    expect(h.doctors.map(d => [d.id, d.name, d.specialty])).toEqual([['resp-1', '李明', '哮喘'], ['resp-2', '王芳', '肺部感染']])
    expect(h.slots).toEqual([
      { doctorId: 'resp-1', dayOffset: 0, period: 'pm', remaining: 2 },
      { doctorId: 'resp-1', dayOffset: 1, period: 'am', remaining: 0 },
    ])
  })

  it('fails loudly with the line number on bad input', () => {
    expect(() => parseHospital(SAMPLE.replace('今天下午 2', '下周一 2'))).toThrow(/第 9 行.*下周一 2/)
    expect(() => parseHospital(SAMPLE.replace('(resp)', ''))).toThrow(/## 科室名 \(编号\)/)
    expect(() => parseHospital(SAMPLE.replace('咳嗽、发热\n', ''))).toThrow(/缺少简介/)
  })

  it('parses the real hospital.md', () => {
    expect(departments.length).toBeGreaterThan(0)
    expect(doctors.every(d => departments.some(dep => dep.id === d.departmentId))).toBe(true)
    expect(slots.every(s => doctors.some(d => d.id === s.doctorId))).toBe(true)
  })
})
