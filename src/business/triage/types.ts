export interface Department {
  id: string
  name: string
  intro: string
}

export interface Doctor {
  id: string
  departmentId: string
  name: string
  title: string
  specialty: string
}

// 号源:dayOffset 相对今天,免得 mock 数据过期
export interface Slot {
  doctorId: string
  dayOffset: number
  period: 'am' | 'pm' | 'night'
  remaining: number
}

export interface DepartmentMatch {
  department: Department
  hits: string[]
}

export interface DoctorWithSlots {
  doctor: Doctor
  slots: Slot[]
}

export type Sex = 'male' | 'female'

// 人体图上可点的部位。左右成对的器官共用一个 id(分诊不区分左右)。
export interface BodyRegion {
  id: string
  common: string // 俗称,hover 主文案
  formal: string // 专业名称
  group: '头颈' | '躯干' | '四肢' | '全身'
  sex?: Sex // 不填 = 男女都有
}

export interface Symptom {
  id: string
  regionId: string
  name: string
  // 首个是首选门诊,排序打平时靠前
  departmentIds: string[]
  // 病名、别名、项目名(来自科室《诊疗核心信息》的分诊规则),给 AI 做同义词匹配
  tags: string[]
  sex?: Sex
  // 危急症状:选中即提示急诊,文案给患者看
  redFlag?: string
}
