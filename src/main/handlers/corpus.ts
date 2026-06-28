import { dialog, ipcMain } from 'electron'
import { nanoid } from 'nanoid'
import { getDb } from '../db'
import { extractAtoms } from '../engine/extractAtoms'
import { atomsToDocHtml, generateProseFromAtoms } from '../engine/generateDoc'
import { readTranscriptFromFile } from '../engine/readImportFile'
import { getGoogleApiKey } from '../settingsStore'
import type { Atom, AtomKind, CreateDocFromAtomsInput, Meeting } from '@shared/types'

function parseMeetingRow(row: Record<string, unknown>): Meeting {
  return {
    id: row.id as string,
    title: (row.title as string) || '',
    transcript: (row.transcript as string) || '',
    source: ((row.source as string) || 'import') as Meeting['source'],
    sourcePath: (row.source_path as string | null) ?? null,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number
  }
}

function parseAtomRow(row: Record<string, unknown>): Atom {
  return {
    id: row.id as string,
    meetingId: row.meeting_id as string,
    text: (row.text as string) || '',
    kind: ((row.kind as string) || 'insight') as AtomKind,
    position: (row.position as number) ?? 0,
    createdAt: row.created_at as number
  }
}

function titleFromTranscript(text: string, fallback = 'Voice note'): string {
  const firstLine = text.split('\n').find((l) => l.trim())?.trim() ?? ''
  if (!firstLine) return fallback
  return firstLine.length > 72 ? `${firstLine.slice(0, 69)}…` : firstLine
}

async function saveMeetingWithAtoms(
  transcript: string,
  opts: { title?: string; sourcePath?: string | null }
): Promise<{ meeting: Meeting; atoms: Atom[] }> {
  const db = getDb()
  const now = Date.now()
  const meetingId = nanoid()
  const title = (opts.title?.trim() || titleFromTranscript(transcript)).slice(0, 200)
  const apiKey = await getGoogleApiKey()
  const extracted = await extractAtoms(transcript, apiKey)

  await db.execute({
    sql: `INSERT INTO meetings (id, title, transcript, source, source_path, created_at, updated_at)
          VALUES (?, ?, ?, 'import', ?, ?, ?)`,
    args: [meetingId, title, transcript, opts.sourcePath ?? null, now, now]
  })

  const atoms: Atom[] = []
  for (let i = 0; i < extracted.length; i++) {
    const atomId = nanoid()
    const atom: Atom = {
      id: atomId,
      meetingId,
      text: extracted[i].text,
      kind: extracted[i].kind,
      position: i,
      createdAt: now
    }
    atoms.push(atom)
    await db.execute({
      sql: `INSERT INTO atoms (id, meeting_id, text, kind, position, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [atomId, meetingId, atom.text, atom.kind, i, now]
    })
  }

  const meeting: Meeting = {
    id: meetingId,
    title,
    transcript,
    source: 'import',
    sourcePath: opts.sourcePath ?? null,
    createdAt: now,
    updatedAt: now
  }

  return { meeting, atoms }
}

export function registerCorpusHandlers(): void {
  ipcMain.handle('corpus:getMeetings', async () => {
    const db = getDb()
    const result = await db.execute('SELECT * FROM meetings ORDER BY created_at DESC')
    return result.rows.map((row) => parseMeetingRow(row as unknown as Record<string, unknown>))
  })

  ipcMain.handle('corpus:getMeeting', async (_e, id: string) => {
    const db = getDb()
    const result = await db.execute({ sql: 'SELECT * FROM meetings WHERE id = ?', args: [id] })
    if (result.rows.length === 0) return null
    return parseMeetingRow(result.rows[0] as unknown as Record<string, unknown>)
  })

  ipcMain.handle('corpus:getAtoms', async (_e, meetingId?: string) => {
    const db = getDb()
    const result = meetingId
      ? await db.execute({
          sql: 'SELECT * FROM atoms WHERE meeting_id = ? ORDER BY position ASC',
          args: [meetingId]
        })
      : await db.execute('SELECT * FROM atoms ORDER BY created_at DESC')
    return result.rows.map((row) => parseAtomRow(row as unknown as Record<string, unknown>))
  })

  ipcMain.handle(
    'corpus:importTranscript',
    async (_e, payload: { text: string; title?: string }) => {
      const text = (payload.text || '').trim()
      if (!text) throw new Error('Transcript is empty')
      return saveMeetingWithAtoms(text, { title: payload.title })
    }
  )

  ipcMain.handle('corpus:importPaths', async (_e, paths: string[]) => {
    const results: { meeting: Meeting; atoms: Atom[] }[] = []
    for (const filePath of paths) {
      const { text, title } = await readTranscriptFromFile(filePath)
      results.push(await saveMeetingWithAtoms(text, { title, sourcePath: filePath }))
    }
    return results
  })

  ipcMain.handle('corpus:pickAndImport', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import voice note or transcript',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Transcripts & audio', extensions: ['txt', 'md', 'vtt', 'srt', 'm4a', 'mp3', 'wav', 'webm', 'mp4', 'aac', 'caf'] },
        { name: 'All files', extensions: ['*'] }
      ]
    })
    if (canceled || filePaths.length === 0) return []

    const results: { meeting: Meeting; atoms: Atom[] }[] = []
    for (const filePath of filePaths) {
      const { text, title } = await readTranscriptFromFile(filePath)
      results.push(await saveMeetingWithAtoms(text, { title, sourcePath: filePath }))
    }
    return results
  })

  ipcMain.handle('corpus:deleteMeeting', async (_e, id: string) => {
    const db = getDb()
    await db.execute({ sql: 'DELETE FROM atoms WHERE meeting_id = ?', args: [id] })
    await db.execute({ sql: 'DELETE FROM meetings WHERE id = ?', args: [id] })
  })

  ipcMain.handle('corpus:createDocFromAtoms', async (_e, input: CreateDocFromAtomsInput) => {
    const db = getDb()
    if (!input.atomIds?.length) throw new Error('No atoms selected')

    const placeholders = input.atomIds.map(() => '?').join(', ')
    const atomResult = await db.execute({
      sql: `SELECT * FROM atoms WHERE id IN (${placeholders}) ORDER BY position ASC`,
      args: input.atomIds
    })
    const atoms = atomResult.rows.map((row) => parseAtomRow(row as unknown as Record<string, unknown>))
    if (atoms.length === 0) throw new Error('Selected atoms not found')

    const now = Date.now()
    const docType = input.docType ?? 'newsletter'
    const tags =
      docType === 'newsletter' ? ['newsletter', 'draft'] : ['outline']
    const title =
      input.title?.trim() ||
      (docType === 'newsletter' ? 'Newsletter draft' : 'Outline')

    const apiKey = await getGoogleApiKey()
    let body: string

    if (input.generateWithGemini && apiKey) {
      body = await generateProseFromAtoms(atoms, docType, apiKey, title)
    } else {
      body = atomsToDocHtml(atoms, title)
    }

    if (input.mode === 'append' && input.docId) {
      const existing = await db.execute({ sql: 'SELECT * FROM docs WHERE id = ?', args: [input.docId] })
      if (existing.rows.length === 0) throw new Error('Document not found')
      const row = existing.rows[0] as unknown as Record<string, unknown>
      const mergedBody = `${row.body as string}${body}`
      await db.execute({
        sql: 'UPDATE docs SET body = ?, updated_at = ? WHERE id = ?',
        args: [mergedBody, now, input.docId]
      })

      for (const atom of atoms) {
        await db.execute({
          sql: 'INSERT INTO doc_attachments (id, doc_id, atom_id, created_at) VALUES (?, ?, ?, ?)',
          args: [nanoid(), input.docId, atom.id, now]
        })
      }

      return {
        id: input.docId,
        title: row.title,
        body: mergedBody,
        type: row.type,
        folderId: row.folder_id,
        icon: row.icon,
        coverImage: row.cover_image,
        isTemplate: Boolean(row.is_template),
        isFavorite: Boolean(row.is_favorite),
        favoriteOrder: row.favorite_order,
        tags: JSON.parse((row.tags as string) || '[]'),
        createdAt: row.created_at,
        updatedAt: now
      }
    }

    const docId = nanoid()
    await db.execute({
      sql: `INSERT INTO docs
            (id, title, body, type, folder_id, icon, cover_image, is_template, is_favorite, favorite_order, tags, created_at, updated_at)
            VALUES (?, ?, ?, 'doc', NULL, NULL, NULL, 0, 0, NULL, ?, ?, ?)`,
      args: [docId, title, body, JSON.stringify(tags), now, now]
    })

    for (const atom of atoms) {
      await db.execute({
        sql: 'INSERT INTO doc_attachments (id, doc_id, atom_id, created_at) VALUES (?, ?, ?, ?)',
        args: [nanoid(), docId, atom.id, now]
      })
    }

    return {
      id: docId,
      title,
      body,
      type: 'doc' as const,
      folderId: null,
      icon: null,
      coverImage: null,
      isTemplate: false,
      isFavorite: false,
      favoriteOrder: null,
      tags,
      createdAt: now,
      updatedAt: now
    }
  })
}
