import assert from 'node:assert/strict';
import { runRestoreFlow } from '../src/app/restoreFlow.ts';
import { buildSnapshotPayload } from '../src/services/snapshot/snapshotBuilder.ts';
import {
  loadBookshelf,
  saveBookshelf,
  type BookshelfEntry
} from '../src/pages/novelDiscoverHelpers.ts';

const BOOKSHELF_KEY = 'novel-discover-bookshelf-v1';

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

const bookshelf: BookshelfEntry[] = [{
  book: {
    id: 'novel-1',
    title: '雾港遗书',
    author: '测试作者',
    tags: ['悬疑', '成长'],
    wordCount: '12万字',
    favorites: '3.1万',
    rating: '9.3',
    description: '她在雾港收到一封来自十年后的遗书。'
  },
  meta: {
    intro: '雾港里藏着一段迟到的真相。',
    storyBible: {
      premise: '一封遗书牵出旧案。',
      coreConflict: '真相与亲情互相撕扯。',
      heroineArc: '从逃避到主动揭开谜底。',
      relationArc: '误解中的两人逐步重建信任。',
      worldRules: ['雾港每年冬天封港'],
      writingStyle: '悬疑慢热',
      readerDirectives: ['保留雾港意象']
    },
    chapters: [{
      index: 1,
      title: '第一章 来信',
      summary: '女主收到遗书。',
      content: '冬雾压下来时，那封信躺在门缝里。'
    }]
  },
  lastReadChapterIndex: 1,
  updatedAt: 2000
}];

saveBookshelf(bookshelf);
const normalizedBookshelf = loadBookshelf();

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

assert.deepEqual(payload.novelBookshelf, normalizedBookshelf, '快照应包含小说书架、章节内容和阅读进度');

localStorage.clear();

const restoredFile = new File([JSON.stringify({
  contacts: [],
  messages: {},
  novelBookshelf: normalizedBookshelf
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

assert.deepEqual(JSON.parse(localStorage.getItem(BOOKSHELF_KEY) || 'null'), normalizedBookshelf, '全量恢复应写回小说书架');
assert.deepEqual(loadBookshelf(), normalizedBookshelf, '恢复后小说页应能读回书架、章节内容和阅读进度');

console.log('测试通过：小说书架、章节内容和阅读进度会随备份恢复。');
