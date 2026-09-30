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

interface Reply { type?: string, body: string, status?: number, delayMs?: number }

// 本地假 HIS:记录请求,按 handler 回包;每个请求都带 0–30ms 随机抖动,handler 可再加延迟、改状态码
async function fakeHis(handler: (path: string, headers: Record<string, string | string[] | undefined>, body: string) => Reply) {
  const requests: { path: string, headers: Record<string, string | string[] | undefined>, body: string }[] = []
  const server = createServer((req, res) => {
    let body = ''
    req.on('data', (c: Buffer) => {
      body += c.toString()
    })
    req.on('end', () => {
      requests.push({ path: req.url ?? '', headers: req.headers, body })
      const out = handler(req.url ?? '', req.headers, body)
      setTimeout(() => {
        res.writeHead(out.status ?? 200, { 'content-type': out.type ?? 'text/xml' }).end(out.body)
      }, Math.random() * 30 + (out.delayMs ?? 0))
    })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const close = () => new Promise((resolve) => {
    server.closeAllConnections() // 超时用例里还挂着的请求直接断开
    server.close(resolve)
  })
  return { url, requests, close }
}

const soap = (message: unknown) => `<SampleResult>${JSON.stringify(message).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}</SampleResult>`

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

describe('his edge cases (random latency)', () => {
  it('shares one in-flight request across concurrent callers', async () => {
    const his = await fakeHis(() => ({ body: soap({ code: 0, data: DEPTS }), delayMs: 50 + Math.random() * 200 }))
    try {
      const { searchDepartments } = await load({ HIS_MODE: 'soap', HIS_URL: his.url })
      const results = await Promise.all(Array.from({ length: 8 }, (_, i) => searchDepartments(i % 2 ? '美容' : '')))
      expect(his.requests).toHaveLength(1)
      expect(results.every(r => r.length === 1)).toBe(true)
    }
    finally {
      await his.close()
    }
  })

  it('times out slow responses and does not cache the failure', async () => {
    let slow = true
    const his = await fakeHis(() => ({ body: soap({ code: 0, data: DEPTS }), delayMs: slow ? 400 : 0 }))
    try {
      const { listDepartments } = await load({ HIS_MODE: 'soap', HIS_URL: his.url, HIS_TIMEOUT_MS: '100' })
      await expect(listDepartments()).rejects.toThrow('HIS 请求超时(100ms)')
      slow = false
      expect(await listDepartments()).toHaveLength(3) // 失败没进缓存,马上重试成功
      expect(his.requests).toHaveLength(2)
    }
    finally {
      await his.close()
    }
  })

  it.each([
    ['HTTP 500', { status: 500, body: 'Internal Server Error' }, /HTTP 500/],
    ['no SampleResult', { body: '<soap:Fault>JHIPLIB busy</soap:Fault>' }, /没有 SampleResult/],
    ['HTML inside SampleResult', { body: '<SampleResult>&lt;html&gt;502&lt;/html&gt;</SampleResult>' }, /返回的不是 JSON/],
    ['business error code', { body: soap({ code: 401, msg: '认证失败' }) }, /code=401.*认证失败/],
  ] as const)('reports %s clearly', async (_, reply, message) => {
    const his = await fakeHis(() => reply)
    try {
      const { listUsers } = await load({ HIS_MODE: 'soap', HIS_URL: his.url })
      await expect(listUsers()).rejects.toThrow(message)
    }
    finally {
      await his.close()
    }
  })

  it('treats null data as empty and trims the keyword', async () => {
    const his = await fakeHis(path => ({ body: soap({ code: 0, data: path.includes('JH3012') ? null : [{ RYID: 'a', XM: '张三', GH: 'G1', RYLB: '01', SFYX: '1' }] }) }))
    try {
      const { searchDepartments, searchDoctors } = await load({ HIS_MODE: 'soap', HIS_URL: his.url })
      expect(await searchDepartments('美容')).toEqual([])
      expect((await searchDoctors('  张  ')).map(u => u.XM)).toEqual(['张三'])
      expect(await searchDoctors('不存在的人')).toEqual([])
    }
    finally {
      await his.close()
    }
  })

  it('says it cannot connect when nothing listens', async () => {
    const his = await fakeHis(() => ({ body: '' }))
    await his.close()
    const { listDepartments } = await load({ HIS_MODE: 'soap', HIS_URL: his.url })
    await expect(listDepartments()).rejects.toThrow(/HIS 连不上/)
  })

  it('rest: surfaces a login failure and logs in again after the token expires', async () => {
    let password = 'wrong'
    const his = await fakeHis((path, _, body) => path === '/login'
      ? { type: 'application/json', body: JSON.stringify((JSON.parse(body) as { password: string }).password === password ? { code: 0, data: { token: `t${Date.now()}` } } : { code: 1, msg: '密码无效！' }) }
      : { type: 'application/json', body: JSON.stringify({ code: 0, data: [] }) })
    try {
      const failing = await load({ HIS_MODE: 'rest', HIS_URL: his.url, HIS_PASSWORD: 'x' })
      await expect(failing.listUsers()).rejects.toThrow(/登录失败.*密码无效/)

      password = 'x'
      vi.useFakeTimers({ toFake: ['Date'] })
      const { listUsers } = await load({ HIS_MODE: 'rest', HIS_URL: his.url, HIS_PASSWORD: 'x' })
      await listUsers()
      vi.setSystemTime(Date.now() + 61 * 60 * 1000) // token 1 小时、缓存 10 分钟都过期
      await listUsers()
      expect(his.requests.map(r => r.path)).toEqual(['/login', '/login', '/master/listUsers', '/login', '/master/listUsers'])
    }
    finally {
      vi.useRealTimers()
      await his.close()
    }
  })

  it('mock: random delay stays within range, failures and timeouts surface', async () => {
    const ok = await load({ HIS_MODE: 'mock', HIS_MOCK_DELAY_MS: '20-60' })
    const started = Date.now()
    await ok.listDepartments()
    expect(Date.now() - started).toBeGreaterThanOrEqual(19)

    const failing = await load({ HIS_MODE: 'mock', HIS_MOCK_FAIL_RATE: '1' })
    await expect(failing.listUsers()).rejects.toThrow(/mock 随机失败/)

    const slow = await load({ HIS_MODE: 'mock', HIS_MOCK_DELAY_MS: '500-800', HIS_TIMEOUT_MS: '50' })
    await expect(slow.listUsers()).rejects.toThrow('HIS 请求超时(50ms)')
  })
})
