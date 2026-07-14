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

let contactsState = [
  { id: 'c-old', name: '旧联系人', avatar: '/old.png' },
  { id: 'c-keep', name: '保留联系人', avatar: '/keep.png' }
];
let worldBooksState = [
  { id: 'wb-old', name: '旧世界书', entries: [{ id: 'e-old', text: '旧设定' }], enabled: true }
];

const incomingContact = { id: 'c-new', name: '新联系人', avatar: '/new.png' };
const incomingWorldBook = { id: 'wb-new', name: '新世界书', entries: [{ id: 'e-new', text: '新设定' }], enabled: true };

const setByValueOrUpdater = <T>(current: T, value: T | ((prev: T) => T)): T =>
  typeof value === 'function' ? (value as (prev: T) => T)(current) : value;

const createSetter = () => () => {};

await runRestoreFlow({
  showToast: () => {},
  setProgressDialog: () => {},
  importBackupFile: async () => ({
    success: true,
    data: {
      contacts: [incomingContact],
      messages: {},
      worldBooks: [incomingWorldBook]
    },
    format: 'json'
  }),
  unwrapImportedBackupData: (data: any) => data,
  adaptLegacyBackupData: (data: any) => data,
  scoreSnapshotShape: () => 3,
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
}, new File(['{}'], 'full.json', { type: 'application/json' }), 'overwrite');

assert.deepEqual(contactsState, [incomingContact], '完整备份全量恢复仍应覆盖联系人列表');
assert.deepEqual(
  worldBooksState,
  [{ ...incomingWorldBook, description: '' }],
  '完整备份全量恢复仍应覆盖世界书列表'
);

console.log('测试通过：完整联系人/世界书备份仍会执行全量覆盖。');
