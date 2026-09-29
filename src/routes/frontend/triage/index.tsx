import { createFileRoute } from '@tanstack/react-router'

import { TriagePage } from './-triage-page'

export const Route = createFileRoute('/frontend/triage/')({
  component: TriagePage,
})
