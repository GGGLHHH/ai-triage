import { definePartRenderers } from '@gedatou/cadenza-ai'

import { TOOL } from './prompt'
import { RecommendCard } from './recommend-card'

// 按工具名换掉默认的 ToolCallCard;其余 part 交给 TranscriptParts 的默认渲染
export const triageRenderers = definePartRenderers({
  toolCall: {
    [TOOL.recommend]: props => <RecommendCard {...props} />,
  },
})
