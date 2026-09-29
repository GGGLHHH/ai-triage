import type { Department, DepartmentMatch, Doctor, Slot } from './types'

import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { doctorsWithSlots } from './engine'

const DAY_LABELS = ['今天', '明天', '后天']
const PERIOD_LABELS: Record<Slot['period'], string> = { am: '上午', pm: '下午', night: '晚上' }

function slotTime(slot: Slot): string {
  return `${DAY_LABELS[slot.dayOffset] ?? `+${slot.dayOffset}天`}${PERIOD_LABELS[slot.period]}`
}

interface SlotBadgeProps {
  department: Department
  doctor: Doctor
  slot: Slot
}

// 号源标签:有号可点,点了弹 toast;约满禁用。
// ponytail: demo 只提示,接挂号时在 handleSelect 里换成跳转预约或调接口
function SlotBadge({ department, doctor, slot }: SlotBadgeProps) {
  const full = slot.remaining <= 0

  function handleSelect() {
    toast.success(`已选择 ${doctor.name} ${slotTime(slot)}`, {
      description: `${department.name} · ${doctor.title},剩余 ${slot.remaining} 个号`,
    })
  }

  return (
    <Badge
      variant={full ? 'secondary' : 'outline'}
      className='cursor-pointer hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-secondary'
      render={(
        <button
          type='button'
          disabled={full}
          onClick={handleSelect}
        />
      )}
    >
      {`${slotTime(slot)} · ${full ? '约满' : `余${slot.remaining}`}`}
    </Badge>
  )
}

export function DepartmentCard({ match }: { match: DepartmentMatch }) {
  const { department, hits } = match

  return (
    <Card size='sm'>
      <CardHeader>
        <CardTitle>{department.name}</CardTitle>
        <CardDescription>{department.intro}</CardDescription>
        <div className='flex flex-wrap gap-1'>
          {hits.map(hit => (
            <Badge
              key={hit}
              variant='secondary'
            >
              {hit}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className='flex flex-col gap-3'>
        {doctorsWithSlots(department.id).map(({ doctor, slots }) => (
          <div
            key={doctor.id}
            className='flex flex-col gap-1.5 border-t pt-3 text-sm'
          >
            <div>
              <span className='font-medium'>{doctor.name}</span>
              <span className='ml-2 text-muted-foreground'>{doctor.title}</span>
            </div>
            <div className='text-xs text-muted-foreground'>{`擅长:${doctor.specialty}`}</div>
            <div className='flex flex-wrap gap-1.5'>
              {slots.map(slot => (
                <SlotBadge
                  key={`${slot.dayOffset}-${slot.period}`}
                  department={department}
                  doctor={doctor}
                  slot={slot}
                />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
