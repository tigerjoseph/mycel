export interface Contact {
  id: string
  name: string
  metadata: Record<string, string>
  tags: string[]
  lastContactedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface Folder {
  id: string
  name: string
  createdAt: number
}

export type DocType = 'note' | 'doc' | 'post' | 'grid'

export type PostChannel = 'linkedin' | 'newsletter'
export type PostStatus = 'draft' | 'review' | 'scheduled' | 'published'
export type PostIntent = 'teach' | 'entertain' | 'discover' | 'frame'

export interface PostMeta {
  channel?: PostChannel
  source?: string
  status?: PostStatus
  scheduledFor?: number | null
  publishedAt?: number | null
  insightIds?: string[]
  threadId?: string | null
  intent?: PostIntent
}

export interface Doc {
  id: string
  title: string
  body: string
  type: DocType
  folderId: string | null
  icon: string | null
  coverImage: string | null
  isTemplate: boolean
  isFavorite: boolean
  favoriteOrder: number | null
  tags: string[]
  postMeta?: PostMeta
  createdAt: number
  updatedAt: number
}

export interface DocVersion extends Doc {
  versionId: string
  docId: string
  savedAt: number
  reason: 'save' | 'delete' | 'restore'
}

export interface Note {
  id: string
  title: string
  body: string
  bodyPreview?: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface Link {
  id: string
  sourceId: string
  sourceType: 'note' | 'doc' | 'contact'
  targetId: string
  targetType: 'note' | 'doc' | 'contact'
  createdAt: number
}

export interface Touchpoint {
  id: string
  contactId: string
  medium: 'email' | 'dm' | 'call' | 'coffee' | 'meet' | 'letter'
  note: string
  createdAt: number
}

export type FollowUpManual = 'on' | 'off' | null

export interface Project {
  id: string
  contactId: string
  name: string
  stage: string
  valueCents: number | null
  closedAt: number | null
  stageChangedAt: number | null
  followUpManual: FollowUpManual
  createdAt: number
  updatedAt: number
}

export interface Milestone {
  id: string
  projectId: string
  text: string
  done: boolean
  position: number
  createdAt: number
}

export interface Todo {
  id: string
  text: string
  done: boolean
  position: number
  createdAt: number
}

export interface ContentScript {
  id: string
  title: string
  body?: string
  stage: string
  position: number
  projectId: string | null
  createdAt: number
  updatedAt: number
}

export interface Attachment {
  id: string
  projectId: string
  filename: string
  filepath: string
  createdAt: number
}

export interface Tag {
  name: string
  count: number
}

export interface TagEntity {
  id: string
  type: 'contact' | 'doc' | 'note'
  name: string
}

export interface SearchResult {
  id: string
  type: 'contact' | 'doc' | 'note' | 'project' | 'todo' | 'library' | 'atom'
  title: string
  snippet: string
  /** For 'atom' results: the parent meeting id, used to navigate/expand the right group */
  parentId?: string
}

export type AtomKind = 'insight' | 'quote' | 'action' | 'frame'

export interface Meeting {
  id: string
  title: string
  transcript: string
  source: 'import' | 'recording'
  sourcePath: string | null
  createdAt: number
  updatedAt: number
}

export interface Atom {
  id: string
  meetingId: string
  text: string
  kind: AtomKind
  position: number
  createdAt: number
}

export type CorpusDocType = 'newsletter' | 'outline'

export type LibraryMediaType = 'image' | 'video' | 'carousel' | 'link' | 'quote' | 'page'

export interface LibraryItem {
  id: string
  source: string
  url: string
  title: string
  caption: string
  mediaType: LibraryMediaType
  thumbnailPath: string | null
  mediaPaths: string[]
  mediaUrls?: string[]
  thumbnailUrl?: string | null
  embedUrl?: string | null
  remoteMediaUrls?: string[]
  tags: string[]
  createdAt: number
  updatedAt: number
}

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

export interface CreateDocFromAtomsInput {
  atomIds: string[]
  mode: 'new' | 'append'
  docId?: string
  docType: CorpusDocType
  title?: string
  generateWithGemini?: boolean
}

export type InsightOrigin = 'manual' | 'extract' | 'dump' | 'session' | 'auto' | 'hybrid'

export interface InsightProvenance {
  sessionId?: string
  meetingId?: string
}

export interface CorpusInsight {
  id: string
  text: string
  soWhat: string | null
  source: string | null
  pillar: string | null
  origin: InsightOrigin
  embedding: number[] | null
  dumpId: string | null
  sessionId: string | null
  threadId: string | null
  duplicateOf: string | null
  provenance: InsightProvenance
  createdAt: number
  updatedAt: number
}

export interface CreateInsightInput {
  text: string
  soWhat?: string | null
  source?: string | null
  pillar?: string | null
  origin?: InsightOrigin
  dumpId?: string | null
  sessionId?: string | null
  provenance?: InsightProvenance
}

export interface InsightListFilter {
  sessionId?: string
}

export interface UpdateInsightInput {
  text?: string
  soWhat?: string | null
  source?: string | null
  pillar?: string | null
}

export type CorpusThreadStatus = 'emerging' | 'active' | 'pinned' | 'muted'

export interface CorpusThread {
  id: string
  title: string
  meaning: string
  centroidEmbedding: number[] | null
  meaningScore: number
  status: CorpusThreadStatus
  evidenceCount: number
  sourceDiversity: number
  surfaced: boolean
  eligibleForDraft: boolean
  insights: CorpusInsight[]
  createdAt: number
  updatedAt: number
}

export type DumpSource = 'manual' | 'paste' | 'file' | 'telegram'

export interface Dump {
  id: string
  source: DumpSource
  payload: string
  metadata: Record<string, unknown>
  telegramMessageId: string | null
  createdAt: number
}

export interface CreateDumpInput {
  source?: DumpSource
  payload: string
  metadata?: Record<string, unknown>
  telegramMessageId?: string | null
}

export interface SynthesisDraftResult {
  docId: string
  title: string
  channel: PostChannel
  threadId: string | null
}

export interface SynthesisPromptResult {
  promptId: string
  text: string
  sent: boolean
  error: string | null
}

export interface SynthesisResult {
  richness: import('./synthesis').DayRichness
  skipped: boolean
  skipReason: string | null
  waitingOnPrompt: boolean
  usedLlm: boolean
  drafts: SynthesisDraftResult[]
  prompts: SynthesisPromptResult[]
  ranAt: number
}

export interface SynthesisStatus {
  richness: import('./synthesis').DayRichness
  eodEnabled: boolean
  lastRunAt: number | null
  lastResult: SynthesisResult | null
  openSynthesisPromptCount: number
}

export type TelegramPromptStatus = 'pending' | 'sent' | 'answered'

export interface TelegramPrompt {
  id: string
  text: string
  relatedInsightId: string | null
  relatedDraftId: string | null
  telegramMessageId: string | null
  status: TelegramPromptStatus
  kind: string
  answerText: string | null
  answerDumpId: string | null
  createdAt: number
  sentAt: number | null
  answeredAt: number | null
}

export interface TelegramStatus {
  configured: boolean
  tokenConfigured: boolean
  userIdConfigured: boolean
  polling: boolean
  lastError: string | null
  lastOkAt: number | null
  pendingPromptCount: number
}

export interface NotifyDraftReadyInput {
  title: string
  docId?: string | null
}

export interface IngestTestDumpInput {
  text: string
}

export interface RequestContextInput {
  text?: string
  relatedInsightId?: string | null
  relatedDraftId?: string | null
}

export type SessionKind = 'work' | 'meeting'
export type SessionSource = 'work' | 'meeting' | 'manual' | 'observer'

export interface WorkSession {
  id: string
  title: string
  kind: SessionKind
  source: SessionSource
  meetingId: string | null
  transcriptRef: string | null
  contactId: string | null
  projectId: string | null
  startedAt: number | null
  endedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface CreateSessionInput {
  title?: string
  kind?: SessionKind
  source?: SessionSource
  meetingId?: string | null
  transcriptRef?: string | null
  contactId?: string | null
  projectId?: string | null
  startedAt?: number | null
  endedAt?: number | null
}

export interface UpdateSessionInput {
  title?: string
  contactId?: string | null
  projectId?: string | null
}

export interface ActivityEvent {
  id: string
  kind: string
  payload: Record<string, unknown>
  capturedAt: number
  expiresAt: number | null
  createdAt: number
}

export interface CaptureStatus {
  enabled: boolean
  running: boolean
  supported: boolean
  allowlist: import('./capture').CaptureAppId[]
  lastAppName: string | null
  lastMatchedId: import('./capture').CaptureAppId | null
  currentSessionId: string | null
  currentSessionTitle: string | null
  lastError: string | null
}

export type PageId = 'todo' | 'people' | 'create' | 'library'

export interface BreadcrumbEntry {
  label: string
  action: () => void
}
