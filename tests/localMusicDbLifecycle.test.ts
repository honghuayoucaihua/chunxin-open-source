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
    put: (value: { id: string; blob: Blob; timestamp: number }) => FakeRequest;
    delete: (key: string) => FakeRequest;
  };
};

type FakeDb = {
  closed: boolean;
  objectStoreNames: { contains: (name: string) => boolean };
  createObjectStore: (name: string, options?: unknown) => void;
  transaction: (name: string, mode: IDBTransactionMode) => FakeTransaction;
  close: () => void;
};

const openedDbs: FakeDb[] = [];
const stores = new Set(['audioFiles']);
const audioStore = new Map<string, Blob>();

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
          get: (key: string) => {
            const request: FakeRequest = {};
            queueMicrotask(() => {
              const blob = audioStore.get(key);
              request.result = blob ? { id: key, blob, timestamp: Date.now() } : undefined;
              request.onsuccess?.();
              tx.oncomplete?.();
            });
            return request;
          },
          put: (value: { id: string; blob: Blob }) => {
            const request: FakeRequest = {};
            queueMicrotask(() => {
              audioStore.set(value.id, value.blob);
              request.onsuccess?.();
              tx.oncomplete?.();
            });
            return request;
          },
          delete: (key: string) => {
            const request: FakeRequest = {};
            queueMicrotask(() => {
              audioStore.delete(key);
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

const { saveAudioToDB, getAudioFromDB, deleteAudioFromDB } = await import('../src/music/musicCommon.ts');

const blob = new Blob(['audio-data'], { type: 'audio/mpeg' });
await saveAudioToDB('audio-1', blob);
assert.equal(openedDbs.at(-1)?.closed, true, '保存本地音乐后应关闭 IndexedDB 连接');

const loaded = await getAudioFromDB('audio-1');
assert.equal(loaded, blob, '应能读取已保存的本地音乐 Blob');
assert.equal(openedDbs.at(-1)?.closed, true, '读取本地音乐后应关闭 IndexedDB 连接');

await deleteAudioFromDB('audio-1');
assert.equal(openedDbs.at(-1)?.closed, true, '删除本地音乐后应关闭 IndexedDB 连接');
assert.equal(await getAudioFromDB('audio-1'), null, '删除后应读取不到本地音乐');
assert.equal(openedDbs.at(-1)?.closed, true, '读取空本地音乐后也应关闭 IndexedDB 连接');

console.log('测试通过：本地音乐 IndexedDB 读写会等待事务完成并关闭连接。');
