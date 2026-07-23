import { mkdir, writeFile } from 'fs/promises'
import { extname } from 'path'
import { nanoid } from 'nanoid'
import { getDb } from '../db'
import type { SaveLibraryPayload } from './types'
import { libraryItemDir } from './paths'

function extFromUrl(url: string, fallback: string): string {
  try {
    const pathname = new URL(url).pathname
    const ext = extname(pathname).toLowerCase()
    if (ext && ext.length <= 5) return ext
  } catch {
    // ignore
  }
  return fallback
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  })
  if (!res.ok) throw new Error(`Download failed (${res.status})`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(dest, buf)
}

function inferSource(url: string, source?: string): string {
  if (source?.trim()) return source.trim().toLowerCase()
  if (/instagram\.com/i.test(url)) return 'instagram'
  return 'web'
}

function inferTags(url: string, tags: string[] | undefined, source: string): string[] {
  const set = new Set((tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))
  if (source === 'instagram') set.add('instagram')
  const profile = url.match(/instagram\.com\/([^/?#]+)/i)
  if (profile && !['p', 'reel', 'reels', 'stories'].includes(profile[1])) {
    set.add(profile[1].toLowerCase())
  }
  return [...set]
}

export function parseLibraryRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    source: row.source,
    url: row.url,
    title: row.title,
    caption: row.caption,
    mediaType: row.media_type,
    thumbnailPath: row.thumbnail_path,
    mediaPaths: JSON.parse((row.media_paths as string) || '[]'),
    embedUrl: (row.embed_url as string) || null,
    remoteMediaUrls: JSON.parse((row.remote_media_urls as string) || '[]'),
    tags: JSON.parse((row.tags as string) || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function inferEmbedUrl(url: string, embedUrl?: string): string | null {
  if (embedUrl?.trim()) return embedUrl.trim()
  const ig = url.match(/instagram\.com\/(p|reel|reels)\/([^/?#]+)/i)
  if (ig) {
    const kind = ig[1].toLowerCase() === 'p' ? 'p' : 'reel'
    return `https://www.instagram.com/${kind}/${ig[2]}/embed/`
  }
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&/?#]+)/i)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  return null
}

export async function saveLibraryItem(payload: SaveLibraryPayload): Promise<Record<string, unknown>> {
  const url = payload.url?.trim()
  if (!url) throw new Error('URL is required')

  const now = Date.now()
  const id = nanoid()
  const dir = libraryItemDir(id)
  await mkdir(dir, { recursive: true })

  const source = inferSource(url, payload.source)
  const tags = inferTags(url, payload.tags, source)
  const mediaPaths: string[] = []
  const remoteMediaUrls: string[] = []

  const imageUrls = (payload.imageUrls ?? []).filter(Boolean)
  for (let i = 0; i < imageUrls.length; i++) {
    const imgUrl = imageUrls[i]
    const ext = extFromUrl(imgUrl, '.jpg')
    const file = `${dir}/image-${i}${ext}`
    try {
      await downloadToFile(imgUrl, file)
      mediaPaths.push(file)
    } catch {
      if (imgUrl.startsWith('http')) remoteMediaUrls.push(imgUrl)
    }
  }

  const videoUrl = payload.videoUrl?.trim()
  if (videoUrl && !videoUrl.startsWith('blob:')) {
    const ext = extFromUrl(videoUrl, '.mp4')
    const file = `${dir}/video${ext}`
    try {
      await downloadToFile(videoUrl, file)
      mediaPaths.push(file)
    } catch {
      remoteMediaUrls.push(videoUrl)
    }
  }

  const embedUrl = inferEmbedUrl(url, payload.embedUrl)

  let mediaType = payload.mediaType ?? 'link'
  if (payload.selection?.trim()) mediaType = 'quote'
  else if (mediaPaths.length > 1) mediaType = 'carousel'
  else if (mediaPaths.length === 1) {
    const path = mediaPaths[0]
    mediaType = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(path) || videoUrl ? 'video' : 'image'
  } else if (videoUrl || embedUrl || remoteMediaUrls.some((u) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u))) {
    mediaType = 'video'
  } else if (!imageUrls.length) {
    mediaType = 'page'
  }

  const caption =
    payload.caption?.trim() ||
    payload.selection?.trim() ||
    ''
  const title = payload.title?.trim() || caption.slice(0, 80) || new URL(url).hostname

  const thumbnailPath = mediaPaths[0] ?? null

  const db = getDb()
  await db.execute({
    sql: `INSERT INTO library_items
      (id, source, url, title, caption, media_type, thumbnail_path, media_paths, embed_url, remote_media_urls, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      source,
      url,
      title,
      caption,
      mediaType,
      thumbnailPath,
      JSON.stringify(mediaPaths),
      embedUrl,
      JSON.stringify(remoteMediaUrls),
      JSON.stringify(tags),
      now,
      now
    ]
  })

  const result = await db.execute({ sql: 'SELECT * FROM library_items WHERE id = ?', args: [id] })
  return parseLibraryRow(result.rows[0] as unknown as Record<string, unknown>)
}
