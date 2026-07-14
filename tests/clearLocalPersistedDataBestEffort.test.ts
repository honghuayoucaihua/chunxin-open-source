import assert from 'node:assert/strict';
import { clearAllLocalPersistedData } from '../src/services/localDataCleanup.ts';

let localStorageCleared = false;
let sessionStorageCleared = false;
let cacheDeleted = false;
let indexedDbDeleted = false;

(globalThis as any).localStorage = {
  clear: () => {
    localStorageCleared = true;
  }
};
(globalThis as any).sessionStorage = {
  clear: () => {
    sessionStorageCleared = true;
  }
};
(globalThis as any).indexedDB = {
  databases: undefined,
  deleteDatabase: () => {
    indexedDbDeleted = true;
    const request: any = {};
    queueMicrotask(() => {
      request.onsuccess?.();
    });
    return request;
  }
};
(globalThis as any).caches = {
  keys: async () => ['cache-1'],
  delete: async () => {
    cacheDeleted = true;
    return true;
  }
};
Object.defineProperty(globalThis, 'navigator', {
  value: {
    serviceWorker: {
      getRegistrations: async () => [
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
  /Service Worker: Service Worker 注销失败/,
  'Service Worker 清理失败仍应向外报告'
);

assert.equal(localStorageCleared, true, '清空流程应尝试清理 localStorage');
assert.equal(sessionStorageCleared, true, '清空流程应尝试清理 sessionStorage');
assert.equal(cacheDeleted, true, 'Service Worker 失败后仍应继续清理 CacheStorage');
assert.equal(indexedDbDeleted, true, 'Service Worker 失败后仍应继续清理 IndexedDB');

console.log('测试通过：清空本地数据会尽量完成所有清理步骤，再汇总失败项。');
