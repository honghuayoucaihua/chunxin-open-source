import assert from 'node:assert/strict';
import { buildSnapshotPayload } from '../src/services/snapshot/snapshotBuilder.ts';

(globalThis as any).window = {
  customEmojis: [],
  emojiGroups: [],
  allGroupEmojis: {},
  hiddenEmojiIds: [],
  customEmojiOrder: [],
  selectedContacts: [],
  currentArticle: null
};
(globalThis as any).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};

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
    balance: 999
  },
  walletBalance: 12,
  messages: {},
  favorites: [],
  moments: [],
  settings: {} as any,
  aiSettings: {} as any,
  worldBooks: [],
  officialArticles: [],
  contactMemories: {},
  friendRequests: [],
  discoverUnreadCount: 0,
  inboxLetters: [],
  sentLetters: [],
  soundVibrationSettings: {} as any,
  hasAgreedTerms: false,
  walletBank: { name: '', last4: '' },
  musicState: {},
  masks: [],
  forums: [],
  mailboxTheme: {} as any,
  anonymousChatSettings: { onlyOppositeSex: false, ageRange: [18, 35], tags: [] },
  anonymousChatHistory: [],
  anonymousHasUnfinishedSession: false,
  anonymousUnfinishedSession: null,
  divinationHistory: [],
  htmlTemplates: [],
  bubbleTemplates: [],
  truthDareThemes: [],
  truthDareRuntime: {},
  imageLibraryGroups: [],
  imageLibraryItems: [],
  novelBookshelf: [],
  novelReaderAppearance: { background: 'paper', fontSize: 16, lineHeight: 2 },
  novelPreference: { guided: false, genre: '' },
  aiProviderPresets: [],
  aiProviderConfigs: {}
});

assert.equal(payload.user.balance, 12, '快照中的钱包余额应以 walletBalance 为准');

const requiredKeys = [
  'contacts',
  'messages',
  'settings',
  'aiSettings',
  'worldBooks',
  'customEmojis',
  'emojiGroups',
  'groupEmojis',
  'selectedContacts',
  'officialArticles',
  'contactMemories',
  'friendRequests',
  'inboxLetters',
  'sentLetters',
  'soundVibrationSettings',
  'hasAgreedTerms',
  'walletBank',
  'musicState',
  'masks',
  'forums',
  'mailboxTheme',
  'anonymousChatSettings',
  'anonymousChatHistory',
  'anonymousHasUnfinishedSession',
  'anonymousUnfinishedSession',
  'divinationHistory',
  'htmlTemplates',
  'bubbleTemplates',
  'truthDareThemes',
  'truthDareRuntime',
  'imageLibraryGroups',
  'imageLibraryItems',
  'novelBookshelf',
  'novelReaderAppearance',
  'novelPreference',
  'aiProviderPresets',
  'aiProviderConfigs'
];

for (const key of requiredKeys) {
  assert.ok(Object.prototype.hasOwnProperty.call(payload, key), `快照必须包含字段：${key}`);
}

assert.deepEqual(payload.messages, {}, '键存在但值为空对象时应保留 messages');
assert.deepEqual(payload.masks, [], '键存在但值为空数组时应保留 masks');
assert.deepEqual(payload.forums, [], '键存在但值为空数组时应保留 forums');
assert.deepEqual(payload.htmlTemplates, [], '键存在但值为空数组时应保留 htmlTemplates');
assert.deepEqual(payload.bubbleTemplates, [], '键存在但值为空数组时应保留 bubbleTemplates');
assert.deepEqual(payload.divinationHistory, [], '键存在但值为空数组时应保留 divinationHistory');
assert.deepEqual(payload.truthDareThemes, [], '键存在但值为空数组时应保留 truthDareThemes');
assert.deepEqual(payload.truthDareRuntime, {}, '键存在但值为空对象时应保留 truthDareRuntime');
assert.deepEqual(payload.imageLibraryGroups, [], '键存在但值为空数组时应保留 imageLibraryGroups');
assert.deepEqual(payload.imageLibraryItems, [], '键存在但值为空数组时应保留 imageLibraryItems');
assert.deepEqual(payload.novelBookshelf, [], '键存在但值为空数组时应保留 novelBookshelf');
assert.deepEqual(payload.novelReaderAppearance, { background: 'paper', fontSize: 16, lineHeight: 2 }, '键存在时应保留 novelReaderAppearance');
assert.deepEqual(payload.novelPreference, { guided: false, genre: '' }, '键存在时应保留 novelPreference');
assert.deepEqual(payload.aiProviderPresets, [], '键存在但值为空数组时应保留 aiProviderPresets');
assert.deepEqual(payload.aiProviderConfigs, {}, '键存在但值为空对象时应保留 aiProviderConfigs');
assert.deepEqual(payload.mailboxTheme, {}, '键存在但值为空对象时应保留 mailboxTheme');
assert.equal(payload.anonymousUnfinishedSession, null, '空匿名未完成会话应以 null 明确持久化');

console.log('测试通过：快照持久化契约包含核心字段，并保留空数组与空对象。');
