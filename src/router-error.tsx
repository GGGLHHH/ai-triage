import type { ErrorComponentProps } from '@tanstack/react-router'

import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/error-state'

// 从 router.tsx 拆出来:那个文件导出的 getRouter 是非组件,组件和它同住会拦住
// Fast Refresh(react-refresh/only-export-components)。
// router 新版把 error 放宽成 unknown(可注册),非 Error 的抛出物也要能显示。
export function RouterError({ error }: ErrorComponentProps) {
  const { t } = useTranslation()
  return (
    <ErrorState
      className='min-h-svh'
      code='Error'
      title={t('errors.generic')}
      description={error instanceof Error ? error.message : String(error)}
    />
  )
}
