import process from 'node:process'

import { MOCK_HIS } from './mock.ts'

// 仅服务端:院内 HIS 主数据(科室、人员)。字段与接口按《患者管理系统与体检、HIS系统对接接口文档》,
// 南山实际走 JHIPLIB SOAP 服务总线(同 sznsrmyy-integration 的 SznsrmyyZkhisApiImpl)。HIS 只在院内网可达。
//   HIS_MODE=soap  HIS_URL=http://10.241.129.19/soap/JHIPLIB.SOAP.BS.Streambus.cls  (无鉴权,靠内网)
//   HIS_MODE=rest  HIS_URL=<集成服务根地址> HIS_USERNAME / HIS_PASSWORD             (文档的 /login + /master/*)
//   HIS_MODE=mock  本地假数据,内网不通时开发用;HIS_MOCK_DELAY_MS=200-3000 随机延迟、HIS_MOCK_FAIL_RATE=0.2 随机失败,
//                  模拟院内网慢和抖动(mock 同样走缓存 / 超时 / 错误处理)
//   HIS_TIMEOUT_MS 单次请求超时,默认 15000
//   不设 HIS_MODE = 不接 HIS,AI 也不注册 HIS 工具

export type HisMode = 'soap' | 'rest' | 'mock'

/** 科室信息(文档:科室信息 /master/listDepts,SOAP JH3012) */
export interface HisDept {
  KSID: string
  KSMC: string
  SJKSID?: string
  SFYX?: number | string // 代码里是 1/0,文档写 "01"/"00",两种都认
  MZ_FLAG?: number | string
  ZY_FLAG?: number | string
  JZ_FLAG?: number | string
  BQ_FLAG?: number | string
  GXSJ?: string
}

/** 人员信息(文档:人员信息 /master/listUsers,SOAP JH3011)。人员里没有所属科室 */
export interface HisUser {
  RYID: string
  ZH?: string
  GH?: string
  XM: string
  RYLB?: string // 01 医生,02 护士,03 医技,04 行政,99 其他
  SFYX?: number | string
  GXSJ?: string
}

const OPS = {
  depts: { soap: 'JH3012企微患者管理科室信息', rest: '/master/listDepts' },
  users: { soap: 'JH3011企微患者管理人员信息', rest: '/master/listUsers' },
} as const
type Op = keyof typeof OPS

export function hisMode(): HisMode | undefined {
  const mode = process.env.HIS_MODE
  return mode === 'soap' || mode === 'rest' || mode === 'mock' ? mode : undefined
}

function hisUrl(): string {
  const url = process.env.HIS_URL
  if (url === undefined || url === '') {
    throw new Error(`HIS_MODE=${hisMode()} 需要配置 HIS_URL`)
  }
  return url
}

const timeoutMs = () => Number(process.env.HIS_TIMEOUT_MS ?? 15_000)

// SOAP 信封与 SznsrmyyZkhisApiImpl 一致:JSON 参数放进 <tem:msgbody> 的 CDATA,结果在 <SampleResult> 里
export function soapEnvelope(json: string): string {
  return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org"><soapenv:Header/><soapenv:Body><tem:Sample><tem:msgbody><![CDATA[ ${json} ]]></tem:msgbody></tem:Sample></soapenv:Body></soapenv:Envelope>`
}

export function sampleResult(xml: string): string {
  const m = /<(?:\w+:)?SampleResult[^>]*>([\s\S]*?)<\/(?:\w+:)?SampleResult>/.exec(xml)
  if (!m) {
    throw new Error(`HIS SOAP 返回里没有 SampleResult:${xml.slice(0, 200)}`)
  }
  const body = m[1].trim()
  const cdata = /^<!\[CDATA\[([\s\S]*)\]\]>$/.exec(body)
  return cdata ? cdata[1] : body.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, '\'').replace(/&amp;/g, '&')
}

// 统一返回 { code, msg, data }:code 0 成功(文档「数据交互规范」)
function unwrap<T>(json: string, op: Op): T[] {
  let message: { code?: number, msg?: string, data?: T[] | null }
  try {
    message = JSON.parse(json) as typeof message
  }
  catch {
    throw new Error(`HIS ${op} 返回的不是 JSON:${json.slice(0, 200)}`)
  }
  if (message.code !== undefined && message.code !== 0) {
    throw new Error(`HIS ${op} 返回失败 code=${message.code}:${message.msg ?? ''}`)
  }
  return message.data ?? []
}

async function post(url: string, init: { headers: Record<string, string>, body: string }): Promise<string> {
  const response = await fetch(url, { method: 'POST', ...init, signal: AbortSignal.timeout(timeoutMs()) }).catch((error: unknown) => {
    throw new Error(error instanceof DOMException && error.name === 'TimeoutError' ? `HIS 请求超时(${timeoutMs()}ms)` : `HIS 连不上:${error instanceof Error ? error.message : String(error)}`)
  })
  if (!response.ok) {
    throw new Error(`HIS 返回 HTTP ${response.status}:${(await response.text()).slice(0, 200)}`)
  }
  return response.text()
}

async function callSoap(op: Op, params: object): Promise<string> {
  const url = `${hisUrl()}?CfgItem=${encodeURIComponent(OPS[op].soap)}`
  const xml = await post(url, {
    headers: { 'Content-Type': 'text/xml', 'SOAPAction': 'http://tempuri.org/JHIPLIB.SOAP.BS.Streambus.Sample' },
    body: soapEnvelope(JSON.stringify(params)),
  })
  return sampleResult(xml)
}

// 文档:/login 换 token,后续请求头 Authorization 带上;集成服务的客户端按 1 小时换一次
let token: { value: string, at: number } | undefined
async function restToken(): Promise<string> {
  if (token && Date.now() - token.at < 60 * 60 * 1000) {
    return token.value
  }
  const text = await post(`${hisUrl()}/login`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: process.env.HIS_USERNAME ?? '', password: process.env.HIS_PASSWORD ?? '' }),
  })
  const message = JSON.parse(text) as { code?: number, msg?: string, data?: { token?: string } }
  const value = message.data?.token
  if (message.code !== 0 || value === undefined || value === '') {
    throw new Error(`HIS 登录失败:${message.msg ?? text.slice(0, 200)}`)
  }
  token = { value, at: Date.now() }
  return token.value
}

// mock 也按真实请求的样子走:随机延迟、随机失败、受同一个超时约束,返回和 HIS 一样的 { code, data } JSON
async function callMock(op: Op): Promise<string> {
  const [min = 0, max = min] = (process.env.HIS_MOCK_DELAY_MS ?? '0').split('-').map(Number)
  const delay = min + Math.random() * (max - min)
  if (delay > timeoutMs()) {
    await new Promise(resolve => setTimeout(resolve, timeoutMs()))
    throw new Error(`HIS 请求超时(${timeoutMs()}ms)`)
  }
  await new Promise(resolve => setTimeout(resolve, delay))
  if (Math.random() < Number(process.env.HIS_MOCK_FAIL_RATE ?? 0)) {
    throw new Error('HIS 返回 HTTP 503:mock 随机失败')
  }
  return JSON.stringify({ code: 0, data: MOCK_HIS[op] })
}

async function callRest(op: Op, params: object): Promise<string> {
  return post(`${hisUrl()}${OPS[op].rest}`, {
    headers: { 'Content-Type': 'application/json', 'Authorization': await restToken() },
    body: JSON.stringify(params),
  })
}

// 主数据很少变:同一请求缓存 10 分钟,别让每句对话都去打生产 HIS
const CACHE_MS = 10 * 60 * 1000
const cache = new Map<string, { at: number, rows: Promise<unknown[]> }>()

async function call<T>(op: Op, params: object = {}): Promise<T[]> {
  const mode = hisMode()
  if (mode === undefined) {
    throw new Error('未配置 HIS_MODE')
  }
  const key = `${op}:${JSON.stringify(params)}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return hit.rows as Promise<T[]>
  }
  const transport = mode === 'soap' ? callSoap(op, params) : mode === 'rest' ? callRest(op, params) : callMock(op)
  const rows = transport.then(json => unwrap<T>(json, op))
  cache.set(key, { at: Date.now(), rows })
  rows.catch(() => cache.delete(key)) // 失败不缓存
  return rows
}

const truthy = (v: number | string | undefined) => v === undefined || Number(v) === 1

export const listDepartments = () => call<HisDept>('depts')
export const listUsers = () => call<HisUser>('users')

/** 有效的门诊科室,名称含关键词(空关键词 = 全部) */
export async function searchDepartments(keyword: string): Promise<HisDept[]> {
  const rows = await listDepartments()
  return rows.filter(d => truthy(d.SFYX) && Number(d.MZ_FLAG ?? 1) === 1 && d.KSMC.includes(keyword.trim()))
}

/** 有效的医生,姓名或工号含关键词 */
export async function searchDoctors(keyword: string): Promise<HisUser[]> {
  const k = keyword.trim()
  const rows = await listUsers()
  return rows.filter(u => truthy(u.SFYX) && (u.RYLB ?? '01') === '01' && (u.XM.includes(k) || (u.GH ?? '').includes(k)))
}
