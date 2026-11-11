
CREATE TABLE IF NOT EXISTS catalog_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (
    type IN ('movie', 'blender', 'music', 'comedy')
  ),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  poster TEXT DEFAULT '',
  source_type TEXT NOT NULL CHECK (
    source_type IN ('youtube', 'mp4', 'hls')
  ),
  source TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_catalog_type
ON catalog_items(type);

CREATE INDEX IF NOT EXISTS idx_catalog_created
ON catalog_items(created_at);
