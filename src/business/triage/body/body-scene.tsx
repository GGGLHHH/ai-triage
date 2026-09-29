import type { ThreeEvent } from '@react-three/fiber'
import type { Sex } from '../types'
import type { BodyPart } from './body-parts'

import { OrbitControls, Outlines } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useMemo, useRef } from 'react'

import { bodyParts } from './body-parts'

const SKIN = '#f7c9a8'
const HOVER = '#c7d2fe' // 品牌蓝系:悬停最浅
const MARKED = '#8ea5fb' // 已选 / AI 标出
const ACTIVE = '#4a6cf7' // 当前部位 = 品牌蓝
const OUTLINE = '#8a5a44'

// 拖动旋转松手时也会触发 click。不能用 R3F 的 e.delta 判断:OrbitControls 捕获了指针,
// 从人体上开始拖动时 delta 依然很小,会误选起点部位。改看这次按下后视角有没有真的转过。

export interface PointerAt { x: number, y: number }

interface BodySceneProps {
  sex: Sex
  hovered: string | null
  active: string | null
  marked: ReadonlySet<string> // 已选了症状的部位
  onHover: (region: string | null, at?: PointerAt) => void
  onSelect: (region: string, at: PointerAt) => void
}

export function BodyScene(props: BodySceneProps) {
  const parts = useMemo(() => bodyParts(props.sex), [props.sex])
  const rotatedRef = useRef(false)
  const onSelect: BodySceneProps['onSelect'] = (region, at) => {
    if (!rotatedRef.current) {
      props.onSelect(region, at)
    }
  }

  return (
    <Canvas
      camera={{ position: [0, 0.9, 3.4], fov: 35 }}
      dpr={[1, 2]}
      onPointerMissed={() => props.onHover(null)}
    >
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[2, 3, 4]}
        intensity={1.3}
      />
      <directionalLight
        position={[-2, 2, -3]}
        intensity={0.6}
      />
      {parts.map(part => (
        <PartMesh
          key={part.key}
          part={part}
          {...props}
          onSelect={onSelect}
        />
      ))}
      <OrbitControls
        onStart={() => {
          rotatedRef.current = false
        }}
        onChange={() => {
          rotatedRef.current = true
        }}
        target={[0, 0.88, 0]}
        enablePan={false}
        minDistance={0.7}
        maxDistance={3.4}
        minPolarAngle={Math.PI * 0.25}
        maxPolarAngle={Math.PI * 0.75}
      />
    </Canvas>
  )
}

function PartMesh({ part, hovered, active, marked, onHover, onSelect }: BodySceneProps & { part: BodyPart }) {
  const at = (e: ThreeEvent<PointerEvent | MouseEvent>): PointerAt => ({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })
  const color = part.region === active
    ? ACTIVE
    : part.region === hovered
      ? HOVER
      : marked.has(part.region) ? MARKED : (part.color ?? SKIN)

  return (
    <mesh
      position={part.position}
      rotation={part.rotation}
      scale={part.scale}
      onPointerMove={(e) => {
        e.stopPropagation()
        onHover(part.region, at(e))
      }}
      onPointerOut={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(part.region, at(e))
      }}
    >
      <PartGeometry part={part} />
      <meshToonMaterial color={color} />
      <Outlines
        thickness={0.006}
        color={OUTLINE}
      />
    </mesh>
  )
}

function PartGeometry({ part }: { part: BodyPart }) {
  const [a = 0, b = 0, c = 0, d = 0, e = 0] = part.args
  switch (part.shape) {
    case 'sphere':
      return <sphereGeometry args={[a, 32, 16]} />
    case 'capsule':
      return <capsuleGeometry args={[a, b, 8, 16]} />
    case 'sector':
      return <cylinderGeometry args={[a, b, c, 32, 1, false, d, e]} />
    case 'dome':
      // 面部 + 头顶 + 后脑三片正好拼成闭合球面,单面材质即可
      return <sphereGeometry args={[a, 32, 16, b, c, d, e]} />
  }
}
