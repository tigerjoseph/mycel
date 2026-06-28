export type PaletteId = 'warm' | 'bold'
export type ModeId = 'light' | 'dark'
export type AppearanceId = 'warm-light' | 'warm-dark' | 'bold-light' | 'bold-dark'

export const DEFAULT_APPEARANCE: AppearanceId = 'bold-light'

export const APPEARANCE_OPTIONS: Array<{
  id: AppearanceId
  label: string
  palette: PaletteId
  mode: ModeId
}> = [
  { id: 'warm-light', label: 'Warm Light', palette: 'warm', mode: 'light' },
  { id: 'warm-dark', label: 'Warm Dark', palette: 'warm', mode: 'dark' },
  { id: 'bold-light', label: 'Bold Light', palette: 'bold', mode: 'light' },
  { id: 'bold-dark', label: 'Bold Dark', palette: 'bold', mode: 'dark' }
]

export function parseAppearance(id: AppearanceId): { palette: PaletteId; mode: ModeId } {
  const [palette, mode] = id.split('-') as [PaletteId, ModeId]
  return { palette, mode }
}

export function applyAppearanceToDocument(id: AppearanceId): void {
  const { palette, mode } = parseAppearance(id)
  document.documentElement.dataset.palette = palette
  document.documentElement.dataset.theme = mode
}
