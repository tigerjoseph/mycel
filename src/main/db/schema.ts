export const SCHEMA = `
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  metadata TEXT NOT NULL DEFAULT '{}',
  tags TEXT NOT NULL DEFAULT '[]',
  last_contacted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS docs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'doc',
  folder_id TEXT,
  icon TEXT,
  cover_image TEXT,
  is_template INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  favorite_order INTEGER,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS doc_versions (
  id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'doc',
  folder_id TEXT,
  icon TEXT,
  cover_image TEXT,
  is_template INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  favorite_order INTEGER,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  document_updated_at INTEGER NOT NULL,
  saved_at INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT 'save'
);

CREATE INDEX IF NOT EXISTS idx_doc_versions_doc_saved
  ON doc_versions (doc_id, saved_at DESC);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS touchpoints (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  medium TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'Lead',
  value_cents INTEGER,
  closed_at INTEGER,
  stage_changed_at INTEGER,
  follow_up_manual TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  done INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL DEFAULT '',
  done INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  transcript TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'import',
  source_path TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS atoms (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL,
  text TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'insight',
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS doc_attachments (
  id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL,
  atom_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS library_items (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'web',
  url TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  media_type TEXT NOT NULL DEFAULT 'link',
  thumbnail_path TEXT,
  media_paths TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_library_items_created ON library_items (created_at DESC);

CREATE TABLE IF NOT EXISTS content_scripts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'Pre-production',
  position INTEGER NOT NULL DEFAULT 0,
  project_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_content_scripts_stage ON content_scripts (stage, position);
`
