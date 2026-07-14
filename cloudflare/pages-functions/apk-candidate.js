const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_CANDIDATE_METADATA_PATH = 'apk/candidates/latest.json';

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function toSafeInt(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

function buildMetadataUrl(publicBaseUrl, metadataPath = DEFAULT_CANDIDATE_METADATA_PATH) {
  const normalizedBaseUrl = trimTrailingSlash(publicBaseUrl);
  const normalizedPath = String(metadataPath || DEFAULT_CANDIDATE_METADATA_PATH).replace(/^\/+/, '');
  if (!normalizedBaseUrl) return '';
  return `${normalizedBaseUrl}/${normalizedPath}`;
}

function pickFirstString(...values) {
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (normalized) return normalized;
  }
  return '';
}

function redactSensitiveText(value) {
  const text = String(value || '');
  if (!text) return text;
  return text
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1***')
    .replace(
      /((?:api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|token|authorization|password|passphrase|secret)\s*[:=]\s*)(["']?)[^"',\s&}]+(\2)/gi,
      '$1$2***$3'
    );
}

function formatUpstreamErrorText(value, limit = 300) {
  const text = redactSensitiveText(String(value || '').trim());
  if (!text) return '';
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}...`;
}

function parseBooleanFlag(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value === null || value === undefined) return false;
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  return Boolean(value);
}

function normalizeMetadataRecord(metadata, publicBaseUrl = '') {
  const filename = pickFirstString(
    metadata?.filename,
    metadata?.apkName,
    metadata?.apk_name,
    metadata?.name
  );
  const versionCode = toSafeInt(
    metadata?.versionCode
    ?? metadata?.buildNumber
    ?? metadata?.build_number
    ?? metadata?.version_code
  );
  const apkUrl = pickFirstString(
    metadata?.apkUrl,
    metadata?.downloadUrl,
    metadata?.download_url,
    metadata?.url,
    publicBaseUrl && filename ? `${trimTrailingSlash(publicBaseUrl)}/apk/${filename}` : ''
  );
  if (!apkUrl || !versionCode) return null;

  return {
    id: pickFirstString(metadata?.id, metadata?.tagName, metadata?.tag_name, filename),
    tagName: pickFirstString(metadata?.tagName, metadata?.tag_name),
    version: pickFirstString(
      metadata?.version,
      metadata?.versionName,
      metadata?.version_name,
      String(versionCode)
    ) || String(versionCode),
    versionCode,
    apkUrl,
    apkSize: toSafeInt(metadata?.apkSize) || null,
    updateLog: pickFirstString(
      metadata?.updateLog,
      metadata?.update_log,
      metadata?.changelog,
      metadata?.releaseNotes,
      'GitHub 自动构建候选 APK'
    ),
    forceUpdate: parseBooleanFlag(metadata?.forceUpdate),
    minVersion: metadata?.minVersion === null || metadata?.minVersion === undefined ? null : toSafeInt(metadata.minVersion),
    createdAt: toSafeInt(metadata?.createdAt) || Date.now(),
    source: 'r2-candidate'
  };
}

export function createApkCandidateSource({
  env = {},
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  log = console
} = {}) {
  let cache = {
    expiresAt: 0,
    value: null,
    hasValue: false,
    inflight: null
  };

  const publicBaseUrl = String(env.APK_R2_PUBLIC_BASE_URL || env.R2_PUBLIC_BASE_URL || '').trim();
  const metadataUrl = String(env.APK_R2_CANDIDATE_METADATA_URL || '').trim()
    || buildMetadataUrl(publicBaseUrl, env.APK_R2_CANDIDATE_METADATA_PATH || DEFAULT_CANDIDATE_METADATA_PATH);
  const cacheTtlMs = Math.max(10 * 1000, toSafeInt(env.APK_CANDIDATE_CACHE_TTL_MS) || DEFAULT_CACHE_TTL_MS);

  const isConfigured = () => Boolean(metadataUrl) && typeof fetchImpl === 'function';

  const fetchCandidate = async () => {
    if (!isConfigured()) return null;
    const response = await fetchImpl(metadataUrl, {
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    if (response.status === 404) return null;

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const safeText = formatUpstreamErrorText(text);
      throw new Error(`候选 APK 元数据请求失败（${response.status}）${safeText ? `: ${safeText}` : ''}`);
    }

    const metadata = await response.json().catch(() => { throw new Error('候选 APK 元数据返回的不是有效 JSON'); });
    return normalizeMetadataRecord(metadata, publicBaseUrl);
  };

  const getLatestCandidate = async ({ forceRefresh = false } = {}) => {
    if (!isConfigured()) return null;
    if (!forceRefresh && cache.hasValue && cache.expiresAt > now()) {
      return cache.value;
    }
    if (!forceRefresh && cache.inflight) {
      return cache.inflight;
    }

    cache.inflight = fetchCandidate()
      .then((result) => {
        cache.value = result;
        cache.hasValue = true;
        cache.expiresAt = now() + cacheTtlMs;
        return result;
      })
      .catch((error) => {
        log?.warn?.('[APK] 读取候选元数据失败:', error?.message || error);
        if (cache.hasValue && cache.expiresAt > now()) {
          return cache.value;
        }
        throw error;
      })
      .finally(() => {
        cache.inflight = null;
      });

    return cache.inflight;
  };

  const clearCache = () => {
    cache = {
      expiresAt: 0,
      value: null,
      hasValue: false,
      inflight: null
    };
  };

  return {
    isConfigured,
    getLatestCandidate,
    clearCache
  };
}

export const __apkCandidateInternals = {
  buildMetadataUrl,
  formatUpstreamErrorText,
  normalizeMetadataRecord,
  parseBooleanFlag
};
