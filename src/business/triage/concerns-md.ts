import type { Sex, Symptom } from './types'

import { cells } from './hospital-md'

const SEX: Record<string, Sex | undefined> = { '女': 'female', '男': 'male', '': undefined }
const split = (text: string) => text.split(/[、,，]/).map(s => s.trim()).filter(s => s !== '')

// 解析 concerns.md。格式错直接抛(带行号),同 hospital.md;部位编号是否存在由调用方校验(部位在代码里,绑 3D 模型)。
// 表头第三列是「部位」时,一行诉求展开到该列的每个子部位,编号变成「编号.部位」(脸的子区域共用一套诉求)。
export function parseConcerns(md: string): Symptom[] {
  const symptoms: Symptom[] = []
  let regionId: string | undefined
  let withRegions = false

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

    const row = cells(line)
    if (row[0] === '编号') {
      withRegions = row[2] === '部位'
      return
    }
    const [id = '', name = '', ...more] = row
    if (/^-+$/.test(id)) {
      return
    }
    const [regionCell = '', departments = '', tags = '', sex = '', redFlag = '', ...rest] = withRegions ? more : [regionId, ...more]
    if (rest.length > 0 || !/^\w+$/.test(id) || name === '') {
      fail('诉求表要六列:编号 | 诉求 | 门诊 | 标签 | 性别 | 危急提示(可在诉求后加一列「部位」),编号只能是英文')
    }
    if (!(sex in SEX)) {
      fail(`性别只能填「女」「男」或留空,不能是「${sex}」`)
    }
    const regionIds = split(regionCell)
    if (regionIds.length === 0) {
      fail('至少要填一个部位编号')
    }
    const departmentIds = split(departments)
    if (departmentIds.length === 0) {
      fail('至少要填一个门诊编号')
    }
    for (const region of regionIds) {
      const key = withRegions ? `${id}.${region}` : id
      if (symptoms.some(s => s.id === key)) {
        fail(`诉求编号 ${key} 重复`)
      }
      symptoms.push({
        id: key,
        regionId: region,
        name,
        departmentIds,
        tags: split(tags),
        ...(SEX[sex] === undefined ? {} : { sex: SEX[sex] }),
        ...(redFlag === '' ? {} : { redFlag }),
      })
    }
  })
  return symptoms
}
