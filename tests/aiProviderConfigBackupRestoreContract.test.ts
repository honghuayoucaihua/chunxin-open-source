import assert from 'node:assert/strict';
import { buildSnapshotPayload } from '../src/services/snapshot/snapshotBuilder.ts';
import { runRestoreFlow } from '../src/app/restoreFlow.ts';

const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, String(value)),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear()
};

(globalThis as any).window = {
  customEmojis: [],
  emojiGroups: [],
  allGroupEmojis: {},
  hiddenEmojiIds: [],
  customEmojiOrder: [],
  selectedContacts: [],
  currentArticle: null
};

const presets = [{
  id: 'preset-1',
  name: '创作模型',
  provider: 'custom_response',
  config: {
    apiKey: 'sk-test',
    baseUrl: 'https://api.example.com/v1',
    model: 'writer-model',
    responseFormat: 'response',
    enableImageGeneration: true,
    imageModel: 'image-model'
  },
  modelList: ['writer-model', 'backup-model'],
  imageModelList: ['image-model'],
  createdAt: 1000,
  updatedAt: 2000
}];
const providerConfigs = {
  custom_response: {
    apiKey: 'sk-response',
    baseUrl: 'https://response.example.com/v1',
    model: 'response-model',
    responseFormat: 'response',
    modelList: ['response-model']
  },
  gemini: {
    apiKey: 'gemini-key',
    baseUrl: 'https://generativelanguage.googleapis.com',
    model: 'gemini-2.5-pro',
    modelList: ['gemini-2.5-pro']
  }
};

localStorage.setItem('aiProviderPresets', JSON.stringify(presets));
for (const [provider, config] of Object.entries(providerConfigs)) {
  localStorage.setItem(`aiProviderConfig:${provider}`, JSON.stringify(config));
}

const payload = buildSnapshotPayload({
  contacts: [],
  user: {
    name: '测试用户',
    avatar: '',
    wechatId: 'tester',
    gender: 'other',
    signature: '',
    momentsCover: '',
    region: '',
    balance: 0
  },
  walletBalance: 0,
  messages: {},
  favorites: [],
  moments: [],
  settings: {} as any,
  aiSettings: {} as any,
  worldBooks: [],
  officialArticles: [],
  contactMemories: {},
  friendRequests: []
});

assert.deepEqual(payload.aiProviderPresets, presets, '快照应包含用户保存的 AI 服务商预设');
assert.deepEqual(payload.aiProviderConfigs, providerConfigs, '快照应包含各 AI 服务商切换缓存');

localStorage.clear();

const restoredFile = new File([JSON.stringify({
  contacts: [],
  messages: {},
  aiProviderPresets: presets,
  aiProviderConfigs: providerConfigs
})], 'backup.json', { type: 'application/json' });

const createSetter = () => () => {};

await runRestoreFlow({
  showToast: () => {},
  setProgressDialog: () => {},
  importBackupFile: async (file: File) => ({
    success: true,
    data: JSON.parse(await file.text()),
    format: 'json'
  }),
  unwrapImportedBackupData: (data: any) => data,
  adaptLegacyBackupData: (data: any) => data,
  scoreSnapshotShape: () => 2,
  normalizeLegacyContacts: (contacts: any[]) => contacts,
  shouldSkipImportedContact: () => false,
  mergeBuiltInContacts: (contacts: any[]) => contacts,
  normalizeLegacyMessages: (messages: any) => messages,
  normalizeAppearanceSettings: (settings: any) => settings,
  normalizeAiSettings: (settings: any) => settings,
  normalizeSoundVibrationSettings: (settings: any) => settings || {},
  setContacts: createSetter(),
  setUser: createSetter(),
  setWalletBalance: createSetter(),
  setMessages: createSetter(),
  setFavorites: createSetter(),
  setMoments: createSetter(),
  setSettings: createSetter(),
  setAiSettings: createSetter(),
  setWorldBooks: createSetter(),
  setMasks: createSetter(),
  setHtmlTemplates: createSetter(),
  setBubbleTemplates: createSetter(),
  setForums: createSetter(),
  setSoundVibrationSettings: createSetter(),
  setContactMemories: createSetter(),
  setOfficialArticles: createSetter(),
  setFriendRequests: createSetter(),
  setDiscoverUnreadCount: createSetter(),
  setInboxLetters: createSetter(),
  setSentLetters: createSetter(),
  setMailboxTheme: createSetter(),
  setAnonymousChatSettings: createSetter(),
  setAnonymousHistory: createSetter(),
  setAnonymousHasUnfinishedSession: createSetter(),
  setAnonymousUnfinishedSession: createSetter(),
  setDivinationHistory: createSetter(),
  setHasAgreedTerms: createSetter(),
  setWalletBank: createSetter(),
  setMusicState: createSetter()
}, restoredFile, 'overwrite');

assert.deepEqual(JSON.parse(localStorage.getItem('aiProviderPresets') || 'null'), presets, '全量恢复应写回 AI 服务商预设');
assert.deepEqual(JSON.parse(localStorage.getItem('aiProviderConfig:custom_response') || 'null'), providerConfigs.custom_response, '全量恢复应写回自定义 Response 服务商缓存');
assert.deepEqual(JSON.parse(localStorage.getItem('aiProviderConfig:gemini') || 'null'), providerConfigs.gemini, '全量恢复应写回 Gemini 服务商缓存');

console.log('测试通过：AI 服务商预设和切换缓存会随备份恢复。');
