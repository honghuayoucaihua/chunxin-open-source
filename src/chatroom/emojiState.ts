import type { EmojiGroup, EmojiItem } from '../types/index.ts';
import {
  collectEmojiUiStateFromLocalStorage,
  CUSTOM_EMOJI_ORDER_STORAGE_KEY,
  EMOJI_GROUPS_STORAGE_KEY,
  HIDDEN_EMOJI_IDS_STORAGE_KEY,
  persistEmojiUiStateToLocalStorage
} from './emojiUiState.ts';

export type CustomEmoji = { id: string; url: string; desc: string };
export type GroupEmojiMap = Record<string, EmojiItem[]>;

export {
  CUSTOM_EMOJI_ORDER_STORAGE_KEY,
  EMOJI_GROUPS_STORAGE_KEY,
  HIDDEN_EMOJI_IDS_STORAGE_KEY
};
export const EMOJI_UNIFIED_SIZE = 160;
export const EMOJI_OUTPUT_QUALITY = 0.78;
export const EMOJI_COMPACT_MIGRATION_KEY = 'xushuo_emoji_compact_v1';
export const EMOJI_PANEL_PAGE_SIZE_CUSTOM = 48;
export const EMOJI_PANEL_PAGE_SIZE_GROUP = 120;
export const URL_IMPORT_PAGE_SIZE = 30;
export const URL_IMPORT_CONCURRENCY = 4;
export const MESSAGE_PAGE_SIZE = 80;
export const MESSAGE_INITIAL_RENDER_COUNT = 160;
export const IMAGE_FALLBACK_SRC = '/assets/image/user.png';

const LEGACY_BUILTIN_EMOJI_GROUP_IDS = new Set(['douyin', 'xiaohongshu']);
const EMOJI_DB_NAME = 'XushuoEmojiDB';
const EMOJI_DB_VERSION = 2;
const EMOJI_STORE_NAME = 'emoji_state';
const EMOJI_CUSTOM_KEY = 'custom_emojis';
const EMOJI_GROUP_MAP_KEY = 'group_emojis';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

export const normalizeEmojiGroups = (groups: EmojiGroup[]): EmojiGroup[] => {
  return groups.filter((group) => !LEGACY_BUILTIN_EMOJI_GROUP_IDS.has(group.id));
};

export const getInitialEmojiGroups = (): EmojiGroup[] => {
  const saved = (window as any).emojiGroups;
  if (Array.isArray(saved) && saved.length > 0) {
    const normalized = normalizeEmojiGroups(saved);
    (window as any).emojiGroups = normalized;
    const storedUiState = collectEmojiUiStateFromLocalStorage();
    persistEmojiUiStateToLocalStorage({
      ...storedUiState,
      emojiGroups: normalized
    });
    return normalized;
  }
  const storedUiState = collectEmojiUiStateFromLocalStorage();
  if (Array.isArray(storedUiState.emojiGroups) && storedUiState.emojiGroups.length > 0) {
    const normalized = normalizeEmojiGroups(storedUiState.emojiGroups);
    (window as any).emojiGroups = normalized;
    persistEmojiUiStateToLocalStorage({
      ...storedUiState,
      emojiGroups: normalized
    });
    return normalized;
  }
  const defaults: EmojiGroup[] = [];
  (window as any).emojiGroups = defaults;
  return defaults;
};

export const normalizeEmojiDesc = (value: unknown, fallback: string): string => {
  const text = String(value || '').trim();
  if (text) {
    return text;
  }
  const decoded = decodeURIComponent(String(fallback || '').trim())
    .replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,.+$/i, '自定义表情')
    .replace(/^blob:[^/]+\/[a-z0-9-]+$/i, '自定义表情')
    .replace(/^.*[\\/]/, '')
    .replace(/\.[a-zA-Z0-9]{1,8}(?:\?.*)?$/, '')
    .trim();
  return decoded || '自定义表情';
};

export const normalizeCustomEmojis = (list: unknown[]): CustomEmoji[] => {
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .filter(isRecord)
    .map((item, idx: number) => {
      const id = String(item.id || `custom_${Date.now()}_${idx}`);
      const url = String(item.url || '');
      const descFallback = String(item.url || item.id || `emoji_${idx}`);
      const desc = normalizeEmojiDesc(item.desc, descFallback);
      return { id, url, desc };
    })
    .filter((item) => !!item.url);
};

export const normalizeGroupEmojiList = (groupId: string, list: unknown): EmojiItem[] => {
  if (!Array.isArray(list)) return [];
  return list
    .filter(isRecord)
    .map((item) => {
      const id = String(item.id || '').trim();
      const url = String(item.url || '').trim();
      const descFallback = String(item.url || item.id || `${groupId}-emoji`);
      const desc = normalizeEmojiDesc(item.desc, descFallback);
      const normalizedGroupId = String(item.groupId || groupId).trim() || groupId;
      return { id, url, desc, groupId: normalizedGroupId } as EmojiItem;
    })
    .filter((item) => item.id && item.url);
};

export const normalizeGroupEmojiMap = (input: unknown): GroupEmojiMap => {
  if (!input || typeof input !== 'object') return {};
  const normalized: GroupEmojiMap = {};
  Object.entries(input as Record<string, unknown>).forEach(([groupId, list]) => {
    normalized[String(groupId)] = normalizeGroupEmojiList(String(groupId), list);
  });
  return normalized;
};

export const syncGroupEmojiMapToWindow = (value: GroupEmojiMap): GroupEmojiMap => {
  const normalized = normalizeGroupEmojiMap(value);
  (window as any).allGroupEmojis = normalized;
  Object.keys(window as any).forEach((key) => {
    if (key.startsWith('groupEmojis_')) {
      delete (window as any)[key];
    }
  });
  Object.entries(normalized).forEach(([groupId, list]) => {
    (window as any)[`groupEmojis_${groupId}`] = list;
  });
  return normalized;
};

export const getRuntimeGroupEmojiMap = (): GroupEmojiMap => {
  const current = (window as any).allGroupEmojis;
  if (current && typeof current === 'object') {
    return normalizeGroupEmojiMap(current);
  }
  return {};
};

const openEmojiDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(EMOJI_DB_NAME, EMOJI_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(EMOJI_STORE_NAME)) {
        db.createObjectStore(EMOJI_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const loadCustomEmojisFromIDB = async (): Promise<CustomEmoji[]> => {
  try {
    const db = await openEmojiDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(EMOJI_STORE_NAME, 'readonly');
      const store = tx.objectStore(EMOJI_STORE_NAME);
      const req = store.get(EMOJI_CUSTOM_KEY);
      req.onsuccess = () => {
        const data = req.result;
        resolve(Array.isArray(data) ? normalizeCustomEmojis(data) : []);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    if ((error as Error)?.message !== 'indexedDB unavailable') {
      console.warn('[Emoji] Failed to read custom emojis from IndexedDB:', error);
    }
    return [];
  }
};

export const saveCustomEmojisToIDB = async (list: CustomEmoji[]): Promise<void> => {
  try {
    const db = await openEmojiDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(EMOJI_STORE_NAME, 'readwrite');
      const store = tx.objectStore(EMOJI_STORE_NAME);
      const req = store.put(list, EMOJI_CUSTOM_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    if ((error as Error)?.message !== 'indexedDB unavailable') {
      console.warn('[Emoji] Failed to persist custom emojis to IndexedDB:', error);
    }
  }
};

export const loadGroupEmojiMapFromIDB = async (): Promise<GroupEmojiMap> => {
  try {
    const db = await openEmojiDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(EMOJI_STORE_NAME, 'readonly');
      const store = tx.objectStore(EMOJI_STORE_NAME);
      const req = store.get(EMOJI_GROUP_MAP_KEY);
      req.onsuccess = () => {
        resolve(normalizeGroupEmojiMap(req.result));
      };
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    if ((error as Error)?.message !== 'indexedDB unavailable') {
      console.warn('[Emoji] Failed to read group emojis from IndexedDB:', error);
    }
    return {};
  }
};

export const saveGroupEmojiMapToIDB = async (value: GroupEmojiMap): Promise<void> => {
  try {
    const normalized = normalizeGroupEmojiMap(value);
    const db = await openEmojiDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(EMOJI_STORE_NAME, 'readwrite');
      const store = tx.objectStore(EMOJI_STORE_NAME);
      const req = store.put(normalized, EMOJI_GROUP_MAP_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    if ((error as Error)?.message !== 'indexedDB unavailable') {
      console.warn('[Emoji] Failed to persist group emojis to IndexedDB:', error);
    }
  }
};

export const persistGroupEmojiMap = async (value: GroupEmojiMap): Promise<GroupEmojiMap> => {
  const normalized = normalizeGroupEmojiMap(value);
  syncGroupEmojiMapToWindow(normalized);
  await saveGroupEmojiMapToIDB(normalized);
  return normalized;
};

export const loadPersistedGroupEmojiMap = async (): Promise<GroupEmojiMap> => {
  const fromIDB = await loadGroupEmojiMapFromIDB();
  syncGroupEmojiMapToWindow(fromIDB);
  return fromIDB;
};
