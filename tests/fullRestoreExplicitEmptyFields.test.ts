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

const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  }
};

const originalSound = {
  sendSoundEnabled: true,
  receiveSoundEnabled: true,
  sendSoundSrc: '/old-send.mp3',
  receiveSoundSrc: '/old-receive.mp3',
  vibrationEnabled: true,
  notificationEnabled: true,
  notificationTitleTemplate: '旧通知标题',
  notificationBodyTemplate: '旧通知正文',
  keepAliveInBackgroundEnabled: true,
  keepAliveNotificationTitle: '旧常驻标题',
  keepAliveNotificationBody: '旧常驻正文'
};

const incomingSound = {
  sendSoundEnabled: false,
  receiveSoundEnabled: false,
  sendSoundSrc: '',
  receiveSoundSrc: '',
  vibrationEnabled: false,
  notificationEnabled: false,
  notificationTitleTemplate: '',
  notificationBodyTemplate: '',
  keepAliveInBackgroundEnabled: false,
  keepAliveNotificationTitle: '',
  keepAliveNotificationBody: ''
};

let soundState = originalSound;
let divinationState = [{ id: 'div-old', question: '旧问题', answer: '旧答案', createdAt: 1000 }];
let anonymousHistoryState: any[] = [{
  id: 'history-old',
  partner: { gender: 'female', age: 22, tags: ['旧'], persona: '旧历史' },
  startedAt: 1710000000000,
  endedAt: 1710000001000,
  reason: 'leftByPeer',
  messages: [{ id: 'msg-old', senderId: 'anonymous', content: '旧历史', timestamp: 1710000000000, type: 'text' }]
}];
let hasUnfinishedState = true;
let unfinishedState: any = {
  partner: { gender: 'male', age: 24, tags: ['未完成'], persona: '旧未完成' },
  messages: [{ id: 'unfinished-old', senderId: 'anonymous', content: '旧未完成消息', timestamp: 1720000000000, type: 'text' }],
  startedAt: 1720000000000
};
let agreedTermsState = true;

const setByValueOrUpdater = <T>(current: T, value: T | ((prev: T) => T)): T =>
  typeof value === 'function' ? (value as (prev: T) => T)(current) : value;

const createSetter = () => () => {};

await runRestoreFlow({
  showToast: () => {},
  setProgressDialog: () => {},
  importBackupFile: async () => ({
    success: true,
    data: {
      soundVibrationSettings: incomingSound,
      divinationHistory: [],
      anonymousChatHistory: [],
      anonymousHasUnfinishedSession: false,
      anonymousUnfinishedSession: null,
      hasAgreedTerms: false
    },
    format: 'json'
  }),
  unwrapImportedBackupData: (data: any) => data,
  adaptLegacyBackupData: (data: any) => data,
  scoreSnapshotShape: (value: any) => value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'hasAgreedTerms') ? 1 : 0,
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
  setSoundVibrationSettings: (value: any) => {
    soundState = setByValueOrUpdater(soundState, value);
  },
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
  setDivinationHistory: (value: any) => {
    divinationState = setByValueOrUpdater(divinationState, value);
  },
  setHasAgreedTerms: (value: any) => {
    agreedTermsState = setByValueOrUpdater(agreedTermsState, value);
  },
  setWalletBank: createSetter(),
  setMusicState: createSetter()
}, new File(['{}'], 'full-backup.json', { type: 'application/json' }), 'overwrite');

assert.deepEqual(soundState, incomingSound, '完整备份里明确包含声音振动设置时，应允许关闭和清空所有声音字段');
assert.deepEqual(divinationState, [], '完整备份里的空占卜历史应覆盖并清空旧历史');
assert.deepEqual(anonymousHistoryState, [], '完整备份里的空匿名历史应覆盖并清空旧历史');
assert.equal(hasUnfinishedState, false, '完整备份里的 false 未完成标记应覆盖旧状态');
assert.equal(unfinishedState, null, '完整备份里的 null 未完成会话应覆盖旧会话内容');
assert.equal(agreedTermsState, false, '完整备份里的 false 协议状态应覆盖旧状态');

console.log('测试通过：完整恢复会保留空数组、false 和 null 的显式覆盖语义。');
