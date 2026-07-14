import assert from 'node:assert/strict';
import { runRestoreFlow } from '../src/app/restoreFlow.ts';

(globalThis as any).window = {
  customEmojis: [],
  emojiGroups: [],
  allGroupEmojis: {},
  hiddenEmojiIds: [],
  customEmojiOrder: [],
  selectedContacts: [],
  currentArticle: null
};

const incomingHistory = [{
  id: 'history-incoming',
  partner: { gender: 'female', age: 21, tags: ['新'], persona: '新历史' },
  startedAt: 1710000000000,
  endedAt: 1710000001000,
  reason: 'leftByPeer',
  messages: [{ id: 'msg-incoming', senderId: 'anonymous', content: '新历史', timestamp: 1710000000000, type: 'text' }]
}];

let anonymousHistoryState: any[] = [];
let hasUnfinishedState = true;
let unfinishedState: any = {
  partner: { gender: 'male', age: 24, tags: ['未完成'], persona: '当前未完成' },
  messages: [{ id: 'unfinished-old', senderId: 'anonymous', content: '旧未完成消息', timestamp: 1720000000000, type: 'text' }],
  startedAt: 1720000000000
};

const setByValueOrUpdater = <T>(current: T, value: T | ((prev: T) => T)): T =>
  typeof value === 'function' ? (value as (prev: T) => T)(current) : value;

const createSetter = () => () => {};

await runRestoreFlow({
  showToast: () => {},
  setProgressDialog: () => {},
  importBackupFile: async () => ({
    success: true,
    data: { anonymousChatHistory: incomingHistory },
    format: 'json'
  }),
  unwrapImportedBackupData: (data: any) => data,
  adaptLegacyBackupData: (data: any) => data,
  scoreSnapshotShape: (value: any) => value && typeof value === 'object' && Array.isArray(value.anonymousChatHistory) ? 1 : 0,
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
  setAnonymousHistory: (value: any) => {
    anonymousHistoryState = setByValueOrUpdater(anonymousHistoryState, value);
  },
  setAnonymousHasUnfinishedSession: (value: any) => {
    hasUnfinishedState = setByValueOrUpdater(hasUnfinishedState, value);
  },
  setAnonymousUnfinishedSession: (value: any) => {
    unfinishedState = setByValueOrUpdater(unfinishedState, value);
  },
  setDivinationHistory: createSetter(),
  setHasAgreedTerms: createSetter(),
  setWalletBank: createSetter(),
  setMusicState: createSetter()
}, new File(['{}'], 'anonymous-history.json', { type: 'application/json' }), 'overwrite');

assert.deepEqual(anonymousHistoryState, incomingHistory, '只导入匿名历史时应覆盖匿名历史列表');
assert.equal(hasUnfinishedState, true, '只导入匿名历史时不应重置未完成会话标记');
assert.equal(unfinishedState?.messages?.[0]?.id, 'unfinished-old', '只导入匿名历史时不应清空当前未完成会话内容');

console.log('测试通过：局部匿名历史导入不会误清未完成会话。');
