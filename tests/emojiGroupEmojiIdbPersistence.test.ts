import assert from 'node:assert/strict';
import { loadPersistedGroupEmojiMap, persistGroupEmojiMap } from '../src/chatroom/emojiState.ts';

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
  },
  removeItem: (key: string) => {
    storage.delete(key);
  }
};

const fakeWindow: Record<string, any> = {};
(globalThis as any).window = fakeWindow;

const payload = {
  'custom-1': [{ id: 'custom-1-1', url: 'data:image/png;base64,aaa', desc: '分组表情', groupId: 'custom-1' }]
};

await persistGroupEmojiMap(payload);

assert.deepEqual(fakeWindow.allGroupEmojis, payload, '写入分组表情时应同步 window.allGroupEmojis');

delete fakeWindow.allGroupEmojis;
delete fakeWindow['groupEmojis_custom-1'];

const restored = await loadPersistedGroupEmojiMap();

assert.deepEqual(restored, payload, '即使没有 localStorage 回退，仍应能从 XushuoEmojiDB 读回分组表情');
assert.deepEqual(fakeWindow['groupEmojis_custom-1'], payload['custom-1'], '从 XushuoEmojiDB 恢复后应同步 groupEmojis_* 快捷缓存');

console.log('测试通过：分组表情会持久化到 XushuoEmojiDB 并能恢复。');
