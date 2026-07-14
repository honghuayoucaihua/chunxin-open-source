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

const staleGeminiConfig = {
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

localStorage.setItem(`${AI_PROVIDER_CONFIG_STORAGE_PREFIX}gemini`, JSON.stringify(staleGeminiConfig));

applyAiProviderPersistedState({
  contacts: [],
  user: { id: 'me', name: '我' },
  messages: {},
  aiProviderConfigs: {
    custom_response: incomingCustomConfig
  }
}, 'overwrite');

assert.deepEqual(
  JSON.parse(localStorage.getItem(`${AI_PROVIDER_CONFIG_STORAGE_PREFIX}custom_response`) || 'null'),
  incomingCustomConfig,
  '完整恢复应写入备份中包含的 AI 服务商配置'
);
assert.equal(
  localStorage.getItem(`${AI_PROVIDER_CONFIG_STORAGE_PREFIX}gemini`),
  null,
  '完整恢复应清除备份中未包含的旧 AI 服务商配置'
);

console.log('测试通过：完整 AI 服务商配置恢复会清除备份中未包含的旧配置。');
