import assert from 'node:assert/strict';
import {
  DEFAULT_READER_APPEARANCE,
  applyNovelPersistedState,
  collectNovelPersistedState,
  loadBookshelf,
  loadPreference,
  loadReaderAppearance,
  normalizeBookshelfEntries,
  saveBookshelf,
  saveHomeCache,
  saveNovelPreference,
  savePreference,
  saveReaderAppearance
} from '../src/pages/novelDiscoverHelpers.ts';

(globalThis as any).localStorage = {
  getItem() {
    throw new Error('localStorage unavailable');
  },
  setItem() {
    throw new Error('localStorage unavailable');
  },
  removeItem() {
    throw new Error('localStorage unavailable');
  },
  clear() {
    throw new Error('localStorage unavailable');
  }
};

const rawBookshelf = [{
  book: {
    title: '测试小说',
    author: '测试作者',
    tags: ['治愈', '成长'],
    wordCount: '10万字',
    favorites: '1万',
    rating: '9.1',
    description: '测试简介'
  },
  meta: {
    intro: '简介',
    storyBible: {
      premise: '前提',
      coreConflict: '冲突',
      heroineArc: '成长',
      relationArc: '关系',
      worldRules: ['规则'],
      writingStyle: '风格',
      readerDirectives: []
    },
    chapters: [{ title: '第一章', summary: '开场' }]
  },
  lastReadChapterIndex: 1,
  updatedAt: 123
}];

assert.deepEqual(loadPreference(), { guided: false, genre: '' }, '偏好读取失败时应返回默认值');
assert.deepEqual(loadBookshelf(), [], '书架读取失败时应返回空数组');
assert.deepEqual(loadReaderAppearance(), DEFAULT_READER_APPEARANCE, '阅读样式读取失败时应返回默认值');

assert.doesNotThrow(() => savePreference('现代言情'), '偏好保存失败不应抛错');
assert.doesNotThrow(() => saveNovelPreference({ guided: true, genre: '悬疑言情' }), '偏好恢复保存失败不应抛错');
assert.doesNotThrow(() => saveHomeCache('现代言情', []), '首页缓存保存失败不应抛错');
assert.doesNotThrow(() => saveBookshelf([]), '书架保存失败不应抛错');
assert.doesNotThrow(() => saveReaderAppearance(DEFAULT_READER_APPEARANCE), '阅读样式保存失败不应抛错');

const normalized = normalizeBookshelfEntries(rawBookshelf);
assert.equal(normalized.length, 1, '书架标准化不应依赖 localStorage 临时读写');
assert.equal(normalized[0].book.title, '测试小说');

assert.doesNotThrow(
  () => applyNovelPersistedState({
    novelBookshelf: rawBookshelf,
    novelReaderAppearance: DEFAULT_READER_APPEARANCE,
    novelPreference: { guided: true, genre: '悬疑言情' }
  }, 'overwrite'),
  '小说恢复流程在 localStorage 不可用时不应抛错'
);

assert.deepEqual(
  collectNovelPersistedState(),
  {
    novelBookshelf: [],
    novelReaderAppearance: DEFAULT_READER_APPEARANCE,
    novelPreference: { guided: false, genre: '' }
  },
  '本地存储不可用时，小说快照采集应使用安全默认值'
);

console.log('测试通过：小说本地存储不可用时不会中断页面和恢复流程。');
