import { buildStoredAiConfigOverride, normalizeAiConfigOverride } from './config.js';
import { generateId, sha256Hex } from './security.js';
import {
  COMMUNITY_COVER_IMAGE_MAX_BYTES,
  COMMUNITY_UPLOAD_PAYLOAD_LIMIT_BYTES,
  buildCommunityCoverTooLargeMessage,
  buildCommunityPayloadTooLargeMessage,
  prepareCommunityPayloadForStorage
} from '../../src/community/communityPayloadShared.js';

export const SCHEMA_SQL = `
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
`;

const APP_AI_CONFIG_KEY = 'ai.config';
const COMMUNITY_SHARE_TYPES = new Set(['contact', 'worldbook', 'htmltemplate', 'bubbleworkshop']);
const COMMUNITY_REPORT_REMOVE_THRESHOLD = 5;
const COMMUNITY_COVER_OBJECT_PREFIX = 'community/covers/';
const COMMUNITY_AUTHOR_REQUIRED_ERROR = '请提供作者名和密码';
const COMMUNITY_NAME_REQUIRED_ERROR = '名称不能为空';
const PASSPHRASE_REQUIRED_ERROR = '口令不能为空';
const DONOR_NAME_REQUIRED_ERROR = '名称不能为空';
const TEAM_NOTICE_REQUIRED_ERROR = '标题和内容不能为空';
const COMMUNITY_COVER_IMAGE_INVALID_ERROR = '封面图片格式无效';
const COMMUNITY_COVER_IMAGE_SOURCE_INVALID_ERROR = '封面图片来源无效';
const COMMUNITY_LIKE_TARGET_MISSING_ERROR = 'community_share_like_target_missing';
const COMMUNITY_REPORT_TARGET_MISSING_ERROR = 'community_share_report_target_missing';
const COMMUNITY_ADMIN_UPDATE_TARGET_MISSING_ERROR = 'community_admin_update_target_missing';

let schemaPromise = null;
let schemaDb = null;
let schemaInitializedAt = 0;
const SCHEMA_CACHE_TTL_MS = 5 * 60 * 1000; // 5分钟内不重复检查

const splitSqlStatements = (sql) => {
  const statements = [];
  let current = '';
  let inSingleQuote = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (!inSingleQuote && char === '-' && next === '-') {
      while (index < sql.length && sql[index] !== '\n') index += 1;
      continue;
    }

    current += char;

    if (char === "'") {
      if (inSingleQuote && next === "'") {
        current += next;
        index += 1;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === ';' && !inSingleQuote) {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = '';
    }
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
};

const SCHEMA_STATEMENTS = splitSqlStatements(SCHEMA_SQL);

const asText = (value, fallback = '') => String(value ?? fallback);
const asTrimmedText = (value, fallback = '') => asText(value, fallback).trim();
const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toPositiveInt = (value, fallback = 0) => {
  const parsed = Math.floor(asNumber(value, fallback));
  return parsed > 0 ? parsed : fallback;
};

const parseJson = (value, fallback) => {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const safeDecodeURIComponent = (value) => {
  const text = asText(value);
  if (!text) return '';
  try {
    return decodeURIComponent(text);
  } catch {
    return '';
  }
};

const getCommunityAuthorCredentials = (authorName, authorPassword) => ({
  authorName: asTrimmedText(authorName),
  authorPassword: asTrimmedText(authorPassword)
});

const requireCommunityName = (value) => {
  const name = asTrimmedText(value);
  if (!name) {
    throw new Error(COMMUNITY_NAME_REQUIRED_ERROR);
  }
  return name;
};

export const getDatabase = (env = {}) => (
  env.APP_DB || env.DB || env.CHUNXIN_DB || null
);

export const getCommunityBucket = (env = {}) => (
  env.COMMUNITY_BUCKET || env.ASSETS_BUCKET || env.CHUNXIN_R2 || null
);

const MIGRATION_STATEMENTS = [
  `ALTER TABLE passphrases ADD COLUMN max_uses INTEGER`,
  `ALTER TABLE passphrases ADD COLUMN max_uses_per_user INTEGER`,
  `ALTER TABLE passphrases ADD COLUMN phrase_expires_days INTEGER`,
  `CREATE TABLE IF NOT EXISTS passphrase_usage (
    id TEXT PRIMARY KEY,
    passphrase_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_passphrase_usage_phrase ON passphrase_usage(passphrase_id)`,
  `CREATE INDEX IF NOT EXISTS idx_passphrase_usage_client ON passphrase_usage(passphrase_id, client_id)`
];

export const ensureDatabaseSchema = async (env = {}) => {
  const db = getDatabase(env);
  if (!db) {
    throw new Error('Missing D1 binding (APP_DB)');
  }

  // 如果是同一个数据库实例且在缓存有效期内，直接返回
  const now = Date.now();
  if (schemaPromise && schemaDb === db && (now - schemaInitializedAt) < SCHEMA_CACHE_TTL_MS) {
    await schemaPromise;
    return db;
  }

  // 如果是同一个数据库但缓存过期，重置以触发重新初始化
  if (schemaPromise && schemaDb === db) {
    schemaPromise = null;
    schemaInitializedAt = 0;
  }

  schemaDb = db;
  schemaPromise = (async () => {
    for (const statement of SCHEMA_STATEMENTS) {
      await db.prepare(statement).run();
    }
    for (const statement of MIGRATION_STATEMENTS) {
      try {
        await db.prepare(statement).run();
      } catch {
        // 列或表已存在时忽略错误，D1 不支持 IF NOT EXISTS 的 ALTER TABLE
      }
    }
    schemaInitializedAt = Date.now();
  })();
  try {
    await schemaPromise;
  } catch (error) {
    schemaPromise = null;
    schemaInitializedAt = 0;
    throw error;
  }
  return db;
};

const all = async (db, sql, params = []) => {
  const statement = db.prepare(sql).bind(...params);
  const result = await statement.all();
  return Array.isArray(result?.results) ? result.results : [];
};

const first = async (db, sql, params = []) => {
  const statement = db.prepare(sql).bind(...params);
  const row = await statement.first();
  return row || null;
};

const run = async (db, sql, params = []) => {
  const statement = db.prepare(sql).bind(...params);
  return statement.run();
};

const withDbTransaction = async (db, task) => {
  if (!db || typeof db.exec !== 'function') {
    return task();
  }
  // D1 不支持 BEGIN/COMMIT/ROLLBACK，直接执行任务
  // 需要原子性的批量操作应改用 db.batch()
  return task();
};

const buildCommunityAssetPath = (objectKey) => `/api/community/assets/${encodeURIComponent(objectKey)}`;
const isCommunityAssetPath = (value) => String(value || '').startsWith('/api/community/assets/');

const parseDataUrl = (value) => {
  const match = String(value || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  const mimeType = match[1];
  let binary = '';
  try {
    binary = atob(match[2]);
  } catch {
    throw new Error(COMMUNITY_COVER_IMAGE_INVALID_ERROR);
  }
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
  return { bytes, mimeType, ext };
};

const inferContentType = (objectKey) => {
  const lower = String(objectKey || '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
};

const saveCoverImage = async (env, postId, rawImage) => {
  const normalized = asTrimmedText(rawImage);
  if (!normalized) {
    return { coverImage: '', coverObjectKey: '' };
  }
  const parsed = parseDataUrl(normalized);
  if (!parsed) {
    throw new Error(COMMUNITY_COVER_IMAGE_SOURCE_INVALID_ERROR);
  }
  if (parsed.bytes.byteLength > COMMUNITY_COVER_IMAGE_MAX_BYTES) {
    throw new Error(buildCommunityCoverTooLargeMessage(parsed.bytes.byteLength));
  }

  const bucket = getCommunityBucket(env);
  if (!bucket) {
    throw new Error('Missing R2 binding (COMMUNITY_BUCKET)');
  }

  const objectKey = `community/covers/${postId}/${generateId('cover')}.${parsed.ext}`;
  try {
    await bucket.put(objectKey, parsed.bytes, {
      httpMetadata: {
        contentType: parsed.mimeType
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'R2 存储失败';
    throw new Error(`保存封面图片失败：${message}`);
  }

  return {
    coverImage: buildCommunityAssetPath(objectKey),
    coverObjectKey: objectKey
  };
};

const removeCoverImage = async (env, objectKey) => {
  const bucket = getCommunityBucket(env);
  if (!bucket || !objectKey) return;
  await bucket.delete(objectKey).catch(() => {});
};

export const isValidCommunityShareType = (value) => COMMUNITY_SHARE_TYPES.has(asTrimmedText(value));

const normalizePassphraseItem = (item, index = 0, defaultLimit = 2000) => ({
  id: asTrimmedText(item?.id) || generateId(`pp_${index}`),
  phrase: asTrimmedText(item?.phrase),
  limit: Math.floor(asNumber(item?.limit, defaultLimit)),
  validDays: Math.max(0, Math.floor(asNumber(item?.validDays, 0))),
  phraseExpiresDays: item?.phraseExpiresDays !== undefined ? (item?.phraseExpiresDays === null || item?.phraseExpiresDays === '' ? null : Math.max(0, Math.floor(asNumber(item?.phraseExpiresDays, 0)))) : null,
  maxUses: item?.maxUses !== undefined ? (item?.maxUses === null || item?.maxUses === '' ? null : Math.max(0, Math.floor(asNumber(item?.maxUses, 0)))) : null,
  maxUsesPerUser: item?.maxUsesPerUser !== undefined ? (item?.maxUsesPerUser === null || item?.maxUsesPerUser === '' ? null : Math.max(0, Math.floor(asNumber(item?.maxUsesPerUser, 0)))) : null,
  isActive: item?.isActive !== false
});

const requireValidPassphraseItem = (item) => {
  if (!item.phrase) {
    throw new Error(PASSPHRASE_REQUIRED_ERROR);
  }
  return item;
};

export const parsePassphraseList = (passphrases, defaultLimit = 2000) => {
  if (Array.isArray(passphrases)) {
    return passphrases
      .map((item, index) => normalizePassphraseItem(item, index, defaultLimit))
      .filter((item) => item.phrase);
  }

  if (typeof passphrases === 'string' && passphrases.trim()) {
    return passphrases
      .split(',')
      .map((part, index) => {
        const segments = part.trim().split(':');
        const phrase = asTrimmedText(segments[0]);
        if (!phrase) return null;
        const limitRaw = asTrimmedText(segments[1], String(defaultLimit)).toLowerCase();
        const limit = ['0', 'inf', 'unlimited', '无限'].includes(limitRaw)
          ? -1
          : Math.floor(asNumber(limitRaw, defaultLimit));
        const validDays = Math.max(0, Math.floor(asNumber(segments[2], 0)));
        return normalizePassphraseItem({
          id: generateId(`pp_${index}`),
          phrase,
          limit,
          validDays,
          isActive: true
        }, index, defaultLimit);
      })
      .filter(Boolean);
  }

  return [];
};

export const listPassphrases = async (env) => {
  const db = await ensureDatabaseSchema(env);
  return all(db, 'SELECT id, phrase, "limit", valid_days, phrase_expires_days, max_uses, max_uses_per_user, is_active FROM passphrases ORDER BY created_at DESC')
    .then((rows) => rows.map((row) => ({
      id: row.id,
      phrase: row.phrase,
      limit: Number(row.limit),
      validDays: Number(row.valid_days || 0),
      phraseExpiresDays: row.phrase_expires_days === null || row.phrase_expires_days === undefined || row.phrase_expires_days === '' ? null : Number(row.phrase_expires_days),
      maxUses: row.max_uses === null || row.max_uses === undefined || row.max_uses === '' ? null : Number(row.max_uses),
      maxUsesPerUser: row.max_uses_per_user === null || row.max_uses_per_user === undefined || row.max_uses_per_user === '' ? null : Number(row.max_uses_per_user),
      isActive: Number(row.is_active || 0) === 1
    })));
};

export const findActivePassphrase = async (env, phrase) => {
  const db = await ensureDatabaseSchema(env);
  return first(
    db,
    'SELECT id, phrase, "limit", valid_days, phrase_expires_days, max_uses, max_uses_per_user, is_active, created_at FROM passphrases WHERE phrase = ? AND is_active = 1 LIMIT 1',
    [asTrimmedText(phrase)]
  );
};

export const replaceAllPassphrases = async (env, list) => {
  const db = await ensureDatabaseSchema(env);
  const now = Date.now();
  const normalized = parsePassphraseList(list);

  const statements = [db.prepare('DELETE FROM passphrases')];
  for (const item of normalized) {
    statements.push(
      db.prepare('INSERT INTO passphrases (id, phrase, "limit", valid_days, phrase_expires_days, max_uses, max_uses_per_user, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(item.id, item.phrase, item.limit, item.validDays, item.phraseExpiresDays, item.maxUses, item.maxUsesPerUser, item.isActive ? 1 : 0, now, now)
    );
  }

  if (statements.length > 1) {
    await db.batch(statements);
  } else {
    await run(db, 'DELETE FROM passphrases');
  }

  return normalized;
};

export const addPassphrase = async (env, payload) => {
  const db = await ensureDatabaseSchema(env);
  const item = requireValidPassphraseItem(normalizePassphraseItem(payload, 0));
  const now = Date.now();
  await run(
    db,
    'INSERT INTO passphrases (id, phrase, "limit", valid_days, phrase_expires_days, max_uses, max_uses_per_user, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [item.id, item.phrase, item.limit, item.validDays, item.phraseExpiresDays, item.maxUses, item.maxUsesPerUser, item.isActive ? 1 : 0, now, now]
  );
  return item;
};

export const updatePassphrase = async (env, id, payload) => {
  const db = await ensureDatabaseSchema(env);
  const existing = await first(
    db,
    'SELECT id, phrase, "limit", valid_days, phrase_expires_days, max_uses, max_uses_per_user, is_active FROM passphrases WHERE id = ? LIMIT 1',
    [id]
  );
  if (!existing) return null;
  const item = requireValidPassphraseItem(normalizePassphraseItem({
    id,
    phrase: payload?.phrase !== undefined ? payload.phrase : existing.phrase,
    limit: payload?.limit !== undefined ? payload.limit : existing.limit,
    validDays: payload?.validDays !== undefined ? payload.validDays : existing.valid_days,
    phraseExpiresDays: payload?.phraseExpiresDays !== undefined ? payload.phraseExpiresDays : existing.phrase_expires_days,
    maxUses: payload?.maxUses !== undefined ? payload.maxUses : existing.max_uses,
    maxUsesPerUser: payload?.maxUsesPerUser !== undefined ? payload.maxUsesPerUser : existing.max_uses_per_user,
    isActive: payload?.isActive !== undefined ? payload.isActive : Number(existing.is_active || 0) === 1
  }, 0));
  const updated = await first(
    db,
    'UPDATE passphrases SET phrase = ?, "limit" = ?, valid_days = ?, phrase_expires_days = ?, max_uses = ?, max_uses_per_user = ?, is_active = ?, updated_at = ? WHERE id = ? RETURNING id',
    [item.phrase, item.limit, item.validDays, item.phraseExpiresDays, item.maxUses, item.maxUsesPerUser, item.isActive ? 1 : 0, Date.now(), id]
  );
  return updated?.id ? item : null;
};

export const deletePassphrase = async (env, id) => {
  const db = await ensureDatabaseSchema(env);
  const deleted = await first(db, 'DELETE FROM passphrases WHERE id = ? RETURNING id', [id]);
  return !!deleted?.id;
};

export const getPassphraseUsageCount = async (env, passphraseId) => {
  const db = await ensureDatabaseSchema(env);
  const row = await first(
    db,
    'SELECT COUNT(*) AS total FROM passphrase_usage WHERE passphrase_id = ?',
    [passphraseId]
  );
  return Math.max(0, Math.floor(asNumber(row?.total, 0)));
};

export const getPassphraseUsageCountByClient = async (env, passphraseId, clientId) => {
  const db = await ensureDatabaseSchema(env);
  const row = await first(
    db,
    'SELECT COUNT(*) AS total FROM passphrase_usage WHERE passphrase_id = ? AND client_id = ?',
    [passphraseId, asTrimmedText(clientId, 'anonymous')]
  );
  return Math.max(0, Math.floor(asNumber(row?.total, 0)));
};

export const recordPassphraseUsage = async (env, passphraseId, clientId) => {
  const db = await ensureDatabaseSchema(env);
  const now = Date.now();
  await run(
    db,
    'INSERT INTO passphrase_usage (id, passphrase_id, client_id, created_at) VALUES (?, ?, ?, ?)',
    [generateId('pu'), passphraseId, asTrimmedText(clientId, 'anonymous'), now]
  );
};

const getSetting = async (env, key) => {
  const db = await ensureDatabaseSchema(env);
  const row = await first(db, 'SELECT value FROM app_settings WHERE key = ? LIMIT 1', [key]);
  return typeof row?.value === 'string' ? row.value : '';
};

const setSetting = async (env, key, value) => {
  const db = await ensureDatabaseSchema(env);
  const now = Date.now();
  await run(
    db,
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, now]
  );
};

export const getAiConfig = async (env) => {
  const raw = await getSetting(env, APP_AI_CONFIG_KEY);
  if (!raw.trim()) return null;
  return normalizeAiConfigOverride(parseJson(raw, {}));
};

export const saveAiConfig = async (env, payload) => {
  const override = buildStoredAiConfigOverride(payload, env);
  await setSetting(env, APP_AI_CONFIG_KEY, override ? JSON.stringify(override) : '');
  return override;
};

export const listTeamNotices = async (env) => {
  const db = await ensureDatabaseSchema(env);
  return all(db, 'SELECT id, title, content, type, created_at FROM team_notices ORDER BY created_at DESC')
    .then((rows) => rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      type: row.type,
      createdAt: Number(row.created_at || 0)
    })));
};

export const addTeamNotice = async (env, payload) => {
  const db = await ensureDatabaseSchema(env);
  const notice = {
    id: generateId('notice'),
    title: asTrimmedText(payload?.title),
    content: asTrimmedText(payload?.content),
    type: ['announcement', 'update', 'notice'].includes(asTrimmedText(payload?.type))
      ? asTrimmedText(payload?.type)
      : 'notice',
    createdAt: Date.now()
  };
  if (!notice.title || !notice.content) {
    throw new Error(TEAM_NOTICE_REQUIRED_ERROR);
  }
  await run(
    db,
    'INSERT INTO team_notices (id, title, content, type, created_at) VALUES (?, ?, ?, ?, ?)',
    [notice.id, notice.title, notice.content, notice.type, notice.createdAt]
  );
  return notice;
};

export const deleteTeamNotice = async (env, id) => {
  const db = await ensureDatabaseSchema(env);
  const deleted = await first(db, 'DELETE FROM team_notices WHERE id = ? RETURNING id', [id]);
  return !!deleted?.id;
};

export const clearTeamNotices = async (env) => {
  const db = await ensureDatabaseSchema(env);
  await run(db, 'DELETE FROM team_notices');
};

export const listDonors = async (env) => {
  const db = await ensureDatabaseSchema(env);
  return all(
    db,
    `SELECT id, name, amount, message, date, created_at
     FROM donors
     ORDER BY CASE WHEN date IS NULL OR date = '' THEN 1 ELSE 0 END, date ASC, created_at ASC`
  ).then((rows) => rows.map((row) => ({
    id: row.id,
    name: row.name,
    amount: row.amount || '',
    message: row.message || '',
    date: row.date || ''
  })));
};

export const addDonor = async (env, payload) => {
  const db = await ensureDatabaseSchema(env);
  const donor = requireValidDonorPayload({
    ...normalizeDonorPayload(payload),
    createdAt: Date.now()
  });
  await run(
    db,
    'INSERT INTO donors (id, name, amount, message, date, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [donor.id, donor.name, donor.amount || null, donor.message || null, donor.date || null, donor.createdAt]
  );
  return donor;
};

export const updateDonor = async (env, id, payload) => {
  const db = await ensureDatabaseSchema(env);
  const existing = await first(
    db,
    'SELECT id, name, amount, message, date FROM donors WHERE id = ? LIMIT 1',
    [id]
  );
  if (!existing) return null;
  const donor = requireValidDonorPayload(normalizeDonorPayload({
    id,
    name: payload?.name !== undefined ? payload.name : existing.name,
    amount: payload?.amount !== undefined ? payload.amount : existing.amount,
    message: payload?.message !== undefined ? payload.message : existing.message,
    date: payload?.date !== undefined ? payload.date : existing.date
  }));
  const updated = await first(
    db,
    'UPDATE donors SET name = ?, amount = ?, message = ?, date = ? WHERE id = ? RETURNING id',
    [
      donor.name,
      donor.amount || null,
      donor.message || null,
      donor.date || null,
      id
    ]
  );
  return updated?.id ? donor : null;
};

export const deleteDonor = async (env, id) => {
  const db = await ensureDatabaseSchema(env);
  const deleted = await first(db, 'DELETE FROM donors WHERE id = ? RETURNING id', [id]);
  return !!deleted?.id;
};

export const replaceDonors = async (env, donors) => {
  const db = await ensureDatabaseSchema(env);
  const now = Date.now();
  const normalized = Array.isArray(donors) ? donors : [];

  const statements = [db.prepare('DELETE FROM donors')];
  for (const donor of normalized) {
    const name = asTrimmedText(donor?.name);
    if (!name) continue;
    statements.push(
      db.prepare('INSERT INTO donors (id, name, amount, message, date, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(generateId('donor'), name, asTrimmedText(donor?.amount) || null, asTrimmedText(donor?.message) || null, asTrimmedText(donor?.date) || null, now)
    );
  }

  if (statements.length > 1) {
    await db.batch(statements);
  } else {
    await run(db, 'DELETE FROM donors');
  }

  return listDonors(env);
};

const normalizeDonorPayload = (payload = {}) => ({
  id: asTrimmedText(payload.id) || generateId('donor'),
  name: asTrimmedText(payload.name),
  amount: asTrimmedText(payload.amount),
  message: asTrimmedText(payload.message),
  date: asTrimmedText(payload.date)
});

const requireValidDonorPayload = (item) => {
  if (!item.name) {
    throw new Error(DONOR_NAME_REQUIRED_ERROR);
  }
  return item;
};

const normalizeApkVersionPayload = (payload = {}) => ({
  id: asTrimmedText(payload.id) || generateId('apk'),
  version: asTrimmedText(payload.version),
  versionCode: Math.max(0, Math.floor(asNumber(payload.versionCode, 0))),
  apkUrl: asTrimmedText(payload.apkUrl),
  apkSize: Math.max(0, Math.floor(asNumber(payload.apkSize, 0))) || null,
  updateLog: asText(payload.updateLog || '').trim(),
  forceUpdate: payload.forceUpdate === true || payload.forceUpdate === 1,
  minVersion: toPositiveInt(payload.minVersion, 0) || null
});

const requireValidApkVersionPayload = (item) => {
  if (!item.version || !item.versionCode || !item.apkUrl) {
    throw new Error('版本号、版本代码、APK 地址不能为空');
  }
  return item;
};

export const listApkVersions = async (env) => {
  const db = await ensureDatabaseSchema(env);
  return all(
    db,
    'SELECT id, version, versionCode, apkUrl, apkSize, updateLog, forceUpdate, minVersion, created_at FROM apk_versions ORDER BY versionCode DESC, created_at DESC'
  ).then((rows) => rows.map((row) => ({
    id: row.id,
    version: row.version,
    versionCode: Number(row.versionCode || 0),
    apkUrl: row.apkUrl,
    apkSize: row.apkSize === null ? undefined : Number(row.apkSize),
    updateLog: row.updateLog || '',
    forceUpdate: Number(row.forceUpdate || 0) === 1,
    minVersion: row.minVersion === null ? undefined : Number(row.minVersion),
    createdAt: Number(row.created_at || 0)
  })));
};

export const addApkVersion = async (env, payload) => {
  const db = await ensureDatabaseSchema(env);
  const item = requireValidApkVersionPayload(normalizeApkVersionPayload(payload));
  const now = Date.now();
  await run(
    db,
    `INSERT INTO apk_versions (id, version, versionCode, apkUrl, apkSize, updateLog, forceUpdate, minVersion, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [item.id, item.version, item.versionCode, item.apkUrl, item.apkSize, item.updateLog, item.forceUpdate ? 1 : 0, item.minVersion, now, now]
  );
  return item;
};

export const updateApkVersion = async (env, id, payload) => {
  const db = await ensureDatabaseSchema(env);
  const existing = await first(
    db,
    'SELECT id, version, versionCode, apkUrl, apkSize, updateLog, forceUpdate, minVersion FROM apk_versions WHERE id = ? LIMIT 1',
    [id]
  );
  if (!existing) return null;
  const item = requireValidApkVersionPayload(normalizeApkVersionPayload({
    id,
    version: payload?.version !== undefined ? payload.version : existing.version,
    versionCode: payload?.versionCode !== undefined ? payload.versionCode : existing.versionCode,
    apkUrl: payload?.apkUrl !== undefined ? payload.apkUrl : existing.apkUrl,
    apkSize: payload?.apkSize !== undefined ? payload.apkSize : existing.apkSize,
    updateLog: payload?.updateLog !== undefined ? payload.updateLog : existing.updateLog,
    forceUpdate: payload?.forceUpdate !== undefined ? payload.forceUpdate : Number(existing.forceUpdate || 0) === 1,
    minVersion: payload?.minVersion !== undefined ? payload.minVersion : existing.minVersion
  }));
  const updated = await first(
    db,
    `UPDATE apk_versions
     SET version = ?, versionCode = ?, apkUrl = ?, apkSize = ?, updateLog = ?, forceUpdate = ?, minVersion = ?, updated_at = ?
     WHERE id = ?
     RETURNING id`,
    [item.version, item.versionCode, item.apkUrl, item.apkSize, item.updateLog, item.forceUpdate ? 1 : 0, item.minVersion, Date.now(), id]
  );
  return updated?.id ? item : null;
};

export const deleteApkVersion = async (env, id) => {
  const db = await ensureDatabaseSchema(env);
  const deleted = await first(db, 'DELETE FROM apk_versions WHERE id = ? RETURNING id', [id]);
  return !!deleted?.id;
};

export const getLatestApkVersion = async (env) => {
  const versions = await listApkVersions(env);
  return versions[0] || null;
};

const buildCommunityListRow = (row) => ({
  id: row.id,
  type: row.type,
  name: row.name,
  description: row.description || '',
  avatar: row.avatar || '',
  cover_image: row.cover_image || '',
  author_name: row.author_name || '',
  is_anonymous: Number(row.is_anonymous || 0),
  is_encrypted: Number(row.is_encrypted || 0),
  like_count: Number(row.like_count || 0),
  download_count: Number(row.download_count || 0),
  created_at: Number(row.created_at || 0)
});

const buildCommunityAdminRow = (row) => ({
  ...buildCommunityListRow(row),
  report_count: Number(row.report_count || 0)
});

const getCommunityAdminRow = async (env, id) => {
  const db = await ensureDatabaseSchema(env);
  const row = await first(
    db,
    `SELECT id, type, name, description, avatar, cover_image, author_name, is_anonymous, is_encrypted, like_count, download_count, report_count, created_at
     FROM community_shares
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return row ? buildCommunityAdminRow(row) : null;
};

const getCommunityRow = async (env, id) => {
  const db = await ensureDatabaseSchema(env);
  return first(db, 'SELECT * FROM community_shares WHERE id = ? LIMIT 1', [id]);
};

const deleteCommunityShareRecordInternal = async (db, row) => {
  if (!row) {
    return false;
  }
  const id = row.id;
  await run(db, 'DELETE FROM community_share_likes WHERE post_id = ?', [id]);
  await run(db, 'DELETE FROM community_share_reports WHERE post_id = ?', [id]);
  await run(db, 'DELETE FROM community_shares WHERE id = ?', [id]);
  return true;
};

const deleteCommunityShareRecord = async (env, id) => {
  const db = await ensureDatabaseSchema(env);
  const row = await getCommunityRow(env, id);
  if (!row) {
    return false;
  }
  await deleteCommunityShareRecordInternal(db, row);
  if (row?.cover_object_key) {
    await removeCoverImage(env, row.cover_object_key);
  }
  return true;
};

export const listCommunityShares = async (env, params = {}) => {
  const db = await ensureDatabaseSchema(env);
  const type = asTrimmedText(params.type);
  const page = Math.max(1, Math.floor(asNumber(params.page, 1)));
  const pageSize = Math.min(50, Math.max(1, Math.floor(asNumber(params.pageSize, 20))));
  const search = asTrimmedText(params.search);
  const sort = asTrimmedText(params.sort) || 'newest';
  const offset = (page - 1) * pageSize;

  let where = `status = 'active'`;
  const bindings = [];
  if (type) {
    where += ' AND type = ?';
    bindings.push(type);
  }
  if (search) {
    where += ' AND (name LIKE ? OR description LIKE ?)';
    bindings.push(`%${search}%`, `%${search}%`);
  }

  let orderBy = 'created_at DESC, id DESC';
  if (sort === 'popular') {
    orderBy = '(like_count * 2 + download_count) DESC, created_at DESC, id DESC';
  } else if (sort === 'likes') {
    orderBy = 'like_count DESC, created_at DESC, id DESC';
  } else if (sort === 'downloads') {
    orderBy = 'download_count DESC, created_at DESC, id DESC';
  }

  const totalRow = await first(db, `SELECT COUNT(*) AS total FROM community_shares WHERE ${where}`, bindings);
  const items = await all(
    db,
    `SELECT id, type, name, description, avatar, cover_image, author_name, is_anonymous, is_encrypted, like_count, download_count, created_at
     FROM community_shares
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...bindings, pageSize, offset]
  );

  return {
    items: items.map(buildCommunityListRow),
    total: Number(totalRow?.total || 0),
    page,
    pageSize
  };
};

export const uploadCommunityShare = async (env, payload, clientId) => {
  const db = await ensureDatabaseSchema(env);
  const id = generateId('cs');
  const now = Date.now();
  const shareName = requireCommunityName(payload?.name);
  const { authorName, authorPassword } = getCommunityAuthorCredentials(payload?.author_name, payload?.author_password);
  if (!authorName || !authorPassword) {
    throw new Error(COMMUNITY_AUTHOR_REQUIRED_ERROR);
  }
  const authorPasswordHash = await sha256Hex(`${authorName}\n${authorPassword}`);
  const preparedPayload = prepareCommunityPayloadForStorage(
    asTrimmedText(payload?.type),
    payload?.payload ?? {},
    payload?.is_encrypted === true || payload?.is_encrypted === 1
  );
  if (preparedPayload.bytes > COMMUNITY_UPLOAD_PAYLOAD_LIMIT_BYTES) {
    throw new Error(buildCommunityPayloadTooLargeMessage(preparedPayload.bytes));
  }
  const cover = await saveCoverImage(env, id, payload?.cover_image);
  try {
    await run(
      db,
      `INSERT INTO community_shares (
        id, client_id, type, name, description, avatar, cover_image, cover_object_key,
        author_name, author_password_hash, is_anonymous, is_encrypted, payload,
        like_count, download_count, report_count, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'active', ?, ?)`,
      [
        id,
        asTrimmedText(clientId),
        asTrimmedText(payload?.type),
        shareName,
        asText(payload?.description || ''),
        asText(payload?.avatar || ''),
        cover.coverImage,
        cover.coverObjectKey,
        authorName,
        authorPasswordHash,
        payload?.is_anonymous ? 1 : 0,
        payload?.is_encrypted ? 1 : 0,
        preparedPayload.payloadString,
        now,
        now
      ]
    );
  } catch (error) {
    if (cover.coverObjectKey) {
      await removeCoverImage(env, cover.coverObjectKey);
    }
    throw error;
  }
 
  return { id, created_at: now };
};

export const getCommunityDetail = async (env, id) => {
  const row = await getCommunityRow(env, id);
  if (!row || row.status !== 'active') return null;
  return buildCommunityListRow(row);
};

export const downloadCommunityShare = async (env, id) => {
  const db = await ensureDatabaseSchema(env);
  const row = await getCommunityRow(env, id);
  if (!row || row.status !== 'active') return null;
  const updated = await first(
    db,
    "UPDATE community_shares SET download_count = download_count + 1, updated_at = ? WHERE id = ? AND status = 'active' RETURNING download_count",
    [Date.now(), id]
  );
  if (!updated) {
    return null;
  }
  return {
    ...buildCommunityListRow({
      ...row,
      download_count: Number(updated.download_count || 0)
    }),
    payload: parseJson(row.payload, row.payload)
  };
};

export const deleteCommunityShareByAuthor = async (env, id, authorName, authorPassword) => {
  const row = await getCommunityRow(env, id);
  if (!row) return { ok: false, reason: 'not_found' };
  const credentials = getCommunityAuthorCredentials(authorName, authorPassword);
  if (!credentials.authorName || !credentials.authorPassword) {
    if (row.author_name === '' && row.author_password_hash === '') {
      await deleteCommunityShareRecord(env, id);
      return { ok: true, legacy: true };
    }
    return { ok: false, reason: 'missing_author' };
  }
  const expectedHash = await sha256Hex(`${credentials.authorName}\n${credentials.authorPassword}`);
  if (row.author_name !== credentials.authorName || row.author_password_hash !== expectedHash) {
    return { ok: false, reason: 'forbidden' };
  }
  await deleteCommunityShareRecord(env, id);
  return { ok: true };
};

export const listMyCommunityShares = async (env, authorName, authorPassword) => {
  const db = await ensureDatabaseSchema(env);
  const credentials = getCommunityAuthorCredentials(authorName, authorPassword);
  if (!credentials.authorName || !credentials.authorPassword) {
    const rows = await all(
      db,
      `SELECT id, type, name, description, avatar, cover_image, author_name, is_anonymous, is_encrypted, like_count, download_count, created_at
       FROM community_shares
       WHERE author_name = '' AND author_password_hash = '' AND status = 'active'
       ORDER BY created_at DESC`
    );
    return rows.map(buildCommunityListRow);
  }
  const expectedHash = await sha256Hex(`${credentials.authorName}\n${credentials.authorPassword}`);
  const rows = await all(
    db,
    `SELECT id, type, name, description, avatar, cover_image, author_name, is_anonymous, is_encrypted, like_count, download_count, created_at
     FROM community_shares
     WHERE author_name = ? AND author_password_hash = ? AND status = 'active'
     ORDER BY created_at DESC`,
    [credentials.authorName, expectedHash]
  );
  return rows.map(buildCommunityListRow);
};

export const likeCommunityShare = async (env, id, clientId, action = 'like') => {
  const db = await ensureDatabaseSchema(env);
  const share = await getCommunityRow(env, id);
  if (!share || share.status !== 'active') return null;
  const normalizedClientId = asTrimmedText(clientId);
  if (!normalizedClientId) return { like_count: Number(share.like_count || 0), reason: 'missing_client' };
  const wantsLike = action !== 'unlike';
  const now = Date.now();

  if (wantsLike) {
    let inserted = null;
    let updated = null;
    try {
      inserted = await first(
        db,
        'INSERT INTO community_share_likes (post_id, client_id, created_at) VALUES (?, ?, ?) ON CONFLICT(post_id, client_id) DO NOTHING RETURNING post_id',
        [id, normalizedClientId, now]
      );
      if (inserted) {
        updated = await first(
          db,
          "UPDATE community_shares SET like_count = like_count + 1, updated_at = ? WHERE id = ? AND status = 'active' RETURNING like_count",
          [now, id]
        );
        if (!updated) {
          throw new Error(COMMUNITY_LIKE_TARGET_MISSING_ERROR);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message === COMMUNITY_LIKE_TARGET_MISSING_ERROR) {
        return null;
      }
      throw error;
    }
    if (inserted) {
      return { like_count: Number(updated?.like_count || Number(share.like_count || 0) + 1) };
    }
    const current = await first(db, 'SELECT like_count FROM community_shares WHERE id = ? LIMIT 1', [id]);
    return { like_count: Number(current?.like_count || 0) };
  }

  let deleted = null;
  let updated = null;
  try {
    deleted = await first(
      db,
      'DELETE FROM community_share_likes WHERE post_id = ? AND client_id = ? RETURNING post_id',
      [id, normalizedClientId]
    );
    if (deleted) {
      updated = await first(
        db,
        "UPDATE community_shares SET like_count = MAX(0, like_count - 1), updated_at = ? WHERE id = ? AND status = 'active' RETURNING like_count",
        [now, id]
      );
      if (!updated) {
        throw new Error(COMMUNITY_LIKE_TARGET_MISSING_ERROR);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message === COMMUNITY_LIKE_TARGET_MISSING_ERROR) {
      return null;
    }
    throw error;
  }
  if (deleted) {
    return { like_count: Number(updated?.like_count || Math.max(0, Number(share.like_count || 0) - 1)) };
  }
  const current = await first(db, 'SELECT like_count FROM community_shares WHERE id = ? LIMIT 1', [id]);
  return { like_count: Number(current?.like_count || 0) };
};

export const reportCommunityShare = async (env, id, clientId) => {
  const db = await ensureDatabaseSchema(env);
  const share = await getCommunityRow(env, id);
  if (!share || share.status !== 'active') return { reported: false, report_count: 0, reason: 'not_found' };
  const normalizedClientId = asTrimmedText(clientId);
  if (!normalizedClientId) return { reported: false, report_count: Number(share.report_count || 0), reason: 'missing_client' };

  const now = Date.now();
  let inserted = null;
  let updated = null;
  let shouldRemove = false;
  try {
    inserted = await first(
      db,
      'INSERT INTO community_share_reports (post_id, client_id, created_at) VALUES (?, ?, ?) ON CONFLICT(post_id, client_id) DO NOTHING RETURNING post_id',
      [id, normalizedClientId, now]
    );
    if (inserted) {
      updated = await first(
        db,
        "UPDATE community_shares SET report_count = report_count + 1, updated_at = ? WHERE id = ? AND status = 'active' RETURNING report_count",
        [now, id]
      );
      if (!updated) {
        throw new Error(COMMUNITY_REPORT_TARGET_MISSING_ERROR);
      }
      shouldRemove = Number(updated?.report_count || 0) >= COMMUNITY_REPORT_REMOVE_THRESHOLD;
      if (shouldRemove) {
        await deleteCommunityShareRecordInternal(db, share);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message === COMMUNITY_REPORT_TARGET_MISSING_ERROR) {
      return { reported: false, report_count: 0, reason: 'not_found' };
    }
    throw error;
  }
  if (!inserted) {
    const current = await first(db, 'SELECT report_count FROM community_shares WHERE id = ? LIMIT 1', [id]);
    return { reported: false, report_count: Number(current?.report_count || 0), reason: 'duplicate' };
  }
  const nextCount = Number(updated?.report_count || Number(share.report_count || 0) + 1);
  if (shouldRemove) {
    if (share?.cover_object_key) {
      await removeCoverImage(env, share.cover_object_key);
    }
    return { reported: true, report_count: nextCount, removed: true };
  }
  return { reported: true, report_count: nextCount, removed: false };
};

export const listAdminCommunityShares = async (env, search = '') => {
  const db = await ensureDatabaseSchema(env);
  const keyword = asTrimmedText(search);
  let where = '1 = 1';
  const bindings = [];
  if (keyword) {
    where += ' AND (name LIKE ? OR description LIKE ? OR author_name LIKE ?)';
    bindings.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  const rows = await all(
    db,
    `SELECT id, type, name, description, avatar, cover_image, author_name, is_anonymous, is_encrypted, like_count, download_count, report_count, created_at
     FROM community_shares
     WHERE ${where}
     ORDER BY created_at DESC`,
    bindings
  );
  return rows.map(buildCommunityAdminRow);
};

export const deleteAdminCommunityShare = async (env, id) => {
  return deleteCommunityShareRecord(env, id);
};

export const updateAdminCommunityShare = async (env, id, payload) => {
  const db = await ensureDatabaseSchema(env);
  const row = await getCommunityRow(env, id);
  if (!row) return null;
  const nextName = payload.name !== undefined ? requireCommunityName(payload.name) : row.name;

  let coverImage = row.cover_image || '';
  let coverObjectKey = row.cover_object_key || '';
  let nextCoverObjectKey = coverObjectKey;
  const previousCoverObjectKey = row.cover_object_key || '';
  let shouldRemovePreviousCover = false;
  if (payload.cover_image !== undefined) {
    const nextCover = asTrimmedText(payload.cover_image);
    if (!nextCover.trim()) {
      coverImage = '';
      coverObjectKey = '';
      nextCoverObjectKey = '';
      shouldRemovePreviousCover = !!previousCoverObjectKey;
    } else if (nextCover.startsWith('data:image')) {
      const stored = await saveCoverImage(env, id, nextCover);
      coverImage = stored.coverImage;
      coverObjectKey = stored.coverObjectKey;
      nextCoverObjectKey = stored.coverObjectKey;
      shouldRemovePreviousCover = !!previousCoverObjectKey && previousCoverObjectKey !== nextCoverObjectKey;
    } else if (nextCover === (row.cover_image || '') && isCommunityAssetPath(nextCover)) {
      coverImage = nextCover;
      coverObjectKey = previousCoverObjectKey;
      nextCoverObjectKey = previousCoverObjectKey;
      shouldRemovePreviousCover = false;
    } else {
      throw new Error(COMMUNITY_COVER_IMAGE_SOURCE_INVALID_ERROR);
    }
  }

  const nextUpdatedAt = Date.now();
  try {
    const result = await run(
      db,
      `UPDATE community_shares
       SET name = ?, description = ?, like_count = ?, download_count = ?, report_count = ?, cover_image = ?, cover_object_key = ?, updated_at = ?
       WHERE id = ?`,
      [
        nextName,
        payload.description !== undefined ? asText(payload.description) : (row.description || ''),
        payload.like_count !== undefined ? Math.max(0, Math.floor(asNumber(payload.like_count, 0))) : Number(row.like_count || 0),
        payload.download_count !== undefined ? Math.max(0, Math.floor(asNumber(payload.download_count, 0))) : Number(row.download_count || 0),
        payload.report_count !== undefined ? Math.max(0, Math.floor(asNumber(payload.report_count, 0))) : Number(row.report_count || 0),
        coverImage,
        coverObjectKey,
        nextUpdatedAt,
        id
      ]
    );
    const hasExplicitChanges = Number.isFinite(Number(result?.meta?.changes));
    if (hasExplicitChanges && Number(result?.meta?.changes) <= 0) {
      throw new Error(COMMUNITY_ADMIN_UPDATE_TARGET_MISSING_ERROR);
    }
  } catch (error) {
    if (payload.cover_image !== undefined && nextCoverObjectKey && nextCoverObjectKey !== previousCoverObjectKey) {
      await removeCoverImage(env, nextCoverObjectKey);
    }
    if (error instanceof Error && error.message === COMMUNITY_ADMIN_UPDATE_TARGET_MISSING_ERROR) {
      return null;
    }
    throw error;
  }

  if (shouldRemovePreviousCover && previousCoverObjectKey && previousCoverObjectKey !== nextCoverObjectKey) {
    await removeCoverImage(env, previousCoverObjectKey);
  }
  return getCommunityAdminRow(env, id);
};

export const getCommunityAsset = async (env, objectKey) => {
  const bucket = getCommunityBucket(env);
  if (!bucket) return null;
  const key = safeDecodeURIComponent(objectKey);
  if (!key) return null;
  if (!key.startsWith(COMMUNITY_COVER_OBJECT_PREFIX)) return null;

  const db = await ensureDatabaseSchema(env);
  const relatedShare = await first(
    db,
    "SELECT id FROM community_shares WHERE cover_object_key = ? AND status = 'active' LIMIT 1",
    [key]
  );
  if (!relatedShare) return null;

  let object;
  try {
    object = await bucket.get(key);
  } catch {
    return null;
  }
  if (!object) return null;

  const headers = new Headers();
  try {
    object.writeHttpMetadata(headers);
  } catch {
    // 忽略 R2 元数据写入失败
  }
  if (!headers.get('Content-Type')) {
    headers.set('Content-Type', inferContentType(key));
  }
  headers.set('Cache-Control', 'public, max-age=86400');
  return {
    body: object.body,
    headers
  };
};
