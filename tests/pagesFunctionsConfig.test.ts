import assert from 'node:assert/strict';
import {
  buildStoredAiConfigOverride,
  getBuiltinAiConfig,
  getBuiltinAiEnvConfig,
  getClientId,
  getTodayString,
  isProxyConfigured,
  normalizeAiConfigOverride,
  resolveRequestedModel
} from '../cloudflare/pages-functions/config.js';
import { checkRateLimit } from '../cloudflare/pages-functions/state.js';
import { getAiConfig, saveAiConfig } from '../cloudflare/pages-functions/data.js';

{
  const config = getBuiltinAiConfig({
    BUILTIN_AI_MODELS: ' free/cc,\nmodels/free/grok-3-mini , free/cc ',
    BUILTIN_AI_DEFAULT_MODEL: 'free/grok-3-mini',
    BUILTIN_AI_DAILY_LIMIT: '321',
    BUILTIN_AI_MAX_CONTEXT_CHARS: '65432',
    SYSHUO_API_URL: 'https://example.com/v1/chat/completions',
    SYSHUO_API_KEY: 'test-key'
  });

  assert.deepEqual(
    config.models,
    ['free/cc', 'free/grok-3-mini'],
    '模型列表应去重、去前缀并保留输入顺序'
  );
  assert.equal(config.defaultModel, 'free/grok-3-mini', '应支持显式默认模型');
  assert.equal(config.defaultDailyLimit, 321, '应读取每日限额环境变量');
  assert.equal(config.maxContextChars, 65432, '应读取上下文预算环境变量');
  assert.equal(isProxyConfigured(config), true, '上游 URL + Key 齐全时应视为已配置');
}

{
  const envConfig = getBuiltinAiEnvConfig({
    BUILTIN_AI_MODELS: 'free/cc,free/gpt-5',
    BUILTIN_AI_DEFAULT_MODEL: 'free/gpt-5',
    BUILTIN_AI_DAILY_LIMIT: '123'
  });
  assert.deepEqual(
    envConfig,
    {
      defaultDailyLimit: 123,
      maxContextChars: 50000,
      proxyTimeoutMs: 180000,
      defaultTemperature: 0.7,
      models: ['free/cc', 'free/gpt-5'],
      defaultModel: 'free/gpt-5',
      fallbackModel: 'free/gpt-5',
      enforceModelWhitelist: true
    },
    '环境变量配置应独立归一化，供持久化覆盖项合并'
  );
}

{
  const override = normalizeAiConfigOverride({
    defaultDailyLimit: '9',
    models: ['models/free/gpt-5', 'free/gpt-5', 'free/cc'],
    defaultModel: 'models/free/gpt-5',
    enforceModelWhitelist: false
  });
  assert.deepEqual(
    override,
    {
      defaultDailyLimit: 9,
      models: ['free/gpt-5', 'free/cc'],
      defaultModel: 'free/gpt-5',
      enforceModelWhitelist: false
    },
    '持久化覆盖项应只归一化显式字段，不补齐未提供的默认值'
  );
}

{
  const override = buildStoredAiConfigOverride({
    defaultDailyLimit: 200,
    models: ['free/cc'],
    defaultModel: 'free/cc',
    fallbackModel: 'free/cc',
    enforceModelWhitelist: true
  }, {
    BUILTIN_AI_DAILY_LIMIT: '200',
    BUILTIN_AI_MODELS: 'free/cc'
  });
  assert.equal(override, null, '与环境变量完全一致的配置不应再写入数据库');
}

{
  const override = buildStoredAiConfigOverride({
    defaultDailyLimit: 300,
    maxContextChars: 50000,
    proxyTimeoutMs: 180000,
    defaultTemperature: 0.7,
    models: ['free/cc', 'free/gpt-5'],
    defaultModel: 'free/gpt-5',
    fallbackModel: 'free/cc',
    enforceModelWhitelist: false
  }, {
    BUILTIN_AI_DAILY_LIMIT: '200',
    BUILTIN_AI_MODELS: 'free/cc'
  });
  assert.deepEqual(
    override,
    {
      defaultDailyLimit: 300,
      models: ['free/cc', 'free/gpt-5'],
      defaultModel: 'free/gpt-5',
      enforceModelWhitelist: false
    },
    '持久化层只应保存真正偏离环境变量的覆盖项'
  );
}

{
  const config = getBuiltinAiConfig({});
  assert.equal(resolveRequestedModel('models/free/cc', config), 'free/cc', '应兼容 models/ 前缀模型名');
  assert.equal(resolveRequestedModel('unknown-model', config), config.defaultModel, '非法模型应回退到默认模型');
}

{
  const clientId = getClientId(new Request('https://example.com/api/proxy', {
    headers: {
      'X-Client-ID': 'client-123'
    }
  }));
  assert.equal(clientId, 'client-123', '应优先使用请求头里的客户端 ID');
}

{
  const date = getTodayString('Asia/Shanghai');
  assert.match(date, /^\d{4}-\d{2}-\d{2}$/, '时区日期应输出 YYYY-MM-DD');
}

{
  const db = {
    writes: [] as any[],
    prepare(sql: string) {
      return {
        bind(...params: any[]) {
          return {
            async first() {
              if (sql.includes('SELECT value FROM app_settings WHERE key = ? LIMIT 1')) {
                assert.equal(params[0], 'ai.config');
                return null;
              }
              return null;
            }
          };
        },
        async run() {
          db.writes.push(sql);
          return { success: true };
        }
      };
    }
  };

  const config = await getAiConfig({ APP_DB: db } as any);
  assert.equal(config, null, '数据库未存储 AI 配置时不应伪造默认配置对象');
}

{
  const writes: Array<{ sql: string; params: any[] }> = [];
  let storedValue = '';
  const db = {
    prepare(sql: string) {
      return {
        bind(...params: any[]) {
          return {
            async first() {
              if (sql.includes('SELECT value FROM app_settings WHERE key = ? LIMIT 1')) {
                return storedValue ? { value: storedValue } : null;
              }
              return null;
            },
            async run() {
              writes.push({ sql, params });
              if (sql.includes('INSERT INTO app_settings')) {
                storedValue = String(params[1] || '');
              }
              return { success: true };
            }
          };
        },
        async run() {
          return { success: true };
        }
      };
    }
  };

  const saved = await saveAiConfig({
    APP_DB: db,
    BUILTIN_AI_DAILY_LIMIT: '200',
    BUILTIN_AI_MODELS: 'free/cc'
  } as any, {
    defaultDailyLimit: 200,
    maxContextChars: 50000,
    proxyTimeoutMs: 180000,
    defaultTemperature: 0.7,
    models: ['free/cc'],
    defaultModel: 'free/cc',
    fallbackModel: 'free/cc',
    enforceModelWhitelist: true
  });

  assert.equal(saved, null, '保存与环境变量一致的配置时不应产生覆盖项');
  assert.equal(storedValue, '', '无差异配置应在数据库中保留为空');

  const savedOverride = await saveAiConfig({
    APP_DB: db,
    BUILTIN_AI_DAILY_LIMIT: '200',
    BUILTIN_AI_MODELS: 'free/cc'
  } as any, {
    defaultDailyLimit: 300,
    maxContextChars: 50000,
    proxyTimeoutMs: 180000,
    defaultTemperature: 0.7,
    models: ['free/cc', 'free/gpt-5'],
    defaultModel: 'free/gpt-5',
    fallbackModel: 'free/cc',
    enforceModelWhitelist: true
  });

  assert.deepEqual(
    savedOverride,
    {
      defaultDailyLimit: 300,
      models: ['free/cc', 'free/gpt-5'],
      defaultModel: 'free/gpt-5'
    },
    '保存差异配置时应只返回有效覆盖项'
  );
  assert.equal(
    storedValue,
    JSON.stringify(savedOverride),
    '数据库中应只写入差异覆盖项 JSON'
  );
  assert.ok(writes.some((item) => item.sql.includes('INSERT INTO app_settings')), '应通过设置表持久化覆盖项');
}

{
  const effective = getBuiltinAiConfig({
    BUILTIN_AI_DAILY_LIMIT: '200',
    BUILTIN_AI_MODELS: 'free/cc',
    BUILTIN_AI_DEFAULT_MODEL: 'free/cc'
  }, {
    defaultDailyLimit: 300,
    models: ['free/cc', 'free/gpt-5'],
    defaultModel: 'free/gpt-5'
  });
  assert.equal(effective.defaultDailyLimit, 300, '有效配置应允许持久化覆盖每日限额');
  assert.deepEqual(effective.models, ['free/cc', 'free/gpt-5'], '有效配置应允许持久化扩展模型白名单');
  assert.equal(effective.defaultModel, 'free/gpt-5', '有效配置应允许持久化默认模型');
}

{
  const current = getBuiltinAiConfig({
    BUILTIN_AI_DAILY_LIMIT: '200',
    BUILTIN_AI_MODELS: 'free/gpt-5,free/gpt-4o-mini',
    BUILTIN_AI_DEFAULT_MODEL: 'free/gpt-5'
  }, null);
  const merged = { ...current, defaultDailyLimit: 300 };
  const override = buildStoredAiConfigOverride(merged, {
    BUILTIN_AI_DAILY_LIMIT: '200',
    BUILTIN_AI_MODELS: 'free/gpt-5,free/gpt-4o-mini',
    BUILTIN_AI_DEFAULT_MODEL: 'free/gpt-5'
  });
  assert.deepEqual(
    override,
    { defaultDailyLimit: 300 },
    '局部更新应基于完整有效配置合并，不能把环境变量模型配置错误写回覆盖项'
  );
}

{
  const originalDateNow = Date.now;
  try {
    Date.now = () => 1_000;
    const key = `proxy-limit:${Date.now()}`;
    const first = checkRateLimit(key, 2, 60_000);
    const second = checkRateLimit(key, 2, 60_000);
    const third = checkRateLimit(key, 2, 60_000);
    const fourth = checkRateLimit(key, 2, 60_000);

    assert.equal(first.allowed, true, '内存限流首次请求应放行');
    assert.equal(second.allowed, true, '配额内第二次请求应继续放行');
    assert.equal(third.allowed, false, '首次超限时应立即拦截');
    assert.equal(fourth.allowed, false, '超限后应保持拦截状态');
    assert.equal(third.remaining, 0, '超限后剩余额度应为 0');
  } finally {
    Date.now = originalDateNow;
  }
}

console.log('测试通过：Pages Functions 简易后端会正确解析配置、识别客户端并维护基础限流状态。');
