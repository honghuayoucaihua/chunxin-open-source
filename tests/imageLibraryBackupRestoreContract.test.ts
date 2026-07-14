import assert from 'node:assert/strict';
import { buildSnapshotPayload } from '../src/services/snapshot/snapshotBuilder.ts';
import { runRestoreFlow } from '../src/app/restoreFlow.ts';
import {
  getImageLibraryState,
  saveImageLibraryState
} from '../src/services/imageLibraryStore.ts';

const IMAGE_LIBRARY_GROUPS_KEY = 'xushuo_image_library_groups';
const IMAGE_LIBRARY_ITEMS_KEY = 'xushuo_image_library_items';

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

const groups = [{
  id: 'album-1',
  name: '角色设定',
  order: 0,
  createdAt: 1000,
  updatedAt: 2000
}];
const items = [{
  id: 'img-1',
  groupId: 'album-1',
  url: 'data:image/png;base64,AAAA',
  desc: '女主头像参考',
  createdAt: 3000
}];

saveImageLibraryState(groups, items);

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

assert.deepEqual(payload.imageLibraryGroups, groups, '快照应包含图片素材库相册分组');
assert.deepEqual(payload.imageLibraryItems, items, '快照应包含图片素材库图片条目');

localStorage.clear();
(window as any).imageLibraryGroups = undefined;
(window as any).imageLibraryItems = undefined;

const restoredFile = new File([JSON.stringify({
  contacts: [],
  messages: {},
  imageLibraryGroups: groups,
  imageLibraryItems: items
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

assert.deepEqual(JSON.parse(localStorage.getItem(IMAGE_LIBRARY_GROUPS_KEY) || 'null'), groups, '全量恢复应写回图片素材库相册分组');
assert.deepEqual(JSON.parse(localStorage.getItem(IMAGE_LIBRARY_ITEMS_KEY) || 'null'), items, '全量恢复应写回图片素材库图片条目');
assert.deepEqual(getImageLibraryState(), { groups, items }, '恢复后运行时也应能立即读到图片素材库');

console.log('测试通过：图片素材库相册和图片条目会随备份恢复。');
