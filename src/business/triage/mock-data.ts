import { parseHospital } from './hospital-md'
import hospitalMd from './hospital.md?raw'

// 科室、医生、号源都在 hospital.md 里维护;这里只解析一次,供前后端共用(AI 提示词、工具枚举、科室卡)。
export const { departments, doctors, slots } = parseHospital(hospitalMd)

export const departmentById = new Map(departments.map(d => [d.id, d]))
