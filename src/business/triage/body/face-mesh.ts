import { Box3, BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'

import objText from './ict-face.obj?raw'

// ICT-FaceKit 通用中性脸(MIT,scripts/ict-face.ts 精简):单位厘米,鼻尖朝 +z,y 朝上,左右对称。
// 分组 face / head(后脑、耳、颈)/ sclera / iris。部位按表面点的 x/y 判断,JS(点击)和着色器(逐像素上色)
// 共用下面这组参数,边界是平滑曲线、不受三角面形状影响。参数取自 68 点 iBUG 关键点(注释里是编号)。

export const FACE_REGIONS = ['forehead', 'eye', 'nose', 'cheek', 'mouth'] as const
export type FaceRegion = typeof FACE_REGIONS[number]

export const PARTS = ['face', 'head', 'sclera', 'iris'] as const

// 下颌轮廓 8→16(|x|, y),以下是脖子
const JAW = [[0, -7.57], [1.54, -7.26], [3.05, -6.91], [4.3, -6.21], [5.72, -4.49], [6.56, -2.36], [6.94, -0.46], [7.28, 1.49], [7.36, 3.68]] as const
const EAR_X = 7.4 // 颧弓 0/16 x≈7.4 以外是耳前
// 鼻:鼻底 33 y≈-1.2 到眉间,上窄下宽(鼻翼 31/35 外缘)
const NOSE = { bottom: -1.6, top: 5, wBottom: 2, wTop: 0.9 }
// 眼周:以眼中心为心的椭圆,上到眉峰 19/24 y≈6.3,下留出眼袋
const EYE = { cx: 3.2, cy: 4.3, rx: 2.9, ry: 2.4 }
// 口周与下巴:一个椭圆,嘴角 48/54 x≈2.5、下巴 8 y≈-7.6(被下颌线截断)
const MOUTH = { cy: -4.8, rx: 3.8, ry: 3.4 }
const FOREHEAD_Y = 5

function jawY(ax: number): number {
  const i = JAW.findIndex(([x]) => x >= ax)
  if (i <= 0) {
    return i === 0 ? JAW[0][1] : -Infinity
  }
  const [[x0, y0], [x1, y1]] = [JAW[i - 1], JAW[i]]
  return y0 + (y1 - y0) * (ax - x0) / (x1 - x0)
}

export function regionAt(x: number, y: number): FaceRegion | null {
  const ax = Math.abs(x)
  if (ax > EAR_X || y < jawY(ax) - 0.3) {
    return null
  }
  const t = (y - NOSE.bottom) / (NOSE.top - NOSE.bottom)
  if (t > 0 && t < 1 && ax < NOSE.wBottom + (NOSE.wTop - NOSE.wBottom) * t) {
    return 'nose'
  }
  if (((ax - EYE.cx) / EYE.rx) ** 2 + ((y - EYE.cy) / EYE.ry) ** 2 < 1) {
    return 'eye'
  }
  if ((ax / MOUTH.rx) ** 2 + ((y - MOUTH.cy) / MOUTH.ry) ** 2 < 1) {
    return 'mouth'
  }
  return y > FOREHEAD_Y ? 'forehead' : 'cheek'
}

// 同一套判断的 GLSL 版:返回 FACE_REGIONS 下标,-1 = 不属于任何部位
const f = (n: number) => n.toFixed(3)
export const REGION_GLSL = /* glsl */ `
int regionAt(vec2 p) {
  float ax = abs(p.x);
  float jaw = -1e9;
  ${JAW.slice(1).map(([x1, y1], i) => {
    const [x0, y0] = JAW[i]
    return `if (ax >= ${f(x0)} && ax <= ${f(x1)}) jaw = ${f(y0)} + (${f(y1 - y0)}) * (ax - ${f(x0)}) / ${f(x1 - x0)};`
  }).join('\n  ')}
  if (ax > ${f(EAR_X)} || p.y < jaw - 0.3) return -1;
  float t = (p.y - (${f(NOSE.bottom)})) / ${f(NOSE.top - NOSE.bottom)};
  if (t > 0.0 && t < 1.0 && ax < ${f(NOSE.wBottom)} + (${f(NOSE.wTop - NOSE.wBottom)}) * t) return ${FACE_REGIONS.indexOf('nose')};
  vec2 e = vec2((ax - ${f(EYE.cx)}) / ${f(EYE.rx)}, (p.y - ${f(EYE.cy)}) / ${f(EYE.ry)});
  if (dot(e, e) < 1.0) return ${FACE_REGIONS.indexOf('eye')};
  vec2 m = vec2(ax / ${f(MOUTH.rx)}, (p.y - (${f(MOUTH.cy)})) / ${f(MOUTH.ry)});
  if (dot(m, m) < 1.0) return ${FACE_REGIONS.indexOf('mouth')};
  return p.y > ${f(FOREHEAD_Y)} ? ${FACE_REGIONS.indexOf('forehead')} : ${FACE_REGIONS.indexOf('cheek')};
}
`

// 一个 geometry,按 PARTS 分 group(materialIndex = PARTS 下标),保留模型原坐标(着色器和点击都按它判断部位);
// faceCenter / faceSize 是可点部分的包围盒,给摆放和取景用(模型带脖子和肩,按整体取景脸太小)。
export function faceGeometry(): { geometry: BufferGeometry, faceCenter: Vector3, faceSize: Vector3 } {
  const vertices: number[][] = []
  const buckets = PARTS.map(() => [] as number[])
  const face = new Box3()
  let part = -1
  for (const line of objText.split('\n')) {
    const [kind, ...rest] = line.trim().split(/\s+/)
    if (kind === 'v') {
      vertices.push(rest.map(Number))
    }
    else if (kind === 'g') {
      part = PARTS.indexOf(rest[0] as typeof PARTS[number])
    }
    else if (kind === 'f') {
      const tri = rest.map(id => Number(id) - 1)
      buckets[part].push(...tri)
      for (const i of part === 0 ? tri : []) {
        const [x, y, z] = vertices[i]
        if (regionAt(x, y) !== null) {
          face.expandByPoint(new Vector3(x, y, z))
        }
      }
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices.flat(), 3))
  geometry.setIndex(buckets.flat())
  let start = 0
  buckets.forEach((indices, materialIndex) => {
    geometry.addGroup(start, indices.length, materialIndex)
    start += indices.length
  })
  geometry.computeVertexNormals()
  return { geometry, faceCenter: face.getCenter(new Vector3()), faceSize: face.getSize(new Vector3()) }
}
