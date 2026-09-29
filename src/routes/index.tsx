import { createFileRoute, redirect } from '@tanstack/react-router'

// root 落地:本仓库是诊前分诊 demo,直接进 /frontend/triage。模板自带的 /frontend/home、/admin 仍在,需要后端。
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/frontend/triage' })
  },
})
