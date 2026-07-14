const rateLimitStore = new Map();

const MAX_RATE_LIMIT_ENTRIES = 10000;
const STALE_ENTRY_TTL_MS = 48 * 60 * 60 * 1000;

const pruneMap = (map, maxEntries, shouldDelete) => {
  if (map.size <= maxEntries) return;
  for (const [key, value] of map.entries()) {
    if (shouldDelete(value)) {
      map.delete(key);
    }
    if (map.size <= maxEntries) break;
  }
};

const normalizeRateLimitInput = (identifier, maxRequests = 30, windowMs = 60000) => {
  const safeIdentifier = String(identifier || '').trim() || 'anonymous';
  const safeMaxRequests = Math.max(1, Math.floor(Number(maxRequests || 30)));
  const safeWindowMs = Math.max(1000, Math.floor(Number(windowMs || 60000)));
  return {
    identifier: safeIdentifier,
    maxRequests: safeMaxRequests,
    saturatedCount: safeMaxRequests + 1,
    windowMs: safeWindowMs
  };
};

const buildRateLimitResult = (count, startTime, maxRequests, windowMs) => ({
  allowed: count <= maxRequests,
  remaining: Math.max(0, maxRequests - count),
  resetTime: startTime + windowMs
});

export const checkRateLimit = (identifier, maxRequests = 30, windowMs = 60000) => {
  const now = Date.now();
  const normalized = normalizeRateLimitInput(identifier, maxRequests, windowMs);
  const existing = rateLimitStore.get(normalized.identifier);

  if (!existing || now - existing.startTime >= normalized.windowMs) {
    rateLimitStore.set(normalized.identifier, {
      count: 1,
      startTime: now
    });
    pruneMap(rateLimitStore, MAX_RATE_LIMIT_ENTRIES, (value) => now - Number(value?.startTime || 0) > STALE_ENTRY_TTL_MS);
    return buildRateLimitResult(1, now, normalized.maxRequests, normalized.windowMs);
  }

  existing.count = Math.min(existing.count + 1, normalized.saturatedCount);
  return buildRateLimitResult(existing.count, existing.startTime, normalized.maxRequests, normalized.windowMs);
};
