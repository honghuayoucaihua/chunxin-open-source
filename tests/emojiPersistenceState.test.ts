import assert from 'node:assert/strict';
import { applyEmojiPersistedState, collectEmojiPersistedState } from '../src/services/emojiPersistenceState.ts';

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

const storage = new Map<string, string>();
const fakeWindow: Record<string, any> = {
  customEmojis: [{ id: 'custom-1', url: 'data:image/png;base64,aaa', desc: '旧自定义表情' }],
  emojiGroups: [{ id: 'group-1', name: '新分组', folder: 'custom-1', enabled: true, isBuiltIn: false, order: 0 }],
  allGroupEmojis: {
    'group-1': [{ id: 'group-1-1', url: 'data:image/png;base64,bbb', desc: '分组表情1', groupId: 'group-1' }]
  },
  hiddenEmojiIds: ['group-1-hidden'],
  customEmojiOrder: ['custom-1'],
  groupEmojis_old: [{ id: 'old' }]
};

(globalThis as any).window = fakeWindow;
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
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  }
};

const snapshot = collectEmojiPersistedState();
assert.deepEqual(snapshot.customEmojis, fakeWindow.customEmojis, '应采集自定义表情');
assert.deepEqual(snapshot.emojiGroups, fakeWindow.emojiGroups, '应采集表情分组');
assert.deepEqual(snapshot.groupEmojis, fakeWindow.allGroupEmojis, '应采集分组表情映射');
assert.deepEqual(snapshot.hiddenEmojiIds, fakeWindow.hiddenEmojiIds, '应采集隐藏表情ID');
assert.deepEqual(snapshot.customEmojiOrder, fakeWindow.customEmojiOrder, '应采集自定义表情排序');

await applyEmojiPersistedState({
  customEmojis: [{ id: 'custom-2', url: 'data:image/png;base64,ddd', desc: '恢复自定义表情' }],
  emojiGroups: [{ id: 'group-2', name: '恢复分组', folder: 'custom-2', enabled: true, isBuiltIn: false, order: 1 }],
  groupEmojis: {
    'group-2': [{ id: 'group-2-1', url: 'data:image/png;base64,ccc', desc: '恢复表情1', groupId: 'group-2' }]
  },
  hiddenEmojiIds: ['group-2-hidden'],
  customEmojiOrder: ['custom-2']
});

assert.deepEqual(fakeWindow.customEmojis, [{ id: 'custom-2', url: 'data:image/png;base64,ddd', desc: '恢复自定义表情' }], '应恢复自定义表情到全局状态');
assert.deepEqual(fakeWindow.emojiGroups, [{ id: 'group-2', name: '恢复分组', folder: 'custom-2', enabled: true, isBuiltIn: false, order: 1 }], '应恢复表情分组到全局状态');
assert.deepEqual(fakeWindow.allGroupEmojis, {
  'group-1': [{ id: 'group-1-1', url: 'data:image/png;base64,bbb', desc: '分组表情1', groupId: 'group-1' }],
  'group-2': [{ id: 'group-2-1', url: 'data:image/png;base64,ccc', desc: '恢复表情1', groupId: 'group-2' }]
}, '应恢复分组表情映射到全局状态，并保留运行时已存在的分组内容');
assert.equal(fakeWindow.groupEmojis_old, undefined, '应清理旧的 groupEmojis_* 缓存');
assert.deepEqual(fakeWindow.groupEmojis_group_2, undefined, '不存在未规范键');
assert.deepEqual(fakeWindow['groupEmojis_group-2'], [{ id: 'group-2-1', url: 'data:image/png;base64,ccc', desc: '恢复表情1', groupId: 'group-2' }], '应恢复 groupEmojis_* 快捷缓存');
assert.equal(storage.get('xushuo_emoji_groups'), JSON.stringify(fakeWindow.emojiGroups), '应写入表情分组存储');
assert.equal(storage.get('xushuo_hidden_emoji_ids'), JSON.stringify(['group-2-hidden']), '应写入隐藏表情存储');
assert.equal(storage.get('xushuo_custom_emoji_order'), JSON.stringify(['custom-2']), '应写入排序存储');
assert.deepEqual(
  stores.get('emoji_state')?.get('group_emojis'),
  fakeWindow.allGroupEmojis,
  '应将分组表情写入 XushuoEmojiDB'
);
assert.deepEqual(
  stores.get('emoji_state')?.get('custom_emojis'),
  fakeWindow.customEmojis,
  '应将自定义表情写入 XushuoEmojiDB'
);

console.log('测试通过：表情分组持久化状态的采集与恢复符合预期。');
