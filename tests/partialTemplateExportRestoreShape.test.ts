import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  variables: [{ name: '状态', description: '当前状态', type: 'text' }],
  enabled: true,
  createdAt: 1000
};

let htmlTemplatesState: any[] = [];
let toastMessage = '';

const createSetter = () => () => {};
const normalizeSource = readFileSync(new URL('../src/appStateNormalizeUtils.ts', import.meta.url), 'utf8');

for (const key of ['htmlTemplates', 'bubbleTemplates', 'imageLibraryItems', 'novelBookshelf', 'aiProviderPresets']) {
  assert.match(
    normalizeSource,
    new RegExp(`['"]${key}['"]`),
    `结构识别必须把局部/扩展导出字段视为可恢复数据：${key}`
  );
}

await runRestoreFlow({
  showToast: (message: string) => { toastMessage = message; },
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
  scoreSnapshotShape: (value: any) => {
    if (!value || typeof value !== 'object') return 0;
    return [
      'contacts',
      'user',
      'messages',
      'moments',
      'favorites',
      'settings',
      'aiSettings',
      'worldBooks',
      'masks',
      'htmlTemplates',
      'bubbleTemplates',
      'inboxLetters',
      'sentLetters',
      'forums',
      'mailboxTheme',
      'musicState',
      'anonymousChatSettings',
      'anonymousChatHistory',
      'anonymousHasUnfinishedSession',
      'anonymousUnfinishedSession',
      'divinationHistory',
      'truthDareThemes',
      'truthDareRuntime',
      'imageLibraryGroups',
      'imageLibraryItems',
      'novelBookshelf',
      'novelReaderAppearance',
      'novelPreference',
      'aiProviderPresets',
      'aiProviderConfigs'
    ]
      .reduce((score, key) => (key in value ? score + 1 : score), 0);
  },
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
    htmlTemplatesState = typeof value === 'function' ? value(htmlTemplatesState) : value;
  },
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
}, new File(['{}'], 'html.json', { type: 'application/json' }), 'merge');

assert.deepEqual(htmlTemplatesState, [htmlTemplate], '导出的 HTML 模板文件应能通过恢复入口增量导入');
assert.match(toastMessage, /完成/, '恢复成功时应提示完成，而不是结构无法识别');

console.log('测试通过：局部 HTML 模板导出文件能通过恢复入口导入。');
