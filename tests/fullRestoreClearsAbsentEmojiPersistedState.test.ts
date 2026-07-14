import assert from 'node:assert/strict';
import { applyEmojiPersistedState } from '../src/services/emojiPersistenceState.ts';
import {
  CUSTOM_EMOJI_ORDER_STORAGE_KEY,
  EMOJI_GROUPS_STORAGE_KEY,
  HIDDEN_EMOJI_IDS_STORAGE_KEY
} from '../src/chatroom/emojiState.ts';

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

const staleCustomEmojis = [{ id: 'custom-old', url: 'data:image/png;base64,OLD', desc: '旧自定义表情' }];
const staleEmojiGroups = [{ id: 'group-old', name: '旧分组', folder: 'old', enabled: true, isBuiltIn: false, order: 0 }];
const staleGroupEmojis = {
  'group-old': [{ id: 'group-old-1', url: 'data:image/png;base64,GROUP', desc: '旧分组表情', groupId: 'group-old' }]
};

storage.set(EMOJI_GROUPS_STORAGE_KEY, JSON.stringify(staleEmojiGroups));
storage.set(HIDDEN_EMOJI_IDS_STORAGE_KEY, JSON.stringify(['hidden-old']));
storage.set(CUSTOM_EMOJI_ORDER_STORAGE_KEY, JSON.stringify(['custom-old']));

if (!stores.has('emoji_state')) stores.set('emoji_state', new Map());
stores.get('emoji_state')!.set('custom_emojis', staleCustomEmojis);
stores.get('emoji_state')!.set('group_emojis', staleGroupEmojis);

const fakeWindow: Record<string, any> = {
  customEmojis: staleCustomEmojis,
  emojiGroups: staleEmojiGroups,
  allGroupEmojis: staleGroupEmojis,
  hiddenEmojiIds: ['hidden-old'],
  customEmojiOrder: ['custom-old'],
  allEnabledEmojis: staleCustomEmojis,
  groupEmojis_old: [{ id: 'legacy-cache' }]
};
(globalThis as any).window = fakeWindow;

await applyEmojiPersistedState({
  version: 'legacy-idb-auto-migrated',
  contacts: [],
  user: { id: 'me', name: '我' },
  messages: {},
  settings: {},
  worldBooks: []
});

assert.deepEqual(fakeWindow.customEmojis, [], '完整恢复缺少自定义表情字段时，应清空旧自定义表情');
assert.deepEqual(fakeWindow.emojiGroups, [], '完整恢复缺少表情分组字段时，应清空旧分组');
assert.deepEqual(fakeWindow.allGroupEmojis, {}, '完整恢复缺少分组表情字段时，应清空旧分组表情映射');
assert.deepEqual(fakeWindow.hiddenEmojiIds, [], '完整恢复缺少隐藏表情字段时，应清空旧隐藏列表');
assert.deepEqual(fakeWindow.customEmojiOrder, [], '完整恢复缺少表情排序字段时，应清空旧排序');
assert.equal(fakeWindow.groupEmojis_old, undefined, '完整恢复后应清理旧的 groupEmojis_* 快捷缓存');
assert.deepEqual(fakeWindow.allEnabledEmojis, [], '完整恢复后应同步清空可用表情集合');

assert.equal(storage.get(EMOJI_GROUPS_STORAGE_KEY), '[]', '完整恢复缺少表情分组字段时，应清空 localStorage 分组缓存');
assert.equal(storage.get(HIDDEN_EMOJI_IDS_STORAGE_KEY), '[]', '完整恢复缺少隐藏表情字段时，应清空 localStorage 隐藏缓存');
assert.equal(storage.get(CUSTOM_EMOJI_ORDER_STORAGE_KEY), '[]', '完整恢复缺少表情排序字段时，应清空 localStorage 排序缓存');
assert.deepEqual(stores.get('emoji_state')?.get('custom_emojis'), [], '完整恢复缺少自定义表情字段时，应清空 IndexedDB 自定义表情缓存');
assert.deepEqual(stores.get('emoji_state')?.get('group_emojis'), {}, '完整恢复缺少分组表情字段时，应清空 IndexedDB 分组表情缓存');

console.log('测试通过：完整恢复缺少表情字段时，会清空旧表情持久化状态，避免残留脏数据。');
