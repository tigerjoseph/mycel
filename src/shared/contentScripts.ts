export const CONTENT_STAGES = ['Pre-production', 'Production', 'Done'] as const
export type ContentStage = (typeof CONTENT_STAGES)[number]

const STAGE_COLORS: Record<ContentStage, string> = {
  'Pre-production': '#9B9A97',
  Production: '#529CCA',
  Done: '#5AAC72'
}

export function getContentStageColor(stage: string): string {
  return STAGE_COLORS[stage as ContentStage] ?? '#9B9A97'
}

export function isContentStage(stage: string): stage is ContentStage {
  return (CONTENT_STAGES as readonly string[]).includes(stage)
}

export function normalizeContentStage(stage: string): ContentStage {
  if (isContentStage(stage)) return stage
  if (stage === 'To prep') return 'Pre-production'
  if (stage === 'Shooting' || stage === 'In Editing') return 'Production'
  return 'Done'
}
