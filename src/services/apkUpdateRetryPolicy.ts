const RETRYABLE_HTTP_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export function extractHttpStatusFromError(error: unknown): number | null {
  const message = error instanceof Error ? error.message : String(error || '');
  const match = message.match(/\bHTTP\s+(\d{3})\b/i);
  if (!match) return null;
  const status = Number(match[1]);
  return Number.isFinite(status) ? status : null;
}

export function shouldRetryApkUpdateCheckError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = message.trim().toLowerCase();
  const status = extractHttpStatusFromError(error);

  if (status !== null) {
    return RETRYABLE_HTTP_STATUS.has(status);
  }

  if (error instanceof SyntaxError) return false;

  return [
    'timeout',
    'timed out',
    'abort',
    'networkerror',
    'network error',
    'network request failed',
    'failed to fetch',
    'fetch failed',
    'load failed',
    'unable to resolve host',
    'temporarily unavailable'
  ].some((keyword) => normalized.includes(keyword));
}
