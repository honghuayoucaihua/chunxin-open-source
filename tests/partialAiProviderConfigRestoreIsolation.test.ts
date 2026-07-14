import assert from 'node:assert/strict';
import {
  AI_PROVIDER_CONFIG_STORAGE_PREFIX,
  applyAiProviderPersistedState
} from '../src/settings/ai/aiProviderPersistence.ts';

const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, String(value)),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear()
};

const geminiConfig = {
  apiKey: 'gemini-old',
  model: 'gemini-2.5-pro',
  modelList: ['gemini-2.5-pro']
};
const incomingCustomConfig = {
  apiKey: 'custom-new',
  baseUrl: 'https://api.example.com/v1',
  model: 'writer-model',
  modelList: ['writer-model']
};

localStorage.setItem(`${AI_PROVIDER_CONFIG_STORAGE_PREFIX}gemini`, JSON.stringify(geminiConfig));

applyAiProviderPersistedState({
  aiProviderConfigs: {
    custom_response: incomingCustomConfig
  }
}, 'overwrite');

assert.deepEqual(
  JSON.parse(localStorage.getItem(`${AI_PROVIDER_CONFIG_STORAGE_PREFIX}custom_response`) || 'null'),
  incomingCustomConfig,
  '局部导入单个 AI 服务商配置时，应写入该服务商配置'
);
assert.deepEqual(
  JSON.parse(localStorage.getItem(`${AI_PROVIDER_CONFIG_STORAGE_PREFIX}gemini`) || 'null'),
  geminiConfig,
  '局部导入单个 AI 服务商配置时，不应清除未包含的其他服务商缓存'
);

console.log('测试通过：局部 AI 服务商配置恢复不会误清其他服务商缓存。');
