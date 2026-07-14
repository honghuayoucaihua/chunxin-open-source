import assert from 'node:assert/strict';
import {
  clearModelCache,
  fetchFreeModels,
  fetchUsageFromBackend,
  getBuiltinAIUsage,
  saveBuiltinAIUsage,
  sendBuiltinAIRequest,
  verifyPassphrase
} from '../src/services/builtinAI.ts';

const storage = new Map<string, string>();

(globalThis as any).localStorage = {
  getItem(key: string) {
    return storage.has(key) ? storage.get(key)! : null;
  },
  setItem(key: string, value: string) {
    storage.set(key, String(value));
  },
  removeItem(key: string) {
    storage.delete(key);
  },
  clear() {
    storage.clear();
  }
};

const today = new Date().toISOString().split('T')[0];
const originalFetch = globalThis.fetch;
const originalError = console.error;
const originalWarn = console.warn;

try {
  storage.clear();
  saveBuiltinAIUsage({
    date: today,
    count: 2,
    limit: 3,
    remaining: 1,
    isPremium: false,
    progress: 66.67,
    premiumLimit: null,
    premiumExpiresAt: null,
    isExpired: false,
    serverTracked: false
  });

  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('本地额度同步不应访问网络');
  };

  const usage = await fetchUsageFromBackend();
  assert.equal(fetchCalls, 0, '同步每日次数不应再请求后端状态接口');
  assert.equal(usage?.count, 2, '同步应保留本地今日已用次数');
  assert.equal(usage?.remaining, 1, '剩余额度应继续按本地已用次数计算');
  assert.equal(usage?.serverTracked, false, '本地每日额度应明确标记为非服务端跟踪');

  const storedUsage = getBuiltinAIUsage();
  assert.equal(storedUsage.count, 2, '保存后的本地用量也应保留今日已用次数');
  assert.equal(storedUsage.remaining, 1, '保存后的本地剩余额度应保持正确');

  storage.set('builtinAIUsage', JSON.stringify({
    date: today,
    count: 1,
    limit: 3,
    remaining: 2,
    isPremium: false,
    progress: 33.33,
    premiumLimit: null,
    premiumExpiresAt: null,
    isExpired: false,
    serverTracked: true
  }));
  assert.equal(getBuiltinAIUsage().serverTracked, false, '旧本地数据中的服务端跟踪标记应被清理');

  clearModelCache();
  storage.clear();
  saveBuiltinAIUsage({
    date: today,
    count: 2,
    limit: 500,
    remaining: 498,
    isPremium: false,
    progress: 0.4,
    premiumLimit: null,
    premiumExpiresAt: null,
    isExpired: false,
    serverTracked: false
  });

  fetchCalls = 0;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    assert.ok(url.endsWith('/api/models'), '每日上限应跟随模型接口获取，不应请求使用状态接口');
    fetchCalls += 1;
    return {
      ok: true,
      text: async () => JSON.stringify({
        models: ['free/cc'],
        defaultModel: 'free/cc',
        dailyLimit: 3,
        serverTracked: false
      })
    } as any;
  };

  const models = await fetchFreeModels();
  assert.deepEqual(models, ['free/cc'], '模型接口仍应正常返回可用模型');
  assert.equal(fetchCalls, 1, '只应请求一次模型接口');
  const usageAfterModelFetch = getBuiltinAIUsage();
  assert.equal(usageAfterModelFetch.count, 2, '刷新每日上限不应清空本地已用次数');
  assert.equal(usageAfterModelFetch.limit, 3, '每日上限应跟随后端模型接口返回值');
  assert.equal(usageAfterModelFetch.remaining, 1, '剩余额度应按新的上限和本地次数重算');
  assert.equal(usageAfterModelFetch.serverTracked, false, '模型接口带回的额度仍应保持本地跟踪');

  clearModelCache();
  storage.set('builtinAIModelConfigCache:v1', JSON.stringify({
    scope: 'free',
    cachedAt: Date.now(),
    config: {
      models: ['free/cc'],
      defaultModel: 'free/cc',
      dailyLimit: 3
    }
  }));
  fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('有效模型配置本地缓存不应访问网络');
  };
  const persistedCachedModels = await fetchFreeModels();
  assert.deepEqual(persistedCachedModels, ['free/cc'], '刷新页面后应复用本地模型配置缓存');
  assert.equal(fetchCalls, 0, '有效本地模型配置缓存不应额外请求 /api/models');

  let proxyCalls = 0;
  fetchCalls = 0;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/api/models')) {
      fetchCalls += 1;
      throw new Error('已有缓存时发送请求不应额外刷新模型接口');
    }
    if (url.endsWith('/api/proxy')) {
      proxyCalls += 1;
      return {
        ok: true,
        text: async () => JSON.stringify({
          choices: [{ message: { content: 'ok' } }]
        })
      } as any;
    }
    throw new Error(`Unexpected fetch url: ${url}`);
  };
  const cachedConfigResponse = await sendBuiltinAIRequest({
    model: 'free/cc',
    messages: [{ role: 'user', content: '你好' }]
  });
  assert.equal(cachedConfigResponse.success, true, '有缓存配置时仍应正常发送内置 AI 请求');
  assert.equal(fetchCalls, 0, '有缓存配置时发送请求不应额外请求 /api/models');
  assert.equal(proxyCalls, 1, '真正的 AI 代理请求仍应正常发送一次');
  assert.equal(getBuiltinAIUsage().count, 3, '代理成功后只在本地增加今日次数');

  saveBuiltinAIUsage({
    date: today,
    count: 0,
    limit: 3,
    remaining: 3,
    isPremium: false,
    progress: 0,
    premiumLimit: null,
    premiumExpiresAt: null,
    isExpired: false,
    serverTracked: false
  });
  proxyCalls = 0;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/api/models')) {
      throw new Error('已有缓存时失败请求不应额外刷新模型接口');
    }
    if (url.endsWith('/api/proxy')) {
      proxyCalls += 1;
      if (proxyCalls === 1) {
        return {
          ok: false,
          status: 503,
          text: async () => JSON.stringify({ error: '上游暂时不可用' })
        } as any;
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          choices: [{ message: { content: '重试后成功' } }]
        })
      } as any;
    }
    throw new Error(`Unexpected fetch url: ${url}`);
  };
  console.error = () => {};
  console.warn = () => {};
  try {
    const retriedProxyResponse = await sendBuiltinAIRequest({
      model: 'free/cc',
      messages: [{ role: 'user', content: '临时上游失败可以重试一次' }]
    });
    assert.equal(retriedProxyResponse.success, true, '代理临时失败时应自动重试一次');
    assert.equal(retriedProxyResponse.content, '重试后成功', '重试成功后应返回模型正文');
    assert.equal(proxyCalls, 2, '代理临时失败只允许额外重试一次，避免放大免费后端调用次数');
    assert.equal(getBuiltinAIUsage().count, 1, '只有重试成功后才增加本地已用次数');
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
  }

  clearModelCache();
  storage.clear();
  saveBuiltinAIUsage({
    date: today,
    count: 5,
    limit: 500,
    remaining: 495,
    isPremium: false,
    progress: 1,
    premiumLimit: null,
    premiumExpiresAt: null,
    isExpired: false,
    serverTracked: false
  });

  fetchCalls = 0;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    assert.ok(url.endsWith('/api/models'), '发送前只允许刷新模型配置，不应进入代理请求');
    fetchCalls += 1;
    return {
      ok: true,
      text: async () => JSON.stringify({
        models: ['free/cc'],
        defaultModel: 'free/cc',
        dailyLimit: 3,
        serverTracked: false
      })
    } as any;
  };
  const loweredLimitResponse = await sendBuiltinAIRequest({
    model: 'free/cc',
    messages: [{ role: 'user', content: '你好' }]
  });

  assert.equal(loweredLimitResponse.success, false, '后台每日上限调低后应按本地新上限拦截');
  assert.equal(loweredLimitResponse.quotaExceeded, true, '后台每日上限调低导致超限时应返回额度用完');
  assert.equal(fetchCalls, 1, '只应复用模型接口刷新上限，不应额外请求 usage/status');

  storage.clear();
  saveBuiltinAIUsage({
    date: today,
    count: 3,
    limit: 3,
    remaining: 0,
    isPremium: false,
    progress: 100,
    premiumLimit: null,
    premiumExpiresAt: null,
    isExpired: false,
    serverTracked: false
  });

  fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('本地额度用完时不应访问网络');
  };
  let quotaCallbackCalled = false;
  const response = await sendBuiltinAIRequest({
    model: 'free/cc',
    messages: [{ role: 'user', content: '你好' }]
  }, () => {
    quotaCallbackCalled = true;
  });

  assert.equal(response.success, false, '本地额度用完时应直接拒绝请求');
  assert.equal(response.quotaExceeded, true, '返回值应标记为额度用完');
  assert.equal(quotaCallbackCalled, true, '额度用完回调仍应触发');
  assert.equal(fetchCalls, 0, '本地额度用完时不应再请求 usage/status、models 或 proxy');

  storage.clear();
  saveBuiltinAIUsage({
    date: today,
    count: 7,
    limit: 500,
    remaining: 493,
    isPremium: false,
    progress: 1.4,
    premiumLimit: null,
    premiumExpiresAt: null,
    isExpired: false,
    serverTracked: false
  });

  fetchCalls = 0;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    assert.ok(url.endsWith('/api/verify-passphrase'), '兑换口令只应请求验证接口');
    fetchCalls += 1;
    return {
      ok: true,
      text: async () => JSON.stringify({
        success: true,
        message: 'ok',
        token: 'premium-token',
        usage: {
          date: today,
          count: 0,
          limit: 20,
          remaining: 20,
          isPremium: true,
          progress: 0,
          premiumLimit: 20,
          premiumExpiresAt: null,
          serverTracked: false
        }
      })
    } as any;
  };
  const passphraseResponse = await verifyPassphrase('test-code');
  assert.equal(passphraseResponse.success, true, '口令验证成功应返回成功');
  assert.equal(fetchCalls, 1, '兑换口令应只请求一次后端验证');
  const premiumUsage = getBuiltinAIUsage();
  assert.equal(premiumUsage.isPremium, true, '兑换后应立即进入高级额度状态');
  assert.equal(premiumUsage.limit, 20, '兑换后每日上限应使用口令额度');
  assert.equal(premiumUsage.count, 7, '兑换口令不应清空本地今日已用次数');
  assert.equal(premiumUsage.remaining, 13, '剩余额度应按本地已用次数重新计算');
  assert.equal(premiumUsage.serverTracked, false, '兑换后仍应保持本地额度统计');
  assert.equal(storage.get('builtinAIPremiumToken'), 'premium-token', '高级凭证应写入本地，供后续请求携带');
} finally {
  clearModelCache();
  storage.clear();
  globalThis.fetch = originalFetch;
  console.error = originalError;
  console.warn = originalWarn;
}

console.log('测试通过：内置 AI 每日额度只在本地记录，不再额外请求服务端状态。');
