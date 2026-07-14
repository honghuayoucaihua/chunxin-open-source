import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { exportAsZip, importFromZip } from '../src/services/snapshot/zipOperations.ts';
import type { SnapshotPayload } from '../src/services/snapshot/snapshotBuilder.ts';

const imageDataUrl = 'data:image/png;base64,QUJDRA==';

const payload = {
  contacts: [],
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
  imageLibraryGroups: [{
    id: 'album-1',
    name: '角色设定',
    order: 0,
    createdAt: 1000,
    updatedAt: 2000
  }],
  imageLibraryItems: [{
    id: 'img-1',
    groupId: 'album-1',
    url: imageDataUrl,
    desc: '女主头像参考',
    createdAt: 3000
  }],
  novelBookshelf: [],
  novelReaderAppearance: { background: 'paper', fontSize: 16, lineHeight: 2 },
  novelPreference: { guided: false, genre: '' },
  aiProviderPresets: [],
  aiProviderConfigs: {}
} as SnapshotPayload;

const exported = await exportAsZip(payload);
assert.equal(exported.success, true, 'ZIP 导出应成功');
assert.ok(exported.blob, 'ZIP 导出应返回压缩包 Blob');

const zipBytes = await exported.blob!.arrayBuffer();
const zip = await JSZip.loadAsync(zipBytes);
const rawData = JSON.parse(await zip.file('data.json')!.async('string'));
assert.equal(
  rawData.imageLibraryItems[0].url,
  '__IMAGE_REF__:images/img_0.png',
  'ZIP 内 data.json 应把素材库图片抽成文件引用'
);
assert.ok(zip.file('images/img_0.png'), 'ZIP 应包含被抽离的素材库图片文件');

const imported = await importFromZip(zipBytes as any);

assert.equal(imported.success, true, 'ZIP 导入应成功');
assert.equal(
  imported.data?.imageLibraryItems[0].url,
  imageDataUrl,
  'ZIP 导入后应把素材库图片引用还原成原始 data URL'
);
assert.deepEqual(imported.data?.imageLibraryGroups, payload.imageLibraryGroups, 'ZIP 图片处理不应破坏普通素材库字段');

console.log('测试通过：ZIP 备份会抽离并还原图片素材库里的 data URL 图片。');
