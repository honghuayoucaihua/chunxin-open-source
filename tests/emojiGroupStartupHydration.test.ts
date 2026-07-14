import assert from 'node:assert/strict';
import { applyEmojiPersistedState } from '../src/services/emojiPersistenceState.ts';

class FakeIDBRequest<T = any> {
  result: T | null = null;
  error: any = null;
  onsuccess: ((this: FakeIDBRequest<T>, ev: any) => void) | null = null;
  onerror: ((this: FakeIDBRequest<T>, ev: any) => void) | null = null;
  onupgradeneeded: ((this: FakeIDBRequest<T>, ev: any) => void) | null = null;
}

const stores = new Map<string, Map<string, any>>();
let dbVersion = 0;
const fakeDB = {
  objectStoreNames: {
    contains: (name: string) => stores.has(name)
  },
  createObjectStore: (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name);
  },
  transaction: (name: string) => ({
    objectStore: () => ({
      get: (key: string) => {
        const request = new FakeIDBRequest<any>();
        queueMicrotask(() => {
          request.result = stores.get(name)?.get(key);
          request.onsuccess?.call(request, {});
        });
        return request;
      },
      put: (value: any, key: string) => {
        const request = new FakeIDBRequest<any>();
        queueMicrotask(() => {
          if (!stores.has(name)) stores.set(name, new Map());
          stores.get(name)!.set(key, value);
          request.result = value;
          request.onsuccess?.call(request, {});
        });
        return request;
      }
    })
  })
};

(globalThis as any).indexedDB = {
  open: (_name: string, version: number) => {
    const request = new FakeIDBRequest<any>();
    queueMicrotask(() => {
      const needsUpgrade = version > dbVersion;
      dbVersion = Math.max(dbVersion, version);
      request.result = fakeDB;
      if (needsUpgrade) {
        request.onupgradeneeded?.call(request, {});
      }
      request.onsuccess?.call(request, {});
    });
    return request;
  }
};

const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  }
};

const persistedGroups = [
  { id: 'custom-1', name: '我的分组', folder: 'mine', enabled: true, isBuiltIn: false, order: 0 }
];
const idbGroupEmojis = {
  'custom-1': [{ id: 'custom-1-1', url: 'data:image/png;base64,aaa', desc: '分组表情', groupId: 'custom-1' }]
};

storage.set('xushuo_emoji_groups', JSON.stringify(persistedGroups));
if (!stores.has('emoji_state')) stores.set('emoji_state', new Map());
stores.get('emoji_state')!.set('group_emojis', idbGroupEmojis);

const fakeWindow: Record<string, any> = {
  emojiGroups: [],
  allGroupEmojis: {},
  hiddenEmojiIds: [],
  customEmojiOrder: []
};
(globalThis as any).window = fakeWindow;

await applyEmojiPersistedState({
  emojiGroups: [],
  groupEmojis: {},
  hiddenEmojiIds: [],
  customEmojiOrder: []
});

assert.deepEqual(fakeWindow.emojiGroups, persistedGroups, '当快照中分组为空数组时，应恢复 localStorage 中的分组配置');
assert.deepEqual(fakeWindow.allGroupEmojis, idbGroupEmojis, '刷新启动时应恢复 IndexedDB 中的分组表情映射');
assert.deepEqual(fakeWindow['groupEmojis_custom-1'], idbGroupEmojis['custom-1'], '恢复后应同步 groupEmojis_* 快捷缓存');

console.log('测试通过：启动恢复会合并 localStorage 分组配置与 IndexedDB 分组表情。');
