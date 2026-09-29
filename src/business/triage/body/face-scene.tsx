import type { ThreeEvent } from '@react-three/fiber'

import { Bounds, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, MeshStandardMaterial } from 'three'

import { FACE_REGIONS, faceGeometry, PARTS, REGION_GLSL, regionAt } from './face-mesh'

const SKIN = '#f7c9a8'
const HOVER = '#c7d2fe' // 品牌蓝系:悬停最浅
const MARKED = '#8ea5fb' // 已选了诉求
const ACTIVE = '#4a6cf7' // 当前部位 = 品牌蓝

// 拖动旋转松手时也会触发 click。不能用 R3F 的 e.delta 判断:OrbitControls 捕获了指针,
// 从脸上开始拖动时 delta 依然很小,会误选起点部位。改看这次按下后视角有没有真的转过。

// 脸的材质:部位颜色逐像素算(着色器里跑 face-mesh 的 regionAt),边界是平滑曲线,不沿三角面走锯齿
function faceMaterial(regionColors: Color[]): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ color: SKIN, roughness: 0.75 })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.regionColors = { value: regionColors }
    shader.vertexShader = `varying vec2 vFacePos;\n${shader.vertexShader}`
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFacePos = position.xy;')
    shader.fragmentShader = `varying vec2 vFacePos;\nuniform vec3 regionColors[${FACE_REGIONS.length}];\n${REGION_GLSL}\n${shader.fragmentShader}`
      .replace('#include <color_fragment>', '#include <color_fragment>\nint region = regionAt(vFacePos);\nif (region >= 0) diffuseColor.rgb = regionColors[region];')
  }
  return material
}

// 命中点换回模型坐标判断部位;点到眼球(巩膜 / 虹膜)也算眼周
function regionOfHit(e: ThreeEvent<PointerEvent | MouseEvent>): string | null {
  const part = PARTS[e.face?.materialIndex ?? -1]
  if (part === 'face') {
    const { x, y } = e.object.worldToLocal(e.point.clone())
    return regionAt(x, y)
  }
  return part === 'sclera' || part === 'iris' ? 'eye' : null
}

export interface PointerAt { x: number, y: number }

interface FaceSceneProps {
  hovered: string | null
  active: string | null
  marked: ReadonlySet<string> // 已选了诉求的部位
  onHover: (region: string | null, at?: PointerAt) => void
  onSelect: (region: string, at: PointerAt) => void
}

export function FaceScene({ hovered, active, marked, onHover, onSelect }: FaceSceneProps) {
  const { geometry, faceCenter, faceSize } = useMemo(faceGeometry, [])
  const regionColors = useMemo(() => FACE_REGIONS.map(() => new Color(SKIN)), [])
  const material = useMemo(() => faceMaterial(regionColors), [regionColors])
  const rotatedRef = useRef(false)

  const hit = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    e.stopPropagation()
    return {
      region: regionOfHit(e),
      at: { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY },
    }
  }
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    const { region, at } = hit(e)
    onHover(region, at)
  }
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    const { region, at } = hit(e)
    if (region !== null && !rotatedRef.current) {
      onSelect(region, at)
    }
  }
  const handleRotateStart = () => {
    rotatedRef.current = false
  }
  const handleRotate = () => {
    rotatedRef.current = true
  }

  const colorOf = (region: string) => region === active
    ? ACTIVE
    : region === hovered
      ? HOVER
      : marked.has(region) ? MARKED : SKIN
  useEffect(() => {
    FACE_REGIONS.forEach((region, i) => regionColors[i].set(colorOf(region)))
  })

  return (
    <Canvas
      camera={{ position: [0, 0, 42], fov: 35 }}
      dpr={[1, 2]}
      onPointerMissed={() => onHover(null)}
    >
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[4, 6, 10]}
        intensity={1.4}
      />
      <directionalLight
        position={[-6, 2, 6]}
        intensity={0.5}
      />
      {/* 按脸的大小和画布宽高自动取景;observe 只在画布尺寸变了(窗口缩放)时重新取景 */}
      <Bounds
        fit
        clip
        observe
        margin={1.15}
      >
        <mesh visible={false}>
          <boxGeometry args={faceSize.toArray()} />
        </mesh>
      </Bounds>
      <mesh
        geometry={geometry}
        position={faceCenter.clone().negate()}
        onPointerMove={handlePointerMove}
        onPointerOut={() => onHover(null)}
        onClick={handleClick}
      >
        <primitive
          object={material}
          attach='material-0'
        />
        <meshStandardMaterial
          attach='material-1'
          color={SKIN}
          roughness={0.75}
        />
        <meshStandardMaterial
          attach='material-2'
          color='#f2eee9'
          roughness={0.3}
        />
        <meshStandardMaterial
          attach='material-3'
          color='#4a3326'
          roughness={0.3}
        />
      </mesh>
      <OrbitControls
        makeDefault
        onStart={handleRotateStart}
        onChange={handleRotate}
        enablePan={false}
        minDistance={20}
        maxDistance={120}
        minPolarAngle={Math.PI * 0.3}
        maxPolarAngle={Math.PI * 0.7}
      />
    </Canvas>
  )
}
