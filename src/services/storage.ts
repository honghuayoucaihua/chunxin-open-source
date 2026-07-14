export type PersistedState = {
  contacts: any;
  user: any;
  messages: any;
  favorites: any;
  moments: any;
  settings: any;
  aiSettings: any;
  worldBooks: any;
  masks?: any;
  forums?: any;
  contactMemories?: any;
  customEmojis?: any;
  emojiGroups?: any;
  groupEmojis?: any;
  hiddenEmojiIds?: any;
  customEmojiOrder?: any;
  selectedContacts?: any;
  currentArticle?: any;
  officialArticles?: any;
  friendRequests?: any;
  soundVibrationSettings?: any;
  hasAgreedTerms?: boolean;
  walletBank?: { name: string; last4: string };
  musicState?: any;
  divinationHistory?: any;
};

// 使用XushuoDB作为数据库名称，以保留xushuo 1.0版本的数据
// 这样在同一个域名部署时，用户数据可以无缝迁移
const DB_NAME = 'XushuoDB';
const DB_VERSION = 16;
const STORE_NAME = 'app_state';
const STATE_KEY = 'root';

const openDB = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME);
    }
  };

  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const closeDB = (db: IDBDatabase): void => {
  try {
    db.close();
  } catch {
    // 忽略关闭失败，避免掩盖真正的读写结果。
  }
};

const safeParseJson = (value: string | null): any => {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const safeLocalStorageGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const readStoreAll = <T = any>(db: IDBDatabase, storeName: string): Promise<T[]> => {
  if (!db.objectStoreNames.contains(storeName)) return Promise.resolve([]);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(Array.isArray(req.result) ? (req.result as T[]) : []);
    req.onerror = () => reject(req.error);
  });
};

export type LoadStateProgress = (status: string, progress?: number) => void;

const loadLegacyState = async (db: IDBDatabase, onProgress?: LoadStateProgress): Promise<PersistedState | null> => {
  onProgress?.('正在读取旧版联系人与配置...', 20);
  const [
    contacts,
    settings,
    emojis,
    dynamics,
    shopItems,
    inventory,
    musicCache,
    fonts,
    worldBooks
  ] = await Promise.all([
    readStoreAll(db, 'contacts'),
    readStoreAll(db, 'settings'),
    readStoreAll(db, 'emojis'),
    readStoreAll(db, 'dynamics'),
    readStoreAll(db, 'shop_items'),
    readStoreAll(db, 'inventory'),
    readStoreAll(db, 'music_cache'),
    readStoreAll(db, 'fonts'),
    readStoreAll(db, 'world_books')
  ]);

  onProgress?.('正在读取浏览器本地设置...', 60);
  const localSoundSettingsRaw = safeLocalStorageGetItem('soundSettings');
  const localSyshuoUsageRaw = safeLocalStorageGetItem('syshuo_usage') || safeLocalStorageGetItem('syshuoUsage');
  const localSyshuoLimitBoostRaw = safeLocalStorageGetItem('syshuo_limit_boost') || safeLocalStorageGetItem('syshuoLimitBoost');
  const localCustomCodeConfigRaw = safeLocalStorageGetItem('customCodeConfig');

  const hasLegacyData =
    contacts.length > 0
    || settings.length > 0
    || emojis.length > 0
    || dynamics.length > 0
    || shopItems.length > 0
    || inventory.length > 0
    || musicCache.length > 0
    || fonts.length > 0
    || worldBooks.length > 0
    || !!localSoundSettingsRaw
    || !!localSyshuoUsageRaw
    || !!localSyshuoLimitBoostRaw
    || !!localCustomCodeConfigRaw;

  if (!hasLegacyData) {
    onProgress?.('未发现可迁移的旧版数据', 100);
    return null;
  }

  onProgress?.('正在组装迁移数据...', 85);

  return {
    version: 'legacy-idb-auto-migrated',
    contacts,
    settings,
    emojis,
    dynamics,
    shopItems,
    inventory,
    musicCache,
    fonts,
    worldBooks,
    localStorage: {
      soundSettings: safeParseJson(localSoundSettingsRaw),
      syshuoUsage: safeParseJson(localSyshuoUsageRaw),
      syshuoLimitBoost: safeParseJson(localSyshuoLimitBoostRaw),
      customCodeConfig: safeParseJson(localCustomCodeConfigRaw)
    },
    soundSettings: localSoundSettingsRaw || undefined,
    syshuoUsage: localSyshuoUsageRaw || undefined,
    syshuoLimitBoost: localSyshuoLimitBoostRaw || undefined,
    customCodeConfig: localCustomCodeConfigRaw || undefined
  } as unknown as PersistedState;
};

export const loadState = async (onProgress?: LoadStateProgress): Promise<PersistedState | null> => {
  const shouldReportProgress = !!onProgress;
  const reportProgress = (status: string, progress?: number) => {
    if (!shouldReportProgress) return;
    // 仅在需要“迁移旧版数据”时才显示恢复进度，避免每次启动都弹出进度条
    if (!/旧版|迁移|恢复/i.test(status)) return;
    onProgress?.(status, progress);
  };

  reportProgress('正在打开本地数据库...', 5);
  const db = await openDB();
  try {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      return await loadLegacyState(db, reportProgress);
    }

    reportProgress('正在读取新版状态...', 12);
    const persisted = await new Promise<PersistedState | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(STATE_KEY);
      req.onsuccess = () => resolve((req.result as PersistedState) || null);
      req.onerror = () => reject(req.error);
    });

    const hasUsableRootState = !!(
      persisted
      && (
        Array.isArray((persisted as any).contacts)
        || ((persisted as any).messages && typeof (persisted as any).messages === 'object')
        || !!(persisted as any).user
        || Array.isArray((persisted as any).worldBooks)
      )
    );

    if (hasUsableRootState) {
      return persisted;
    }

    // 同域名替换部署场景：若新版根状态缺失或为空壳，回退旧版对象仓库自动拼装迁移数据
    reportProgress('未发现有效新版数据，开始迁移旧版数据...', 18);
    const legacy = await loadLegacyState(db, reportProgress);
    if (legacy) {
      reportProgress('旧版数据迁移完成', 100);
      return legacy;
    }

    return persisted;
  } finally {
    closeDB(db);
  }
};

export const saveState = async (state: PersistedState): Promise<void> => {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('保存本地状态事务已中止'));

      const store = tx.objectStore(STORE_NAME);
      const req = store.put(state, STATE_KEY);
      req.onerror = () => reject(req.error);
    });
  } finally {
    closeDB(db);
  }
};
