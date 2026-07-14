import assert from 'node:assert/strict';

type FakeRequest<T = unknown> = {
  result?: T;
  error?: unknown;
  onsuccess?: () => void;
  onerror?: () => void;
  onupgradeneeded?: () => void;
};

type FakeTransaction = {
  error?: unknown;
  oncomplete?: () => void;
  onerror?: () => void;
  onabort?: () => void;
  objectStore: (name: string) => {
    get: (key: string) => FakeRequest;
    put: (value: unknown, key: string) => FakeRequest;
  };
};

type FakeDb = {
  closed: boolean;
  objectStoreNames: { contains: (name: string) => boolean };
  createObjectStore: (name: string) => void;
  transaction: (name: string, mode: IDBTransactionMode) => FakeTransaction;
  close: () => void;
};

const openedDbs: FakeDb[] = [];
const stores = new Set(['app_state']);
let rootState: unknown = {
  contacts: [],
  messages: {},
  user: { name: '测试用户' },
  worldBooks: []
};

const createFakeDb = (): FakeDb => {
  const db: FakeDb = {
    closed: false,
    objectStoreNames: {
      contains: (name: string) => stores.has(name)
    },
    createObjectStore: (name: string) => {
      stores.add(name);
    },
    transaction: (_name: string, _mode: IDBTransactionMode) => {
      const tx: FakeTransaction = {
        objectStore: () => ({
          get: () => {
            const request: FakeRequest = {};
            queueMicrotask(() => {
              request.result = rootState;
              request.onsuccess?.();
            });
            return request;
          },
          put: (value: unknown) => {
            const request: FakeRequest = {};
            queueMicrotask(() => {
              rootState = value;
              request.onsuccess?.();
              tx.oncomplete?.();
            });
            return request;
          }
        })
      };
      return tx;
    },
    close: () => {
      db.closed = true;
    }
  };
  openedDbs.push(db);
  return db;
};

(globalThis as any).indexedDB = {
  open: () => {
    const request: FakeRequest<FakeDb> = {};
    queueMicrotask(() => {
      request.result = createFakeDb();
      request.onsuccess?.();
    });
    return request;
  }
};

(globalThis as any).localStorage = {
  getItem() {
    throw new Error('localStorage unavailable');
  },
  setItem() {
    throw new Error('localStorage unavailable');
  },
  removeItem() {},
  clear() {}
};

const { loadState, saveState } = await import('../src/services/storage.ts');

{
  const loaded = await loadState();
  assert.equal((loaded as any)?.user?.name, '测试用户', '应能正常读取 IndexedDB 根状态');
  assert.equal(openedDbs.at(-1)?.closed, true, 'loadState 完成后应关闭 IndexedDB 连接');
}

{
  await saveState({
    contacts: [],
    user: { name: '保存用户' },
    messages: {},
    favorites: [],
    moments: [],
    settings: {},
    aiSettings: {},
    worldBooks: []
  });
  assert.equal((rootState as any).user.name, '保存用户', '应能正常写入 IndexedDB 根状态');
  assert.equal(openedDbs.at(-1)?.closed, true, 'saveState 完成后应关闭 IndexedDB 连接');
}

{
  rootState = null;
  const loaded = await loadState();
  assert.equal(loaded, null, 'localStorage 不可用时，空状态读取应安全返回 null');
  assert.equal(openedDbs.at(-1)?.closed, true, '回退旧版迁移读取后也应关闭 IndexedDB 连接');
}

console.log('测试通过：本地状态读写会关闭 IndexedDB 连接，并兼容 localStorage 不可用。');
