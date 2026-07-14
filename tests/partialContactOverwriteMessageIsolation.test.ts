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

const existingMessages = {
  'c-old': [{ id: 'old-msg', senderId: 'c-old', content: '旧联系人消息', timestamp: 1000, type: 'text' }],
  'c-keep': [{ id: 'keep-msg', senderId: 'c-keep', content: '保留会话消息', timestamp: 1100, type: 'text' }]
};
const incomingMessages = {
  'c-new': [{ id: 'new-msg', senderId: 'c-new', content: '新联系人消息', timestamp: 2000, type: 'text' }]
};

let contactsState = [
  { id: 'c-old', name: '旧联系人', avatar: '/old.png' },
  { id: 'c-keep', name: '保留联系人', avatar: '/keep.png' }
];
let messagesState = existingMessages;

const incomingContact = { id: 'c-new', name: '新联系人', avatar: '/new.png' };

const setByValueOrUpdater = <T>(current: T, value: T | ((prev: T) => T)): T =>
  typeof value === 'function' ? (value as (prev: T) => T)(current) : value;

const createSetter = () => () => {};

await runRestoreFlow({
  showToast: () => {},
  setProgressDialog: () => {},
  importBackupFile: async () => ({
    success: true,
    data: {
      version: 'contacts-export-v2',
      exportedAt: 2000,
      contacts: [incomingContact],
      exportOptions: {
        includeChatHistory: true
      },
      messages: incomingMessages
    },
    format: 'json'
  }),
  unwrapImportedBackupData: (data: any) => data,
  adaptLegacyBackupData: (data: any) => data,
  scoreSnapshotShape: (value: any) => value && typeof value === 'object' && Array.isArray(value.contacts) ? 1 : 0,
  normalizeLegacyContacts: (contacts: any[]) => contacts,
  shouldSkipImportedContact: () => false,
  mergeBuiltInContacts: (contacts: any[]) => contacts,
  normalizeLegacyMessages: (messages: any) => messages,
  normalizeAppearanceSettings: (settings: any) => settings,
  normalizeAiSettings: (settings: any) => settings,
  normalizeSoundVibrationSettings: (settings: any) => settings || {},
  setContacts: (value: any) => {
    contactsState = setByValueOrUpdater(contactsState, value);
  },
  setUser: createSetter(),
  setWalletBalance: createSetter(),
  setMessages: (value: any) => {
    messagesState = setByValueOrUpdater(messagesState, value);
  },
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
}, new File(['{}'], 'contact-with-history.json', { type: 'application/json' }), 'overwrite');

assert.deepEqual(
  contactsState,
  [
    { id: 'c-old', name: '旧联系人', avatar: '/old.png' },
    { id: 'c-keep', name: '保留联系人', avatar: '/keep.png' },
    incomingContact
  ],
  '全量导入局部联系人文件时，不应清空未包含的联系人'
);
assert.deepEqual(
  messagesState,
  {
    ...existingMessages,
    ...incomingMessages
  },
  '全量导入含聊天记录的局部联系人文件时，不应清空其他会话消息'
);

console.log('测试通过：全量导入含聊天记录的局部联系人文件不会误清其他会话。');
