import { app, ipcMain, shell } from 'electron'
import { execFile } from 'child_process'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

function slugify(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'untitled'
}

async function openInCursor(targetPath: string): Promise<void> {
  if (process.platform === 'darwin') {
    try {
      await execFileAsync('open', ['-a', 'Cursor', targetPath])
      return
    } catch {
      // fall through to reveal in Finder
    }
  }
  await shell.openPath(targetPath)
}

export function registerExportHandlers(): void {
  ipcMain.handle(
    'export:cursorBundle',
    async (_e, payload: { title: string; draft: string; context: string }) => {
      const slug = slugify(payload.title)
      const dir = join(app.getPath('documents'), 'mycel-exports', slug)
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, 'draft.md'), payload.draft, 'utf8')
      await writeFile(join(dir, 'CONTEXT.md'), payload.context, 'utf8')
      await openInCursor(dir)
      return dir
    }
  )
}
