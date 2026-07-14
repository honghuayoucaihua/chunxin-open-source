import assert from 'node:assert/strict';
import { exportAsZip, importFromZip } from '../src/services/snapshot/zipOperations.ts';
import type { SnapshotPayload } from '../src/services/snapshot/snapshotBuilder.ts';

const svgDataUrl = 'data:image/svg+xml;base64,PHN2Zy8+';

const payload = {
  contacts: [{
    id: 'contact-1',
    name: '测试联系人',
    avatar: svgDataUrl,
    isGroup: false
  }],
  user: {
    name: '测试用户',
    avatar: '',
    wechatId: 'tester',
    gender: 'other',
    signature: '',
    momentsCover: '',
    region: '',
    balance: 0
  },
  messages: {},
  favorites: [],
  moments: [],
  settings: {},
  aiSettings: {},
  worldBooks: [],
  customEmojis: [],
  emojiGroups: [],
  groupEmojis: {},
  hiddenEmojiIds: [],
  customEmojiOrder: [],
  selectedContacts: [],
  currentArticle: null,
  officialArticles: [],
  contactMemories: {},
  friendRequests: [],
  discoverUnreadCount: 0,
  inboxLetters: [],
  sentLetters: [],
  hasAgreedTerms: false,
  masks: [],
  forums: [],
  anonymousChatHistory: [],
  anonymousHasUnfinishedSession: false,
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
} as SnapshotPayload;

const exported = await exportAsZip(payload);
assert.equal(exported.success, true, 'ZIP 导出应成功');
assert.ok(exported.blob, 'ZIP 导出应返回压缩包 Blob');

const imported = await importFromZip(await exported.blob!.arrayBuffer() as any);

assert.equal(imported.success, true, 'ZIP 导入应成功');
assert.equal(
  imported.data?.contacts[0].avatar,
  svgDataUrl,
  'ZIP 导入后应完整保留 SVG 图片的 MIME 类型'
);

console.log('测试通过：ZIP 备份恢复 SVG 图片时会保留 image/svg+xml MIME 类型。');
