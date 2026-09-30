import type { Buffer } from 'node:buffer'

import type { AddressInfo } from 'node:net'
import { createServer } from 'node:http'
import process from 'node:process'

import { afterEach, describe, expect, it, vi } from 'vitest'

// 模块级有缓存和 token:每个用例重新 import 一份
async function load(env: Record<string, string>) {
  vi.resetModules()
  for (const [k, v] of Object.entries(env)) {
    vi.stubEnv(k, v)
  }
  return import('./his.ts')
}

afterEach(() => {
  vi.unstubAllEnvs()
})

// 本地假 HIS:记录请求,按 handler 回包
async function fakeHis(handler: (path: string, headers: Record<string, string | string[] | undefined>, body: string) => { type: string, body: string }) {
  const requests: { path: string, headers: Record<string, string | string[] | undefined>, body: string }[] = []
  const server = createServer((req, res) => {
    let body = ''
    req.on('data', (c: Buffer) => {
      body += c.toString()
    })
    req.on('end', () => {
      requests.push({ path: req.url ?? '', headers: req.headers, body })
      const out = handler(req.url ?? '', req.headers, body)
      res.writeHead(200, { 'content-type': out.type }).end(out.body)
    })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  return { url, requests, close: () => new Promise(resolve => server.close(resolve)) }
}

const DEPTS = [
  { KSID: '1', KSMC: '医疗美容科门诊', SFYX: 1, MZ_FLAG: 1 },
  { KSID: '2', KSMC: '美容病区', SFYX: 1, MZ_FLAG: 0 },
  { KSID: '3', KSMC: '旧美容门诊', SFYX: '00', MZ_FLAG: 1 },
]

describe('his soap (JHIPLIB)', () => {
  it('posts the envelope with CfgItem, unwraps SampleResult, filters and caches', async () => {
    const his = await fakeHis(() => ({
      type: 'text/xml',
      body: `<SOAP-ENV:Envelope><SOAP-ENV:Body><SampleResponse><SampleResult>${JSON.stringify({ code: 0, data: DEPTS }).replace(/"/g, '&quot;')}</SampleResult></SampleResponse></SOAP-ENV:Body></SOAP-ENV:Envelope>`,
    }))
    try {
      const { searchDepartments } = await load({ HIS_MODE: 'soap', HIS_URL: `${his.url}/soap` })
      expect((await searchDepartments('美容')).map(d => d.KSID)).toEqual(['1'])
      await searchDepartments('')
      expect(his.requests).toHaveLength(1) // 第二次走缓存
      const [req] = his.requests
      expect(decodeURIComponent(req.path)).toBe('/soap?CfgItem=JH3012企微患者管理科室信息')
      expect(req.headers.soapaction).toBe('http://tempuri.org/JHIPLIB.SOAP.BS.Streambus.Sample')
      expect(req.body).toContain('<![CDATA[ {} ]]>')
    }
    finally {
      await his.close()
    }
  })

  it('reads CDATA results and surfaces a failing code', async () => {
    const { sampleResult } = await load({})
    expect(sampleResult('<a:SampleResult><![CDATA[{"code":0}]]></a:SampleResult>')).toBe('{"code":0}')
    const his = await fakeHis(() => ({ type: 'text/xml', body: '<SampleResult>{"code":500,"msg":"系统内部错误"}</SampleResult>' }))
    try {
      const { listUsers } = await load({ HIS_MODE: 'soap', HIS_URL: his.url })
      await expect(listUsers()).rejects.toThrow(/code=500.*系统内部错误/)
    }
    finally {
      await his.close()
    }
  })
})

describe('his rest (接口文档)', () => {
  it('logs in once and sends the token on master calls', async () => {
    const his = await fakeHis((path, _, body) => path === '/login'
      ? { type: 'application/json', body: JSON.stringify({ code: 0, data: { token: `tk-${(JSON.parse(body) as { username: string }).username}` } }) }
      : { type: 'application/json', body: JSON.stringify({ code: 0, data: [{ RYID: 'a', XM: '张三', GH: '001', RYLB: '01', SFYX: 1 }, { RYID: 'b', XM: '张护士', RYLB: '02', SFYX: 1 }] }) })
    try {
      const { searchDoctors, searchDepartments } = await load({ HIS_MODE: 'rest', HIS_URL: his.url, HIS_USERNAME: 'U001', HIS_PASSWORD: 'x' })
      expect((await searchDoctors('张')).map(u => u.XM)).toEqual(['张三'])
      await searchDepartments('').catch(() => {})
      expect(his.requests.map(r => r.path)).toEqual(['/login', '/master/listUsers', '/master/listDepts'])
      expect(his.requests[1].headers.authorization).toBe('tk-U001')
    }
    finally {
      await his.close()
    }
  })
})

describe('his mock', () => {
  it('filters out invalid and non-outpatient departments and non-doctors', async () => {
    const { searchDepartments, searchDoctors, hisMode } = await load({ HIS_MODE: 'mock' })
    expect(hisMode()).toBe('mock')
    expect((await searchDepartments('美容')).map(d => d.KSMC)).toEqual(['医疗美容科门诊'])
    expect((await searchDoctors('')).map(u => u.XM)).toEqual(['张医生', '李医生'])
  })

  it('is off without HIS_MODE', async () => {
    const { hisMode } = await load({})
    expect(process.env.HIS_MODE).toBeUndefined()
    expect(hisMode()).toBeUndefined()
  })
})
