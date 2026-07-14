import assert from 'node:assert/strict';
import {
  applyImageLibraryPersistedState,
  getImageLibraryState,
  saveImageLibraryState
} from '../src/services/imageLibraryStore.ts';

const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, String(value)),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear()
};

(globalThis as any).window = {
  imageLibraryGroups: undefined,
  imageLibraryItems: undefined
};

const groups = [{
  id: 'album-1',
  name: '相册',
  order: 0,
  createdAt: 1000,
  updatedAt: 1000
}];
const oldItems = [{
  id: 'img-old',
  groupId: 'album-1',
  url: 'data:image/png;base64,OLD',
  desc: '旧图片',
  createdAt: 1200
}];

saveImageLibraryState(groups, oldItems);
applyImageLibraryPersistedState({
  imageLibraryGroups: groups,
  imageLibraryItems: []
}, 'overwrite');

assert.deepEqual(getImageLibraryState(), {
  groups,
  items: []
}, '完整备份显式包含空图片条目时，应允许清空旧图片');

console.log('测试通过：图片素材库完整恢复保留显式空数组覆盖语义。');
