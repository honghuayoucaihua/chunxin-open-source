import {
  MAX_PROXY_CONTEXT_CHARS,
  estimateProxyMessageChars,
  isProxyContextWithinBudget
} from './proxy-budget.js';

export {
  MAX_PROXY_CONTEXT_CHARS,
  estimateProxyMessageChars,
  isProxyContextWithinBudget
};

export const DEFAULT_FREE_MODELS = ['free/cc'];
export const DEFAULT_DAILY_LIMIT = 500;
export const DEFAULT_PROXY_TIMEOUT_MS = 180000;
export const DEFAULT_TIME_ZONE = 'Asia/Shanghai';

const DEFAULT_CLIENT_RATE = Object.freeze({
  max: 20,
  windowMs: 60000
});

export const DEFAULT_BUILTIN_AI_CONFIG = Object.freeze({
  defaultDailyLimit: DEFAULT_DAILY_LIMIT,
  maxContextChars: MAX_PROXY_CONTEXT_CHARS,
  proxyTimeoutMs: DEFAULT_PROXY_TIMEOUT_MS,
  models: [...DEFAULT_FREE_MODELS],
  defaultModel: DEFAULT_FREE_MODELS[0],
  fallbackModel: DEFAULT_FREE_MODELS[0],
  enforceModelWhitelist: true
});

const AI_CONFIG_FIELDS = Object.freeze([
  'defaultDailyLimit',
  'maxContextChars',
  'proxyTimeoutMs',
  'defaultTemperature',
  'models',
  'defaultModel',
  'fallbackModel',
  'enforceModelWhitelist'
]);

const clampInt = (value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
};

const clampFloat = (value, fallback, { min = 0, max = 1 } = {}) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
};

const normalizeModelName = (value) => String(value || '').trim().replace(/^models\//, '');

const parseStringList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  const raw = String(value || '').trim();
  if (!raw) return [];

  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || '').trim()).filter(Boolean);
      }
    } catch {
      // Ignore invalid JSON and fall back to comma/newline parsing.
    }
  }

  return raw
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const getAllowedModels = (env) => {
  const source = parseStringList(env.BUILTIN_AI_MODELS || env.CF_PAGES_BUILTIN_AI_MODELS);
  return source;
};

const resolveTimeZone = (value) => {
  const timeZone = String(value || '').trim() || DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
};

const parseRate = (maxValue, windowValue, fallback) => ({
  max: clampInt(maxValue, fallback.max, { min: 1, max: 100000 }),
  windowMs: clampInt(windowValue, fallback.windowMs, { min: 1000, max: 24 * 60 * 60 * 1000 })
});

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const sanitizeModelList = (input, fallback = DEFAULT_FREE_MODELS) => {
  const source = Array.isArray(input) ? input : parseStringList(input);
  const seen = new Set();
  const models = [];
  for (const item of source) {
    const normalized = normalizeModelName(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    models.push(normalized);
  }
  return models.length > 0 ? models : [...fallback];
};

export const normalizeAiConfig = (input = {}) => {
  const source = input && typeof input === 'object' ? input : {};
  const models = sanitizeModelList(source.models, DEFAULT_FREE_MODELS);
  const requestedDefaultModel = normalizeModelName(source.defaultModel);
  const requestedFallbackModel = normalizeModelName(source.fallbackModel);

  const defaultModel = models.includes(requestedDefaultModel)
    ? requestedDefaultModel
    : models[0];
  const fallbackModel = models.includes(requestedFallbackModel)
    ? requestedFallbackModel
    : (models.includes(defaultModel) ? defaultModel : models[0]);

  return {
    defaultDailyLimit: clampInt(source.defaultDailyLimit, DEFAULT_BUILTIN_AI_CONFIG.defaultDailyLimit, { min: 0, max: 10_000_000 }),
    maxContextChars: clampInt(source.maxContextChars, DEFAULT_BUILTIN_AI_CONFIG.maxContextChars, { min: 1000, max: 5_000_000 }),
    proxyTimeoutMs: clampInt(source.proxyTimeoutMs, DEFAULT_BUILTIN_AI_CONFIG.proxyTimeoutMs, { min: 1000, max: 10 * 60 * 1000 }),
    defaultTemperature: clampFloat(source.defaultTemperature, 0.7, { min: 0, max: 2 }),
    models,
    defaultModel,
    fallbackModel,
    enforceModelWhitelist: source.enforceModelWhitelist !== false
  };
};

export const normalizeAiConfigOverride = (input = {}) => {
  const source = input && typeof input === 'object' ? input : {};
  const override = {};

  if (hasOwn(source, 'defaultDailyLimit')) {
    override.defaultDailyLimit = clampInt(source.defaultDailyLimit, DEFAULT_BUILTIN_AI_CONFIG.defaultDailyLimit, { min: 0, max: 10_000_000 });
  }
  if (hasOwn(source, 'maxContextChars')) {
    override.maxContextChars = clampInt(source.maxContextChars, DEFAULT_BUILTIN_AI_CONFIG.maxContextChars, { min: 1000, max: 5_000_000 });
  }
  if (hasOwn(source, 'proxyTimeoutMs')) {
    override.proxyTimeoutMs = clampInt(source.proxyTimeoutMs, DEFAULT_BUILTIN_AI_CONFIG.proxyTimeoutMs, { min: 1000, max: 10 * 60 * 1000 });
  }
  if (hasOwn(source, 'defaultTemperature')) {
    override.defaultTemperature = clampFloat(source.defaultTemperature, 0.7, { min: 0, max: 2 });
  }
  if (hasOwn(source, 'models')) {
    override.models = sanitizeModelList(source.models, DEFAULT_FREE_MODELS);
  }
  if (hasOwn(source, 'defaultModel')) {
    const defaultModel = normalizeModelName(source.defaultModel);
    if (defaultModel) override.defaultModel = defaultModel;
  }
  if (hasOwn(source, 'fallbackModel')) {
    const fallbackModel = normalizeModelName(source.fallbackModel);
    if (fallbackModel) override.fallbackModel = fallbackModel;
  }
  if (hasOwn(source, 'enforceModelWhitelist')) {
    override.enforceModelWhitelist = source.enforceModelWhitelist !== false;
  }

  return override;
};

export const getBuiltinAiEnvConfig = (env = {}) => {
  return normalizeAiConfig({
    models: getAllowedModels(env),
    defaultModel: env.BUILTIN_AI_DEFAULT_MODEL || env.CF_PAGES_BUILTIN_AI_DEFAULT_MODEL,
    fallbackModel: env.BUILTIN_AI_FALLBACK_MODEL || env.CF_PAGES_BUILTIN_AI_FALLBACK_MODEL,
    enforceModelWhitelist: String(env.BUILTIN_AI_ENFORCE_MODEL_WHITELIST || env.CF_PAGES_BUILTIN_AI_ENFORCE_MODEL_WHITELIST || 'true').trim().toLowerCase() !== 'false',
    defaultDailyLimit: env.BUILTIN_AI_DAILY_LIMIT || env.CF_PAGES_BUILTIN_AI_DAILY_LIMIT,
    maxContextChars: env.BUILTIN_AI_MAX_CONTEXT_CHARS || env.CF_PAGES_BUILTIN_AI_MAX_CONTEXT_CHARS,
    proxyTimeoutMs: env.BUILTIN_AI_PROXY_TIMEOUT_MS || env.CF_PAGES_BUILTIN_AI_PROXY_TIMEOUT_MS,
    defaultTemperature: env.BUILTIN_AI_DEFAULT_TEMPERATURE || env.CF_PAGES_BUILTIN_AI_DEFAULT_TEMPERATURE
  });
};

const isSameConfigValue = (left, right) => {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((item, index) => item === right[index]);
  }
  return left === right;
};

export const buildStoredAiConfigOverride = (config, env = {}) => {
  const effectiveConfig = normalizeAiConfig(config);
  const baseConfig = getBuiltinAiEnvConfig(env);
  const override = {};

  for (const field of AI_CONFIG_FIELDS) {
    if (!isSameConfigValue(effectiveConfig[field], baseConfig[field])) {
      override[field] = effectiveConfig[field];
    }
  }

  return Object.keys(override).length > 0 ? override : null;
};

export const getBuiltinAiConfig = (env = {}, storedConfig = null) => {
  const baseConfig = getBuiltinAiEnvConfig(env);
  const persistedConfig = normalizeAiConfig({
    ...baseConfig,
    ...(storedConfig && typeof storedConfig === 'object' ? storedConfig : {})
  });

  return {
    upstreamUrl: String(env.SYSHUO_API_URL || env.BUILTIN_AI_BASE_URL || '').trim(),
    upstreamKey: String(env.SYSHUO_API_KEY || env.BUILTIN_AI_API_KEY || '').trim(),
    ...persistedConfig,
    timeZone: resolveTimeZone(env.BUILTIN_AI_TIME_ZONE || env.TZ || env.CF_PAGES_BUILTIN_AI_TIME_ZONE),
    clientRate: parseRate(
      env.BUILTIN_AI_RATE_LIMIT_MAX || env.CF_PAGES_BUILTIN_AI_RATE_LIMIT_MAX,
      env.BUILTIN_AI_RATE_LIMIT_WINDOW_MS || env.CF_PAGES_BUILTIN_AI_RATE_LIMIT_WINDOW_MS,
      DEFAULT_CLIENT_RATE
    )
  };
};

export const buildModelAccess = (config, isPremium = false) => {
  const normalizedConfig = normalizeAiConfig(config || DEFAULT_BUILTIN_AI_CONFIG);
  const safeModels = normalizedConfig.models.length > 0
    ? [...normalizedConfig.models]
    : [...DEFAULT_FREE_MODELS];
  const defaultModel = safeModels.includes(normalizedConfig.defaultModel)
    ? normalizedConfig.defaultModel
    : safeModels[0];

  return {
    models: safeModels,
    defaultModel
  };
};

export const resolveRequestedModel = (requestedModel, config, options = {}) => {
  const normalized = normalizeModelName(requestedModel);
  const access = buildModelAccess(config, options.isPremium === true);
  if (access.models.includes(normalized)) return normalized;
  if (access.models.includes(access.defaultModel)) return access.defaultModel;
  return access.models[0] || DEFAULT_FREE_MODELS[0];
};

export const isProxyConfigured = (config) => !!(config.upstreamUrl && config.upstreamKey);

export const isModelAllowed = (model, config, options = {}) => {
  const normalized = normalizeModelName(model);
  const access = buildModelAccess(config, options.isPremium === true);
  return access.models.includes(normalized);
};

export const getClientId = (request, _body) =>
  request.headers.get('x-client-id')
  || request.headers.get('x-session-id')
  || request.headers.get('cf-connecting-ip')
  || 'anonymous';

export const parseAllowedOrigins = (env = {}) => {
  const origins = parseStringList(env.ALLOWED_ORIGINS || env.CF_PAGES_ALLOWED_ORIGINS);
  return origins.length > 0 ? origins : [];
};

export const resolveCorsOrigin = (request, env = {}) => {
  const requestOrigin = String(request.headers.get('Origin') || '').trim();
  if (!requestOrigin) return null;

  const allowedOrigins = parseAllowedOrigins(env);
  if (allowedOrigins.includes('*')) return '*';
  return allowedOrigins.includes(requestOrigin) ? requestOrigin : null;
};

export const getTodayString = (timeZone = DEFAULT_TIME_ZONE) => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find((item) => item.type === 'year')?.value || '1970';
    const month = parts.find((item) => item.type === 'month')?.value || '01';
    const day = parts.find((item) => item.type === 'day')?.value || '01';
    return `${year}-${month}-${day}`;
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};
