import assert from 'node:assert/strict';
import {
  clearModelCache,
  fetchFreeModels,
  getBuiltinAIModel,
  getBuiltinAIUsage,
  sendBuiltinAIRequest,
  syncBuiltinAIModelSelection
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

const originalFetch = globalThis.fetch;

try {
  clearModelCache();
  storage.clear();
  storage.set('builtinAIModel', 'free/stale');

  const forwardedModels: string[] = [];
  let modelFetchCount = 0;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/api/models')) {
      modelFetchCount += 1;
      const payload = modelFetchCount === 1
        ? {
            models: ['models/free/admin-a', 'free/admin-b', 'free/admin-a'],
            defaultModel: 'free/admin-b',
            defaultDailyLimit: 7,
            serverTracked: false
          }
        : {
            models: ['free/runtime-a', 'free/runtime-b'],
            defaultModel: 'free/runtime-a',
            dailyLimit: 9,
            serverTracked: false
          };
      return {
        ok: true,
        text: async () => JSON.stringify(payload)
      } as any;
    }
    if (url.endsWith('/api/proxy')) {
      const payload = JSON.parse(String(init?.body || '{}'));
      forwardedModels.push(String(payload.model || ''));
      return {
        ok: true,
        text: async () => JSON.stringify({
          choices: [{ message: { content: 'ok' } }]
        })
      } as any;
    }
    throw new Error(`Unexpected fetch url: ${url}`);
  };

  const models = await fetchFreeModels();
  assert.deepEqual(models, ['free/admin-a', 'free/admin-b'], '前端内置 AI 应直接使用后台配置的模型列表');
  assert.equal(getBuiltinAIUsage().limit, 7, '前端每日上限应跟随后台模型接口返回值');

  const syncedModel = await syncBuiltinAIModelSelection();
  assert.equal(modelFetchCount, 1, '模型选择同步应复用已缓存的后台配置，避免重复请求模型接口');
  assert.equal(syncedModel, 'free/admin-b', '本地旧模型失效时应回退到后台默认模型');
  assert.equal(getBuiltinAIModel(), 'free/admin-b', '同步后读取到的当前模型应与后台默认模型一致');

  const response = await sendBuiltinAIRequest({
    model: 'free/stale',
    messages: [{ role: 'user', content: '你好' }]
  });

  assert.equal(response.success, true, '模型已按后台配置归一化时，请求应成功');
  assert.equal(modelFetchCount, 1, '发送内置 AI 请求时应复用模型配置缓存，减少 Cloudflare 额外调用');
  assert.deepEqual(forwardedModels, ['free/admin-b'], '真正发请求时应按当前缓存配置归一化模型');
  assert.equal(getBuiltinAIModel(), 'free/admin-b', '请求归一化后，本地当前模型应保持为缓存中的默认模型');
  assert.equal(getBuiltinAIUsage().limit, 7, '发送请求不应为刷新每日上限额外请求模型接口');
  assert.equal(getBuiltinAIUsage().count, 1, '请求成功后只增加本地使用次数');

  const refreshedModel = await syncBuiltinAIModelSelection(true);
  assert.equal(modelFetchCount, 2, '显式强制刷新时仍应重新请求后台模型接口');
  assert.equal(refreshedModel, 'free/runtime-a', '强制刷新后应同步后台最新默认模型');
  assert.equal(getBuiltinAIModel(), 'free/runtime-a', '强制刷新后读取到的当前模型应更新');
  assert.equal(getBuiltinAIUsage().limit, 9, '强制刷新模型配置时应同步最新每日上限');
} finally {
  clearModelCache();
  storage.clear();
  globalThis.fetch = originalFetch;
}

console.log('测试通过：内置 AI 模型配置会缓存复用，必要时可强制跟随后台管理配置。');
