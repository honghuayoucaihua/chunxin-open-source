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

const readerAppearance = {
  background: 'green',
  fontSize: 20,
  lineHeight: 2.4
};

localStorage.setItem('novel-reader-appearance-v1', JSON.stringify(readerAppearance));

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

assert.deepEqual(payload.novelReaderAppearance, readerAppearance, '快照应包含小说阅读器外观偏好');

localStorage.clear();

const restoredFile = new File([JSON.stringify({
  contacts: [],
  messages: {},
  novelReaderAppearance: readerAppearance
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

assert.deepEqual(JSON.parse(localStorage.getItem('novel-reader-appearance-v1') || 'null'), readerAppearance, '全量恢复应写回小说阅读器外观偏好');

console.log('测试通过：小说阅读器外观偏好会随备份恢复。');
