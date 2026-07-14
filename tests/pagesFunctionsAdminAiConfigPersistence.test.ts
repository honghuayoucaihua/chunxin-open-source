import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';

const createMockDb = () => {
  const settings = new Map<string, string>();

  return {
    settings,
    prepare(sql: string) {
      return {
        bind(...params: any[]) {
          return {
            async first() {
              if (sql.includes('SELECT value FROM app_settings WHERE key = ? LIMIT 1')) {
                const key = String(params[0] || '');
                return settings.has(key) ? { value: settings.get(key) } : null;
              }
              return null;
            },
            async run() {
              if (sql.includes('INSERT INTO app_settings (key, value, updated_at)')) {
                settings.set(String(params[0] || ''), String(params[1] || ''));
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
};

{
  const db = createMockDb();

  const saveResponse = await handleApiRequest({
    request: new Request('https://example.com/api/admin/ai-config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: JSON.stringify({
        defaultDailyLimit: 300,
        models: ['free/cc', 'free/gpt-5'],
        defaultModel: 'free/gpt-5'
      })
    }),
    env: {
      APP_DB: db,
      ADMIN_KEY: 'secret',
      SYSHUO_API_URL: 'https://example.com/v1/chat/completions',
      SYSHUO_API_KEY: 'test-key',
      BUILTIN_AI_DAILY_LIMIT: '200',
      BUILTIN_AI_MODELS: 'free/cc',
      BUILTIN_AI_DEFAULT_MODEL: 'free/cc'
    }
  } as any);

  assert.equal(saveResponse.status, 200, '保存 AI 配置应成功');
  const savedBody = await saveResponse.json();
  assert.equal(savedBody.success, true);
  assert.equal(savedBody.config.defaultDailyLimit, 300, '返回值应是已合并的有效配置');
  assert.deepEqual(savedBody.config.models, ['free/cc', 'free/gpt-5']);
  assert.equal(savedBody.config.defaultModel, 'free/gpt-5');
  assert.equal(
    db.settings.get('ai.config'),
    JSON.stringify({
      defaultDailyLimit: 300,
      models: ['free/cc', 'free/gpt-5'],
      defaultModel: 'free/gpt-5'
    }),
    '数据库只应存储偏离环境变量的配置项'
  );

  const readResponse = await handleApiRequest({
    request: new Request('https://example.com/api/admin/ai-config', {
      method: 'GET',
      headers: {
        'x-admin-key': 'secret'
      }
    }),
    env: {
      APP_DB: db,
      ADMIN_KEY: 'secret',
      SYSHUO_API_URL: 'https://example.com/v1/chat/completions',
      SYSHUO_API_KEY: 'test-key',
      BUILTIN_AI_DAILY_LIMIT: '200',
      BUILTIN_AI_MODELS: 'free/cc',
      BUILTIN_AI_DEFAULT_MODEL: 'free/cc'
    }
  } as any);

  assert.equal(readResponse.status, 200, '读取 AI 配置应成功');
  const readBody = await readResponse.json();
  assert.equal(readBody.config.defaultDailyLimit, 300, '读取时应重新合并环境变量与覆盖项');
  assert.deepEqual(readBody.config.models, ['free/cc', 'free/gpt-5']);
  assert.equal(readBody.config.defaultModel, 'free/gpt-5');
  assert.equal(readBody.runtime.upstream.host, 'example.com');
  assert.equal(readBody.runtime.upstream.keyConfigured, true);
}

{
  const db = createMockDb();

  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/ai-config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: JSON.stringify({
        defaultDailyLimit: 200,
        models: ['free/cc'],
        defaultModel: 'free/cc',
        fallbackModel: 'free/cc',
        enforceModelWhitelist: true
      })
    }),
    env: {
      APP_DB: db,
      ADMIN_KEY: 'secret',
      BUILTIN_AI_DAILY_LIMIT: '200',
      BUILTIN_AI_MODELS: 'free/cc',
      BUILTIN_AI_DEFAULT_MODEL: 'free/cc'
    }
  } as any);

  assert.equal(response.status, 200);
  assert.equal(db.settings.get('ai.config'), '', '保存回环境变量默认值时应清空数据库覆盖项');
}

{
  const db = createMockDb();

  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/ai-config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: JSON.stringify({
        defaultDailyLimit: 300
      })
    }),
    env: {
      APP_DB: db,
      ADMIN_KEY: 'secret',
      BUILTIN_AI_DAILY_LIMIT: '200',
      BUILTIN_AI_MODELS: 'free/gpt-5,free/gpt-4o-mini',
      BUILTIN_AI_DEFAULT_MODEL: 'free/gpt-5'
    }
  } as any);

  assert.equal(response.status, 200, '局部更新 AI 配置应成功');
  const body = await response.json();
  assert.equal(body.config.defaultDailyLimit, 300);
  assert.deepEqual(
    body.config.models,
    ['free/gpt-5', 'free/gpt-4o-mini'],
    '只更新每日限额时不应把环境变量中的模型配置重置回默认值'
  );
  assert.equal(body.config.defaultModel, 'free/gpt-5');
  assert.equal(
    db.settings.get('ai.config'),
    JSON.stringify({
      defaultDailyLimit: 300
    }),
    '局部更新后数据库只应保留真正变化的字段'
  );
}

{
  const db = createMockDb();

  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/ai-config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: 'null'
    }),
    env: {
      APP_DB: db,
      ADMIN_KEY: 'secret'
    }
  } as any);

  assert.equal(response.status, 400, '非法请求体应直接返回 400');
  const body = await response.json();
  assert.equal(body.error, '请求格式错误');
}

console.log('测试通过：Pages Functions AI 配置会以环境变量为基线，仅持久化必要覆盖项。');
