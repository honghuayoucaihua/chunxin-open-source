import assert from 'node:assert/strict';
import { runRestoreFlow } from '../src/app/restoreFlow.ts';
import { PLAYLIST_STORAGE_KEY } from '../src/music/musicCommon.ts';

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

localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify({
  queue: [{ id: 'old-track', name: '旧歌', artist: '旧歌手', album: '旧专辑', source: 'netease' }],
  currentIndex: 0
}));

const restoredMusicState = {
  queue: [],
  currentIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  joinedIds: [],
  togetherStartAt: null,
  togetherElapsed: 0,
  togetherMode: 'together',
  distanceKm: 0,
  audioUrl: null,
  playMode: 'sequence'
};

const restoredFile = new File([JSON.stringify({
  contacts: [],
  messages: {},
  musicState: restoredMusicState
})], 'backup.json', { type: 'application/json' });

const createSetter = () => () => {};
let restoredState: any = null;

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
  setMusicState: (updater: any) => {
    restoredState = typeof updater === 'function' ? updater({}) : updater;
  }
}, restoredFile, 'overwrite');

assert.deepEqual(restoredState.queue, [], '全量恢复应把音乐状态恢复为空队列');
assert.deepEqual(
  JSON.parse(localStorage.getItem(PLAYLIST_STORAGE_KEY) || 'null'),
  { queue: [], currentIndex: 0 },
  '全量恢复音乐状态时应同步覆盖播放器本地播放列表缓存，避免旧队列下次打开又恢复'
);

console.log('测试通过：全量恢复音乐状态会同步覆盖播放器本地播放列表缓存。');
