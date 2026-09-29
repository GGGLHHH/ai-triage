import type { Sex, Symptom } from '#/business/triage/types'

import {
  Composer,
  ComposerSubmit,
  ComposerTextarea,
  ComposerToolbar,
  fetchServerSentEvents,
  Transcript,
  TranscriptEmpty,
  TranscriptError,
  TranscriptMessage,
  TranscriptPending,
  TranscriptProvider,
  useChat,
} from '@gedatou/cadenza-ai'
import { Badge, Button, MessageScrollerButton } from '@gedatou/cadenza-ui'
import { useMemo, useState } from 'react'

import { aiMarkedRegions } from '#/business/triage/ai/tool-inputs'
import { TriageParts } from '#/business/triage/ai/triage-parts'
import { regionById, symptomById } from '#/business/triage/body/body-data'
import { BodyPanel } from '#/business/triage/body/body-panel'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const SUGGESTIONS = ['脸上长了好多斑,越来越明显', '头发越来越少,发际线也高了', '有狐臭,夏天特别尴尬']

const SEX_LABEL: Record<Sex, string> = { female: '女', male: '男' }

function describe(symptom: Symptom): string {
  return `${regionById.get(symptom.regionId)?.common ?? ''}·${symptom.name}`
}

export function TriagePage() {
  const [sex, setSex] = useState<Sex>('female')
  const [picked, setPicked] = useState<string[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [sent, setSent] = useState<{ picks: string[], sex: Sex | null, focus: string | null }>({ picks: [], sex: null, focus: null })
  // 人体图重置:bodyKey 换值让左栏整体重挂(视角/缩放/hover 归位);markFrom 之前的消息不再参与 AI 高亮
  const [bodyKey, setBodyKey] = useState(0)
  const [markFrom, setMarkFrom] = useState(0)
  // 思考档位走 forwardedProps,服务端按模型目录校验(v4-flash 支持 off/low/high/max);low 兼顾守规则与速度
  const chat = useChat({ connection: fetchServerSentEvents('/ai/chat'), forwardedProps: { thinking: 'low' } })

  const aiMarked = useMemo(() => aiMarkedRegions(chat.messages.slice(markFrom)), [chat.messages, markFrom])
  const pending = picked.filter(id => !sent.picks.includes(id)).flatMap(id => symptomById.get(id) ?? [])
  // 只点了部位、没选诉求(如点肩膀后打「痛」):部位本身也要让 AI 知道。已有该部位的待发诉求时不重复
  const focus = active !== null && active !== sent.focus && !pending.some(s => s.regionId === active)
    ? regionById.get(active)
    : undefined
  const context = [
    ...(focus ? [`当前部位:${focus.common}(${focus.formal})`] : []),
    ...pending.map(describe),
  ]
  const localRedFlags = picked.flatMap(id => symptomById.get(id) ?? []).filter(s => s.redFlag !== undefined)
  const last = chat.messages.at(-1)

  function resetBody(markFromIndex = chat.messages.length) {
    setActive(null)
    setPicked([])
    setMarkFrom(markFromIndex)
    setBodyKey(k => k + 1)
  }

  function switchSex(next: Sex) {
    setSex(next)
    setActive(null)
    setBodyKey(k => k + 1)
    // 换性别后丢掉另一性别专属的症状
    setPicked(prev => prev.filter(id => symptomById.get(id)?.sex !== (next === 'male' ? 'female' : 'male')))
  }

  function toggle(symptom: Symptom) {
    setPicked(prev => (prev.includes(symptom.id) ? prev.filter(id => id !== symptom.id) : [...prev, symptom.id]))
  }

  // 人体图上的新选择与性别(首次或变更时)作为前缀行随消息发出,提示词里约定了【】前缀的含义
  function send(text: string) {
    const lines = [
      ...(sent.sex === sex ? [] : [`【患者信息】性别:${SEX_LABEL[sex]}`]),
      ...(context.length > 0 ? [`【人体图】${context.join('、')}`] : []),
      ...(text.trim() === '' ? [] : [text.trim()]),
    ]
    setSent({ picks: picked, sex, focus: active })
    void chat.sendMessage(lines.join('\n'))
  }

  function restart() {
    chat.clear()
    resetBody(0)
    setSent({ picks: [], sex: null, focus: null })
  }

  return (
    <div className='flex h-svh bg-background'>
      <aside className='w-100 shrink-0 border-r'>
        <BodyPanel
          key={bodyKey}
          sex={sex}
          onSexChange={switchSex}
          picked={picked}
          onToggle={toggle}
          aiMarked={aiMarked}
          active={active}
          onActiveChange={setActive}
          onReset={() => resetBody()}
        />
      </aside>

      <main className='flex min-w-0 flex-1 flex-col'>
        <header className='flex h-12 shrink-0 items-center gap-3 border-b px-4'>
          <h1 className='font-medium'>医疗美容科 · AI 预分诊</h1>
          <span className='text-xs text-muted-foreground'>仅供就诊参考,不作为诊断依据</span>
          <Button
            className='ml-auto'
            size='sm'
            variant='ghost'
            disabled={chat.messages.length === 0}
            onClick={restart}
          >
            新对话
          </Button>
        </header>

        <TranscriptProvider
          status={chat.status}
          interrupts={chat.interrupts}
          addToolApprovalResponse={chat.addToolApprovalResponse}
        >
          <div className='mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col'>
            <Transcript
              anchorTurns
              previousPeek={0}
              after={<MessageScrollerButton />}
            >
              {chat.messages.length === 0 && (
                <TranscriptEmpty>
                  <div className='flex flex-col items-center gap-3'>
                    <p>您好,我是小美。想改善哪里?可以直接说,也可以在左边人体上点。</p>
                    <div className='flex flex-wrap justify-center gap-2'>
                      {SUGGESTIONS.map(s => (
                        <Button
                          key={s}
                          size='sm'
                          variant='outline'
                          onClick={() => send(s)}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>
                </TranscriptEmpty>
              )}
              {chat.messages.map((message, index) => (
                <TranscriptMessage
                  // 不用 message.id:工具调用后模型进入下一轮时,TanStack AI 会中途换掉助手消息的 id,
                  // 按 id 做 key 会整条重挂,思考块计时归零(永远显示 1s)。列表只追加、新对话整体清空,序号即稳定身份。

                  key={index}
                  message={message}
                  streaming={chat.status === 'streaming' && message === last}
                >
                  <TriageParts
                    message={message}
                    streaming={chat.status === 'streaming' && message === last}
                    status={chat.status}
                  />
                </TranscriptMessage>
              ))}
              {chat.status === 'submitted' && <TranscriptPending>小美正在思考…</TranscriptPending>}
              {chat.error !== undefined && (
                <TranscriptError error={chat.error}>
                  {chat.error.message}
                  <Button
                    className='ms-2'
                    size='xs'
                    variant='outline'
                    onClick={() => void chat.reload()}
                  >
                    重试
                  </Button>
                </TranscriptError>
              )}
            </Transcript>

            <div className='flex flex-col gap-2 px-4 pb-4'>
              {/* 本地规则兜底:不等 AI,手点到危急症状立即提示 */}
              {localRedFlags.map(symptom => (
                <Alert
                  key={symptom.id}
                  variant='destructive'
                >
                  <AlertTitle>{`请立即就医:${symptom.name}`}</AlertTitle>
                  <AlertDescription>{symptom.redFlag}</AlertDescription>
                </Alert>
              ))}
              <Composer
                status={chat.status}
                allowEmpty={context.length > 0}
                onValueCommitted={send}
                onStop={() => chat.stop()}
                className='rounded-xl border p-2'
              >
                {context.length > 0 && (
                  <div className='flex flex-wrap items-center gap-1.5 px-1 pb-1 text-xs text-muted-foreground'>
                    <span>人体图已选,随消息发给小美:</span>
                    {context.map(label => (
                      <Badge
                        key={label}
                        variant='secondary'
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
                <ComposerTextarea placeholder='说说想改善的地方、困扰多久了…' />
                <ComposerToolbar>
                  <ComposerSubmit className='ms-auto' />
                </ComposerToolbar>
              </Composer>
            </div>
          </div>
        </TranscriptProvider>
      </main>
    </div>
  )
}
