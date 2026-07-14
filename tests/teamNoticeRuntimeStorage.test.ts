import assert from 'node:assert/strict';
import { fetchTeamNoticePreviewRuntime } from '../src/tabs/teamNoticeRuntime.ts';

type MemoryStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const createMemoryStorage = (): MemoryStorage => {
  const store = new Map<string, string>();
  return {
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    }
  };
};

const originalFetch = globalThis.fetch;
const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

try {
  const localStorage = createMemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorage
  });

  let fetchCount = 0;
  globalThis.fetch = async (input) => {
    const url = String(input);
    assert.match(url, /\/team\/notices$/, '团队公告运行时应请求 /team/notices 接口（利用后端 Cache-Control 缓存）');
    fetchCount += 1;
    return new Response(JSON.stringify({ notices: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  localStorage.setItem('preview-key', JSON.stringify({ title: '旧公告', createdAt: 1700000000000 }));
  const result = await fetchTeamNoticePreviewRuntime({
    previewStorageKey: 'preview-key',
    lastReadStorageKey: 'last-read-key',
    fallbackLastReadAt: 0
  });

  assert.equal(localStorage.getItem('preview-key'), null, '当接口已经没有公告时，应删除本地残留的公告预览缓存');
  assert.deepEqual(result, { preview: null, unreadCount: 0 }, '当接口已经没有公告时，应返回空预览和 0 未读');

  await fetchTeamNoticePreviewRuntime({
    previewStorageKey: 'preview-key',
    lastReadStorageKey: 'last-read-key',
    fallbackLastReadAt: 0
  });
  assert.equal(fetchCount, 1, '短时间内重复刷新公告预览应复用本地缓存，避免重复请求 Worker');
} finally {
  globalThis.fetch = originalFetch;
  if (originalLocalStorageDescriptor) {
    Object.defineProperty(globalThis, 'localStorage', originalLocalStorageDescriptor);
  } else {
    delete (globalThis as typeof globalThis & { localStorage?: MemoryStorage }).localStorage;
  }
}

console.log('测试通过：团队公告删空后会同步清理本地预览缓存。');
