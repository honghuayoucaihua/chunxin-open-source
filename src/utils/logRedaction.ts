const SENSITIVE_LOG_VALUE_PATTERN = /((?:api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|token|authorization|password|passphrase|secret)\s*[:=]\s*)(["']?)[^"',\s&}]+(\2)/gi;

export const redactSensitiveLogText = (value: string): string => {
  const text = String(value || '');
  if (!text) return text;
  return text
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1***')
    .replace(SENSITIVE_LOG_VALUE_PATTERN, '$1$2***$3');
};

export const formatSafeLogError = (
  error: unknown,
  maxMessageLength = 240
): { name: string; message: string } => {
  const name = error instanceof Error ? error.name || 'Error' : typeof error;
  const rawMessage = error instanceof Error ? error.message : String(error || '');
  const message = redactSensitiveLogText(rawMessage).slice(0, maxMessageLength);
  return {
    name,
    message: message || 'unknown error'
  };
};
