CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS passphrases (
  id TEXT PRIMARY KEY,
  phrase TEXT NOT NULL UNIQUE,
  "limit" INTEGER NOT NULL DEFAULT 2000,
  valid_days INTEGER NOT NULL DEFAULT 0,
  phrase_expires_days INTEGER,
  max_uses INTEGER,
  max_uses_per_user INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_passphrases_active ON passphrases(is_active, created_at DESC);

CREATE TABLE IF NOT EXISTS passphrase_usage (
  id TEXT PRIMARY KEY,
  passphrase_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_passphrase_usage_phrase ON passphrase_usage(passphrase_id);
CREATE INDEX IF NOT EXISTS idx_passphrase_usage_client ON passphrase_usage(passphrase_id, client_id);

CREATE TABLE IF NOT EXISTS team_notices (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'notice',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_team_notices_created ON team_notices(created_at DESC);

CREATE TABLE IF NOT EXISTS donors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount TEXT,
  message TEXT,
  date TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_donors_date ON donors(date ASC, created_at ASC);

CREATE TABLE IF NOT EXISTS apk_versions (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  versionCode INTEGER NOT NULL,
  apkUrl TEXT NOT NULL,
  apkSize INTEGER,
  updateLog TEXT,
  forceUpdate INTEGER NOT NULL DEFAULT 0,
  minVersion INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_apk_versions_order ON apk_versions(versionCode DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS community_shares (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  cover_image TEXT DEFAULT '',
  cover_object_key TEXT DEFAULT '',
  author_name TEXT DEFAULT '',
  author_password_hash TEXT DEFAULT '',
  is_anonymous INTEGER NOT NULL DEFAULT 0,
  is_encrypted INTEGER NOT NULL DEFAULT 0,
  payload TEXT NOT NULL,
  like_count INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  report_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_community_type ON community_shares(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_created ON community_shares(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_report ON community_shares(status, report_count);
CREATE INDEX IF NOT EXISTS idx_community_popular ON community_shares(status, like_count DESC, download_count DESC);
CREATE INDEX IF NOT EXISTS idx_community_author ON community_shares(author_name, created_at DESC);

CREATE TABLE IF NOT EXISTS community_share_likes (
  post_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, client_id)
);

CREATE TABLE IF NOT EXISTS community_share_reports (
  post_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, client_id)
);
