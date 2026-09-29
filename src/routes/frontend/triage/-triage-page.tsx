import type { BubbleTone } from '#/business/triage/icon-bubble'

import type { Sex, Symptom } from '#/business/triage/types'
import {
  Composer,
  ComposerSubmit,
  ComposerTextarea,
  ComposerToolbar,
  fetchServerSentEvents,
  PartRenderersProvider,
  Transcript,
  TranscriptEmpty,
  TranscriptError,
  TranscriptMessage,
  TranscriptParts,
  TranscriptPending,
  TranscriptProvider,
  useChat,
  useMessageKeys,
  ZH_PART_LABELS,
} from '@gedatou/cadenza-ai'

import { Badge, Button, MessageScrollerButton } from '@gedatou/cadenza-ui'
import { IconMessagePlus } from '@tabler/icons-react'
import { useState } from 'react'

import { triageRenderers } from '#/business/triage/ai/renderers'
import { regionById, symptomById } from '#/business/triage/body/body-data'
import { BodyPanel } from '#/business/triage/body/body-panel'
import { IconBubble } from '#/business/triage/icon-bubble'

// 空对话时的快捷入口,排成小程序首页那种宫格卡片:标题 + 副标题 + 彩色图标。点了发的是 text
const SUGGESTIONS: { text: string, title: string, sub: string, icon: string, tone: BubbleTone }[] = [
  { text: '脸上长了好多斑,晒完越来越明显', title: '脸上长斑', sub: '晒完越来越明显', icon: 'i-fluent-color-weather-sunny-low-24', tone: 'orange' },
  { text: '一直反复长痘,还留了痘印和痘坑', title: '痘痘和痘印', sub: '反复长、留了印子', icon: 'i-fluent-color-scan-person-24', tone: 'rose' },
  { text: '眼角和额头有皱纹了,脸也有点松', title: '皱纹松弛', sub: '想抗衰紧致', icon: 'i-fluent-color-clock-24', tone: 'violet' },
]

const SEX_LABEL: Record<Sex, string> = { female: '女', male: '男' }

function describe(symptom: Symptom): string {
  return `${regionById.get(symptom.regionId)?.common ?? ''}·${symptom.name}`
}

export function TriagePage() {
  const [sex, setSex] = useState<Sex>('female')
  const [picked, setPicked] = useState<string[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [sent, setSent] = useState<{ picks: string[], sex: Sex | null, focus: string | null }>({ picks: [], sex: null, focus: null })
  // 面部图重置:bodyKey 换值让左栏整体重挂(视角/缩放/hover 归位)
  const [bodyKey, setBodyKey] = useState(0)
  // 思考档位走 forwardedProps,服务端按模型目录校验(v4-flash 支持 off/low/high/max)
  const chat = useChat({ connection: fetchServerSentEvents('/ai/chat'), forwardedProps: { thinking: 'low' } })

  const pending = picked.filter(id => !sent.picks.includes(id)).flatMap(id => symptomById.get(id) ?? [])
  // 只点了部位、没选诉求(如点肩膀后打「痛」):部位本身也要让 AI 知道。已有该部位的待发诉求时不重复
  const focus = active !== null && active !== sent.focus && !pending.some(s => s.regionId === active)
    ? regionById.get(active)
    : undefined
  const context = [
    ...(focus ? [`当前部位:${focus.common}(${focus.formal})`] : []),
    ...pending.map(describe),
  ]
  const last = chat.messages.at(-1)
  // TanStack 流式途中会给助手消息改 id,按 id 当 key 会重挂:思考计时归零(总显示 1s)、折叠状态丢失
  const keyOf = useMessageKeys(chat.messages)

  function resetBody() {
    setActive(null)
    setPicked([])
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

  // 面部图上的新选择与性别(首次或变更时)作为前缀行随消息发出,system-prompt.md 说明了【】标记的含义
  function send(text: string) {
    const lines = [
      ...(sent.sex === sex ? [] : [`【患者信息】性别:${SEX_LABEL[sex]}`]),
      ...(context.length > 0 ? [`【面部图】${context.join('、')}`] : []),
      ...(text.trim() === '' ? [] : [text.trim()]),
    ]
    setSent({ picks: picked, sex, focus: active })
    void chat.sendMessage(lines.join('\n'))
  }

  function restart() {
    chat.clear()
    resetBody()
    setSent({ picks: [], sex: null, focus: null })
  }

  return (
    <div className='flex h-svh bg-background text-foreground triage-theme'>
      <aside className='w-100 shrink-0 border-r bg-card'>
        <BodyPanel
          key={bodyKey}
          sex={sex}
          onSexChange={switchSex}
          picked={picked}
          onToggle={toggle}
          active={active}
          onActiveChange={setActive}
          onReset={resetBody}
        />
      </aside>

      <main className='flex min-w-0 flex-1 flex-col'>
        <header className='flex h-14 shrink-0 items-center gap-3 border-b bg-card px-5'>
          <IconBubble
            icon='i-fluent-color-bot-sparkle-24'
            size='sm'
          />
          <div className='flex flex-col'>
            <h1 className='leading-tight font-semibold'>医疗美容科 · AI 预分诊</h1>
            <span className='text-xs text-muted-foreground'>仅供就诊参考,不作为诊断依据</span>
          </div>
          <Button
            className='ml-auto rounded-full'
            size='sm'
            variant='outline'
            disabled={chat.messages.length === 0}
            onClick={restart}
          >
            <IconMessagePlus />
            新对话
          </Button>
        </header>

        <PartRenderersProvider
          renderers={triageRenderers}
          labels={ZH_PART_LABELS}
        >
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
                    <div className='flex w-full max-w-2xl flex-col items-center gap-6 px-4'>
                      <div className='flex flex-col items-center gap-2 text-center'>
                        <IconBubble
                          icon='i-fluent-color-bot-sparkle-24'
                          size='lg'
                        />
                        <p className='text-lg font-semibold text-foreground'>您好,我是小美</p>
                        <p className='text-sm text-muted-foreground'>想改善哪里?可以直接说,也可以在左边脸上点</p>
                      </div>
                      <div className='grid w-full grid-cols-3 gap-3'>
                        {SUGGESTIONS.map(s => (
                          <button
                            key={s.text}
                            type='button'
                            className='flex items-center justify-between gap-2 rounded-xl bg-card p-4 text-left shadow-(--triage-shadow) ring-1 ring-border transition hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                            onClick={() => send(s.text)}
                          >
                            <span className='flex flex-col gap-1'>
                              <span className='font-semibold text-foreground'>{s.title}</span>
                              <span className='text-xs text-muted-foreground'>{s.sub}</span>
                            </span>
                            <IconBubble
                              icon={s.icon}
                              tone={s.tone}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </TranscriptEmpty>
                )}
                {chat.messages.map(message => (
                  <TranscriptMessage
                    key={keyOf(message)}
                    message={message}
                    streaming={chat.status === 'streaming' && message === last}
                  >
                    <TranscriptParts message={message} />
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
                <Composer
                  status={chat.status}
                  allowEmpty={context.length > 0}
                  onValueCommitted={send}
                  onStop={() => chat.stop()}
                  className='rounded-2xl border bg-card p-2 shadow-(--triage-shadow)'
                >
                  {context.length > 0 && (
                    <div className='flex flex-wrap items-center gap-1.5 px-1 pb-1 text-xs text-muted-foreground'>
                      <span>面部图已选,随消息发给小美:</span>
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
        </PartRenderersProvider>
      </main>
    </div>
  )
}
