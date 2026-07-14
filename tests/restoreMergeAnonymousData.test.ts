import assert from 'node:assert/strict';
import { runRestoreFlow } from '../src/app/restoreFlow.ts';

(globalThis as any).window = {
  customEmojis: [],
  emojiGroups: [],
  allGroupEmojis: {},
  hiddenEmojiIds: [],
  customEmojiOrder: []
};

const existingHistory = [{
  id: 'history-existing',
  partner: { gender: 'female', age: 22, tags: ['旧'], persona: '旧会话' },
  startedAt: 1710000000000,
  endedAt: 1710000001000,
  reason: 'leftByMe',
  messages: [{ id: 'msg-existing', senderId: 'anonymous', content: '旧历史', timestamp: 1710000000000, type: 'text' }]
}];

const incomingHistory = {
  id: 'history-incoming',
  partner: { gender: 'male', age: 25, tags: ['新'], persona: '新会话' },
  startedAt: 1720000000000,
  endedAt: 1720000001000,
  reason: 'leftByPeer',
  messages: [{ id: 'msg-incoming', senderId: 'anonymous', content: '新历史', timestamp: 1720000000000, type: 'text' }]
};

let anonymousHistoryState: any[] = existingHistory;
let unfinishedState: any = null;
let hasUnfinishedState = false;

const setByValueOrUpdater = <T>(current: T, value: T | ((prev: T) => T)): T =>
  typeof value === 'function' ? (value as (prev: T) => T)(current) : value;

await runRestoreFlow({
  showToast: () => {},
  setProgressDialog: () => {},
  importBackupFile: async () => ({
    success: true,
    format: 'json',
    data: {
      contacts: [],
      messages: {},
      musicState: {},
      anonymousChatHistory: [incomingHistory],
      anonymousHasUnfinishedSession: true,
      anonymousUnfinishedSession: {
        partner: { gender: 'female', age: 20, tags: ['未完成'], persona: '未完成会话' },
        messages: [{ id: 'unfinished-msg', senderId: 'anonymous', content: '还没结束', timestamp: 1730000000000, type: 'text' }],
        startedAt: 1730000000000
      }
    }
  }),
  adaptLegacyBackupData: (raw: any) => raw,
  unwrapImportedBackupData: (raw: any) => raw,
  scoreSnapshotShape: () => 3,
  normalizeLegacyContacts: (raw: any) => Array.isArray(raw) ? raw : [],
  shouldSkipImportedContact: () => false,
  mergeBuiltInContacts: (contacts: any[]) => contacts,
  setContacts: () => {},
  setUser: () => {},
  setWalletBalance: () => {},
  normalizeLegacyMessages: (raw: any) => raw,
  setMessages: () => {},
  setFavorites: () => {},
  setMoments: () => {},
  normalizeAppearanceSettings: (raw: any) => raw,
  setSettings: () => {},
  normalizeAiSettings: (raw: any) => raw,
  setAiSettings: () => {},
  setWorldBooks: () => {},
  setMasks: () => {},
  setHtmlTemplates: () => {},
  setBubbleTemplates: () => {},
  setForums: () => {},
  normalizeSoundVibrationSettings: (raw: any) => raw,
  setSoundVibrationSettings: () => {},
  setContactMemories: () => {},
  setOfficialArticles: () => {},
  setFriendRequests: () => {},
  setDiscoverUnreadCount: () => {},
  setInboxLetters: () => {},
  setSentLetters: () => {},
  setMailboxTheme: () => {},
  setAnonymousChatSettings: () => {},
  setAnonymousHistory: (value: any) => {
    anonymousHistoryState = setByValueOrUpdater(anonymousHistoryState, value);
  },
  setAnonymousHasUnfinishedSession: (value: any) => {
    hasUnfinishedState = setByValueOrUpdater(hasUnfinishedState, value);
  },
  setAnonymousUnfinishedSession: (value: any) => {
    unfinishedState = setByValueOrUpdater(unfinishedState, value);
  },
  setDivinationHistory: () => {},
  setHasAgreedTerms: () => {},
  setWalletBank: () => {},
  setMusicState: () => {}
}, new File(['{}'], 'backup.json', { type: 'application/json' }), 'merge');

assert.deepEqual(
  anonymousHistoryState.map((item) => item.id),
  ['history-incoming', 'history-existing'],
  '增量恢复应追加匿名聊天历史，并保留当前已有历史'
);
assert.equal(hasUnfinishedState, true, '增量恢复应带回备份中的未完成匿名会话标记');
assert.equal(unfinishedState?.messages?.[0]?.id, 'unfinished-msg', '增量恢复应带回备份中的未完成匿名会话内容');

console.log('测试通过：增量恢复会合并匿名聊天历史和未完成会话。');
