import assert from 'node:assert/strict';
import { runRestoreFlow } from '../src/app/restoreFlow.ts';
import {
  getImageLibraryState,
  saveImageLibraryState
} from '../src/services/imageLibraryStore.ts';

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
  currentArticle: null,
  imageLibraryGroups: undefined,
  imageLibraryItems: undefined
};

const originalGroups = [{
  id: 'album-old',
  name: '旧相册',
  order: 0,
  createdAt: 1000,
  updatedAt: 1000
}];
const originalItems = [{
  id: 'img-old',
  groupId: 'album-old',
  url: 'data:image/png;base64,OLD',
  desc: '旧图片',
  createdAt: 1200
}];
const incomingGroups = [{
  id: 'album-new',
  name: '新相册',
  order: 0,
  createdAt: 2000,
  updatedAt: 2000
}];

saveImageLibraryState(originalGroups, originalItems);

const createSetter = () => () => {};

await runRestoreFlow({
  showToast: () => {},
  setProgressDialog: () => {},
  importBackupFile: async () => ({
    success: true,
    data: {
      version: 'image-library-groups-export-v1',
      imageLibraryGroups: incomingGroups
    },
    format: 'json'
  }),
  unwrapImportedBackupData: (data: any) => data,
  adaptLegacyBackupData: (data: any) => data,
  scoreSnapshotShape: (value: any) => value && typeof value === 'object' && Array.isArray(value.imageLibraryGroups) ? 1 : 0,
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
}, new File(['{}'], 'image-library-groups.json', { type: 'application/json' }), 'overwrite');

const restored = getImageLibraryState();
assert.deepEqual(restored.groups, incomingGroups, '导入仅包含图片素材库分组的文件时，应覆盖分组');
assert.deepEqual(restored.items, originalItems, '导入仅包含图片素材库分组的文件时，不应清空未包含的图片条目');

console.log('测试通过：局部图片素材库恢复不会误清未包含的图片条目。');
