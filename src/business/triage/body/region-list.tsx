import { Button } from '@gedatou/cadenza-ui'

import { regions } from './body-data'

// 2D 兜底:无 WebGL 或用户切到列表时用,数据与 3D 同源
export function RegionList({ active, marked, onSelect }: {
  active: string | null
  marked: ReadonlySet<string>
  onSelect: (region: string) => void
}) {
  return (
    <div className='grid grid-cols-3 content-start gap-2 overflow-y-auto p-4'>
      {regions.map(region => (
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
  )
}
