import type { Department, Doctor, Slot } from './types'

export interface Hospital {
  departments: Department[]
  doctors: Doctor[]
  slots: Slot[]
}

const SLOT = /^(今天|明天|后天)(上午|下午|晚上)\s*(\d+)$/
const DAYS = ['今天', '明天', '后天']
const PERIODS: Record<string, Slot['period']> = { 上午: 'am', 下午: 'pm', 晚上: 'night' }

// md 表格一行 → 单元格;concerns-md 也用
export function cells(line: string): string[] {
  return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
}

// 解析 hospital.md。格式错直接抛(带行号):宁可页面起不来,也不要静默漏掉一个科室或医生。
export function parseHospital(md: string): Hospital {
  const departments: Department[] = []
  const doctors: Doctor[] = []
  const slots: Slot[] = []
  let current: Department | undefined

  md.split('\n').forEach((raw, index) => {
    const line = raw.trim()
    const fail = (why: string): never => {
      throw new Error(`hospital.md 第 ${index + 1} 行${why}:${line}`)
    }

    if (line.startsWith('##')) {
      // 「## 科室名 (编号)」:编号取最后一对括号,半角全角都认
      const body = line.slice(2).trim().replace('\uFF08', '(').replace('\uFF09', ')')
      const open = body.lastIndexOf('(')
      const id = body.endsWith(')') && open > 0 ? body.slice(open + 1, -1).trim() : ''
      const name = body.slice(0, open).trim()
      if (!/^\w+$/.test(id) || name === '') {
        fail('科室标题要写成「## 科室名 (编号)」')
      }
      if (departments.some(d => d.id === id)) {
        fail(`科室编号 ${id} 重复`)
      }
      current = { id, name, intro: '' }
      departments.push(current)
      return
    }
    if (current === undefined || line === '' || line.startsWith('#') || line.startsWith('>')) {
      return
    }
    if (!line.startsWith('|')) {
      current.intro = current.intro === '' ? line : `${current.intro}${line}`
      return
    }

    const [name = '', title = '', specialty = '', slotText = '', ...rest] = cells(line)
    // 表头与分隔行
    if (name === '医生' || /^-+$/.test(name)) {
      return
    }
    if (rest.length > 0 || name === '' || title === '') {
      fail('医生表要四列:医生 | 职称 | 擅长 | 号源')
    }
    const doctor: Doctor = { id: `${current.id}-${doctors.filter(d => d.departmentId === current?.id).length + 1}`, departmentId: current.id, name, title, specialty }
    doctors.push(doctor)
    for (const item of slotText.split(/[、,\uFF0C]/).map(s => s.trim()).filter(Boolean)) {
      const match = SLOT.exec(item)
      if (!match) {
        fail(`号源「${item}」看不懂,要写成「明天上午 8」`)
      }
      const [, day = '', period = '', remaining = '0'] = match ?? []
      slots.push({ doctorId: doctor.id, dayOffset: DAYS.indexOf(day), period: PERIODS[period] ?? 'am', remaining: Number(remaining) })
    }
  })

  for (const d of departments) {
    if (d.intro === '') {
      throw new Error(`hospital.md 科室「${d.name}」缺少简介(标题下一行)`)
    }
  }
  return { departments, doctors, slots }
}
