import assert from 'node:assert/strict';
import {
  applyNovelPersistedState,
  loadBookshelf,
  loadPreference,
  loadReaderAppearance,
  saveBookshelf,
  saveNovelPreference,
  saveReaderAppearance,
  type BookshelfEntry
} from '../src/pages/novelDiscoverHelpers.ts';

const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, String(value)),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear()
};

const originalBookshelf: BookshelfEntry[] = [{
  book: {
    id: 'novel-old',
    title: '旧书',
    author: '旧作者',
    tags: ['旧'],
    wordCount: '1万字',
    favorites: '1',
    rating: '8.0',
    description: '旧书简介'
  },
  meta: null,
  lastReadChapterIndex: 2,
  updatedAt: 1000
}];
const originalAppearance = { background: 'dark' as const, fontSize: 20, lineHeight: 2.4 };
const incomingPreference = { guided: false, genre: '' };

saveBookshelf(originalBookshelf);
saveReaderAppearance(originalAppearance);
saveNovelPreference({ guided: true, genre: '悬疑言情' });

applyNovelPersistedState({
  novelPreference: incomingPreference
}, 'overwrite');

assert.deepEqual(loadBookshelf(), originalBookshelf, '导入仅包含小说偏好的文件时，不应清空未包含的书架');
assert.deepEqual(loadReaderAppearance(), originalAppearance, '导入仅包含小说偏好的文件时，不应重置未包含的阅读器外观');
assert.deepEqual(loadPreference(), incomingPreference, '导入仅包含小说偏好的文件时，应覆盖小说偏好本身');

console.log('测试通过：局部小说偏好恢复不会误伤书架和阅读器外观。');
