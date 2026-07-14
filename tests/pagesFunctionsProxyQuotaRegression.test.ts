import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';
import { getTodayString } from '../cloudflare/pages-functions/config.js';

const createMockDb = () => {
  const settings = new Map<string, string>();
  const dailyUsageSql: string[] = [];

  return {
    settings,
    dailyUsageSql,
    prepare(sql: string) {
      if (sql.includes('daily_usage')) {
        dailyUsageSql.push(sql);
      }

      return {
        bind(...params: any[]) {
          return {
            async run() {
              return { success: true };
            },
            async first() {
              if (sql.includes('SELECT value FROM app_settings WHERE key = ? LIMIT 1')) {
                const key = String(params[0] || '');
                return settings.has(key) ? { value: settings.get(key) } : null;
              }
              return null;
            }
          };
        },
        async run() {
          return { success: true };
        }
      };
    }
  };
};

const buildProxyRequest = (model = 'free/cc') => new Request('https://example.com/api/proxy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Client-ID': 'proxy-user'
  },
  body: JSON.stringify({
    model,
    messages: [{ role: 'user', content: '你好' }]
  })
});

const buildProxyEnv = (db: ReturnType<typeof createMockDb>) => ({
  APP_DB: db,
  SYSHUO_API_URL: 'https://example.com/v1/chat/completions',
  SYSHUO_API_KEY: 'test-key',
  BUILTIN_AI_DAILY_LIMIT: '1',
  BUILTIN_AI_MODELS: 'free/cc'
});

{
  const db = createMockDb();
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response(JSON.stringify({
      error: {
        message: 'upstream rejected'
      }
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  };

  try {
    const response = await handleApiRequest({
      request: buildProxyRequest(),
      env: buildProxyEnv(db)
    } as any);

    assert.equal(response.status, 429, '上游返回错误状态时应透传状态码');
    assert.equal(fetchCalls, 1, '上游错误场景也应实际发起一次请求');

    const body = await response.json();
    assert.equal(body.error, 'upstream rejected');
    assert.equal(db.dailyUsageSql.length, 0, '上游错误也不应读写服务端每日额度表');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

{
  const db = createMockDb();
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('upstream down');
  };

  try {
    const response = await handleApiRequest({
      request: buildProxyRequest(),
      env: buildProxyEnv(db)
    } as any);

    assert.equal(response.status, 502, '上游失败时代理应返回 502');
    assert.equal(fetchCalls, 1, '上游请求应被真正发起一次');

    const body = await response.json();
    assert.equal(body.error, 'upstream down');
    assert.equal(db.dailyUsageSql.length, 0, '上游异常也不应写服务端每日额度表');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

{
  const db = createMockDb();
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const response = await handleApiRequest({
      request: buildProxyRequest('free/not-allowed'),
      env: buildProxyEnv(db)
    } as any);

    assert.equal(response.status, 400, '非法模型应直接返回 400');
    assert.equal(fetchCalls, 0, '非法模型不应请求上游');
    assert.equal(db.dailyUsageSql.length, 0, '非法模型不应触发服务端每日额度记录');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

{
  const db = createMockDb();
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const first = await handleApiRequest({
      request: buildProxyRequest(),
      env: buildProxyEnv(db)
    } as any);
    const second = await handleApiRequest({
      request: buildProxyRequest(),
      env: buildProxyEnv(db)
    } as any);

    assert.equal(first.status, 200, '首次代理请求应正常透传');
    assert.equal(second.status, 200, '服务端不应因每日额度拦截后续代理请求');
    assert.equal(fetchCalls, 2, '每日额度由前端本地处理，后端应继续请求上游');
    assert.equal(db.dailyUsageSql.length, 0, '代理请求不应创建、读取或写入服务端每日额度表');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

{
  const db = createMockDb();
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const buildLimitedRequest = () => new Request('https://example.com/api/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-ID': 'rate-limited-user'
    },
    body: JSON.stringify({
      model: 'free/cc',
      messages: [{ role: 'user', content: '你好' }]
    })
  });

  try {
    const env = {
      ...buildProxyEnv(db),
      BUILTIN_AI_RATE_LIMIT_MAX: '1',
      BUILTIN_AI_RATE_LIMIT_WINDOW_MS: '60000'
    };
    const first = await handleApiRequest({
      request: buildLimitedRequest(),
      env
    } as any);
    const second = await handleApiRequest({
      request: buildLimitedRequest(),
      env
    } as any);

    assert.equal(first.status, 200, '限流窗口内首次代理请求应正常透传');
    assert.equal(second.status, 429, '超过客户端频率限制时应返回 429');
    assert.equal(fetchCalls, 1, '被限流的请求不应继续请求上游 AI');

    const body = await second.json();
    assert.equal(body.code, 'RATE_LIMITED');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

{
  const db = createMockDb();
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/models', {
      method: 'GET'
    }),
    env: {
      APP_DB: db,
      BUILTIN_AI_DAILY_LIMIT: '4',
      BUILTIN_AI_MODELS: 'free/cc'
    }
  } as any);

  assert.equal(response.status, 200, '模型接口应正常返回');
  const body = await response.json();
  assert.deepEqual(body.models, ['free/cc'], '模型接口仍应返回可用模型列表');
  assert.equal(body.dailyLimit, 4, '模型接口应顺带返回本地每日上限，避免前端额外请求使用状态');
  assert.equal(body.defaultDailyLimit, 4, '模型接口应兼容每日上限字段名');
  assert.equal(body.serverTracked, false, '模型接口应明确标记每日额度不由服务端跟踪');
  assert.equal(db.dailyUsageSql.length, 0, '模型接口不应创建、读取或写入服务端每日额度表');
}

{
  const db = createMockDb();
  const usageDate = getTodayString('Asia/Shanghai');
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/usage/status', {
      method: 'GET',
      headers: {
        'X-Client-ID': 'proxy-user'
      }
    }),
    env: {
      APP_DB: db,
      BUILTIN_AI_DAILY_LIMIT: '3'
    }
  } as any);

  assert.equal(response.status, 200, '使用状态接口应正常返回');
  const body = await response.json();
  assert.equal(body.date, usageDate, '使用状态应按配置时区返回日期');
  assert.equal(body.count, 0, '使用状态不应读取服务端每日计数');
  assert.equal(body.limit, 3, '使用状态可返回环境配置的每日上限，供前端本地使用');
  assert.equal(body.remaining, 3, '未记录服务端次数时应返回完整本地可用额度');
  assert.equal(body.serverTracked, false, '使用状态应明确标记后端不跟踪每日额度');
  assert.equal(db.dailyUsageSql.length, 0, '使用状态接口不应创建、读取或写入服务端每日额度表');
}

console.log('测试通过：Pages Functions 代理不再记录服务端每日额度，适配 Cloudflare 免费额度。');
