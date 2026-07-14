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

const existingHtmlTemplates = [
  { id: 'html-old', name: '旧HTML', htmlContent: '<div>old</div>', variables: [], enabled: true },
  { id: 'html-keep', name: '保留HTML', htmlContent: '<div>keep</div>', variables: [], enabled: true }
];
const incomingHtmlTemplate = { id: 'html-new', name: '新HTML', htmlContent: '<div>new</div>', variables: [], enabled: true };

const existingBubbleTemplates = [
  { id: 'bubble-old', name: '旧气泡', cssContent: '.old{}', enabled: true },
  { id: 'bubble-keep', name: '保留气泡', cssContent: '.keep{}', enabled: true }
];
const incomingBubbleTemplate = { id: 'bubble-new', name: '新气泡', cssContent: '.new{}', enabled: true };

let htmlTemplatesState = existingHtmlTemplates;
let bubbleTemplatesState = existingBubbleTemplates;

const setByValueOrUpdater = <T>(current: T, value: T | ((prev: T) => T)): T =>
  typeof value === 'function' ? (value as (prev: T) => T)(current) : value;

const createSetter = () => () => {};

const createRestoreParams = (data: any) => ({
  showToast: () => {},
  setProgressDialog: () => {},
  importBackupFile: async () => ({
    success: true,
    data,
    format: 'json'
  }),
  unwrapImportedBackupData: (value: any) => value,
  adaptLegacyBackupData: (value: any) => value,
  scoreSnapshotShape: (value: any) => value && typeof value === 'object' && (
    Array.isArray(value.htmlTemplates) || Array.isArray(value.bubbleTemplates)
  ) ? 1 : 0,
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
});

await runRestoreFlow(createRestoreParams({
  version: 'htmltemplates-export-v1',
  exportedAt: 2000,
  htmlTemplates: [incomingHtmlTemplate]
}), new File(['{}'], 'html.json', { type: 'application/json' }), 'overwrite');

assert.deepEqual(
  htmlTemplatesState,
  [...existingHtmlTemplates, incomingHtmlTemplate],
  '全量导入局部 HTML 文件时，不应清空未包含的其他 HTML 模板'
);

await runRestoreFlow(createRestoreParams({
  bubbleTemplates: [incomingBubbleTemplate]
}), new File(['{}'], 'bubble.json', { type: 'application/json' }), 'overwrite');

assert.deepEqual(
  bubbleTemplatesState,
  [...existingBubbleTemplates, incomingBubbleTemplate],
  '全量导入局部气泡模板文件时，不应清空未包含的其他气泡模板'
);

console.log('测试通过：全量导入局部模板文件不会误清未包含的同类模板。');
