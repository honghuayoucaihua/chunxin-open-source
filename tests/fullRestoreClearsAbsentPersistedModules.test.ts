import assert from 'node:assert/strict';
import {
  TRUTH_DARE_RUNTIME_STORAGE_KEY,
  TRUTH_DARE_THEMES_STORAGE_KEY,
  applyTruthOrDarePersistedState,
  readTruthOrDareRuntimeMap
} from '../src/chatroom/truthOrDarePersistence.ts';
import {
  AI_PROVIDER_CONFIG_STORAGE_PREFIX,
  AI_PROVIDER_PRESETS_STORAGE_KEY,
  applyAiProviderPersistedState
} from '../src/settings/ai/aiProviderPersistence.ts';
import {
  getImageLibraryState,
  saveImageLibraryState,
  applyImageLibraryPersistedState,
  type ImageLibraryGroup,
  type ImageLibraryItem
} from '../src/services/imageLibraryStore.ts';
import {
  DEFAULT_READER_APPEARANCE,
  applyNovelPersistedState,
  loadBookshelf,
  loadPreference,
  loadReaderAppearance,
  saveBookshelf,
  saveNovelPreference,
  saveReaderAppearance,
  type BookshelfEntry
} from '../src/pages/novelDiscoverHelpers.ts';

const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, String(value)),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear()
};

(globalThis as any).window = {
  imageLibraryGroups: undefined,
  imageLibraryItems: undefined
};

const staleThemes = [{
  id: 'theme-old',
  name: '旧主题',
  questions: ['旧问题'],
  challenges: ['旧挑战'],
  updatedAt: 1000
}];
const staleRuntime = {
  contact_old: {
    active: true,
    round: 3,
    theme: staleThemes[0],
    updatedAt: 2000
  }
};
const staleGroups: ImageLibraryGroup[] = [{
  id: 'group-old',
  name: '旧相册',
  order: 0,
  createdAt: 1000,
  updatedAt: 1000
}];
const staleItems: ImageLibraryItem[] = [{
  id: 'item-old',
  groupId: 'group-old',
  url: 'data:image/png;base64,OLD',
  desc: '旧图片',
  createdAt: 1001
}];
const staleBookshelf: BookshelfEntry[] = [{
  book: {
    id: 'book-old',
    title: '旧小说',
    author: '旧作者',
    tags: ['旧'],
    wordCount: '1万字',
    favorites: '5',
    rating: '9.0',
    description: '旧简介'
  },
  meta: null,
  lastReadChapterIndex: 8,
  updatedAt: 1000
}];

localStorage.setItem(TRUTH_DARE_THEMES_STORAGE_KEY, JSON.stringify(staleThemes));
localStorage.setItem(TRUTH_DARE_RUNTIME_STORAGE_KEY, JSON.stringify(staleRuntime));
saveImageLibraryState(staleGroups, staleItems);
saveBookshelf(staleBookshelf);
saveReaderAppearance({ background: 'dark', fontSize: 21, lineHeight: 2.5 });
saveNovelPreference({ guided: true, genre: '悬疑言情' });
localStorage.setItem(AI_PROVIDER_PRESETS_STORAGE_KEY, JSON.stringify([{ id: 'preset-old', provider: 'gemini', name: '旧预设' }]));
localStorage.setItem(`${AI_PROVIDER_CONFIG_STORAGE_PREFIX}gemini`, JSON.stringify({ apiKey: 'gemini-old' }));

const legacyFullSnapshot = {
  version: 'legacy-idb-auto-migrated',
  contacts: [],
  user: { id: 'me', name: '我' },
  messages: {},
  settings: {},
  worldBooks: []
};

applyTruthOrDarePersistedState(legacyFullSnapshot, 'overwrite');
applyImageLibraryPersistedState(legacyFullSnapshot, 'overwrite');
applyNovelPersistedState(legacyFullSnapshot, 'overwrite');
applyAiProviderPersistedState(legacyFullSnapshot, 'overwrite');

assert.deepEqual(
  JSON.parse(localStorage.getItem(TRUTH_DARE_THEMES_STORAGE_KEY) || 'null'),
  [],
  '完整恢复缺少真心话大冒险字段时，应清空旧主题缓存'
);
assert.deepEqual(readTruthOrDareRuntimeMap(), {}, '完整恢复缺少真心话大冒险字段时，应清空旧运行态缓存');

const imageLibraryState = getImageLibraryState();
assert.deepEqual(imageLibraryState.groups, [], '完整恢复缺少图片素材库字段时，应清空旧相册缓存');
assert.deepEqual(imageLibraryState.items, [], '完整恢复缺少图片素材库字段时，应清空旧图片缓存');

assert.deepEqual(loadBookshelf(), [], '完整恢复缺少小说书架字段时，应清空旧书架');
assert.deepEqual(loadReaderAppearance(), DEFAULT_READER_APPEARANCE, '完整恢复缺少阅读器外观字段时，应回到默认外观');
assert.deepEqual(loadPreference(), { guided: false, genre: '' }, '完整恢复缺少小说偏好字段时，应清空旧偏好');

assert.deepEqual(
  JSON.parse(localStorage.getItem(AI_PROVIDER_PRESETS_STORAGE_KEY) || 'null'),
  [],
  '完整恢复缺少 AI 预设字段时，应清空旧预设缓存'
);
assert.equal(
  localStorage.getItem(`${AI_PROVIDER_CONFIG_STORAGE_PREFIX}gemini`),
  null,
  '完整恢复缺少 AI 配置字段时，应清空旧服务商缓存'
);

console.log('测试通过：完整恢复缺少扩展模块字段时，会清理旧旁路缓存，避免残留脏状态。');
