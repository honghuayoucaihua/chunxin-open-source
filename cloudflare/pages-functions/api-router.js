import {
  buildModelAccess,
  estimateProxyMessageChars,
  getBuiltinAiConfig,
  getClientId,
  getTodayString,
  isModelAllowed,
  isProxyConfigured,
  isProxyContextWithinBudget,
  normalizeAiConfig,
  resolveRequestedModel
} from './config.js';
import {
  addApkVersion,
  addDonor,
  addPassphrase,
  addTeamNotice,
  clearTeamNotices,
  deleteAdminCommunityShare,
  deleteApkVersion,
  deleteDonor,
  deletePassphrase,
  deleteTeamNotice,
  deleteCommunityShareByAuthor,
  ensureDatabaseSchema,
  findActivePassphrase,
  getAiConfig,
  getCommunityAsset,
  getCommunityDetail,
  getLatestApkVersion,
  getPassphraseUsageCount,
  getPassphraseUsageCountByClient,
  isValidCommunityShareType,
  listAdminCommunityShares,
  listApkVersions,
  listCommunityShares,
  listDonors,
  listMyCommunityShares,
  recordPassphraseUsage,
  listPassphrases,
  listTeamNotices,
  parsePassphraseList,
  replaceAllPassphrases,
  replaceDonors,
  reportCommunityShare,
  saveAiConfig,
  updateAdminCommunityShare,
  updateApkVersion,
  updateDonor,
  updatePassphrase,
  uploadCommunityShare,
  downloadCommunityShare,
  likeCommunityShare
} from './data.js';
import { createApkCandidateSource } from './apk-candidate.js';
import {
  jsonResponse,
  methodNotAllowedResponse,
  optionsResponse,
  passthroughResponse
} from './response.js';
import {
  isValidAdminKey,
  issuePremiumToken,
  readPremiumTokenFromRequest,
  verifyPremiumToken
} from './security.js';

const ALL_METHODS = 'GET,POST,PUT,DELETE,OPTIONS';
const ADMIN_PASSPHRASE_REQUIRED_ERROR = '口令不能为空';
const ADMIN_DONOR_NAME_REQUIRED_ERROR = '名称不能为空';
const ADMIN_TEAM_NOTICE_REQUIRED_ERROR = '标题和内容不能为空';
const ADMIN_APK_VERSION_REQUIRED_ERROR = '版本号、版本代码、APK 地址不能为空';
const ADMIN_APK_CLEANUP_KEEP_COUNT_INVALID_ERROR = '保留数量格式错误';
const MAX_JSON_BODY_BYTES = 524288;
const RATE_LIMIT_MAX_ENTRIES = 10000;
const DIVINATION_RATE_LIMIT = { max: 6, windowMs: 60 * 1000 };
const COMMUNITY_UPLOAD_RATE_LIMIT = { max: 3, windowMs: 60 * 1000 };
const COMMUNITY_DOWNLOAD_RATE_LIMIT = { max: 30, windowMs: 60 * 1000 };
const COMMUNITY_MINE_RATE_LIMIT = { max: 20, windowMs: 60 * 1000 };
const COMMUNITY_DELETE_RATE_LIMIT = { max: 10, windowMs: 60 * 1000 };
const COMMUNITY_LIKE_RATE_LIMIT = { max: 40, windowMs: 60 * 1000 };
const COMMUNITY_REPORT_RATE_LIMIT = { max: 10, windowMs: 60 * 1000 };
const ADMIN_FETCH_MODELS_TIMEOUT_MS = 15000;

const proxyRateBuckets = new Map();
const divinationRateBuckets = new Map();
const communityRateBuckets = new Map();

const normalizeRateLimit = (rate = {}) => ({
  max: Math.max(1, Math.floor(Number(rate.max || 0))),
  windowMs: Math.max(1000, Math.floor(Number(rate.windowMs || 0)))
});

const getRateLimitIdentity = (request, clientId = '') => {
  const ip = String(
    request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]
    || ''
  ).trim();
  const client = String(clientId || '').trim();
  const identity = [ip, client && client !== 'anonymous' ? client : ''].filter(Boolean).join(':');
  return String(identity || client || 'anonymous').slice(0, 240);
};

const checkMemoryRateLimit = (buckets, identifier, rate = {}) => {
  const { max, windowMs } = normalizeRateLimit(rate);
  const now = Date.now();
  const key = String(identifier || 'anonymous').slice(0, 260);
  const current = buckets.get(key);

  if (!current || now >= current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, retryAfterSeconds: 0 };
  }

  if (current.count >= max) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }

  current.count += 1;
  return {
    ok: true,
    remaining: Math.max(0, max - current.count),
    retryAfterSeconds: 0
  };
};

const checkProxyRateLimit = (identifier, clientRate = {}) => (
  checkMemoryRateLimit(proxyRateBuckets, identifier, clientRate)
);

const pruneRateBuckets = (buckets) => {
  if (buckets.size <= RATE_LIMIT_MAX_ENTRIES) return;
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) {
      buckets.delete(key);
    }
    if (buckets.size <= RATE_LIMIT_MAX_ENTRIES) break;
  }
  while (buckets.size > RATE_LIMIT_MAX_ENTRIES) {
    const oldestKey = buckets.keys().next().value;
    if (oldestKey === undefined) break;
    buckets.delete(oldestKey);
  }
};

const rateLimitedJsonResponse = (request, env, rateLimit, body = {}) => (
  jsonResponse(request, env, {
    error: '请求过于频繁，请稍后再试',
    code: 'RATE_LIMITED',
    retryAfterSeconds: rateLimit.retryAfterSeconds,
    ...body
  }, 429, {
    'Retry-After': String(rateLimit.retryAfterSeconds)
  })
);

const parseJsonBody = async (request) => {
  const contentLength = parseInt(String(request.headers.get('content-length') || '0'), 10);
  if (contentLength > MAX_JSON_BODY_BYTES) {
    return null;
  }
  try {
    let text = '';
    if (request.body && typeof request.body.getReader === 'function') {
      const reader = request.body.getReader();
      const decoder = new TextDecoder();
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value?.byteLength || 0;
        if (size > MAX_JSON_BODY_BYTES) {
          try {
            await reader.cancel();
          } catch {
            // ignore cancel failures
          }
          return null;
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } else {
      text = await request.text();
      if (text.length > MAX_JSON_BODY_BYTES) return null;
    }
    return JSON.parse(text);
  } catch {
    return null;
  }
};

// 允许透传到上游的额外参数白名单
const ALLOWED_EXTRA_PROXY_PARAMS = new Set([
  'max_tokens', 'top_p', 'top_k', 'stop', 'frequency_penalty',
  'presence_penalty', 'seed', 'response_format', 'tools', 'tool_choice',
  'user', 'n', 'logprobs', 'top_logprobs'
]);

const isPlainObjectBody = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

const requireMethod = (request, env, allowed, method) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse(request, env, Array.isArray(allowed) ? allowed.join(',') : String(allowed || ALL_METHODS));
  }
  if (request.method !== method) {
    return methodNotAllowedResponse(request, env, [method, 'OPTIONS']);
  }
  return null;
};

const requireOneOfMethods = (request, env, methods) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse(request, env, [...methods, 'OPTIONS'].join(','));
  }
  if (!methods.includes(request.method)) {
    return methodNotAllowedResponse(request, env, [...methods, 'OPTIONS']);
  }
  return null;
};

const buildErrorMessage = async (response, fallback) => {
  const text = await response.text().catch(() => '');
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text);
    return parsed?.error?.message || parsed?.error || parsed?.message || fallback;
  } catch {
    return text.slice(0, 500);
  }
};

const getApkCandidateSource = (env) => createApkCandidateSource({ env });

const resolveLocalDailyLimit = (aiConfig) => {
  const dailyLimit = Math.floor(Number(aiConfig.defaultDailyLimit || 0));
  return dailyLimit > 0 ? dailyLimit : -1;
};

const resolvePassphraseLimit = (value) => {
  const limit = Math.floor(Number(value || 0));
  return Number.isFinite(limit) && limit > 0 ? limit : -1;
};

const buildPremiumUsagePayload = (aiConfig, premiumLimit, premiumExpiresAt) => {
  const limit = resolvePassphraseLimit(premiumLimit);
  return {
    date: getTodayString(aiConfig.timeZone),
    count: 0,
    limit,
    remaining: limit === -1 ? -1 : limit,
    isPremium: true,
    progress: 0,
    premiumLimit: limit,
    premiumExpiresAt,
    isExpired: false,
    serverTracked: false
  };
};

const buildModelEndpoint = (baseUrl) => {
  const normalized = String(baseUrl || '').trim().replace(/\/+$/, '');
  const removedChat = normalized
    .replace(/\/v1\/chat\/completions$/i, '/v1')
    .replace(/\/chat\/completions$/i, '');
  return `${removedChat}/models`;
};

const parseModelList = (data) => {
  if (!data) return [];
  const normalize = (value) => String(value || '').trim().replace(/^models\//, '');
  if (Array.isArray(data.models)) {
    return data.models.map((item) => normalize(item?.name || item?.id)).filter(Boolean);
  }
  if (Array.isArray(data.data)) {
    return data.data.map((item) => normalize(item?.id || item?.name)).filter(Boolean);
  }
  if (Array.isArray(data)) {
    return data.map((item) => normalize(item?.id || item?.name || item?.model)).filter(Boolean);
  }
  return [];
};

const getStoredAiConfig = async (env) => {
  try {
    await ensureDatabaseSchema(env);
    return getAiConfig(env);
  } catch {
    return null;
  }
};

const getEffectiveAiConfig = async (env) => {
  const stored = await getStoredAiConfig(env);
  return getBuiltinAiConfig(env, stored);
};

const getPremiumState = async (request, env, aiConfig) => {
  const token = readPremiumTokenFromRequest(request);
  const verification = await verifyPremiumToken(token, env);
  const isPremium = verification.ok && verification.payload?.tier === 'premium';
  return {
    token,
    verification,
    isPremium
  };
};

const requireAdmin = async (request, env) => {
  const adminKey = request.headers.get('x-admin-key');
  if (!isValidAdminKey(adminKey, env)) {
    return jsonResponse(request, env, { error: '无权限' }, 403);
  }
  // 额外的 Origin 验证：如果配置了 ADMIN_ORIGIN，则要求请求来源匹配
  const adminOrigin = String(env.ADMIN_ORIGIN || '').trim();
  if (adminOrigin) {
    const requestOrigin = String(request.headers.get('Origin') || '').trim();
    if (requestOrigin && requestOrigin !== adminOrigin) {
      return jsonResponse(request, env, { error: '请求来源不被允许' }, 403);
    }
  }
  return null;
};

const handleModels = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['GET', 'OPTIONS'], 'GET');
  if (fail) return fail;

  const aiConfig = await getEffectiveAiConfig(env);
  const modelAccess = buildModelAccess(aiConfig);
  const dailyLimit = resolveLocalDailyLimit(aiConfig);
  return jsonResponse(request, env, {
    models: modelAccess.models,
    defaultModel: modelAccess.defaultModel,
    dailyLimit,
    defaultDailyLimit: dailyLimit,
    serverTracked: false,
    backend: 'cloudflare-pages-functions-d1',
    capabilities: {
      builtinAi: true,
      passphrase: true,
      persistence: true,
      community: true
    }
  }, 200, {
    'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600'
  });
};

const handleTest = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['GET', 'OPTIONS'], 'GET');
  if (fail) return fail;

  const aiConfig = await getEffectiveAiConfig(env);
  const configured = isProxyConfigured(aiConfig);
  return jsonResponse(request, env, {
    success: configured,
    message: configured
      ? 'Cloudflare Pages Functions 已配置内置 AI / D1 / R2 后端'
      : '缺少 SYSHUO_API_URL 或 SYSHUO_API_KEY',
    storage: {
      d1: !!(env.APP_DB || env.DB || env.CHUNXIN_DB),
      r2: !!(env.COMMUNITY_BUCKET || env.ASSETS_BUCKET || env.CHUNXIN_R2)
    }
  }, configured ? 200 : 503);
};

const handleVerifyPassphrase = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['POST', 'OPTIONS'], 'POST');
  if (fail) return fail;

  const body = await parseJsonBody(request);
  if (!body || typeof body !== 'object') {
    return jsonResponse(request, env, { success: false, message: '请求格式错误' }, 400);
  }

  const passphrase = String(body.passphrase || '').trim();
  if (!passphrase) {
    return jsonResponse(request, env, { success: false, message: '请输入口令' }, 400);
  }

  const match = await findActivePassphrase(env, passphrase);
  if (!match) {
    return jsonResponse(request, env, { success: false, message: '口令错误' }, 400);
  }

  const phraseExpiresDays = match.phrase_expires_days === null || match.phrase_expires_days === undefined || match.phrase_expires_days === ''
    ? null
    : Math.max(0, Math.floor(Number(match.phrase_expires_days)));
  if (phraseExpiresDays !== null && phraseExpiresDays > 0) {
    const createdAt = Number(match.created_at || 0);
    if (createdAt > 0 && Date.now() > createdAt + phraseExpiresDays * 24 * 60 * 60 * 1000) {
      return jsonResponse(request, env, { success: false, message: '该口令已过期' }, 400);
    }
  }

  const clientId = getClientId(request, body);

  const maxUses = match.max_uses === null || match.max_uses === undefined || match.max_uses === ''
    ? null
    : Math.max(0, Math.floor(Number(match.max_uses)));
  if (maxUses !== null && maxUses > 0) {
    const usedCount = await getPassphraseUsageCount(env, match.id);
    if (usedCount >= maxUses) {
      return jsonResponse(request, env, { success: false, message: '该口令已达到总兑换次数上限' }, 400);
    }
  }

  const maxUsesPerUser = match.max_uses_per_user === null || match.max_uses_per_user === undefined || match.max_uses_per_user === ''
    ? null
    : Math.max(0, Math.floor(Number(match.max_uses_per_user)));
  if (maxUsesPerUser !== null && maxUsesPerUser > 0) {
    const userUsedCount = await getPassphraseUsageCountByClient(env, match.id, clientId);
    if (userUsedCount >= maxUsesPerUser) {
      return jsonResponse(request, env, { success: false, message: '你已达到该口令的个人兑换次数上限' }, 400);
    }
  }

  await recordPassphraseUsage(env, match.id, clientId);

  const validDays = Math.max(0, Number(match.valid_days || 0));
  const premiumExpiresAt = validDays > 0
    ? Date.now() + validDays * 24 * 60 * 60 * 1000
    : null;
  const exp = premiumExpiresAt || (Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);
  const phraseLimit = resolvePassphraseLimit(match.limit);
  const token = await issuePremiumToken({
    phraseId: match.id,
    premiumExpiresAt,
    validDays,
    phraseLimit,
    exp
  }, env);

  return jsonResponse(request, env, {
    success: true,
    message: validDays > 0 ? `口令有效，已升级 ${validDays} 天` : '口令有效，已升级为长期高级',
    token,
    usage: buildPremiumUsagePayload(getBuiltinAiConfig(env, null), phraseLimit, premiumExpiresAt),
    premiumLimit: phraseLimit,
    premiumExpiresAt
  });
};

const handleProxy = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['POST', 'OPTIONS'], 'POST');
  if (fail) return fail;

  const aiConfig = await getEffectiveAiConfig(env);
  if (!isProxyConfigured(aiConfig)) {
    return jsonResponse(request, env, {
      error: 'Missing SYSHUO_API_URL or SYSHUO_API_KEY'
    }, 503);
  }

  const payload = await parseJsonBody(request);
  if (!payload || typeof payload !== 'object') {
    return jsonResponse(request, env, { error: 'Invalid JSON body' }, 400);
  }

  const { model, messages, temperature, stream, ...options } = payload;
  if (!model || !Array.isArray(messages) || messages.length === 0) {
    return jsonResponse(request, env, { error: 'Missing required parameters' }, 400);
  }

  const clientId = getClientId(request, payload);
  const rateLimit = checkProxyRateLimit(getRateLimitIdentity(request, clientId), aiConfig.clientRate);
  pruneRateBuckets(proxyRateBuckets);
  if (!rateLimit.ok) {
    return rateLimitedJsonResponse(request, env, rateLimit);
  }

  if (!isProxyContextWithinBudget(messages, aiConfig.maxContextChars)) {
    return jsonResponse(request, env, {
      error: `Context too large: maximum ${aiConfig.maxContextChars} characters`,
      code: 'CONTEXT_TOO_LARGE',
      totalChars: estimateProxyMessageChars(messages),
      limit: aiConfig.maxContextChars
    }, 400);
  }

  const isPremiumRequest = readPremiumTokenFromRequest(request) ? true : false;
  if (aiConfig.enforceModelWhitelist !== false && !isModelAllowed(model, aiConfig, { isPremium: isPremiumRequest })) {
    return jsonResponse(request, env, {
      error: `Model "${model}" is not in the allowed list`,
      code: 'MODEL_NOT_ALLOWED',
      allowedModels: buildModelAccess(aiConfig).models
    }, 400);
  }

  const safeModel = resolveRequestedModel(model, aiConfig, { isPremium: isPremiumRequest });
  const safeTemperature = Number.isFinite(Number(temperature))
    ? Number(temperature)
    : aiConfig.defaultTemperature;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), aiConfig.proxyTimeoutMs);

  try {
    const upstreamResponse = await fetch(aiConfig.upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': stream === true ? 'text/event-stream' : 'application/json',
        'Authorization': `Bearer ${aiConfig.upstreamKey}`
      },
      body: JSON.stringify({
        model: safeModel,
        messages,
        temperature: safeTemperature,
        ...(stream === true ? { stream: true } : {}),
        // 只透传白名单内的额外参数
        ...Object.fromEntries(
          Object.entries(options).filter(([key]) => ALLOWED_EXTRA_PROXY_PARAMS.has(key))
        )
      }),
      signal: controller.signal
    });

    if (!upstreamResponse.ok) {
      const errorMessage = await buildErrorMessage(upstreamResponse, `AI upstream error (${upstreamResponse.status})`);
      return jsonResponse(request, env, { error: errorMessage }, upstreamResponse.status);
    }

    return passthroughResponse(request, env, upstreamResponse);
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return jsonResponse(request, env, {
      error: aborted ? 'AI service timeout' : (error instanceof Error ? error.message : 'AI service unavailable')
    }, aborted ? 504 : 502);
  } finally {
    clearTimeout(timeoutId);
  }
};

const handleDivination = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['POST', 'OPTIONS'], 'POST');
  if (fail) return fail;

  const payload = await parseJsonBody(request);
  if (!payload || typeof payload !== 'object' || !payload.type) {
    return jsonResponse(request, env, {
      ok: false,
      error: {
        code: 'BAD_REQUEST',
        message: '缺少有效的占卜请求参数'
      }
    }, 400);
  }

  const clientId = getClientId(request, payload);
  const rateLimit = checkMemoryRateLimit(
    divinationRateBuckets,
    getRateLimitIdentity(request, clientId),
    DIVINATION_RATE_LIMIT
  );
  pruneRateBuckets(divinationRateBuckets);
  if (!rateLimit.ok) {
    return jsonResponse(request, env, {
      ok: false,
      error: {
        code: 'RATE_LIMITED',
        message: '请求过于频繁，请稍后再试'
      },
      retryAfterSeconds: rateLimit.retryAfterSeconds
    }, 429, {
      'Retry-After': String(rateLimit.retryAfterSeconds)
    });
  }

  const upstreamUrl = String(env.DIVINATION_API_URL || '').trim();
  const upstreamKey = String(env.DIVINATION_API_KEY || '').trim();
  if (!upstreamUrl || !upstreamKey) {
    return jsonResponse(request, env, {
      ok: false,
      error: {
        code: 'DIVINATION_NOT_CONFIGURED',
        message: '未配置占卜服务'
      }
    }, 503);
  }

  const stream = payload.stream === true;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), stream ? 120000 : 90000);

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': stream ? 'text/event-stream' : 'application/json',
        'Authorization': `Bearer ${upstreamKey}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!upstreamResponse.ok && !stream) {
      const message = await buildErrorMessage(upstreamResponse, `占卜服务异常（${upstreamResponse.status}）`);
      return jsonResponse(request, env, {
        ok: false,
        error: {
          code: 'DIVINATION_PROXY_FAILED',
          message
        }
      }, upstreamResponse.status);
    }

    return passthroughResponse(request, env, upstreamResponse);
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return jsonResponse(request, env, {
      ok: false,
      error: {
        code: 'DIVINATION_PROXY_FAILED',
        message: aborted ? '占卜服务响应超时' : (error instanceof Error ? error.message : '占卜服务不可用')
      }
    }, aborted ? 504 : 502);
  } finally {
    clearTimeout(timeoutId);
  }
};

const handleTeamNotices = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['GET', 'OPTIONS'], 'GET');
  if (fail) return fail;
  return jsonResponse(request, env, { notices: await listTeamNotices(env) }, 200, {
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
  });
};

const handleTeamDonors = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['GET', 'OPTIONS'], 'GET');
  if (fail) return fail;
  return jsonResponse(request, env, { donors: await listDonors(env) }, 200, {
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
  });
};

const handleAppVersion = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['GET', 'OPTIONS'], 'GET');
  if (fail) return fail;
  const latest = await getLatestApkVersion(env);
  if (!latest) {
    return jsonResponse(request, env, {
      version: '0.1.0',
      versionCode: 0,
      apkUrl: '',
      updateLog: '',
      forceUpdate: false
    }, 200, {
      'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600'
    });
  }
  return jsonResponse(request, env, latest, 200, {
    'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600'
  });
};

const handleCheckUpdate = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['GET', 'OPTIONS'], 'GET');
  if (fail) return fail;

  const latest = await getLatestApkVersion(env);
  if (!latest) {
    return jsonResponse(request, env, {
      hasUpdate: false,
      version: '',
      versionCode: 0,
      apkUrl: '',
      apkSize: 0,
      updateLog: '',
      forceUpdate: false
    }, 200, {
      'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600'
    });
  }

  const currentVersionCode = Math.max(0, Math.floor(Number(new URL(request.url).searchParams.get('versionCode') || 0)));
  const hasUpdate = currentVersionCode > 0 && latest.versionCode > currentVersionCode;
  const minVersion = latest.minVersion === undefined || latest.minVersion === null
    ? null
    : Math.max(0, Math.floor(Number(latest.minVersion || 0))) || null;
  const forceUpdate = hasUpdate && (
    Boolean(latest.forceUpdate)
    || (minVersion !== null && currentVersionCode > 0 && currentVersionCode < minVersion)
  );
  return jsonResponse(request, env, {
    hasUpdate,
    version: latest.version,
    versionCode: latest.versionCode,
    apkUrl: latest.apkUrl,
    apkSize: latest.apkSize || 0,
    updateLog: latest.updateLog || '',
    forceUpdate,
    minVersion: minVersion ?? undefined
  }, 200, {
    'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600'
  });
};

const handleCommunityList = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['GET', 'OPTIONS'], 'GET');
  if (fail) return fail;
  const url = new URL(request.url);
  const data = await listCommunityShares(env, {
    type: url.searchParams.get('type') || '',
    page: url.searchParams.get('page') || '1',
    pageSize: url.searchParams.get('pageSize') || '20',
    search: url.searchParams.get('search') || '',
    sort: url.searchParams.get('sort') || 'newest'
  });
  // 如果是第一页且没有搜索条件，可以缓存短时间
  const canCache = url.searchParams.get('page') === '1' && !url.searchParams.get('search');
  return jsonResponse(request, env, data, 200, canCache ? {
    'Cache-Control': 'public, max-age=120, stale-while-revalidate=240'
  } : undefined);
};

const handleCommunityUpload = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['POST', 'OPTIONS'], 'POST');
  if (fail) return fail;
  const body = await parseJsonBody(request);
  if (!body || typeof body !== 'object') {
    return jsonResponse(request, env, { error: '缺少必要参数' }, 400);
  }
  const clientId = getClientId(request, body);
  if (!clientId) {
    return jsonResponse(request, env, { error: '缺少客户端标识' }, 400);
  }
  const rateLimit = checkMemoryRateLimit(
    communityRateBuckets,
    `upload:${getRateLimitIdentity(request, clientId)}`,
    COMMUNITY_UPLOAD_RATE_LIMIT
  );
  pruneRateBuckets(communityRateBuckets);
  if (!rateLimit.ok) {
    return rateLimitedJsonResponse(request, env, rateLimit);
  }
  if (!body.type || !String(body.name || '').trim() || body.payload === undefined) {
    return jsonResponse(request, env, { error: '缺少必要参数' }, 400);
  }
  if (!String(body.author_name || '').trim() || !String(body.author_password || '').trim()) {
    return jsonResponse(request, env, { error: '请提供作者名和密码' }, 400);
  }
  if (!isValidCommunityShareType(body.type)) {
    return jsonResponse(request, env, { error: '无效的类型' }, 400);
  }
  try {
    return jsonResponse(request, env, await uploadCommunityShare(env, body, clientId));
  } catch (error) {
    const message = error instanceof Error ? error.message : '上传失败';
    const status = message.includes('分享内容过大')
      || message.includes('封面图片过大')
      || message.includes('封面图片格式无效')
      || message.includes('封面图片来源无效')
      || message.includes('加密分享内容结构无效')
      || message.includes('请提供作者名和密码')
      || message.includes('名称不能为空')
      ? 400
      : 500;
    return jsonResponse(request, env, { error: message }, status);
  }
};

const handleCommunityDetail = async (context, id) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['GET', 'OPTIONS'], 'GET');
  if (fail) return fail;
  const item = await getCommunityDetail(env, id);
  if (!item) {
    return jsonResponse(request, env, { error: '未找到该分享' }, 404);
  }
  return jsonResponse(request, env, item);
};

const handleCommunityDownload = async (context, id) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['GET', 'OPTIONS'], 'GET');
  if (fail) return fail;
  const clientId = getClientId(request, {});
  const rateLimit = checkMemoryRateLimit(
    communityRateBuckets,
    `download:${getRateLimitIdentity(request, clientId)}`,
    COMMUNITY_DOWNLOAD_RATE_LIMIT
  );
  pruneRateBuckets(communityRateBuckets);
  if (!rateLimit.ok) {
    return rateLimitedJsonResponse(request, env, rateLimit);
  }
  const item = await downloadCommunityShare(env, id);
  if (!item) {
    return jsonResponse(request, env, { error: '未找到该分享' }, 404);
  }
  return jsonResponse(request, env, item);
};

const handleCommunityDelete = async (context, id) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['POST', 'OPTIONS'], 'POST');
  if (fail) return fail;
  const body = await parseJsonBody(request);
  if (!body || typeof body !== 'object') {
    return jsonResponse(request, env, { error: '缺少必要参数' }, 400);
  }
  const clientId = getClientId(request, body || {});
  const rateLimit = checkMemoryRateLimit(
    communityRateBuckets,
    `delete:${getRateLimitIdentity(request, clientId)}`,
    COMMUNITY_DELETE_RATE_LIMIT
  );
  pruneRateBuckets(communityRateBuckets);
  if (!rateLimit.ok) {
    return rateLimitedJsonResponse(request, env, rateLimit);
  }
  const result = await deleteCommunityShareByAuthor(env, id, body?.author_name, body?.author_password);
  if (result.reason === 'not_found') {
    return jsonResponse(request, env, { error: '未找到该分享' }, 404);
  }
  if (result.reason === 'missing_author') {
    return jsonResponse(request, env, { error: '请提供作者名和密码' }, 400);
  }
  if (result.reason === 'forbidden') {
    return jsonResponse(request, env, { error: '作者名或密码错误' }, 403);
  }
  return jsonResponse(request, env, { ok: true });
};

const handleCommunityMine = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['POST', 'OPTIONS'], 'POST');
  if (fail) return fail;
  const body = await parseJsonBody(request);
  const clientId = getClientId(request, body || {});
  const rateLimit = checkMemoryRateLimit(
    communityRateBuckets,
    `mine:${getRateLimitIdentity(request, clientId)}`,
    COMMUNITY_MINE_RATE_LIMIT
  );
  pruneRateBuckets(communityRateBuckets);
  if (!rateLimit.ok) {
    return rateLimitedJsonResponse(request, env, rateLimit);
  }
  const authorName = String(body?.author_name || '').trim();
  const authorPassword = String(body?.author_password || '').trim();
  if (!authorName || !authorPassword) {
    return jsonResponse(request, env, { error: '请提供作者名和密码' }, 400);
  }
  return jsonResponse(request, env, {
    items: await listMyCommunityShares(env, authorName, authorPassword)
  });
};

const handleCommunityLike = async (context, id) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['POST', 'OPTIONS'], 'POST');
  if (fail) return fail;
  const body = await parseJsonBody(request);
  const clientId = getClientId(request, body || {});
  if (!clientId || clientId === 'anonymous') {
    return jsonResponse(request, env, { error: '缺少客户端标识' }, 400);
  }
  const rateLimit = checkMemoryRateLimit(
    communityRateBuckets,
    `like:${getRateLimitIdentity(request, clientId)}`,
    COMMUNITY_LIKE_RATE_LIMIT
  );
  pruneRateBuckets(communityRateBuckets);
  if (!rateLimit.ok) {
    return rateLimitedJsonResponse(request, env, rateLimit);
  }
  const result = await likeCommunityShare(env, id, clientId, body?.action || 'like');
  if (!result) {
    return jsonResponse(request, env, { error: '未找到该分享' }, 404);
  }
  if (result.reason === 'missing_client') {
    return jsonResponse(request, env, { error: '缺少客户端标识' }, 400);
  }
  return jsonResponse(request, env, result);
};

const handleCommunityReport = async (context, id) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['POST', 'OPTIONS'], 'POST');
  if (fail) return fail;
  const body = await parseJsonBody(request);
  const clientId = getClientId(request, body || {});
  if (!clientId || clientId === 'anonymous') {
    return jsonResponse(request, env, { error: '缺少客户端标识' }, 400);
  }
  const rateLimit = checkMemoryRateLimit(
    communityRateBuckets,
    `report:${getRateLimitIdentity(request, clientId)}`,
    COMMUNITY_REPORT_RATE_LIMIT
  );
  pruneRateBuckets(communityRateBuckets);
  if (!rateLimit.ok) {
    return rateLimitedJsonResponse(request, env, rateLimit);
  }
  const result = await reportCommunityShare(env, id, clientId);
  if (result.reason === 'not_found') {
    return jsonResponse(request, env, { error: '未找到该分享' }, 404);
  }
  if (result.reason === 'missing_client') {
    return jsonResponse(request, env, { error: '缺少客户端标识' }, 400);
  }
  if (result.reason === 'duplicate') {
    return jsonResponse(request, env, { error: '你已经举报过了' }, 400);
  }
  return jsonResponse(request, env, {
    reported: true,
    report_count: result.report_count
  });
};

const handleCommunityAsset = async (context, encodedKey) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['GET', 'OPTIONS'], 'GET');
  if (fail) return fail;
  if (!encodedKey || encodedKey === 'anonymous') {
    return jsonResponse(request, env, { error: '资源不存在' }, 404);
  }
  const asset = await getCommunityAsset(env, encodedKey);
  if (!asset) {
    return jsonResponse(request, env, { error: '资源不存在' }, 404);
  }
  return new Response(asset.body, {
    status: 200,
    headers: asset.headers
  });
};

const handleAdminVerify = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['POST', 'OPTIONS'], 'POST');
  if (fail) return fail;
  const body = await parseJsonBody(request);
  const success = isValidAdminKey(body?.adminKey, env);
  return jsonResponse(request, env, success ? { success: true } : { success: false, error: '密钥错误' }, success ? 200 : 403);
};

const handleAdminPassphrases = async (context) => {
  const { request, env } = context;
  const fail = requireOneOfMethods(request, env, ['GET', 'POST', 'PUT']);
  if (fail) return fail;
  const authFail = await requireAdmin(request, env);
  if (authFail) return authFail;

  if (request.method === 'GET') {
    return jsonResponse(request, env, { passphrases: await listPassphrases(env) });
  }

  const body = await parseJsonBody(request);
  if (request.method === 'PUT') {
    if (!body || body.passphrases === undefined) {
      return jsonResponse(request, env, { error: '缺少口令配置' }, 400);
    }
    const replaced = await replaceAllPassphrases(env, body.passphrases);
    return jsonResponse(request, env, { success: true, passphrases: replaced });
  }

  try {
    const created = await addPassphrase(env, body || {});
    return jsonResponse(request, env, { success: true, passphrase: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建口令失败';
    const status = message.includes(ADMIN_PASSPHRASE_REQUIRED_ERROR) ? 400 : 500;
    return jsonResponse(request, env, { error: message }, status);
  }
};

const handleAdminPassphraseById = async (context, id) => {
  const { request, env } = context;
  const fail = requireOneOfMethods(request, env, ['PUT', 'DELETE']);
  if (fail) return fail;
  const authFail = await requireAdmin(request, env);
  if (authFail) return authFail;

  if (request.method === 'DELETE') {
    const deleted = await deletePassphrase(env, id);
    return deleted
      ? jsonResponse(request, env, { success: true })
      : jsonResponse(request, env, { error: '口令不存在' }, 404);
  }

  const body = await parseJsonBody(request);
  try {
    const updated = await updatePassphrase(env, id, body || {});
    return updated
      ? jsonResponse(request, env, { success: true })
      : jsonResponse(request, env, { error: '口令不存在' }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新口令失败';
    const status = message.includes(ADMIN_PASSPHRASE_REQUIRED_ERROR) ? 400 : 500;
    return jsonResponse(request, env, { error: message }, status);
  }
};

const handleAdminAiConfig = async (context) => {
  const { request, env } = context;
  const fail = requireOneOfMethods(request, env, ['GET', 'PUT']);
  if (fail) return fail;
  const authFail = await requireAdmin(request, env);
  if (authFail) return authFail;

  if (request.method === 'GET') {
    const config = await getEffectiveAiConfig(env);
    return jsonResponse(request, env, {
      config,
      runtime: {
        upstream: {
          host: (() => {
            try { return new URL(config.upstreamUrl || '').host || ''; } catch { return ''; }
          })(),
          keyConfigured: !!config.upstreamKey
        }
      }
    });
  }

  const body = await parseJsonBody(request);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonResponse(request, env, { error: '请求格式错误' }, 400);
  }
  const current = await getEffectiveAiConfig(env);
  const next = await saveAiConfig(env, { ...current, ...(body || {}) });
  return jsonResponse(request, env, { success: true, config: getBuiltinAiConfig(env, next) });
};

const handleAdminFetchModels = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['POST', 'OPTIONS'], 'POST');
  if (fail) return fail;
  const authFail = await requireAdmin(request, env);
  if (authFail) return authFail;

  const aiConfig = await getEffectiveAiConfig(env);
  if (!aiConfig.upstreamKey || !aiConfig.upstreamUrl) {
    return jsonResponse(request, env, { success: false, error: '上游 API Key 未配置' }, 400);
  }

  const endpoint = buildModelEndpoint(aiConfig.upstreamUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ADMIN_FETCH_MODELS_TIMEOUT_MS);
  try {
    const upstreamResponse = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.upstreamKey}`
      },
      signal: controller.signal
    });
    if (!upstreamResponse.ok) {
      const message = await buildErrorMessage(upstreamResponse, `获取模型失败（${upstreamResponse.status}）`);
      return jsonResponse(request, env, { success: false, error: message }, upstreamResponse.status);
    }
    const data = await upstreamResponse.json().catch(() => ({}));
    return jsonResponse(request, env, {
      success: true,
      models: Array.from(new Set(parseModelList(data)))
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    const message = aborted ? '获取模型列表超时' : (error instanceof Error ? error.message : '请求模型列表失败');
    return jsonResponse(request, env, { success: false, error: message }, aborted ? 504 : 502);
  } finally {
    clearTimeout(timeoutId);
  }
};

const handleAdminNotices = async (context) => {
  const { request, env } = context;
  const fail = requireOneOfMethods(request, env, ['POST', 'DELETE']);
  if (fail) return fail;
  const authFail = await requireAdmin(request, env);
  if (authFail) return authFail;

  if (request.method === 'DELETE') {
    await clearTeamNotices(env);
    return jsonResponse(request, env, { success: true });
  }

  const body = await parseJsonBody(request);
  try {
    const notice = await addTeamNotice(env, body || {});
    return jsonResponse(request, env, { success: true, notice });
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建通知失败';
    const status = message.includes(ADMIN_TEAM_NOTICE_REQUIRED_ERROR) ? 400 : 500;
    return jsonResponse(request, env, { error: message }, status);
  }
};

const handleAdminNoticeById = async (context, id) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['DELETE', 'OPTIONS'], 'DELETE');
  if (fail) return fail;
  const authFail = await requireAdmin(request, env);
  if (authFail) return authFail;
  const deleted = await deleteTeamNotice(env, id);
  return deleted
    ? jsonResponse(request, env, { success: true })
    : jsonResponse(request, env, { error: '通知不存在' }, 404);
};

const handleAdminDonors = async (context) => {
  const { request, env } = context;
  const fail = requireOneOfMethods(request, env, ['GET', 'POST']);
  if (fail) return fail;
  const authFail = await requireAdmin(request, env);
  if (authFail) return authFail;

  if (request.method === 'GET') {
    return jsonResponse(request, env, { donors: await listDonors(env) });
  }

  const body = await parseJsonBody(request);
  try {
    const donor = await addDonor(env, body || {});
    return jsonResponse(request, env, { success: true, donor });
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建赞赏记录失败';
    const status = message.includes(ADMIN_DONOR_NAME_REQUIRED_ERROR) ? 400 : 500;
    return jsonResponse(request, env, { error: message }, status);
  }
};

const handleAdminDonorById = async (context, id) => {
  const { request, env } = context;
  const fail = requireOneOfMethods(request, env, ['PUT', 'DELETE']);
  if (fail) return fail;
  const authFail = await requireAdmin(request, env);
  if (authFail) return authFail;

  if (request.method === 'DELETE') {
    const deleted = await deleteDonor(env, id);
    return deleted
      ? jsonResponse(request, env, { success: true })
      : jsonResponse(request, env, { error: '赞赏记录不存在' }, 404);
  }

  const body = await parseJsonBody(request);
  try {
    const updated = await updateDonor(env, id, body || {});
    return updated
      ? jsonResponse(request, env, { success: true })
      : jsonResponse(request, env, { error: '赞赏记录不存在' }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新赞赏记录失败';
    const status = message.includes(ADMIN_DONOR_NAME_REQUIRED_ERROR) ? 400 : 500;
    return jsonResponse(request, env, { error: message }, status);
  }
};

const handleAdminDonorsBatch = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['POST', 'OPTIONS'], 'POST');
  if (fail) return fail;
  const authFail = await requireAdmin(request, env);
  if (authFail) return authFail;
  const body = await parseJsonBody(request);
  if (!Array.isArray(body?.donors)) {
    return jsonResponse(request, env, { error: '数据格式错误' }, 400);
  }
  const donors = await replaceDonors(env, body.donors);
  return jsonResponse(request, env, { success: true, donors, count: donors.length });
};

const handleAdminVersions = async (context) => {
  const { request, env } = context;
  const fail = requireOneOfMethods(request, env, ['GET', 'POST']);
  if (fail) return fail;
  const authFail = await requireAdmin(request, env);
  if (authFail) return authFail;

  if (request.method === 'GET') {
    return jsonResponse(request, env, { versions: await listApkVersions(env) });
  }

  const body = await parseJsonBody(request);
  try {
    const version = await addApkVersion(env, body || {});
    return jsonResponse(request, env, { success: true, version });
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建版本失败';
    const status = message.includes(ADMIN_APK_VERSION_REQUIRED_ERROR) ? 400 : 500;
    return jsonResponse(request, env, { error: message }, status);
  }
};

const handleAdminVersionById = async (context, id) => {
  const { request, env } = context;
  const fail = requireOneOfMethods(request, env, ['PUT', 'DELETE']);
  if (fail) return fail;
  const authFail = await requireAdmin(request, env);
  if (authFail) return authFail;

  if (request.method === 'DELETE') {
    const deleted = await deleteApkVersion(env, id);
    return deleted
      ? jsonResponse(request, env, { success: true })
      : jsonResponse(request, env, { error: '版本不存在' }, 404);
  }

  const body = await parseJsonBody(request);
  try {
    const version = await updateApkVersion(env, id, body || {});
    return version
      ? jsonResponse(request, env, { success: true, version })
      : jsonResponse(request, env, { error: '版本不存在' }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新失败';
    const status = message.includes(ADMIN_APK_VERSION_REQUIRED_ERROR) ? 400 : 500;
    return jsonResponse(request, env, { error: message }, status);
  }
};

const handleAdminVersionsCleanup = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['POST', 'OPTIONS'], 'POST');
  if (fail) return fail;
  const authFail = await requireAdmin(request, env);
  if (authFail) return authFail;
  const body = await parseJsonBody(request);
  if (!isPlainObjectBody(body)) {
    return jsonResponse(request, env, { error: '请求格式错误' }, 400);
  }
  const rawKeepCount = body?.keepCount;
  let keepCount = 3;
  if (rawKeepCount !== undefined) {
    const parsedKeepCount = Number(rawKeepCount);
    if (!Number.isFinite(parsedKeepCount) || parsedKeepCount < 1) {
      return jsonResponse(request, env, { error: ADMIN_APK_CLEANUP_KEEP_COUNT_INVALID_ERROR }, 400);
    }
    keepCount = Math.max(1, Math.floor(parsedKeepCount));
  }
  const versions = await listApkVersions(env);
  const removable = versions.slice(keepCount);
  for (const version of removable) {
    await deleteApkVersion(env, version.id);
  }
  return jsonResponse(request, env, {
    success: true,
    removedCount: removable.length,
    removedFileCount: 0
  });
};

const getPublishedVersionByCode = async (env, versionCode) => {
  const versions = await listApkVersions(env);
  return versions.find((item) => Number(item.versionCode || 0) === Number(versionCode || 0)) || null;
};

const handleAdminScanApk = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['GET', 'OPTIONS'], 'GET');
  if (fail) return fail;
  const authFail = await requireAdmin(request, env);
  if (authFail) return authFail;
  return jsonResponse(request, env, { success: true, files: [] });
};

const handleAdminCandidate = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['GET', 'OPTIONS'], 'GET');
  if (fail) return fail;
  const authFail = await requireAdmin(request, env);
  if (authFail) return authFail;
  let candidate = null;
  let candidateError = '';
  try {
    candidate = await getApkCandidateSource(env).getLatestCandidate({ forceRefresh: true });
  } catch (error) {
    candidateError = error instanceof Error ? error.message : '读取候选 APK 失败';
  }
  const versions = await listApkVersions(env);
  return jsonResponse(request, env, {
    success: true,
    candidate,
    candidateError,
    publishedVersion: versions[0] || null,
    latestPublished: versions[0] || null
  });
};

const handleAdminCandidateSourceStatus = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['GET', 'OPTIONS'], 'GET');
  if (fail) return fail;
  const authFail = await requireAdmin(request, env);
  if (authFail) return authFail;

  const metadataUrl = String(env.APK_R2_CANDIDATE_METADATA_URL || '').trim()
    || (String(env.APK_R2_PUBLIC_BASE_URL || '').trim()
      ? `${String(env.APK_R2_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '')}/${String(env.APK_R2_CANDIDATE_METADATA_PATH || 'apk/candidates/latest.json').replace(/^\/+/, '')}`
      : '');
  try {
    const candidate = await getApkCandidateSource(env).getLatestCandidate({ forceRefresh: true });
    return jsonResponse(request, env, {
      success: true,
      source: 'r2-candidate',
      metadataUrl,
      configured: Boolean(metadataUrl),
      candidate
    });
  } catch (error) {
    return jsonResponse(request, env, {
      success: true,
      source: 'r2-candidate',
      metadataUrl,
      configured: Boolean(metadataUrl),
      candidate: null,
      error: error instanceof Error ? error.message : '读取候选包失败'
    });
  }
};

const handleAdminAddApkFile = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['POST', 'OPTIONS'], 'POST');
  if (fail) return fail;
  const authFail = await requireAdmin(request, env);
  if (authFail) return authFail;
  return jsonResponse(request, env, {
    success: false,
    error: 'Pages Functions 版不再支持本地 APK 扫描，请使用 GitHub Actions 自动构建并上传 R2 候选包'
  }, 400);
};

const handleAdminPublishCandidate = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['POST', 'OPTIONS'], 'POST');
  if (fail) return fail;
  const authFail = await requireAdmin(request, env);
  if (authFail) return authFail;
  const body = await parseJsonBody(request);
  if (!isPlainObjectBody(body)) {
    return jsonResponse(request, env, { error: '请求格式错误' }, 400);
  }
  let candidate = null;
  try {
    candidate = await getApkCandidateSource(env).getLatestCandidate({ forceRefresh: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '读取候选 APK 失败';
    return jsonResponse(request, env, {
      success: false,
      error: `读取候选 APK 失败：${message}`
    }, 502);
  }
  if (!candidate) {
    return jsonResponse(request, env, {
      success: false,
      error: '当前没有可发布的候选 APK'
    }, 404);
  }

  const payload = {
    version: String(body?.version || candidate.version || '').trim(),
    versionCode: Number(body?.versionCode || candidate.versionCode || 0),
    apkUrl: String(body?.apkUrl || candidate.apkUrl || '').trim(),
    apkSize: body?.apkSize === undefined ? candidate.apkSize : Number(body?.apkSize || 0),
    updateLog: String(body?.updateLog || candidate.updateLog || '').trim(),
    forceUpdate: body?.forceUpdate !== undefined
      ? body.forceUpdate === true || body.forceUpdate === 1
      : candidate.forceUpdate === true,
    minVersion: body?.minVersion !== undefined
      ? body.minVersion
      : candidate.minVersion
  };

  if (!payload.version || !payload.versionCode || !payload.apkUrl) {
    return jsonResponse(request, env, {
      success: false,
      error: '候选 APK 元数据不完整，无法发布'
    }, 400);
  }

  const existing = await getPublishedVersionByCode(env, payload.versionCode);
  const version = existing
    ? (await updateApkVersion(env, existing.id, { ...existing, ...payload })) || await addApkVersion(env, payload)
    : await addApkVersion(env, payload);

  return jsonResponse(request, env, {
    success: true,
    version,
    candidate
  });
};

const handleAdminCommunity = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['GET', 'OPTIONS'], 'GET');
  if (fail) return fail;
  const authFail = await requireAdmin(request, env);
  if (authFail) return authFail;
  const url = new URL(request.url);
  const items = await listAdminCommunityShares(env, url.searchParams.get('search') || '');
  return jsonResponse(request, env, { items });
};

const handleAdminCommunityById = async (context, id) => {
  const { request, env } = context;
  const fail = requireOneOfMethods(request, env, ['PUT', 'DELETE']);
  if (fail) return fail;
  const authFail = await requireAdmin(request, env);
  if (authFail) return authFail;

  if (request.method === 'DELETE') {
    const deleted = await deleteAdminCommunityShare(env, id);
    return deleted
      ? jsonResponse(request, env, { success: true })
      : jsonResponse(request, env, { error: '未找到该分享' }, 404);
  }

  const body = await parseJsonBody(request);
  try {
    const item = await updateAdminCommunityShare(env, id, body || {});
    return item
      ? jsonResponse(request, env, { success: true, item })
      : jsonResponse(request, env, { error: '未找到该分享' }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新失败';
    const status = message.includes('名称不能为空')
      || message.includes('封面图片过大')
      || message.includes('封面图片格式无效')
      || message.includes('封面图片来源无效')
      ? 400
      : 500;
    return jsonResponse(request, env, { error: message }, status);
  }
};

const handleRemovedStats = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['GET', 'OPTIONS'], 'GET');
  if (fail) return fail;
  const authFail = await requireAdmin(request, env);
  if (authFail) return authFail;
  return jsonResponse(request, env, {
    error: 'Cloudflare Functions 版已移除统计能力'
  }, 410);
};

const handleUsageStatus = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['GET', 'OPTIONS'], 'GET');
  if (fail) return fail;

  const aiConfig = getBuiltinAiConfig(env, null);
  const usageDate = getTodayString(aiConfig.timeZone);
  const limit = resolveLocalDailyLimit(aiConfig);
  const remaining = limit === -1 ? -1 : limit;

  return jsonResponse(request, env, {
    date: usageDate,
    count: 0,
    limit,
    remaining,
    isPremium: false,
    serverTracked: false,
    progress: 0,
    premiumExpiresAt: null,
    isExpired: false
  }, 200);
};

const handleBootstrap = async (context) => {
  const { request, env } = context;
  const fail = requireMethod(request, env, ['GET', 'OPTIONS'], 'GET');
  if (fail) return fail;

  // 批量获取初始化数据，减少请求次数
  const aiConfig = await getEffectiveAiConfig(env);
  const modelAccess = buildModelAccess(aiConfig);
  const dailyLimit = resolveLocalDailyLimit(aiConfig);
  const [notices, donors, latestVersion] = await Promise.all([
    listTeamNotices(env),
    listDonors(env),
    getLatestApkVersion(env)
  ]);

  return jsonResponse(request, env, {
    models: modelAccess.models,
    defaultModel: modelAccess.defaultModel,
    dailyLimit,
    defaultDailyLimit: dailyLimit,
    serverTracked: false,
    notices,
    donors,
    version: latestVersion || {
      version: '0.1.0',
      versionCode: 0,
      apkUrl: '',
      updateLog: '',
      forceUpdate: false
    },
    backend: 'cloudflare-pages-functions-d1',
    capabilities: {
      builtinAi: true,
      passphrase: true,
      persistence: true,
      community: true
    }
  }, 200, {
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
  });
};

export async function handleApiRequest(context) {
  const { request, env } = context;

  try {
    const pathname = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
    if (!pathname.startsWith('/api')) {
      return jsonResponse(request, env, { error: 'Not found' }, 404);
    }

    const apiPath = pathname.slice(4) || '/';
    if (apiPath === '/proxy') return handleProxy(context);
    if (apiPath === '/models') return handleModels(context);
    if (apiPath === '/bootstrap') return handleBootstrap(context);
    if (apiPath === '/test') return handleTest(context);
    if (apiPath === '/usage/status') return handleUsageStatus(context);
    if (apiPath === '/verify-passphrase') return handleVerifyPassphrase(context);
    if (apiPath === '/divination') return handleDivination(context);
    if (apiPath === '/team/notices') return handleTeamNotices(context);
    if (apiPath === '/team/donors') return handleTeamDonors(context);
    if (apiPath === '/app/version') return handleAppVersion(context);
    if (apiPath === '/app/check-update') return handleCheckUpdate(context);
    if (apiPath === '/community/list') return handleCommunityList(context);
    if (apiPath === '/community/upload') return handleCommunityUpload(context);
    if (apiPath === '/community/mine') return handleCommunityMine(context);
    if (apiPath.startsWith('/community/detail/')) return handleCommunityDetail(context, apiPath.slice('/community/detail/'.length));
    if (apiPath.startsWith('/community/download/')) return handleCommunityDownload(context, apiPath.slice('/community/download/'.length));
    if (apiPath.startsWith('/community/delete/')) return handleCommunityDelete(context, apiPath.slice('/community/delete/'.length));
    if (apiPath.startsWith('/community/like/')) return handleCommunityLike(context, apiPath.slice('/community/like/'.length));
    if (apiPath.startsWith('/community/report/')) return handleCommunityReport(context, apiPath.slice('/community/report/'.length));
    if (apiPath.startsWith('/community/assets/')) return handleCommunityAsset(context, apiPath.slice('/community/assets/'.length));

    if (apiPath === '/admin/verify-key') return handleAdminVerify(context);
    if (apiPath === '/admin/passphrases') return handleAdminPassphrases(context);
    if (apiPath.startsWith('/admin/passphrases/')) return handleAdminPassphraseById(context, apiPath.slice('/admin/passphrases/'.length));
    if (apiPath === '/admin/ai-config') return handleAdminAiConfig(context);
    if (apiPath === '/admin/ai-config/fetch-models') return handleAdminFetchModels(context);
    if (apiPath === '/admin/notices') return handleAdminNotices(context);
    if (apiPath.startsWith('/admin/notices/')) return handleAdminNoticeById(context, apiPath.slice('/admin/notices/'.length));
    if (apiPath === '/admin/donors') return handleAdminDonors(context);
    if (apiPath === '/admin/donors/batch') return handleAdminDonorsBatch(context);
    if (apiPath.startsWith('/admin/donors/')) return handleAdminDonorById(context, apiPath.slice('/admin/donors/'.length));
    if (apiPath === '/admin/versions') return handleAdminVersions(context);
    if (apiPath === '/admin/versions/cleanup') return handleAdminVersionsCleanup(context);
    if (apiPath.startsWith('/admin/versions/')) return handleAdminVersionById(context, apiPath.slice('/admin/versions/'.length));
    if (apiPath === '/admin/community') return handleAdminCommunity(context);
    if (apiPath.startsWith('/admin/community/')) return handleAdminCommunityById(context, apiPath.slice('/admin/community/'.length));
    if (apiPath === '/admin/apk/candidate') return handleAdminCandidate(context);
    if (apiPath === '/admin/apk/source-status') return handleAdminCandidateSourceStatus(context);
    if (apiPath === '/admin/scan-apk') return handleAdminScanApk(context);
    if (apiPath === '/admin/add-apk-file') return handleAdminAddApkFile(context);
    if (apiPath === '/admin/apk/publish-candidate') return handleAdminPublishCandidate(context);
    if (apiPath === '/admin/stats' || apiPath === '/admin/stats/history') return handleRemovedStats(context);

    if (request.method === 'OPTIONS') {
      return optionsResponse(request, env, ALL_METHODS);
    }

    return jsonResponse(request, env, { error: 'Not found' }, 404);
  } catch (error) {
    return jsonResponse(request, env, {
      error: error instanceof Error ? error.message : 'Internal server error'
    }, 500);
  }
}
