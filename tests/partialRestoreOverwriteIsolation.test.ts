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

const htmlTemplate = {
  id: 'html-1',
  name: '状态卡',
  usageNote: '展示状态时',
  htmlContent: '<div>{{状态}}</div>',
  variables: [],
  enabled: true,
  createdAt: 1000
};

const originalSound = {
  sendSoundEnabled: false,
  receiveSoundEnabled: false,
  sendSoundSrc: '/custom-send.mp3',
  receiveSoundSrc: '/custom-receive.mp3',
  vibrationEnabled: false,
  notificationEnabled: false,
  notificationTitleTemplate: '旧标题',
  notificationBodyTemplate: '旧正文',
  keepAliveInBackgroundEnabled: true,
  keepAliveNotificationTitle: '旧常驻标题',
  keepAliveNotificationBody: '旧常驻正文'
};
const originalHistory = [{
  id: 'history-existing',
  partner: { gender: 'female', age: 22, tags: ['旧'], persona: '旧会话' },
  startedAt: 1710000000000,
  endedAt: 1710000001000,
  reason: 'leftByMe',
  messages: [{ id: 'msg-existing', senderId: 'anonymous', content: '旧历史', timestamp: 1710000000000, type: 'text' }]
}];

let htmlTemplatesState: any[] = [];
let soundState = originalSound;
let divinationState = [{ id: 'div-1', question: '旧问题', answer: '旧答案', createdAt: 1000 }];
let anonymousHistoryState: any[] = originalHistory;
let hasUnfinishedState = true;
let unfinishedState: any = {
  partner: { gender: 'male', age: 23, tags: ['未完成'], persona: '旧未完成' },
  messages: [{ id: 'unfinished-old', senderId: 'anonymous', content: '旧未完成消息', timestamp: 1720000000000, type: 'text' }],
  startedAt: 1720000000000
};
let agreedTermsState = false;

const setByValueOrUpdater = <T>(current: T, value: T | ((prev: T) => T)): T =>
  typeof value === 'function' ? (value as (prev: T) => T)(current) : value;

const createSetter = () => () => {};

await runRestoreFlow({
  showToast: () => {},
  setProgressDialog: () => {},
  importBackupFile: async () => ({
    success: true,
    data: {
      version: 'htmltemplates-export-v1',
      exportedAt: 2000,
      htmlTemplates: [htmlTemplate]
    },
    format: 'json'
  }),
  unwrapImportedBackupData: (data: any) => data,
  adaptLegacyBackupData: (data: any) => data,
  scoreSnapshotShape: (value: any) => value && typeof value === 'object' && Array.isArray(value.htmlTemplates) ? 1 : 0,
  normalizeLegacyContacts: (contacts: any[]) => contacts,
  shouldSkipImportedContact: () => false,
  mergeBuiltInContacts: (contacts: any[]) => contacts,
  normalizeLegacyMessages: (messages: any) => messages,
  normalizeAppearanceSettings: (settings: any) => settings,
  normalizeAiSettings: (settings: any) => settings,
  normalizeSoundVibrationSettings: (settings: any) => settings || { reset: true },
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
  setHtmlTemplates: (value: any) => {
    htmlTemplatesState = setByValueOrUpdater(htmlTemplatesState, value);
  },
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
}, new File(['{}'], 'html.json', { type: 'application/json' }), 'overwrite');

assert.deepEqual(htmlTemplatesState, [htmlTemplate], '全量导入局部 HTML 文件时应覆盖对应模板数据');
assert.deepEqual(soundState, originalSound, '全量导入局部文件不应重置未包含的声音振动设置');
assert.deepEqual(divinationState, [{ id: 'div-1', question: '旧问题', answer: '旧答案', createdAt: 1000 }], '全量导入局部文件不应清空未包含的占卜历史');
assert.deepEqual(anonymousHistoryState, originalHistory, '全量导入局部文件不应清空未包含的匿名聊天历史');
assert.equal(hasUnfinishedState, true, '全量导入局部文件不应重置未包含的匿名未完成会话标记');
assert.equal(unfinishedState?.messages?.[0]?.id, 'unfinished-old', '全量导入局部文件不应清空未包含的匿名未完成会话内容');
assert.equal(agreedTermsState, false, '全量导入局部文件不应改写未包含的使用协议状态');

console.log('测试通过：全量导入局部文件只影响文件中包含的数据。');
