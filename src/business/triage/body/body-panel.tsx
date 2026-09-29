import type { Sex, Symptom } from '../types'
import type { PointerAt } from './body-scene'

import { Button } from '@gedatou/cadenza-ui'
import { IconRefresh } from '@tabler/icons-react'
import { useRef, useState } from 'react'

import { cn } from '@/lib/utils'

import { IconBubble } from '../icon-bubble'

import { regionById, symptomById, symptomsOf, WHOLE_BODY } from './body-data'
import { BodyScene } from './body-scene'
import { RegionList } from './region-list'

const TOOLTIP_WIDTH = 150

const MODES = [['3d', '3D 人体'], ['list', '部位列表']] as const

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
  active: string | null // 当前点开的部位;要随消息发给 AI,所以由页面持有
  onActiveChange: (region: string | null) => void
  onReset: () => void
}

// 左栏:3D 人体(或 2D 列表)+ 当前部位的症状选择。只管「选」,发送与对话在页面层。
// 视角、hover、3D/列表 这些面板内状态靠页面换 key 重挂来重置(见 TriagePage.resetBody)。
export function BodyPanel({ sex, onSexChange, picked, onToggle, active, onActiveChange: setActive, onReset }: BodyPanelProps) {
  const [mode, setMode] = useState<'3d' | 'list'>(() => (hasWebGL() ? '3d' : 'list'))
  const [hover, setHover] = useState<{ region: string, at: PointerAt } | null>(null)
  const viewerRef = useRef<HTMLDivElement>(null)

  const marked = new Set(picked.flatMap(id => symptomById.get(id)?.regionId ?? []))
  const activeRegion = active === null ? undefined : regionById.get(active)
  const tooltip = hover === null ? undefined : regionById.get(hover.region)
  const activeSymptoms = activeRegion ? symptomsOf(activeRegion.id, sex) : []
  const viewerWidth = viewerRef.current?.clientWidth ?? 0

  return (
    <div className='flex h-full flex-col'>
      <header className='flex h-14 shrink-0 items-center gap-2.5 px-4'>
        <IconBubble
          icon='i-fluent-color-person-24'
          size='sm'
        />
        <h2 className='font-semibold'>想改善哪里</h2>
        {/* 胶囊开关,照小程序顶部「English / 关怀版」那一对 */}
        <div
          role='radiogroup'
          aria-label='性别'
          className='ml-auto flex rounded-full bg-muted p-0.5'
        >
          {(['female', 'male'] as const).map(s => (
            <button
              key={s}
              type='button'
              role='radio'
              aria-checked={sex === s}
              className={cn(
                'h-7 rounded-full px-3.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                sex === s ? 'bg-primary font-medium text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => onSexChange(s)}
            >
              {s === 'female' ? '女' : '男'}
            </button>
          ))}
        </div>
      </header>

      {/* 视图切换做成带下划线的页签,照小程序「门诊 / 住院 / 体检」那一排 */}
      <div className='flex shrink-0 items-end gap-5 border-b px-4'>
        {MODES.map(([value, label]) => (
          <button
            key={value}
            type='button'
            aria-pressed={mode === value}
            className={cn(
              'relative pb-2.5 text-sm transition-colors focus-visible:text-primary focus-visible:outline-none',
              mode === value
                ? 'font-semibold text-primary after:absolute after:inset-x-1/4 after:bottom-0 after:h-0.75 after:rounded-full after:bg-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setMode(value)}
          >
            {label}
          </button>
        ))}
        <Button
          size='xs'
          variant='ghost'
          className='mb-1.5 ml-auto text-muted-foreground'
          onClick={onReset}
        >
          <IconRefresh />
          重置
        </Button>
      </div>

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
                  className='absolute bottom-3 left-3 rounded-full bg-card'
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

      <section className='flex max-h-[35%] shrink-0 flex-col gap-3 overflow-y-auto border-t bg-background p-4'>
        {activeRegion
          ? (
              <>
                <h3 className='flex items-baseline gap-2'>
                  <span className='font-semibold'>{activeRegion.common}</span>
                  <span className='text-xs text-muted-foreground'>{activeRegion.formal}</span>
                </h3>
                {/* 诉求只收知识库覆盖的(concerns.md),有的部位暂时一条都没有 */}
                <div className='flex flex-wrap gap-2'>
                  {activeSymptoms.map(symptom => (
                    <Button
                      key={symptom.id}
                      size='sm'
                      variant={picked.includes(symptom.id) ? 'default' : 'outline'}
                      className='rounded-full'
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
