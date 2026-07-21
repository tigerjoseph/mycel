import { app } from 'electron'
import { join } from 'path'

export function libraryRoot(): string {
  return join(app.getPath('userData'), 'library')
}

export function libraryItemDir(id: string): string {
  return join(libraryRoot(), id)
}

export function toMediaUrl(absPath: string): string {
  return `mycel-media://local/${encodeURIComponent(absPath)}`
}

export function enrichLibraryItem(item: Record<string, unknown>): Record<string, unknown> {
  const mediaPaths = (item.mediaPaths as string[]) ?? []
  const thumbnailPath = item.thumbnailPath as string | null
  return {
    ...item,
    mediaUrls: mediaPaths.map((p) => toMediaUrl(p)),
    thumbnailUrl: thumbnailPath ? toMediaUrl(thumbnailPath) : null
  }
}
