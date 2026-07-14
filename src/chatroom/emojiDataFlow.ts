import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EmojiGroup, EmojiItem } from '../types';
import {
  EMOJI_COMPACT_MIGRATION_KEY,
  getInitialEmojiGroups,
  getRuntimeGroupEmojiMap,
  loadPersistedGroupEmojiMap,
  loadCustomEmojisFromIDB,
  normalizeCustomEmojis as normalizeCustomEmojisBase,
  saveCustomEmojisToIDB
} from './emojiState';
import {
  hasEmojiGroupConfigChanges,
  orderCustomEmojisByIds
} from './emojiCollectionUtils';
import {
  DEFAULT_EMOJI_GROUP_ID,
  collectEmojiBootstrapState,
  collectEmojiStoreStateFromWindow,
  normalizeEmojiStoreState,
  patchEmojiRuntimeState,
  persistEmojiUiStateToLocalStorage,
  syncAllEnabledEmojisFromState,
  syncEmojiStoreStateToWindow
} from './emojiStore';

export const useEmojiDataFlow = (params: {
  showPanel: 'emoji' | 'more' | 'none';
  compactEmojiList: (list: { id: string; url: string; desc: string }[]) => Promise<{ id: string; url: string; desc: string }[]>;
}) => {
  const safeLocalStorageGetItem = (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const safeLocalStorageSetItem = (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('[Emoji] Failed to persist emoji compact migration flag:', e);
    }
  };
  const normalizeCustomEmojis = useCallback((list: any[]) => normalizeCustomEmojisBase(list), []);
  const initialEmojiState = collectEmojiBootstrapState();

  const [customEmojis, setCustomEmojisState] = useState<{ id: string; url: string; desc: string }[]>(() => {
    const saved = initialEmojiState.customEmojis;
    if (Array.isArray(saved) && saved.length > 0) {
      return normalizeCustomEmojis(saved);
    }
    return [];
  });
  const [isCustomEmojisHydrated, setIsCustomEmojisHydrated] = useState(false);

  const [emojiGroups, setEmojiGroupsState] = useState<EmojiGroup[]>(() => {
    if (Array.isArray(initialEmojiState.emojiGroups) && initialEmojiState.emojiGroups.length > 0) {
      return initialEmojiState.emojiGroups;
    }
    return getInitialEmojiGroups();
  });

  const [activeEmojiGroupId, setActiveEmojiGroupId] = useState<string>(DEFAULT_EMOJI_GROUP_ID);
  const [groupEmojis, setGroupEmojisState] = useState<Record<string, EmojiItem[]>>(() => initialEmojiState.groupEmojis || {});
  const loadedGroupIdsRef = useRef<Set<string>>(new Set());
  const [hiddenEmojiIds, setHiddenEmojiIdsState] = useState<string[]>(() => {
    const saved = initialEmojiState.hiddenEmojiIds;
    if (Array.isArray(saved)) return saved;
    return [];
  });

  const [isManagingEmojis, setIsManagingEmojis] = useState(false);
  const [selectedEmojiIds, setSelectedEmojiIds] = useState<string[]>([]);

  const saveCustomEmojisTimerRef = useRef<number | null>(null);
  const saveCustomEmojiOrderTimerRef = useRef<number | null>(null);
  const [customEmojiOrder, setCustomEmojiOrderState] = useState<string[]>(() => {
    const saved = initialEmojiState.customEmojiOrder;
    if (Array.isArray(saved)) return saved.map((id: any) => String(id));
    return [];
  });

  const orderedCustomEmojis = useMemo(
    () => orderCustomEmojisByIds(customEmojis, customEmojiOrder),
    [customEmojis, customEmojiOrder]
  );

  const setCustomEmojis = useCallback((value: any) => {
    setCustomEmojisState((prev) => {
      const resolved = typeof value === 'function' ? value(prev) : value;
      const normalized = normalizeCustomEmojis(Array.isArray(resolved) ? resolved : []);
      patchEmojiRuntimeState({ customEmojis: normalized });
      return normalized;
    });
  }, [normalizeCustomEmojis]);

  const setHiddenEmojiIds = useCallback((value: any) => {
    setHiddenEmojiIdsState((prev) => {
      const resolved = typeof value === 'function' ? value(prev) : value;
      const normalized = Array.isArray(resolved) ? resolved.map((id: any) => String(id)) : [];
      patchEmojiRuntimeState({ hiddenEmojiIds: normalized });
      return normalized;
    });
  }, []);

  const setCustomEmojiOrder = useCallback((value: any) => {
    setCustomEmojiOrderState((prev) => {
      const resolved = typeof value === 'function' ? value(prev) : value;
      const normalized = Array.isArray(resolved) ? resolved.map((id: any) => String(id)) : [];
      patchEmojiRuntimeState({ customEmojiOrder: normalized });
      return normalized;
    });
  }, []);

  const setEmojiGroups = useCallback((value: any) => {
    setEmojiGroupsState((prev) => {
      const resolved = typeof value === 'function' ? value(prev) : value;
      const normalized = Array.isArray(resolved) ? resolved : [];
      patchEmojiRuntimeState({ emojiGroups: normalized });
      return normalized;
    });
  }, []);

  const setGroupEmojis = useCallback((value: any) => {
    setGroupEmojisState((prev) => {
      const resolved = typeof value === 'function' ? value(prev) : value;
      const normalized = resolved && typeof resolved === 'object' ? resolved : {};
      patchEmojiRuntimeState({ groupEmojis: normalized });
      return normalized;
    });
  }, []);

  const emojiStoreState = useMemo(() => normalizeEmojiStoreState({
    customEmojis,
    emojiGroups,
    groupEmojis,
    hiddenEmojiIds,
    customEmojiOrder
  }), [customEmojis, emojiGroups, groupEmojis, hiddenEmojiIds, customEmojiOrder]);

  const getUploadedGroupEmojis = (groupId: string): EmojiItem[] => {
    const globalMap = (window as any).allGroupEmojis;
    if (globalMap && Array.isArray(globalMap[groupId])) return globalMap[groupId];
    const fromWindow = (window as any)[`groupEmojis_${groupId}`];
    if (Array.isArray(fromWindow)) return fromWindow;
    const stored = getRuntimeGroupEmojiMap();
    return Array.isArray(stored[groupId]) ? stored[groupId] : [];
  };

  const loadGroupEmojis = (groupId: string) => {
    if (loadedGroupIdsRef.current.has(groupId)) return;
    loadedGroupIdsRef.current.add(groupId);
    try {
      const uploaded = getUploadedGroupEmojis(groupId);
      setGroupEmojisState((prev) => ({ ...prev, [groupId]: uploaded }));
    } catch (e) {
      console.error('[Emoji] Error loading uploaded group emojis:', groupId, e);
      setGroupEmojisState((prev) => ({ ...prev, [groupId]: [] }));
    }
  };

  useEffect(() => {
    let cancelled = false;
    const hydrateGroupEmojis = async () => {
      const stored = await loadPersistedGroupEmojiMap();
      if (cancelled) return;
      setGroupEmojisState(stored);
      loadedGroupIdsRef.current = new Set(Object.keys(stored));
      emojiGroups.filter((item) => item.enabled && !Object.prototype.hasOwnProperty.call(stored, item.id)).forEach((item) => {
        loadGroupEmojis(item.id);
      });
    };
    hydrateGroupEmojis().catch((error) => {
      console.error('[Emoji] 分组表情加载失败:', error);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hydrateCustomEmojis = async () => {
      const loaded = await loadCustomEmojisFromIDB();
      if (cancelled) return;
      let initial = loaded;
      if (loaded.length > 0) {
        const compactFlag = safeLocalStorageGetItem(EMOJI_COMPACT_MIGRATION_KEY);
        if (!compactFlag) {
          initial = await params.compactEmojiList(loaded);
          safeLocalStorageSetItem(EMOJI_COMPACT_MIGRATION_KEY, '1');
        }
        setCustomEmojis((prev: unknown[]) => {
          if (Array.isArray(prev) && prev.length > 0) return prev;
          return initial;
        });
      }
      setIsCustomEmojisHydrated(true);
    };
    hydrateCustomEmojis().catch((error) => {
      console.error('[Emoji] 自定义表情加载失败:', error);
      if (!cancelled) setIsCustomEmojisHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [params.compactEmojiList]);

  useEffect(() => {
    syncEmojiStoreStateToWindow(emojiStoreState);
    if (isCustomEmojisHydrated) {
      if (saveCustomEmojisTimerRef.current) window.clearTimeout(saveCustomEmojisTimerRef.current);
      saveCustomEmojisTimerRef.current = window.setTimeout(() => {
        saveCustomEmojisToIDB(customEmojis);
      }, 360);
    }
    if (saveCustomEmojiOrderTimerRef.current) window.clearTimeout(saveCustomEmojiOrderTimerRef.current);
    saveCustomEmojiOrderTimerRef.current = window.setTimeout(() => {
      persistEmojiUiStateToLocalStorage(emojiStoreState);
    }, 320);
    syncAllEnabledEmojisFromState(emojiStoreState);
    return () => {
      if (saveCustomEmojisTimerRef.current) window.clearTimeout(saveCustomEmojisTimerRef.current);
      if (saveCustomEmojiOrderTimerRef.current) window.clearTimeout(saveCustomEmojiOrderTimerRef.current);
    };
  }, [customEmojis, emojiStoreState, isCustomEmojisHydrated]);

  useEffect(() => {
    emojiGroups.filter((item) => item.enabled).forEach((item) => {
      loadGroupEmojis(item.id);
    });
  }, [emojiGroups]);

  useEffect(() => {
    const globalGroups = collectEmojiStoreStateFromWindow().emojiGroups;
    if (Array.isArray(globalGroups) && globalGroups !== emojiGroups) {
      setEmojiGroupsState(globalGroups);
    }
  }, []);

  useEffect(() => {
    if (params.showPanel === 'emoji') {
      const globalGroups = collectEmojiStoreStateFromWindow().emojiGroups;
      if (Array.isArray(globalGroups) && hasEmojiGroupConfigChanges(emojiGroups, globalGroups)) {
        setEmojiGroupsState(globalGroups);
      }
      const stored = getRuntimeGroupEmojiMap();
      setGroupEmojisState((prev) => {
        const prevKeys = Object.keys(prev);
        const storedKeys = Object.keys(stored);
        if (prevKeys.length === storedKeys.length && prevKeys.every((key) => prev[key] === stored[key])) {
          return prev;
        }
        return stored;
      });
      loadedGroupIdsRef.current = new Set();
      emojiGroups.filter((item) => item.enabled).forEach((item) => {
        loadGroupEmojis(item.id);
      });
    }
  }, [params.showPanel, emojiGroups]);

  return {
    emojiStoreState,
    normalizeCustomEmojis,
    customEmojis,
    setCustomEmojis,
    emojiGroups,
    setEmojiGroups,
    activeEmojiGroupId,
    setActiveEmojiGroupId,
    groupEmojis,
    setGroupEmojis,
    hiddenEmojiIds,
    setHiddenEmojiIds,
    isManagingEmojis,
    setIsManagingEmojis,
    selectedEmojiIds,
    setSelectedEmojiIds,
    customEmojiOrder,
    setCustomEmojiOrder,
    orderedCustomEmojis
  };
};
