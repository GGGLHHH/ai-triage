import type { Sex, Symptom } from './types'

import { cells } from './hospital-md'

const SEX: Record<string, Sex | undefined> = { '女': 'female', '男': 'male', '': undefined }
const split = (text: string) => text.split(/[、,，]/).map(s => s.trim()).filter(s => s !== '')

// 解析 concerns.md。格式错直接抛(带行号),同 hospital.md;部位编号是否存在由调用方校验(部位在代码里,绑 3D 模型)。
export function parseConcerns(md: string): Symptom[] {
  const symptoms: Symptom[] = []
  let regionId: string | undefined

  md.split('\n').forEach((raw, index) => {
    const line = raw.trim()
    const fail = (why: string): never => {
      throw new Error(`concerns.md 第 ${index + 1} 行${why}:${line}`)
    }

    if (line.startsWith('##')) {
      const body = line.replace(/^#+/, '').trim().replace('（', '(').replace('）', ')')
      const open = body.lastIndexOf('(')
      regionId = body.endsWith(')') && open > 0 ? body.slice(open + 1, -1).trim() : ''
      if (!/^\w+$/.test(regionId)) {
        fail('部位标题要写成「## 部位名 (编号)」')
      }
      return
    }
    if (regionId === undefined || !line.startsWith('|')) {
      return
    }

    const [id = '', name = '', departments = '', tags = '', sex = '', redFlag = '', ...rest] = cells(line)
    if (id === '编号' || /^-+$/.test(id)) {
      return
    }
    if (rest.length > 0 || !/^\w+$/.test(id) || name === '') {
      fail('诉求表要六列:编号 | 诉求 | 门诊 | 标签 | 性别 | 危急提示,编号只能是英文')
    }
    if (!(sex in SEX)) {
      fail(`性别只能填「女」「男」或留空,不能是「${sex}」`)
    }
    if (symptoms.some(s => s.id === id)) {
      fail(`诉求编号 ${id} 重复`)
    }
    const departmentIds = split(departments)
    if (departmentIds.length === 0) {
      fail('至少要填一个门诊编号')
    }
    symptoms.push({
      id,
      regionId,
      name,
      departmentIds,
      tags: split(tags),
      ...(SEX[sex] === undefined ? {} : { sex: SEX[sex] }),
      ...(redFlag === '' ? {} : { redFlag }),
    })
  })
  return symptoms
}
