export type LibraryMediaType = 'image' | 'video' | 'carousel' | 'link' | 'quote' | 'page'

export interface SaveLibraryPayload {
  url: string
  title?: string
  caption?: string
  source?: string
  mediaType?: LibraryMediaType
  imageUrls?: string[]
  videoUrl?: string
  embedUrl?: string
  tags?: string[]
  selection?: string
}

export interface LibraryItemRow {
  id: string
  source: string
  url: string
  title: string
  caption: string
  media_type: string
  thumbnail_path: string | null
  media_paths: string
  embed_url: string | null
  remote_media_urls: string
  tags: string
  created_at: number
  updated_at: number
}
