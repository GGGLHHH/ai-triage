import { describe, expect, it } from 'vitest'

import { faceGeometry, PARTS, REGION_GLSL, regionAt } from './face-mesh'

describe('face mesh', () => {
  // ICT 关键点坐标(iBUG 68 点,见 ict-face.obj):眉峰 19 上方、上眼睑 37、鼻尖 30、面颊、嘴角 48、下巴 8、下巴以下、耳前
  it.each([
    ['forehead', 0, 9],
    ['eye', -3.87, 3.87],
    ['nose', 0, 0.41],
    ['cheek', -4.5, -1],
    ['mouth', -2.53, -3.52],
    ['mouth', 0, -7.57],
    [null, 0, -10],
    [null, 7.5, 2],
  ] as const)('%s at (%f, %f)', (region, x, y) => {
    expect(regionAt(x, y)).toBe(region)
  })

  it('groups the mesh by part and frames the clickable face', () => {
    const { geometry, faceSize } = faceGeometry()
    expect(geometry.groups.map(g => g.materialIndex)).toEqual(PARTS.map((_, i) => i))
    expect(geometry.groups.reduce((sum, g) => sum + g.count, 0)).toBe((18460 + 9608 + 2166 + 3192) * 3)
    expect(faceSize.x).toBeGreaterThan(12) // 两侧颧弓之间约 14.8cm
  })

  it('emits GLSL for the same regions', () => {
    expect(REGION_GLSL).toMatch(/int regionAt\(vec2 p\)/)
    expect(REGION_GLSL).not.toMatch(/NaN|undefined/)
  })
})
