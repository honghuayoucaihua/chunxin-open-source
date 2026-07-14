const KNOWN_INDEXED_DB_NAMES = ['XushuoDB', 'XushuoEmojiDB', 'localMusicDB'] as const;
const DELETE_RETRY_DELAYS_MS = [300, 900] as const;

const deleteIndexedDBByName = (dbName: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error(`删除数据库失败: ${dbName}`));
    request.onblocked = () => reject(new Error(`数据库被占用，无法删除: ${dbName}`));
  });
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const isWorkboxDatabase = (dbName: string): boolean => dbName.startsWith('workbox-');

const deleteIndexedDBWithRetry = async (dbName: string): Promise<void> => {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= DELETE_RETRY_DELAYS_MS.length; attempt++) {
    try {
      await deleteIndexedDBByName(dbName);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < DELETE_RETRY_DELAYS_MS.length) {
        await sleep(DELETE_RETRY_DELAYS_MS[attempt]);
      }
    }
  }
  throw lastError;
};

const listIndexedDBNames = async (): Promise<string[]> => {
  const api = indexedDB.databases;
  if (typeof api !== 'function') return [...KNOWN_INDEXED_DB_NAMES];
  const entries = await api.call(indexedDB);
  const dynamicNames = Array.isArray(entries)
    ? entries.map((item) => String(item?.name || '').trim()).filter(Boolean)
    : [];
  return Array.from(new Set([...KNOWN_INDEXED_DB_NAMES, ...dynamicNames]));
};

const clearIndexedDBStorage = async (): Promise<void> => {
  if (typeof indexedDB === 'undefined') return;
  const dbNames = await listIndexedDBNames();
  const errors: string[] = [];

  for (const dbName of dbNames) {
    try {
      await deleteIndexedDBWithRetry(dbName);
    } catch (error) {
      const message = String(error || '未知错误');
      if (isWorkboxDatabase(dbName)) {
        console.warn(`[Cleanup] 跳过占用的 Workbox 数据库: ${dbName}; 原因: ${message}`);
        continue;
      }
      errors.push(`${dbName}: ${message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`IndexedDB 清理失败: ${errors.join(' | ')}`);
  }
};

const clearCacheStorage = async (): Promise<void> => {
  if (typeof caches === 'undefined') return;
  const names = await caches.keys();
  const results = await Promise.allSettled(names.map((name) => caches.delete(name)));
  const failures = results.filter((result) => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value)).length;
  if (failures > 0) throw new Error(`CacheStorage 清理失败: ${failures} 项未删除`);
};

const unregisterServiceWorkers = async (): Promise<void> => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  const results = await Promise.allSettled(registrations.map((item) => item.unregister()));
  const failures = results.filter((result) => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value)).length;
  if (failures > 0) throw new Error(`Service Worker 注销失败: ${failures} 项未注销`);
};

export const clearAllLocalPersistedData = async (): Promise<void> => {
  const errors: string[] = [];

  try {
    localStorage.clear();
  } catch (error) {
    errors.push(`localStorage: ${String(error || '未知错误')}`);
  }

  try {
    sessionStorage.clear();
  } catch (error) {
    errors.push(`sessionStorage: ${String(error || '未知错误')}`);
  }

  for (const [label, task] of [
    ['Service Worker', unregisterServiceWorkers],
    ['CacheStorage', clearCacheStorage],
    ['IndexedDB', clearIndexedDBStorage]
  ] as const) {
    try {
      await task();
    } catch (error) {
      errors.push(`${label}: ${error instanceof Error ? error.message : String(error || '未知错误')}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`本地数据清理失败: ${errors.join(' | ')}`);
  }
};
