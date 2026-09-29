import { cn } from '@/lib/utils'

// 小程序服务宫格那种「彩色图标 + 浅色圆底」。
// icon 传完整的 UnoCSS 类名字面量(如 'i-fluent-color-heart-24'):UnoCSS 只生成源码里原样出现过的类,
// 拼出来的类名(`i-fluent-color-${name}`)不会有样式。

// 颜色走 triage-theme 里的 token,不用 Tailwind 调色板(eslint 的 no-restricted-classes 家规);暗色也在那边
const TONES = {
  blue: 'bg-(--triage-tone-blue)',
  orange: 'bg-(--triage-tone-orange)',
  violet: 'bg-(--triage-tone-violet)',
  green: 'bg-(--triage-tone-green)',
  rose: 'bg-(--triage-tone-rose)',
} as const

const SIZES = {
  sm: 'size-8 [&>span]:size-5',
  md: 'size-11 [&>span]:size-6',
  lg: 'size-14 [&>span]:size-8',
} as const

export type BubbleTone = keyof typeof TONES

export function IconBubble({ icon, tone = 'blue', size = 'md', className }: {
  icon: string
  tone?: BubbleTone
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full', TONES[tone], SIZES[size], className)}
    >
      {/* pointer-events-none:uno.config 给所有图标加了 cursor:pointer,装饰图标不该让人以为能点 */}
      <span className={cn('pointer-events-none', icon)} />
    </span>
  )
}
