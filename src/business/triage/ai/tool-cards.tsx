import type { EmergencyInput, KnowledgeInput, MarkInput, RecommendInput, SummaryInput, ToolCallPart } from './tool-inputs'

import { Badge } from '@gedatou/cadenza-ui'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { regionById, symptomById } from '../body/body-data'
import { DepartmentCard } from '../department-card'
import { IconBubble } from '../icon-bubble'
import { departmentById } from '../mock-data'
import { inputOf } from './tool-inputs'

export function MarkBodyCard({ part }: { part: ToolCallPart }) {
  const { regionIds = [], symptomIds = [] } = inputOf<MarkInput>(part)
  const labels = [
    ...regionIds.flatMap(id => regionById.get(id)?.common ?? []),
    ...symptomIds.flatMap(id => symptomById.get(id)?.name ?? []),
  ]
  return (
    <div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
      <span className='i-fluent-color-person-24 pointer-events-none size-4' />
      <span>已在人体图标出</span>
      {labels.map(label => (
        <Badge
          key={label}
          variant='secondary'
        >
          {label}
        </Badge>
      ))}
    </div>
  )
}

export function EmergencyCard({ part }: { part: ToolCallPart }) {
  const { reason } = inputOf<EmergencyInput>(part)
  return (
    <Alert variant='destructive'>
      <AlertTitle className='flex items-center gap-1.5'>
        <span className='i-fluent-color-warning-24 pointer-events-none size-5' />
        请立即就医(急诊 / 拨打 120)
      </AlertTitle>
      <AlertDescription>{reason ?? '…'}</AlertDescription>
    </Alert>
  )
}

export function RecommendCard({ part }: { part: ToolCallPart }) {
  const { departmentIds = [], reason } = inputOf<RecommendInput>(part)
  return (
    <div className='flex flex-col gap-3'>
      {reason !== undefined && <p className='text-sm text-muted-foreground'>{reason}</p>}
      {departmentIds.flatMap(id => departmentById.get(id) ?? []).map(department => (
        <DepartmentCard
          key={department.id}
          match={{ department, hits: [] }}
        />
      ))}
    </div>
  )
}

export function SummaryCard({ part }: { part: ToolCallPart }) {
  const { chiefComplaint, presentIllness, pastHistory, riskFlags } = inputOf<SummaryInput>(part)
  const rows: [string, string | undefined][] = [
    ['主诉', chiefComplaint],
    ['现病史', presentIllness],
    ['既往史', pastHistory],
    ['危险信号', riskFlags],
  ]
  return (
    <Card
      size='sm'
      className='shadow-(--triage-shadow) ring-border'
    >
      <CardHeader className='flex items-center gap-3'>
        <IconBubble
          icon='i-fluent-color-document-text-24'
          tone='violet'
          size='sm'
        />
        <CardTitle className='font-semibold'>预问诊摘要(供接诊医生参考)</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className='grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-2 text-sm'>
          {rows.filter(([, value]) => value !== undefined && value !== '').map(([label, value]) => (
            <div
              key={label}
              className='contents'
            >
              <dt className='text-muted-foreground'>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

export function KnowledgeCard({ part }: { part: ToolCallPart }) {
  const { query } = inputOf<KnowledgeInput>(part)
  return (
    <div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
      <span>查阅科室资料</span>
      {query !== undefined && (
        <Badge variant='secondary'>{query}</Badge>
      )}
    </div>
  )
}
