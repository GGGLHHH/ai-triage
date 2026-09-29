import type { Sex, Symptom } from '../types'
import type { PointerAt } from './body-scene'

import { Button } from '@gedatou/cadenza-ui'
import { useRef, useState } from 'react'

import { regionById, symptomById, symptomsOf, WHOLE_BODY } from './body-data'
import { BodyScene } from './body-scene'
import { RegionList } from './region-list'

const TOOLTIP_WIDTH = 150

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  }
  catch {
    return false
  }
}

interface BodyPanelProps {
  sex: Sex
  onSexChange: (sex: Sex) => void
  picked: readonly string[] // 患者手点选中的症状 id
  onToggle: (symptom: Symptom) => void
  aiMarked: ReadonlySet<string> // AI 从对话里标出的部位 id
  active: string | null // 当前点开的部位;要随消息发给 AI,所以由页面持有
  onActiveChange: (region: string | null) => void
  onReset: () => void
}

// 左栏:3D 人体(或 2D 列表)+ 当前部位的症状选择。只管「选」,发送与对话在页面层。
// 视角、hover、3D/列表 这些面板内状态靠页面换 key 重挂来重置(见 TriagePage.resetBody)。
export function BodyPanel({ sex, onSexChange, picked, onToggle, aiMarked, active, onActiveChange: setActive, onReset }: BodyPanelProps) {
  const [mode, setMode] = useState<'3d' | 'list'>(() => (hasWebGL() ? '3d' : 'list'))
  const [hover, setHover] = useState<{ region: string, at: PointerAt } | null>(null)
  const viewerRef = useRef<HTMLDivElement>(null)

  const marked = new Set([...aiMarked, ...picked.flatMap(id => symptomById.get(id)?.regionId ?? [])])
  const activeRegion = active === null ? undefined : regionById.get(active)
  const tooltip = hover === null ? undefined : regionById.get(hover.region)
  const viewerWidth = viewerRef.current?.clientWidth ?? 0

  return (
    <div className='flex h-full flex-col'>
      <header className='flex h-12 shrink-0 items-center gap-1 border-b px-3'>
        <h2 className='font-medium'>想改善哪里</h2>
        <div className='ml-auto flex gap-1'>
          {(['female', 'male'] as const).map(s => (
            <Button
              key={s}
              size='sm'
              variant={sex === s ? 'default' : 'outline'}
              onClick={() => onSexChange(s)}
            >
              {s === 'female' ? '女' : '男'}
            </Button>
          ))}
          <Button
            size='sm'
            variant='ghost'
            onClick={() => setMode(mode === '3d' ? 'list' : '3d')}
          >
            {mode === '3d' ? '列表' : '3D'}
          </Button>
          <Button
            size='sm'
            variant='ghost'
            onClick={onReset}
          >
            重置
          </Button>
        </div>
      </header>

      <div
        ref={viewerRef}
        className={`relative min-h-0 flex-1 ${hover ? 'cursor-pointer' : ''}`}
      >
        {mode === '3d'
          ? (
              <>
                <BodyScene
                  sex={sex}
                  hovered={hover?.region ?? null}
                  active={active}
                  marked={marked}
                  onHover={(region, at) => setHover(region !== null && at !== undefined ? { region, at } : null)}
                  onSelect={(region, at) => {
                    setActive(region)
                    setHover({ region, at })
                  }}
                />
                <p className='pointer-events-none absolute top-2 left-0 w-full text-center text-xs text-muted-foreground'>
                  拖动旋转 · 滚轮缩放 · 点击部位选择诉求
                </p>
                <Button
                  size='sm'
                  variant={active === WHOLE_BODY ? 'default' : 'outline'}
                  className='absolute bottom-3 left-3'
                  onClick={() => setActive(WHOLE_BODY)}
                >
                  全身 / 其他
                </Button>
                {tooltip && hover && (
                  <div
                    className='pointer-events-none absolute z-10 rounded-md bg-popover px-2.5 py-1.5 text-popover-foreground shadow-md ring-1 ring-foreground/10'
                    style={{
                      left: Math.max(4, Math.min(hover.at.x + 12, viewerWidth - TOOLTIP_WIDTH)),
                      top: hover.at.y + 12,
                      maxWidth: TOOLTIP_WIDTH,
                    }}
                  >
                    <div className='text-sm font-medium'>{tooltip.common}</div>
                    <div className='text-xs text-muted-foreground'>{tooltip.formal}</div>
                  </div>
                )}
              </>
            )
          : (
              <RegionList
                sex={sex}
                active={active}
                marked={marked}
                onSelect={setActive}
              />
            )}
      </div>

      <section className='flex max-h-[35%] shrink-0 flex-col gap-2 overflow-y-auto border-t p-3'>
        {activeRegion
          ? (
              <>
                <h3 className='text-sm'>
                  <span className='font-medium'>{activeRegion.common}</span>
                  <span className='ml-2 text-muted-foreground'>{activeRegion.formal}</span>
                </h3>
                <div className='flex flex-wrap gap-2'>
                  {symptomsOf(activeRegion.id, sex).map(symptom => (
                    <Button
                      key={symptom.id}
                      size='sm'
                      variant={picked.includes(symptom.id) ? 'default' : 'outline'}
                      onClick={() => onToggle(symptom)}
                    >
                      {symptom.name}
                    </Button>
                  ))}
                </div>
              </>
            )
          : <p className='text-sm text-muted-foreground'>点一下人体上想改善的地方,或者直接在右边跟小美说</p>}
      </section>
    </div>
  )
}
