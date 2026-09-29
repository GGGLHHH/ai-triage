// 把 ICT-FaceKit 的 generic_neutral_mesh.obj 精简成页面用的 src/business/triage/body/ict-face.obj:
// 只留脸、后脑、眼球(巩膜 / 虹膜),去掉 UV、牙齿、睫毛等,四边形拆三角,顶点重新编号、保留三位小数。
// 用法: node scripts/ict-face.ts <path/to/generic_neutral_mesh.obj>
// 源: https://github.com/USC-ICT/ICT-FaceKit (MIT)
import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'

const KEEP: Record<string, string | undefined> = {
  M_Face: 'face',
  M_BackHead: 'head',
  M_ScleraLeft: 'sclera',
  M_ScleraRight: 'sclera',
  M_IrisLeft: 'iris',
  M_IrisRight: 'iris',
}

const source = process.argv[2]
if (source === undefined) {
  throw new Error('用法: node scripts/ict-face.ts <generic_neutral_mesh.obj>')
}

const vertices: string[] = []
const parts = new Map<string, number[][]>()
let part: string | undefined
for (const line of readFileSync(source, 'utf8').split('\n')) {
  const [kind, ...rest] = line.trim().split(/\s+/)
  if (kind === 'v') {
    vertices.push(rest.slice(0, 3).map(n => Number(Number(n).toFixed(3))).join(' '))
  }
  else if (kind === 'usemtl') {
    part = KEEP[rest[0] ?? '']
  }
  else if (kind === 'f' && part !== undefined) {
    const ids = rest.map(ref => Number(ref.split('/')[0]) - 1)
    const tris = parts.get(part) ?? []
    for (let i = 1; i < ids.length - 1; i++) {
      tris.push([ids[0], ids[i], ids[i + 1]])
    }
    parts.set(part, tris)
  }
}

// 巩膜是整球,正前方那片盖住了虹膜(原版靠贴图画虹膜),去掉最前面 0.25cm 的球冠
const zOf = (id: number) => Number(vertices[id].split(' ')[2])
const sclera = parts.get('sclera') ?? []
const front = Math.max(...sclera.flat().map(zOf)) - 0.25
parts.set('sclera', sclera.filter(tri => tri.some(id => zOf(id) < front)))

const remap = new Map<number, number>()
const out = [
  '# ICT-FaceKit generic neutral mesh, MIT License, Copyright (c) 2020 USC Institute for Creative Technologies',
  '# https://github.com/USC-ICT/ICT-FaceKit — trimmed by scripts/ict-face.ts',
]
const faces: string[] = []
for (const [name, tris] of parts) {
  faces.push(`g ${name}`)
  for (const tri of tris) {
    faces.push(`f ${tri.map((id) => {
      if (!remap.has(id)) {
        remap.set(id, remap.size)
        out.push(`v ${vertices[id]}`)
      }
      return remap.get(id)! + 1
    }).join(' ')}`)
  }
}
writeFileSync(new URL('../src/business/triage/body/ict-face.obj', import.meta.url), `${[...out, ...faces].join('\n')}\n`)
console.log(`${remap.size} vertices, ${[...parts].map(([n, t]) => `${n} ${t.length}`).join(', ')} triangles`)
