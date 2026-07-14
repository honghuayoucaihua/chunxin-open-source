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

let htmlTemplatesState = [
  { id: 'html-old', name: '旧HTML', htmlContent: '<div>old</div>', variables: [], enabled: true }
];
let bubbleTemplatesState = [
  { id: 'bubble-old', name: '旧气泡', cssContent: '.old{}', enabled: true }
];

const incomingHtmlTemplate = { id: 'html-new', name: '新HTML', htmlContent: '<div>new</div>', variables: [], enabled: true };
const incomingBubbleTemplate = { id: 'bubble-new', name: '新气泡', cssContent: '.new{}', enabled: true };

const setByValueOrUpdater = <T>(current: T, value: T | ((prev: T) => T)): T =>
  typeof value === 'function' ? (value as (prev: T) => T)(current) : value;

const createSetter = () => () => {};

await runRestoreFlow({
  showToast: () => {},
  setProgressDialog: () => {},
  importBackupFile: async () => ({
    success: true,
    data: {
      contacts: [],
      user: { id: 'me', name: '我', balance: 0 },
      messages: {},
      htmlTemplates: [incomingHtmlTemplate],
      bubbleTemplates: [incomingBubbleTemplate]
    },
    format: 'json'
  }),
  unwrapImportedBackupData: (data: any) => data,
  adaptLegacyBackupData: (data: any) => data,
  scoreSnapshotShape: () => 5,
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
  setHtmlTemplates: (value: any) => {
    htmlTemplatesState = setByValueOrUpdater(htmlTemplatesState, value);
  },
  setBubbleTemplates: (value: any) => {
    bubbleTemplatesState = setByValueOrUpdater(bubbleTemplatesState, value);
  },
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

assert.deepEqual(htmlTemplatesState, [incomingHtmlTemplate], '完整备份全量恢复仍应覆盖 HTML 模板列表');
assert.deepEqual(bubbleTemplatesState, [incomingBubbleTemplate], '完整备份全量恢复仍应覆盖气泡模板列表');

console.log('测试通过：完整模板备份仍会执行全量覆盖。');
