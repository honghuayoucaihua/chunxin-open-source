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

const existingContacts = [
  { id: 'c-old', name: '旧联系人', avatar: '/old.png' },
  { id: 'c-keep', name: '保留联系人', avatar: '/keep.png' }
];
const incomingContact = { id: 'c-new', name: '新联系人', avatar: '/new.png' };
const existingWorldBooks = [
  { id: 'wb-old', name: '旧世界书', entries: [{ id: 'e-old', text: '旧设定' }], enabled: true },
  { id: 'wb-keep', name: '保留世界书', entries: [{ id: 'e-keep', text: '保留设定' }], enabled: true }
];
const incomingWorldBook = { id: 'wb-new', name: '新世界书', entries: [{ id: 'e-new', text: '新设定' }], enabled: true };
const normalizedIncomingWorldBook = { ...incomingWorldBook, description: '' };

let contactsState = existingContacts;
let worldBooksState = existingWorldBooks;

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
      contacts: [incomingContact]
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
  setMessages: createSetter(),
  setFavorites: createSetter(),
  setMoments: createSetter(),
  setSettings: createSetter(),
  setAiSettings: createSetter(),
  setWorldBooks: (value: any) => {
    worldBooksState = setByValueOrUpdater(worldBooksState, value);
  },
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
}, new File(['{}'], 'contact.json', { type: 'application/json' }), 'overwrite');

assert.deepEqual(
  contactsState,
  [...existingContacts, incomingContact],
  '全量导入局部联系人文件时，不应清空未包含的其他联系人'
);

await runRestoreFlow({
  showToast: () => {},
  setProgressDialog: () => {},
  importBackupFile: async () => ({
    success: true,
    data: {
      version: 'worldbooks-export-v2',
      exportedAt: 3000,
      worldBooks: [incomingWorldBook]
    },
    format: 'json'
  }),
  unwrapImportedBackupData: (data: any) => data,
  adaptLegacyBackupData: (data: any) => data,
  scoreSnapshotShape: (value: any) => value && typeof value === 'object' && Array.isArray(value.worldBooks) ? 1 : 0,
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
  setMessages: createSetter(),
  setFavorites: createSetter(),
  setMoments: createSetter(),
  setSettings: createSetter(),
  setAiSettings: createSetter(),
  setWorldBooks: (value: any) => {
    worldBooksState = setByValueOrUpdater(worldBooksState, value);
  },
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
}, new File(['{}'], 'worldbook.json', { type: 'application/json' }), 'overwrite');

assert.deepEqual(
  worldBooksState,
  [...existingWorldBooks, normalizedIncomingWorldBook],
  '全量导入局部世界书文件时，不应清空未包含的其他世界书'
);

console.log('测试通过：全量导入局部联系人/世界书文件不会误清未包含的同类数据。');
