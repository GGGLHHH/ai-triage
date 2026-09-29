import type { Sex } from '../types'

type Vec3 = [number, number, number]

// 一个几何块。region 对应 body-data 的部位 id;同一部位可以有多块(左右对称、前后拼接)。
// 部位粒度跟知识库文档走:文档没单独讲的五官并进面部、腋下并进胳膊;脖子、臀部文档没覆盖,不给 region = 不可点。
export interface BodyPart {
  key: string
  region?: string
  // sphere: [r] | capsule: [r, length] | sector: [rTop, rBottom, height, thetaStart, thetaLength]
  // dome(球面的一片): [r, phiStart, phiLength, thetaStart, thetaLength]
  shape: 'sphere' | 'capsule' | 'sector' | 'dome'
  args: number[]
  position: Vec3
  rotation?: Vec3
  scale?: Vec3
  color?: string // 不填用肤色
}

// 人面朝 +z(朝镜头)。three 的 cylinder theta=0 在 +z、往 +x 增加;人的左侧在 +x(镜头看是右边)。
type Arc = [start: number, length: number]
const FRONT_LEFT: Arc = [0, Math.PI / 2]
const FRONT_RIGHT: Arc = [Math.PI * 1.5, Math.PI / 2]
const BACK: Arc = [Math.PI / 2, Math.PI]
const FRONT: Arc = [Math.PI * 1.5, Math.PI]

const EYE = '#3f3a36'
const LIP = '#e58b8b'
const HAIR = '#5a463b'

// 头部球面:three 的 sphere phi=π/2 在 +z(脸朝向),theta 从头顶 0 往下到 π。发际线在 theta≈0.3π
const HAIRLINE = Math.PI * 0.3

// 躯干一段:按 左前 / 右前 / 背面 切成三块扇形柱
function band(name: string, y: number, h: number, rTop: number, rBottom: number, left: string, right: string, back: string): BodyPart[] {
  const sector = (key: string, region: string, arc: Arc): BodyPart => ({
    key: `${name}-${key}`,
    region,
    shape: 'sector',
    args: [rTop, rBottom, h, ...arc],
    position: [0, y, 0],
  })
  return [sector('fl', left, FRONT_LEFT), sector('fr', right, FRONT_RIGHT), sector('b', back, BACK)]
}

// 左右镜像:x 取反,绕 z 的倾斜也取反
function pair(part: BodyPart): BodyPart[] {
  const [x, y, z] = part.position
  const [rx, ry, rz] = part.rotation ?? [0, 0, 0]
  return [
    { ...part, key: `${part.key}-l`, position: [x, y, z], rotation: [rx, ry, rz] },
    { ...part, key: `${part.key}-r`, position: [-x, y, z], rotation: [rx, -ry, -rz] },
  ]
}

// ponytail: 手摆的卡通比例(头偏大),不追求解剖准确;要换写实模型时只需保证网格按 region 命名。
export function bodyParts(sex: Sex): BodyPart[] {
  const female = sex === 'female'
  const shoulderX = female ? 0.185 : 0.2

  return [
    // 头颈
    { key: 'face', region: 'face', shape: 'dome', args: [0.15, 0, Math.PI, HAIRLINE, Math.PI - HAIRLINE], position: [0, 1.6, 0] },
    { key: 'scalp-top', region: 'scalp', shape: 'dome', args: [0.152, 0, Math.PI * 2, 0, HAIRLINE], position: [0, 1.6, 0], color: HAIR },
    { key: 'scalp-back', region: 'scalp', shape: 'dome', args: [0.152, Math.PI, Math.PI, HAIRLINE, Math.PI - HAIRLINE], position: [0, 1.6, 0], color: HAIR },
    ...pair({ key: 'eye', region: 'face', shape: 'sphere', args: [0.024], position: [0.052, 1.625, 0.133], color: EYE }),
    ...pair({ key: 'ear', region: 'face', shape: 'sphere', args: [0.035], position: [0.15, 1.6, 0], scale: [0.45, 1, 0.8] }),
    { key: 'nose', region: 'face', shape: 'sphere', args: [0.02], position: [0, 1.59, 0.15] },
    { key: 'mouth', region: 'face', shape: 'capsule', args: [0.011, 0.045], position: [0, 1.545, 0.138], rotation: [0, 0, Math.PI / 2], color: LIP },
    { key: 'neck-f', shape: 'sector', args: [0.06, 0.065, 0.09, ...FRONT], position: [0, 1.425, 0] },
    { key: 'neck-b', shape: 'sector', args: [0.06, 0.065, 0.09, ...BACK], position: [0, 1.425, 0] },

    // 躯干:胸 / 腹 / 盆;前后分开(胸部、腹部 vs 背部、臀部)
    ...band('chest', 1.25, 0.26, female ? 0.175 : 0.19, 0.16, 'breast', 'breast', 'back'),
    ...(female ? pair({ key: 'breast', region: 'breast', shape: 'sphere', args: [0.058], position: [0.075, 1.27, 0.15] }) : []),
    ...band('abd-up', 1.05, 0.14, 0.16, 0.155, 'abdomen', 'abdomen', 'back'),
    ...band('abd-low', 0.92, 0.12, 0.155, female ? 0.165 : 0.155, 'abdomen', 'abdomen', 'back'),
    { key: 'pelvis-f', region: 'abdomen', shape: 'sector', args: [female ? 0.165 : 0.155, female ? 0.195 : 0.175, 0.14, ...FRONT], position: [0, 0.79, 0] },
    { key: 'pelvis-b', shape: 'sector', args: [female ? 0.165 : 0.155, female ? 0.195 : 0.175, 0.14, ...BACK], position: [0, 0.79, 0] },
    female
      ? { key: 'genital', region: 'privateFemale', shape: 'sphere', args: [0.03], position: [0, 0.725, 0.165], scale: [1, 0.6, 0.5] }
      : { key: 'genital', region: 'privateMale', shape: 'sphere', args: [0.035], position: [0, 0.72, 0.155] },

    // 上肢
    ...pair({ key: 'armpit', region: 'arm', shape: 'sphere', args: [0.034], position: [shoulderX - 0.012, 1.275, 0.015] }),
    ...pair({ key: 'shoulder', region: 'arm', shape: 'sphere', args: [0.07], position: [shoulderX, 1.36, 0] }),
    ...pair({ key: 'upper-arm', region: 'arm', shape: 'capsule', args: [0.05, 0.18], position: [shoulderX + 0.035, 1.2, 0], rotation: [0, 0, 0.12] }),
    ...pair({ key: 'elbow', region: 'arm', shape: 'sphere', args: [0.048], position: [shoulderX + 0.06, 1.06, 0] }),
    ...pair({ key: 'forearm', region: 'arm', shape: 'capsule', args: [0.044, 0.17], position: [shoulderX + 0.075, 0.91, 0.01], rotation: [0, 0, 0.06] }),
    ...pair({ key: 'hand', region: 'hand', shape: 'sphere', args: [0.05], position: [shoulderX + 0.09, 0.75, 0.015], scale: [0.75, 1.25, 0.5] }),

    // 下肢
    ...pair({ key: 'thigh', region: 'leg', shape: 'capsule', args: [0.078, 0.22], position: [0.09, 0.6, 0] }),
    ...pair({ key: 'knee', region: 'leg', shape: 'sphere', args: [0.066], position: [0.09, 0.42, 0.005] }),
    ...pair({ key: 'calf', region: 'leg', shape: 'capsule', args: [0.058, 0.2], position: [0.09, 0.24, 0] }),
    ...pair({ key: 'foot', region: 'leg', shape: 'capsule', args: [0.045, 0.1], position: [0.09, 0.045, 0.05], rotation: [Math.PI / 2, 0, 0] }),
  ]
}
