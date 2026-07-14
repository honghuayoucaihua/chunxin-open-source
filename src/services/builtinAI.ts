/**
 * 叙说AI服务管理模块
 * 提供内置 AI 服务，通过每日次数和口令升级控制权限
 * 通过后端代理保护API密钥
 */

import { httpGetJson, httpPostJson, httpPostExternal } from './httpService.ts';
import { Capacitor } from '@capacitor/core';
import { joinApiPath } from './serverConfig.ts';

// 叙说AI服务配置
export const BUILTIN_AI_CONFIG = {
  baseUrl: '',
  fallbackModel: 'free/cc',
  defaultDailyLimit: 500,
  maxRetries: 2,
  proxyTimeoutMs: 100000
};

// 默认模型列表
export const DEFAULT_FREE_MODELS = [
  'free/cc'
];

const PREMIUM_TOKEN_STORAGE_KEY = 'builtinAIPremiumToken';

type BuiltinModelConfig = {
  models: string[];
  defaultModel: string;
  dailyLimit: number;
};

// 模型列表缓存
const BUILTIN_MODEL_CONFIG_CACHE_KEY = 'builtinAIModelConfigCache:v1';
const BUILTIN_MODEL_CONFIG_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
let cachedBuiltinModelConfig: BuiltinModelConfig | null = null;
let builtinModelConfigPromise: Promise<BuiltinModelConfig> | null = null;
let fallbackClientId = '';
let memoryPremiumToken = '';
let memoryBuiltinAIModel = '';
let memoryBuiltinAIUsage: BuiltinAIUsage | null = null;

const safeLocalStorageGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeLocalStorageSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const safeLocalStorageRemoveItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

/**
 * 获取客户端唯一标识
 */
const getClientId = (): string => {
  let clientId = safeLocalStorageGetItem('clientId');
  if (!clientId) {
    clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (!safeLocalStorageSetItem('clientId', clientId)) {
      fallbackClientId = fallbackClientId || clientId;
    }
  }
  return clientId || fallbackClientId;
};

/**
 * 叙说AI使用次数状态
 */
export interface BuiltinAIUsage {
  date: string;
  count: number;
  limit: number;
  remaining: number;
  isPremium: boolean;
  progress: number;
  premiumLimit?: number | null;
  premiumExpiresAt?: number | null;
  isExpired?: boolean;
  serverTracked?: boolean;
}

/**
 * 检测是否为原生 App 环境
 */
const isNativeApp = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * 获取内置 AI 可用模型列表
 */
const fetchBuiltinModelConfig = async (forceRefresh = false): Promise<BuiltinModelConfig> => {
  if (!forceRefresh && cachedBuiltinModelConfig) {
    syncLocalDailyLimitFromModelConfig(cachedBuiltinModelConfig);
    return cachedBuiltinModelConfig;
  }
  if (!forceRefresh) {
    const storedConfig = readStoredBuiltinModelConfig();
    if (storedConfig) {
      cachedBuiltinModelConfig = storedConfig;
      syncLocalDailyLimitFromModelConfig(storedConfig);
      return storedConfig;
    }
    if (builtinModelConfigPromise) return builtinModelConfigPromise;
  }

  builtinModelConfigPromise = (async () => {
    try {
      const data = await httpGetJson<unknown>('/models', getPremiumHeaders());
      const modelConfig = normalizeBuiltinModelConfig(data);
      cachedBuiltinModelConfig = modelConfig;
      saveStoredBuiltinModelConfig(modelConfig);
      syncLocalDailyLimitFromModelConfig(modelConfig);
      return modelConfig;
    } catch (error) {
      console.error('Failed to fetch builtin models:', error);
      const fallbackConfig = cachedBuiltinModelConfig || {
        models: DEFAULT_FREE_MODELS,
        defaultModel: DEFAULT_FREE_MODELS[0],
        dailyLimit: BUILTIN_AI_CONFIG.defaultDailyLimit
      };
      syncLocalDailyLimitFromModelConfig(fallbackConfig);
      return fallbackConfig;
    } finally {
      builtinModelConfigPromise = null;
    }
  })();
  return builtinModelConfigPromise;
};

export const fetchFreeModels = async (): Promise<string[]> => {
  const modelConfig = await fetchBuiltinModelConfig();
  return modelConfig.models;
};

const normalizeModelName = (value: unknown): string => String(value || '').trim().replace(/^models\//, '');

const normalizeLocalDailyLimit = (value: unknown, fallback = BUILTIN_AI_CONFIG.defaultDailyLimit): number => {
  const fallbackLimit = Math.floor(Number(fallback));
  const safeFallback = Number.isFinite(fallbackLimit) && fallbackLimit > 0
    ? fallbackLimit
    : -1;
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) return safeFallback;
  return parsed > 0 ? parsed : -1;
};

const normalizeBuiltinModelConfig = (raw: unknown): BuiltinModelConfig => {
  const source = isRecord(raw) ? raw : {};
  const remoteModels = Array.isArray(source.models) ? source.models : [];
  const models = Array.from(new Set(
    remoteModels
      .map((item) => normalizeModelName(item))
      .filter(Boolean)
  ));
  const safeModels = models.length > 0 ? models : DEFAULT_FREE_MODELS;
  const requestedDefault = normalizeModelName(source.defaultModel);
  const defaultModel = safeModels.includes(requestedDefault) ? requestedDefault : safeModels[0];
  return {
    models: safeModels,
    defaultModel,
    dailyLimit: normalizeLocalDailyLimit(
      source.dailyLimit ?? source.defaultDailyLimit ?? source.default_daily_limit ?? source.limit
    )
  };
};

const resolveBuiltinModelFromConfig = (requestedModel: unknown, config: BuiltinModelConfig): string => {
  const normalized = normalizeModelName(requestedModel);
  if (config.models.includes(normalized)) return normalized;
  if (config.models.includes(config.defaultModel)) return config.defaultModel;
  return config.models[0] || DEFAULT_FREE_MODELS[0];
};

const getStoredBuiltinAIModel = (): string => normalizeModelName(safeLocalStorageGetItem('builtinAIModel') || memoryBuiltinAIModel);

const storeBuiltinAIModel = (model: string): void => {
  memoryBuiltinAIModel = normalizeModelName(model);
  safeLocalStorageSetItem('builtinAIModel', memoryBuiltinAIModel);
};

export const syncBuiltinAIModelSelection = async (forceRefresh = false): Promise<string> => {
  const config = await fetchBuiltinModelConfig(forceRefresh);
  const nextModel = resolveBuiltinModelFromConfig(getStoredBuiltinAIModel(), config);
  storeBuiltinAIModel(nextModel);
  return nextModel;
};

/**
 * 叙说AI请求参数
 */
export interface BuiltinAIRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  response_format?: { type: string };
  stream?: boolean;
}

/**
 * 叙说AI响应
 */
export interface BuiltinAIResponse {
  success: boolean;
  content?: string;
  error?: string;
  quotaExceeded?: boolean;
  usage?: BuiltinAIUsage;
}

const inflightBuiltinAIRequests = new Map<string, Promise<BuiltinAIResponse>>();

const hashText = (value: string): string => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const buildBuiltinAIRequestKey = (request: BuiltinAIRequest): string => {
  try {
    return `builtin-ai:${hashText(JSON.stringify(request))}`;
  } catch {
    return `builtin-ai-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
};

const runBuiltinAISingleFlight = (
  key: string,
  task: () => Promise<BuiltinAIResponse>
): Promise<BuiltinAIResponse> => {
  const existing = inflightBuiltinAIRequests.get(key);
  if (existing) return existing;

  const promise = task().finally(() => {
    inflightBuiltinAIRequests.delete(key);
  });
  inflightBuiltinAIRequests.set(key, promise);
  return promise;
};

type VerifyPassphraseResponse = {
  success: boolean;
  message?: string;
  token?: string;
  usage?: unknown;
  premiumLimit?: unknown;
  premium_limit?: unknown;
  limit?: unknown;
  premiumExpiresAt?: unknown;
  premium_expires_at?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const toNullableNumber = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toSafeUsageLimit = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed === -1 ? -1 : Math.max(0, Math.floor(parsed));
};

const toPremiumUsageLimit = (value: unknown, fallback = -1): number => {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) return fallback;
  return parsed > 0 ? parsed : -1;
};

const createDefaultUsage = (patch: Partial<BuiltinAIUsage> = {}): BuiltinAIUsage => ({
  date: new Date().toISOString().split('T')[0],
  count: 0,
  limit: BUILTIN_AI_CONFIG.defaultDailyLimit,
  remaining: BUILTIN_AI_CONFIG.defaultDailyLimit,
  isPremium: false,
  progress: 0,
  premiumLimit: null,
  premiumExpiresAt: null,
  isExpired: false,
  serverTracked: false,
  ...patch
});

const getPremiumToken = (): string => String(safeLocalStorageGetItem(PREMIUM_TOKEN_STORAGE_KEY) || memoryPremiumToken || '').trim();

const setPremiumToken = (token: string | null | undefined): void => {
  const normalized = String(token || '').trim();
  memoryPremiumToken = normalized;
  if (!normalized) {
    safeLocalStorageRemoveItem(PREMIUM_TOKEN_STORAGE_KEY);
    return;
  }
  safeLocalStorageSetItem(PREMIUM_TOKEN_STORAGE_KEY, normalized);
};

const getPremiumHeaders = (): Record<string, string> => {
  const token = getPremiumToken();
  return token ? { 'X-Premium-Token': token } : {};
};

const getModelConfigCacheScope = (): 'free' | 'premium' => (
  getPremiumToken() ? 'premium' : 'free'
);

const readStoredBuiltinModelConfig = (): BuiltinModelConfig | null => {
  try {
    const raw = safeLocalStorageGetItem(BUILTIN_MODEL_CONFIG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.scope !== getModelConfigCacheScope()) return null;
    const cachedAt = Number(parsed.cachedAt);
    if (!Number.isFinite(cachedAt) || Date.now() - cachedAt > BUILTIN_MODEL_CONFIG_CACHE_TTL_MS) return null;
    return normalizeBuiltinModelConfig(parsed.config);
  } catch {
    return null;
  }
};

const saveStoredBuiltinModelConfig = (config: BuiltinModelConfig): void => {
  try {
    safeLocalStorageSetItem(BUILTIN_MODEL_CONFIG_CACHE_KEY, JSON.stringify({
      scope: getModelConfigCacheScope(),
      cachedAt: Date.now(),
      config
    }));
  } catch {
    // 本地缓存失败不影响内置 AI 请求
  }
};

export const normalizeBuiltinAIUsage = (raw: unknown): BuiltinAIUsage => {
  const source = isRecord(raw) ? raw : {};
  const isPremium = Boolean(source.isPremium ?? source.is_premium ?? false);
  const premiumLimit = toNullableNumber(source.premiumLimit ?? source.premium_limit);
  const limitFallback = isPremium
    ? (premiumLimit ?? -1)
    : BUILTIN_AI_CONFIG.defaultDailyLimit;
  const limit = toSafeUsageLimit(source.limit, limitFallback);
  const count = Math.max(0, Number(source.count || 0));
  const rawRemaining = Number(source.remaining);
  const remaining = limit === -1
    ? Infinity
    : (Number.isFinite(rawRemaining) ? Math.max(0, rawRemaining) : Math.max(0, limit - count));
  const progress = limit <= 0 || limit === -1
    ? 0
    : Math.min(100, Number(source.progress ?? ((count / limit) * 100)) || 0);
  return {
    date: String(source.date || new Date().toISOString().split('T')[0]),
    count,
    limit,
    remaining,
    isPremium,
    progress,
    premiumLimit,
    premiumExpiresAt: toNullableNumber(source.premiumExpiresAt ?? source.premium_expires_at),
    isExpired: Boolean(source.isExpired ?? source.is_expired ?? false),
    serverTracked: false
  };
};

const buildLocalPremiumUsageFromPassphrase = (data: VerifyPassphraseResponse): BuiltinAIUsage => {
  const current = getBuiltinAIUsage();
  const remoteUsage = data.usage !== undefined ? normalizeBuiltinAIUsage(data.usage) : null;
  const limit = toPremiumUsageLimit(
    remoteUsage?.premiumLimit
      ?? remoteUsage?.limit
      ?? data.premiumLimit
      ?? data.premium_limit
      ?? data.limit,
    current.isPremium ? current.limit : -1
  );
  const premiumExpiresAt = toNullableNumber(
    remoteUsage?.premiumExpiresAt
      ?? data.premiumExpiresAt
      ?? data.premium_expires_at
  );
  const count = current.count;
  const remaining = limit === -1 ? Infinity : Math.max(0, limit - count);
  return {
    ...current,
    isPremium: true,
    isExpired: false,
    limit,
    remaining,
    progress: limit > 0 ? Math.min(100, (count / limit) * 100) : 0,
    premiumLimit: limit,
    premiumExpiresAt,
    serverTracked: false
  };
};

export const extractBuiltinAIProxyContent = (raw: unknown): string => {
  const payload = isRecord(raw) ? raw : {};
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const firstChoice = isRecord(choices[0]) ? choices[0] : {};
  const message = isRecord(firstChoice.message) ? firstChoice.message : {};
  const content = String(message.content || '').trim();
  if (!content) throw new Error('响应格式错误');
  return content;
};

/**
 * 兼容旧调用名：每日次数只保存在本地，不再请求服务端状态。
 */
export const fetchUsageFromBackend = async (): Promise<BuiltinAIUsage | null> => {
  return getBuiltinAIUsage();
};

/**
 * 发送心跳 - 用于统计所有活跃用户（包括使用自定义 key 的用户）
 * 无论用户使用内置 AI 还是自定义 key，都会上报心跳
 */
export const sendHeartbeat = async (): Promise<boolean> => {
  return false;
};

/**
 * 获取叙说AI使用次数
 */
export const getBuiltinAIUsage = (): BuiltinAIUsage => {
  const stored = safeLocalStorageGetItem('builtinAIUsage');
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];

  if (!stored && !memoryBuiltinAIUsage) return createDefaultUsage();

  try {
    const parsed = normalizeBuiltinAIUsage(stored ? JSON.parse(stored) : memoryBuiltinAIUsage);
    const isExpired = !!parsed.premiumExpiresAt && now > parsed.premiumExpiresAt;

    if (isExpired) {
      setPremiumToken('');
      return createDefaultUsage({ isExpired: true });
    }

    if (parsed.date !== today) {
      const limit = parsed.limit === -1
        ? -1
        : (parsed.isPremium ? (parsed.premiumLimit ?? -1) : parsed.limit);
      return createDefaultUsage({
        date: today,
        isPremium: parsed.isPremium,
        limit,
        remaining: limit === -1 ? Infinity : Math.max(0, limit),
        premiumLimit: parsed.premiumLimit,
        premiumExpiresAt: parsed.premiumExpiresAt,
        isExpired: false
      });
    }

    return parsed;
  } catch {
    return createDefaultUsage();
  }
};

const syncLocalDailyLimitFromModelConfig = (modelConfig: BuiltinModelConfig): BuiltinAIUsage => {
  const usage = getBuiltinAIUsage();
  if (usage.isPremium && !usage.isExpired) return usage;
  if (getPremiumToken()) return usage;

  const limit = normalizeLocalDailyLimit(modelConfig.dailyLimit);
  const remaining = limit === -1
    ? Infinity
    : Math.max(0, limit - usage.count);
  const progress = limit > 0
    ? Math.min(100, (usage.count / limit) * 100)
    : 0;
  const nextUsage: BuiltinAIUsage = {
    ...usage,
    limit,
    remaining,
    progress,
    serverTracked: false
  };
  saveBuiltinAIUsage(nextUsage);
  return nextUsage;
};

/**
 * 保存叙说AI使用次数
 */
export const saveBuiltinAIUsage = (usage: BuiltinAIUsage): void => {
  if (!usage.isPremium || usage.isExpired) {
    setPremiumToken('');
  }
  const nextUsage = {
    date: usage.date,
    count: usage.count,
    limit: usage.limit,
    remaining: usage.limit === -1 ? -1 : usage.remaining,
    isPremium: usage.isPremium,
    progress: usage.progress,
    premiumLimit: usage.premiumLimit,
    premiumExpiresAt: usage.premiumExpiresAt,
    isExpired: usage.isExpired,
    serverTracked: false
  };
  memoryBuiltinAIUsage = normalizeBuiltinAIUsage(nextUsage);
  safeLocalStorageSetItem('builtinAIUsage', JSON.stringify(nextUsage));
};

/**
 * 增加使用次数
 */
export const incrementBuiltinAIUsage = (): BuiltinAIUsage => {
  const usage = getBuiltinAIUsage();
  const newUsage = { ...usage, count: usage.count + 1 };
  if (usage.limit === -1) {
    newUsage.remaining = Infinity;
    newUsage.progress = 0;
  } else {
    newUsage.remaining = Math.max(0, newUsage.limit - newUsage.count);
    newUsage.progress = Math.min(100, (newUsage.count / newUsage.limit) * 100);
  }
  saveBuiltinAIUsage(newUsage);
  return newUsage;
};

/**
 * 获取每日限额
 */
export const getDailyLimit = (): number => getBuiltinAIUsage().limit;

/**
 * 检查是否还有剩余次数
 */
export const hasRemainingQuota = (): boolean => {
  const usage = getBuiltinAIUsage();
  if (usage.isExpired) return false;
  if (usage.limit === -1 || usage.remaining === Infinity) return true;
  return usage.remaining > 0;
};

/**
 * 获取剩余次数
 */
export const getRemainingQuota = (): number => getBuiltinAIUsage().remaining;

/**
 * 获取使用进度百分比
 */
export const getUsageProgress = (): number => getBuiltinAIUsage().progress;

/**
 * 验证口令并升级为高级用户
 */
export const verifyPassphrase = async (passphrase: string): Promise<{ success: boolean; message: string }> => {
  try {
    const clientId = getClientId();
    // 使用完整 URL
    const data = await httpPostJson<VerifyPassphraseResponse>(
      joinApiPath('/verify-passphrase'),
      { passphrase, clientId }
    );
    
    if (data.success) {
      setPremiumToken(data.token);
      saveBuiltinAIUsage(buildLocalPremiumUsageFromPassphrase(data));
      clearModelCache();
      return { success: true, message: data.message || '验证成功' };
    }
    
    return { success: false, message: data.message || '口令错误' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '网络错误，请重试';
    return { success: false, message: errorMessage };
  }
};

/**
 * 通过后端代理发送AI请求 - 使用完整 URL
 */
const sendRequestViaProxy = async (request: BuiltinAIRequest): Promise<string> => {
  const clientId = getClientId();
  // 完整的代理 URL
  const proxyUrl = joinApiPath('/proxy');
  
  let responseText: string;
  try {
    responseText = await httpPostExternal(proxyUrl, request, {
      'X-Client-ID': clientId,
      ...getPremiumHeaders()
    }, {
      timeoutMs: BUILTIN_AI_CONFIG.proxyTimeoutMs
    });
  } catch (fetchError) {
    console.error('Request error:', fetchError);
    if (fetchError instanceof Error) throw fetchError;
    throw new Error('网络连接失败，请检查网络或稍后重试');
  }
  
  if (!responseText || !responseText.trim()) {
    throw new Error('服务器返回空响应，请稍后重试');
  }
  
  let data: unknown;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    console.error('JSON parse error. Response:', responseText.substring(0, 200));
    throw new Error('响应格式错误：无法解析JSON');
  }
  
  return extractBuiltinAIProxyContent(data);
};

const isQuotaExceededError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error || '');
  return /QUOTA_EXCEEDED|今日(?:免费|高级)?额度已用完|今日(?:免费)?可?用次数已用完|quota/i.test(message);
};

const isNonRetryableProxyError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error || '');
  return /HTTP (400|401|403|408|409|413|429):/i.test(message);
};

/**
 * 发送叙说AI请求。只对网关/上游临时错误重试一次，明确的参数、鉴权、限流错误不重试。
 */
export const sendBuiltinAIRequest = async (
  request: BuiltinAIRequest,
  onQuotaExceeded?: () => void
): Promise<BuiltinAIResponse> => {
  if (!hasRemainingQuota()) {
    const latestUsage = getBuiltinAIUsage();
    if (onQuotaExceeded) onQuotaExceeded();
    return {
      success: false,
      error: latestUsage.isPremium ? '今日高级额度已用完' : '今日免费额度已用完',
      quotaExceeded: true,
      usage: latestUsage
    };
  }

  let lastError: string = '';
  const modelConfig = await fetchBuiltinModelConfig();
  if (!hasRemainingQuota()) {
    const latestUsage = getBuiltinAIUsage();
    if (onQuotaExceeded) onQuotaExceeded();
    return {
      success: false,
      error: latestUsage.isPremium ? '今日高级额度已用完' : '今日免费额度已用完',
      quotaExceeded: true,
      usage: latestUsage
    };
  }
  const normalizedModel = resolveBuiltinModelFromConfig(request.model, modelConfig);
  storeBuiltinAIModel(normalizedModel);
  const normalizedRequest = {
    ...request,
    model: normalizedModel
  };

  return runBuiltinAISingleFlight(buildBuiltinAIRequestKey(normalizedRequest), async () => {
    for (let attempt = 1; attempt <= BUILTIN_AI_CONFIG.maxRetries; attempt++) {
      try {
        const content = await sendRequestViaProxy(normalizedRequest);
        incrementBuiltinAIUsage();
        return { success: true, content };
      } catch (error) {
        lastError = error instanceof Error ? error.toString() : String(error || 'Unknown error');
        console.warn(`Builtin AI attempt ${attempt} failed:`, lastError);

        if (isQuotaExceededError(error)) {
          const latestUsage = getBuiltinAIUsage();
          if (onQuotaExceeded) onQuotaExceeded();
          return {
            success: false,
            error: latestUsage.isPremium ? '今日高级额度已用完' : '今日免费额度已用完',
            quotaExceeded: true,
            usage: latestUsage
          };
        }

        if (isNonRetryableProxyError(error)) {
          break;
        }

        if (attempt < BUILTIN_AI_CONFIG.maxRetries) {
          const delay = Math.min(5000, 200 * Math.pow(2, attempt - 1));
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return { success: false, error: lastError };
  });
};

/**
 * 测试叙说AI连接
 */
export const testBuiltinConnection = async (): Promise<boolean> => {
  try {
    const data = await httpGetJson<{ success: boolean }>(joinApiPath('/test'), getPremiumHeaders());
    return data.success;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
};

/**
 * 获取叙说AI选中的模型
 */
export const getBuiltinAIModel = (): string => {
  const stored = getStoredBuiltinAIModel();
  if (cachedBuiltinModelConfig) {
    return resolveBuiltinModelFromConfig(stored, cachedBuiltinModelConfig);
  }
  return stored || DEFAULT_FREE_MODELS[0];
};

/**
 * 设置叙说AI选中的模型
 */
export const setBuiltinAIModel = (model: string): void => {
  const safeModel = normalizeModelName(model) || (cachedBuiltinModelConfig?.defaultModel || DEFAULT_FREE_MODELS[0]);
  storeBuiltinAIModel(safeModel);
};

/**
 * 清除模型缓存
 */
export const clearModelCache = (): void => {
  cachedBuiltinModelConfig = null;
  builtinModelConfigPromise = null;
  safeLocalStorageRemoveItem(BUILTIN_MODEL_CONFIG_CACHE_KEY);
};

/**
 * 兼容旧调用名：刷新本地使用状态，不访问服务端。
 */
export const syncUsageFromBackend = async (): Promise<void> => {
  getBuiltinAIUsage();
};
