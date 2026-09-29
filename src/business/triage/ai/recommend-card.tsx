import type { ToolRendererProps } from '@gedatou/cadenza-ai'

import { toolInput } from '@gedatou/cadenza-ai'

import { DepartmentCard } from '../department-card'
import { departmentById } from '../mock-data'

interface RecommendInput { departmentIds: string[], reason: string }

// recommend_departments 的卡片:推荐理由 + 每个门诊一张卡(医生与可点的号源)
export function RecommendCard({ part }: ToolRendererProps) {
  const { departmentIds, reason } = toolInput<RecommendInput>(part)
  return (
    <div className='flex flex-col gap-3'>
      {typeof reason === 'string' && <p className='text-sm text-muted-foreground'>{reason}</p>}
      {(departmentIds ?? []).flatMap(id => departmentById.get(id) ?? []).map(department => (
        <DepartmentCard
          key={department.id}
          match={{ department, hits: [] }}
        />
      ))}
    </div>
  )
}
