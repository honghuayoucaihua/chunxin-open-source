import assert from 'node:assert/strict';
import { clearAllLocalPersistedData } from '../src/services/localDataCleanup.ts';

(globalThis as any).localStorage = {
  clear: () => {}
};
(globalThis as any).sessionStorage = {
  clear: () => {}
};
(globalThis as any).indexedDB = {
  databases: undefined,
  deleteDatabase: () => {
    const request: any = {};
    queueMicrotask(() => {
      request.onsuccess?.();
    });
    return request;
  }
};
(globalThis as any).caches = {
  keys: async () => ['cache-ok', 'cache-fail'],
  delete: async (name: string) => {
    if (name === 'cache-fail') {
      throw new Error('缓存删除失败');
    }
    return true;
  }
};
Object.defineProperty(globalThis, 'navigator', {
  value: {
    serviceWorker: {
      getRegistrations: async () => [
        {
          unregister: async () => true
        },
        {
          unregister: async () => {
            throw new Error('注销失败');
          }
        }
      ]
    }
  },
  configurable: true
});

await assert.rejects(
  clearAllLocalPersistedData(),
  /清理失败|注销失败|删除失败/,
  '清空本地数据时，缓存或 Service Worker 失败应向外抛出错误'
);

console.log('测试通过：清空本地数据遇到缓存或 Service Worker 失败时会暴露错误。');
