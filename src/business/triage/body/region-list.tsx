import type { BodyRegion, Sex } from '../types'

import { Button } from '@gedatou/cadenza-ui'

import { regionsFor } from './body-data'

const GROUPS: BodyRegion['group'][] = ['头颈', '躯干', '四肢', '全身']

// 2D 兜底:无 WebGL 或用户切到列表时用,数据与 3D 同源
export function RegionList({ sex, active, marked, onSelect }: {
  sex: Sex
  active: string | null
  marked: ReadonlySet<string>
  onSelect: (region: string) => void
}) {
  const all = regionsFor(sex)

  return (
    <div className='flex h-full flex-col gap-4 overflow-y-auto p-4'>
      {GROUPS.map(group => (
        <section
          key={group}
          className='flex flex-col gap-2'
        >
          <h2 className='text-xs text-muted-foreground'>{group}</h2>
          <div className='grid grid-cols-3 gap-2'>
            {all.filter(r => r.group === group).map(region => (
              <Button
                key={region.id}
                variant={region.id === active ? 'default' : marked.has(region.id) ? 'secondary' : 'outline'}
                className='h-auto flex-col gap-0 rounded-xl py-2'
                onClick={() => onSelect(region.id)}
              >
                <span>{region.common}</span>
                <span className='text-[10px] font-normal opacity-70'>{region.formal}</span>
              </Button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
