import { INITIAL_CONTACTS } from '../constants.ts';
import { ANONYMOUS_CHAT_ID, DEFAULT_ANONYMOUS_SETTINGS } from './anonymousChatUtils.ts';
import { normalizeDivinationHistory } from '../services/divinationService.ts';
import {
  extractDesktopSettingsRestoreData,
  isDesktopSettingsExportPayload,
  mergeDesktopAppearanceSettings
} from '../services/desktopSettingsTransfer.ts';
import { persistGroupEmojiMap } from '../chatroom/emojiState.ts';
import {
  collectEmojiUiStateFromLocalStorage,
  persistEmojiUiStateToLocalStorage
} from '../chatroom/emojiUiState.ts';
import { collectEmojiStoreStateFromWindow, patchEmojiRuntimeState } from '../chatroom/emojiStore.ts';
import { applyTruthOrDarePersistedState } from '../chatroom/truthOrDarePersistence.ts';
import { applyImageLibraryPersistedState } from '../services/imageLibraryStore.ts';
import { applyNovelPersistedState } from '../pages/novelDiscoverHelpers.ts';
import { applyAiProviderPersistedState } from '../settings/ai/aiProviderPersistence.ts';
import { applyEmojiPersistedState } from '../services/emojiPersistenceState.ts';
import { persistPlaylistFromMusicState } from '../music/musicCommon.ts';
import { normalizeImportedWorldBooks } from '../utils/worldBookImport.ts';

export type RestoreMode = 'merge' | 'overwrite' | 'desktop-only';

const RESTORE_MAX_SIZE = 500 * 1024 * 1024;

const isFileTooLarge = (file: File): boolean => file.size > RESTORE_MAX_SIZE;

const buildRestoreErrorMessage = (error: any): string => {
  if (error instanceof SyntaxError) {
    return '导入失败：JSON 格式错误，请检查文件是否损坏';
  }
  if (error?.message?.includes('memory') || error?.message?.includes('allocation')) {
    return '导入失败：内存不足，请尝试关闭其他应用后重试';
  }
  if (error?.message) {
    return `导入失败：${error.message}`;
  }
  return '导入失败';
};

const normalizeEmojiList = (list: any): { id: string; url: string; desc: string }[] => {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item && typeof item === 'object')
    .map((item, idx) => ({
      id: String(item.id || `emoji-${Date.now()}-${idx}`),
      url: String(item.url || item.src || '').trim(),
      desc: String(item.desc || '').trim()
    }))
    .filter((item) => !!item.url);
};

const normalizeGroupMap = (value: any): Record<string, { id: string; url: string; desc: string; groupId: string }[]> => {
  if (!value || typeof value !== 'object') return {};
  const next: Record<string, { id: string; url: string; desc: string; groupId: string }[]> = {};
  Object.entries(value).forEach(([groupId, list]) => {
    const normalized = normalizeEmojiList(list).map((item) => ({ ...item, groupId: String(groupId) }));
    next[String(groupId)] = normalized;
  });
  return next;
};

const extractEmojiExport = (raw: any): null | {
  customEmojis: any[];
  customEmojiOrder: string[];
  emojiGroups: any[];
  groupEmojis: Record<string, any[]>;
  hiddenEmojiIds: string[];
} => {
  const source = raw?.emojiExport && typeof raw.emojiExport === 'object'
    ? raw.emojiExport
    : null;
  if (!source) return null;
  return {
    customEmojis: normalizeEmojiList(source.customEmojis),
    customEmojiOrder: Array.isArray(source.customEmojiOrder) ? source.customEmojiOrder.map((id: any) => String(id)) : [],
    emojiGroups: Array.isArray(source.emojiGroups) ? source.emojiGroups : [],
    groupEmojis: normalizeGroupMap(source.groupEmojis),
    hiddenEmojiIds: Array.isArray(source.hiddenEmojiIds) ? source.hiddenEmojiIds.map((id: any) => String(id)) : []
  };
};

const mergeUniqueByUrl = (baseList: { id: string; url: string; desc: string }[], appendList: { id: string; url: string; desc: string }[]) => {
  const keySet = new Set(baseList.map((item) => item.url || item.id));
  const appended = appendList.filter((item) => !keySet.has(item.url || item.id));
  return [...baseList, ...appended];
};

const applyEmojiExportRestore = (
  data: {
    customEmojis: any[];
    customEmojiOrder: string[];
    emojiGroups: any[];
    groupEmojis: Record<string, any[]>;
    hiddenEmojiIds: string[];
  },
  mode: RestoreMode
) => {
  const currentEmojiState = collectEmojiStoreStateFromWindow();
  const storedEmojiUiState = collectEmojiUiStateFromLocalStorage();
  const existingCustom = normalizeEmojiList(currentEmojiState.customEmojis);
  const existingGroups = Array.isArray(currentEmojiState.emojiGroups) && currentEmojiState.emojiGroups.length > 0
    ? currentEmojiState.emojiGroups
    : storedEmojiUiState.emojiGroups;
  const existingGroupMap = normalizeGroupMap(currentEmojiState.groupEmojis);
  const existingHiddenIds = Array.isArray(currentEmojiState.hiddenEmojiIds)
    ? currentEmojiState.hiddenEmojiIds
    : storedEmojiUiState.hiddenEmojiIds;
  const existingCustomOrder = Array.isArray(currentEmojiState.customEmojiOrder)
    ? currentEmojiState.customEmojiOrder
    : storedEmojiUiState.customEmojiOrder;

  const customEmojis = mode === 'merge'
    ? mergeUniqueByUrl(existingCustom, data.customEmojis)
    : normalizeEmojiList(data.customEmojis);

  const groupById = new Map<string, any>();
  const putGroups = (list: any[]) => {
    if (!Array.isArray(list)) return;
    list.forEach((group: any) => {
      const id = String(group?.id || '').trim();
      if (!id) return;
      groupById.set(id, { ...group, id });
    });
  };
  if (mode === 'merge') {
    putGroups(existingGroups);
    putGroups(data.emojiGroups);
  } else {
    putGroups(data.emojiGroups);
  }
  const emojiGroups = Array.from(groupById.values());

  const groupEmojis = mode === 'merge' ? { ...existingGroupMap } : {};
  Object.entries(data.groupEmojis).forEach(([groupId, list]) => {
    const incoming = normalizeEmojiList(list).map((item) => ({ ...item, groupId: String(groupId) }));
    if (mode === 'merge') {
      const existing = Array.isArray(groupEmojis[groupId]) ? groupEmojis[groupId] : [];
      groupEmojis[groupId] = mergeUniqueByUrl(existing, incoming).map((item) => ({ ...item, groupId: String(groupId) }));
    } else {
      groupEmojis[groupId] = incoming;
    }
  });

  const hiddenEmojiIds = mode === 'merge'
    ? Array.from(new Set([...(Array.isArray(existingHiddenIds) ? existingHiddenIds : []), ...data.hiddenEmojiIds]))
    : data.hiddenEmojiIds;

  const customEmojiOrder = mode === 'merge'
    ? Array.from(new Set([...(Array.isArray(existingCustomOrder) ? existingCustomOrder : []), ...data.customEmojiOrder]))
    : data.customEmojiOrder;

  patchEmojiRuntimeState({
    customEmojis,
    emojiGroups,
    groupEmojis,
    hiddenEmojiIds,
    customEmojiOrder
  });

  persistEmojiUiStateToLocalStorage({
    emojiGroups,
    hiddenEmojiIds,
    customEmojiOrder
  });
  void persistGroupEmojiMap(groupEmojis);
};

const normalizeAnonymousSettings = (loaded: any) => {
  if (!loaded || typeof loaded !== 'object') return null;
  const incomingRange = Array.isArray(loaded.ageRange) ? loaded.ageRange : DEFAULT_ANONYMOUS_SETTINGS.ageRange;
  const minAge = Math.max(16, Number(incomingRange[0] || 18));
  const maxAge = Math.max(minAge, Number(incomingRange[1] || 35));
  const tags = Array.isArray(loaded.tags)
    ? loaded.tags.map((tag: any) => String(tag || '').trim()).filter(Boolean).slice(0, 6)
    : [];
  return {
    onlyOppositeSex: !!loaded.onlyOppositeSex,
    ageRange: [minAge, maxAge] as [number, number],
    tags
  };
};

const normalizeAnonymousHistory = (list: any): any[] => {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const fallbackTimestamp = Number(item?.endedAt || Date.now());
      const messages = Array.isArray(item?.messages)
        ? item.messages
        : [{
            id: `${fallbackTimestamp}-history-tip`,
            senderId: ANONYMOUS_CHAT_ID,
            content: item?.reason === 'leftByPeer' ? '对方离开了聊天' : '你已离开当前聊天',
            timestamp: fallbackTimestamp,
            type: 'system'
          }];
      return {
        ...item,
        id: String(item?.id || `anonymous-history-${fallbackTimestamp}`),
        messages
      };
    });
};

const isPartialContactsExportPayload = (data: any): boolean =>
  !!data
  && typeof data === 'object'
  && typeof data.version === 'string'
  && data.version.startsWith('contacts-export-');

const isPartialWorldBooksExportPayload = (data: any): boolean =>
  !!data
  && typeof data === 'object'
  && typeof data.version === 'string'
  && data.version.startsWith('worldbooks-export-');

const isPartialHtmlTemplatesExportPayload = (data: any): boolean =>
  !!data
  && typeof data === 'object'
  && typeof data.version === 'string'
  && data.version.startsWith('htmltemplates-export-');

const isPartialTemplatePayload = (data: any): boolean =>
  isPartialHtmlTemplatesExportPayload(data)
  || (
    !!data
    && typeof data === 'object'
    && !Object.prototype.hasOwnProperty.call(data, 'contacts')
    && !Object.prototype.hasOwnProperty.call(data, 'user')
    && !Object.prototype.hasOwnProperty.call(data, 'messages')
    && !Object.prototype.hasOwnProperty.call(data, 'settings')
    && !Object.prototype.hasOwnProperty.call(data, 'worldBooks')
    && !Object.prototype.hasOwnProperty.call(data, 'moments')
    && !Object.prototype.hasOwnProperty.call(data, 'favorites')
    && !Object.prototype.hasOwnProperty.call(data, 'forums')
    && (
      Array.isArray(data.htmlTemplates)
      || Array.isArray(data.bubbleTemplates)
    )
  );

const upsertById = (existing: any[], incoming: any[]): any[] => {
  const next = Array.isArray(existing) ? [...existing] : [];
  const indexById = new Map(next.map((item, index) => [String(item?.id || ''), index]));
  incoming.forEach((item) => {
    const id = String(item?.id || '').trim();
    if (!id) return;
    const index = indexById.get(id);
    if (typeof index === 'number') {
      next[index] = item;
      return;
    }
    indexById.set(id, next.length);
    next.push(item);
  });
  return next;
};

const applyRestorePayload = (params: any, data: any, filteredContacts: any[] | null, mode: RestoreMode) => {
  if (mode === 'merge') {
    if (filteredContacts) {
      params.setContacts((prev: any[]) => {
        const existing = params.mergeBuiltInContacts(prev);
        const existingIds = new Set(existing.map((c: any) => c.id));
        const newContacts = filteredContacts.filter((c: any) => !existingIds.has(c.id));
        return params.mergeBuiltInContacts([...existing, ...newContacts]);
      });
    }
    if (data.messages) {
      const normalizedMessages = params.normalizeLegacyMessages(data.messages, filteredContacts || INITIAL_CONTACTS);
      params.setMessages((prev: Record<string, any[]>) => {
        const merged = { ...prev };
        for (const [contactId, msgs] of Object.entries(normalizedMessages as Record<string, any[]>)) {
          if (!Array.isArray(msgs)) continue;
          const existingMsgs = merged[contactId] || [];
          const existingIds = new Set(existingMsgs.map((m: any) => m.id));
          const newMsgs = msgs.filter((m: any) => !existingIds.has(m.id));
          merged[contactId] = [...existingMsgs, ...newMsgs];
        }
        return merged;
      });
    }
    if (data.favorites) {
      params.setFavorites((prev: any[]) => {
        const existingIds = new Set(prev.map((f: any) => f.id));
        const newFavs = data.favorites.filter((f: any) => !existingIds.has(f.id));
        return [...prev, ...newFavs];
      });
    }
    if (data.moments) {
      params.setMoments((prev: any[]) => {
        const existingIds = new Set(prev.map((m: any) => m.id));
        const newMoments = data.moments.filter((m: any) => !existingIds.has(m.id));
        return [...prev, ...newMoments];
      });
    }
    if (data.worldBooks) {
      const normalizedWorldBooks = normalizeImportedWorldBooks(data.worldBooks);
      params.setWorldBooks((prev: any[]) => {
        const existingIds = new Set(prev.map((w: any) => w.id));
        const newBooks = normalizedWorldBooks.filter((w: any) => !existingIds.has(w.id));
        return [...prev, ...newBooks];
      });
    }
    if (data.masks) {
      params.setMasks((prev: any[]) => {
        const existingIds = new Set(prev.map((m: any) => m.id));
        const newMasks = data.masks.filter((m: any) => !existingIds.has(m.id));
        return [...prev, ...newMasks];
      });
    }
    if (Array.isArray(data.htmlTemplates)) {
      params.setHtmlTemplates?.((prev: any[]) => {
        const existingIds = new Set(prev.map((t: any) => t.id));
        const newTemplates = data.htmlTemplates.filter((t: any) => !existingIds.has(t.id));
        return [...prev, ...newTemplates];
      });
    }
    if (Array.isArray(data.bubbleTemplates)) {
      params.setBubbleTemplates?.((prev: any[]) => {
        const existingIds = new Set(prev.map((t: any) => t.id));
        const newTemplates = data.bubbleTemplates.filter((t: any) => !existingIds.has(t.id));
        return [...prev, ...newTemplates];
      });
    }
    if (Array.isArray(data.forums)) {
      params.setForums((prev: any[]) => {
        const existingIds = new Set(prev.map((f: any) => f.id));
        const newForums = data.forums.filter((f: any) => !existingIds.has(f.id));
        return [...prev, ...newForums];
      });
    }
  } else {
    if (filteredContacts) {
      if (isPartialContactsExportPayload(data)) {
        params.setContacts((prev: any[]) => params.mergeBuiltInContacts(upsertById(prev, filteredContacts)));
      } else {
        params.setContacts(params.mergeBuiltInContacts(filteredContacts));
      }
    }
    if (data.user) {
      params.setUser(data.user);
      params.setWalletBalance(Number.isFinite(data.user?.balance) ? Number(data.user?.balance) : 0);
    }
    if (data.messages) {
      const normalizedMessages = params.normalizeLegacyMessages(data.messages, filteredContacts || INITIAL_CONTACTS);
      if (isPartialContactsExportPayload(data)) {
        params.setMessages((prev: Record<string, any[]>) => ({
          ...(prev || {}),
          ...(normalizedMessages || {})
        }));
      } else {
        params.setMessages(normalizedMessages);
      }
    }
    if (data.favorites) params.setFavorites(data.favorites);
    if (data.moments) params.setMoments(data.moments);
    if (data.settings) params.setSettings(params.normalizeAppearanceSettings(data.settings));
    if (data.aiSettings) params.setAiSettings(params.normalizeAiSettings(data.aiSettings));
    if (data.worldBooks) {
      const normalizedWorldBooks = normalizeImportedWorldBooks(data.worldBooks);
      if (isPartialWorldBooksExportPayload(data)) {
        params.setWorldBooks((prev: any[]) => upsertById(prev, normalizedWorldBooks));
      } else {
        params.setWorldBooks(normalizedWorldBooks);
      }
    }
    if (data.masks) params.setMasks(data.masks);
    if (Array.isArray(data.htmlTemplates)) {
      if (isPartialTemplatePayload(data)) {
        params.setHtmlTemplates?.((prev: any[]) => upsertById(prev, data.htmlTemplates));
      } else {
        params.setHtmlTemplates?.(data.htmlTemplates);
      }
    }
    if (Array.isArray(data.bubbleTemplates)) {
      if (isPartialTemplatePayload(data)) {
        params.setBubbleTemplates?.((prev: any[]) => upsertById(prev, data.bubbleTemplates));
      } else {
        params.setBubbleTemplates?.(data.bubbleTemplates);
      }
    }
    if (Array.isArray(data.forums)) params.setForums(data.forums);
    if (Object.prototype.hasOwnProperty.call(data, 'soundVibrationSettings')) {
      params.setSoundVibrationSettings(params.normalizeSoundVibrationSettings(data.soundVibrationSettings));
    }
  }
};

const applyRestoreExtensionData = (params: any, data: any, filteredContacts: any[] | null, mode: RestoreMode) => {
  if (mode === 'merge') {
    if (data.contactMemories && typeof data.contactMemories === 'object') {
      params.setContactMemories((prev: any) => ({ ...prev, ...data.contactMemories }));
    }
    if (Array.isArray(data.inboxLetters)) {
      params.setInboxLetters((prev: any[]) => {
        const existingIds = new Set(prev.map((l: any) => l.id));
        const newLetters = data.inboxLetters.filter((l: any) => !existingIds.has(l.id));
        return [...prev, ...newLetters];
      });
    }
    if (Array.isArray(data.sentLetters)) {
      params.setSentLetters((prev: any[]) => {
        const existingIds = new Set(prev.map((l: any) => l.id));
        const newLetters = data.sentLetters.filter((l: any) => !existingIds.has(l.id));
        return [...prev, ...newLetters];
      });
    }
    if (Array.isArray(data.friendRequests)) {
      params.setFriendRequests((prev: any[]) => {
        const filtered = data.friendRequests.filter((request: any) => !params.shouldSkipImportedContact(request.contact));
        const existingIds = new Set(prev.map((r: any) => r.id || r.contact?.id));
        const newRequests = filtered.filter((r: any) => !existingIds.has(r.id || r.contact?.id));
        return [...prev, ...newRequests];
      });
    }
    if (data.officialArticles) {
      params.setOfficialArticles((prev: any[]) => {
        const existingIds = new Set(prev.map((a: any) => a.id));
        const newArticles = data.officialArticles.filter((a: any) => !existingIds.has(a.id));
        return [...prev, ...newArticles];
      });
    }
    return;
  }
  if (data.selectedContacts) {
    const validIds = new Set((filteredContacts || []).map((contact: any) => contact.id));
    (window as any).selectedContacts = Array.isArray(data.selectedContacts)
      ? data.selectedContacts.filter((id: any) => validIds.has(String(id || '')))
      : [];
  }
  if (data.currentArticle) (window as any).currentArticle = data.currentArticle;
  if (data.contactMemories && typeof data.contactMemories === 'object') params.setContactMemories(data.contactMemories);
  if (data.officialArticles) params.setOfficialArticles(data.officialArticles);
  if (Array.isArray(data.friendRequests)) {
    params.setFriendRequests(data.friendRequests.filter((request: any) => !params.shouldSkipImportedContact(request.contact)));
  }
  if (Number.isFinite(Number(data.discoverUnreadCount))) params.setDiscoverUnreadCount(Number(data.discoverUnreadCount));
  if (Array.isArray(data.inboxLetters)) params.setInboxLetters(data.inboxLetters);
  if (Array.isArray(data.sentLetters)) params.setSentLetters(data.sentLetters);
  if (data.mailboxTheme && typeof data.mailboxTheme === 'object') {
    params.setMailboxTheme((prev: any) => ({ ...prev, ...(data.mailboxTheme as any) }));
  }
};

const normalizeAnonymousUnfinishedSession = (unfinished: any) => {
  if (!unfinished || typeof unfinished !== 'object' || !unfinished.partner) return null;
  return {
    partner: unfinished.partner,
    messages: Array.isArray(unfinished.messages) ? unfinished.messages : [],
    startedAt: Number(unfinished.startedAt || Date.now())
  };
};

const applyRestoreAnonymousData = (params: any, data: any, mode: RestoreMode) => {
  const hasSettings = Object.prototype.hasOwnProperty.call(data, 'anonymousChatSettings');
  const hasHistory = Object.prototype.hasOwnProperty.call(data, 'anonymousChatHistory');
  const hasUnfinishedFlag = Object.prototype.hasOwnProperty.call(data, 'anonymousHasUnfinishedSession');
  const hasUnfinishedSession = Object.prototype.hasOwnProperty.call(data, 'anonymousUnfinishedSession');
  const normalized = normalizeAnonymousSettings(data.anonymousChatSettings);
  if (hasSettings && normalized && mode === 'overwrite') params.setAnonymousChatSettings(normalized);
  const normalizedHistory = normalizeAnonymousHistory(data.anonymousChatHistory);
  if (hasHistory && (normalizedHistory.length > 0 || (mode === 'overwrite' && Array.isArray(data.anonymousChatHistory)))) {
    if (mode === 'merge') {
      params.setAnonymousHistory((prev: any[]) => {
        const existing = Array.isArray(prev) ? prev : [];
        const existingIds = new Set(existing.map((item: any) => String(item?.id || '')));
        const incoming = normalizedHistory.filter((item: any) => !existingIds.has(String(item?.id || '')));
        return [...incoming, ...existing].slice(0, 30);
      });
    } else {
      params.setAnonymousHistory(normalizedHistory);
    }
  }
  const normalizedUnfinished = normalizeAnonymousUnfinishedSession(data.anonymousUnfinishedSession);
  if (mode === 'merge') {
    if (data.anonymousHasUnfinishedSession && normalizedUnfinished) {
      params.setAnonymousHasUnfinishedSession(true);
      params.setAnonymousUnfinishedSession(normalizedUnfinished);
    }
    return;
  }
  if (hasUnfinishedFlag) {
    params.setAnonymousHasUnfinishedSession(Boolean(data.anonymousHasUnfinishedSession));
  }
  if (hasUnfinishedSession) {
    params.setAnonymousUnfinishedSession(normalizedUnfinished);
    if (!hasUnfinishedFlag) {
      params.setAnonymousHasUnfinishedSession(Boolean(normalizedUnfinished));
    }
  } else if (hasUnfinishedFlag && !data.anonymousHasUnfinishedSession) {
    params.setAnonymousUnfinishedSession(null);
  }
};

const applyRestoreDivinationData = (params: any, data: any, mode: RestoreMode) => {
  if (!Object.prototype.hasOwnProperty.call(data, 'divinationHistory')) return;
  const normalized = normalizeDivinationHistory(data.divinationHistory);
  if (mode === 'merge') {
    params.setDivinationHistory((prev: any[]) => normalizeDivinationHistory([...(normalized || []), ...(prev || [])]));
    return;
  }
  params.setDivinationHistory(normalized);
};

const applyRestoreTruthOrDareData = (data: any, mode: RestoreMode) => {
  applyTruthOrDarePersistedState(data, mode === 'merge' ? 'merge' : 'overwrite');
};

const applyRestoreImageLibraryData = (data: any, mode: RestoreMode) => {
  applyImageLibraryPersistedState(data, mode === 'merge' ? 'merge' : 'overwrite');
};

const applyRestoreNovelData = (data: any, mode: RestoreMode) => {
  applyNovelPersistedState(data, mode === 'merge' ? 'merge' : 'overwrite');
};

const applyRestoreAiProviderData = (data: any, mode: RestoreMode) => {
  applyAiProviderPersistedState(data, mode === 'merge' ? 'merge' : 'overwrite');
};

export const runRestoreFlow = async (params: any, file: File, mode: RestoreMode = 'overwrite'): Promise<void> => {
  if (isFileTooLarge(file)) {
    params.showToast('文件过大，请选择小于 500MB 的备份文件');
    return;
  }
  let isCancelled = false;
  try {
    params.setProgressDialog({
      title: '恢复数据',
      message: '正在读取文件...',
      progress: undefined,
      cancellable: true,
      onCancel: () => {
        isCancelled = true;
        params.setProgressDialog(null);
        params.showToast('恢复已取消');
      }
    });
    const result = await params.importBackupFile(file, (status: string, progress: number) => {
      if (isCancelled) return;
      params.setProgressDialog((prev: any) => (prev ? { ...prev, message: status, progress } : null));
    });
    if (isCancelled) return;
    if (!result.success || !result.data) {
      params.setProgressDialog(null);
      params.showToast(result.error || '导入失败');
      return;
    }
    const unwrapped = params.unwrapImportedBackupData(result.data);
    const emojiExport = extractEmojiExport(unwrapped);
    if (emojiExport && result.format === 'zip' && mode !== 'desktop-only') {
      params.setProgressDialog((prev: any) => (prev ? { ...prev, message: '正在恢复表情分组数据...' } : null));
      applyEmojiExportRestore(emojiExport, mode);
      params.setProgressDialog(null);
      params.showToast(`${mode === 'merge' ? '增量' : '全量'}恢复表情数据完成`);
      return;
    }
    const data = params.adaptLegacyBackupData(unwrapped);
    const desktopSettings = extractDesktopSettingsRestoreData(data) || extractDesktopSettingsRestoreData(unwrapped);
    const isDesktopSettingsExport = isDesktopSettingsExportPayload(unwrapped) || isDesktopSettingsExportPayload(data);
    if (mode === 'desktop-only' || isDesktopSettingsExport) {
      if (!desktopSettings) {
        params.setProgressDialog(null);
        params.showToast('导入文件中没有可恢复的桌面设置');
        return;
      }
      params.setProgressDialog((prev: any) => (prev ? { ...prev, message: '正在恢复桌面设置...' } : null));
      params.setSettings((prev: any) => mergeDesktopAppearanceSettings(prev, desktopSettings));
      params.setProgressDialog(null);
      params.showToast(mode === 'desktop-only' ? '仅恢复桌面设置完成' : '桌面设置导入完成');
      return;
    }
    if (params.scoreSnapshotShape(data) === 0) {
      params.setProgressDialog(null);
      params.showToast('导入失败：备份结构无法识别，请确认使用叙说导出的备份文件');
      return;
    }
    params.setProgressDialog((prev: any) => (prev ? { ...prev, message: `正在处理${result.format === 'zip' ? 'ZIP' : 'JSON'}数据...` } : null));
    await new Promise(resolve => setTimeout(resolve, 50));
    const normalizedContacts = data.contacts ? params.normalizeLegacyContacts(data.contacts) : null;
    const filteredContacts = normalizedContacts ? normalizedContacts.filter((contact: any) => !params.shouldSkipImportedContact(contact)) : null;
    applyRestorePayload(params, data, filteredContacts, mode);
    applyRestoreExtensionData(params, data, filteredContacts, mode);
    await applyEmojiPersistedState(data, mode === 'merge' ? 'merge' : 'overwrite');
    applyRestoreDivinationData(params, data, mode);
    applyRestoreTruthOrDareData(data, mode);
    applyRestoreImageLibraryData(data, mode);
    applyRestoreNovelData(data, mode);
    applyRestoreAiProviderData(data, mode);
  if (mode === 'overwrite') {
      if (
        Object.prototype.hasOwnProperty.call(data, 'anonymousChatSettings')
        || Object.prototype.hasOwnProperty.call(data, 'anonymousChatHistory')
        || Object.prototype.hasOwnProperty.call(data, 'anonymousHasUnfinishedSession')
        || Object.prototype.hasOwnProperty.call(data, 'anonymousUnfinishedSession')
      ) {
        applyRestoreAnonymousData(params, data, mode);
      }
      if (Object.prototype.hasOwnProperty.call(data, 'hasAgreedTerms')) {
        params.setHasAgreedTerms(typeof data.hasAgreedTerms === 'boolean' ? Boolean(data.hasAgreedTerms) : true);
      }
      if (data.walletBank && typeof data.walletBank === 'object') {
        params.setWalletBank({ name: String(data.walletBank.name || '工商银行'), last4: String(data.walletBank.last4 || '4780') });
      }
      if (data.musicState && typeof data.musicState === 'object') {
        params.setMusicState((prev: any) => ({ ...prev, ...(data.musicState as any) }));
        persistPlaylistFromMusicState(data.musicState);
      }
    }
    if (mode === 'merge') {
      applyRestoreAnonymousData(params, data, mode);
    }
    params.setProgressDialog(null);
    params.showToast(`${mode === 'merge' ? '合并' : '恢复'}完成${result.format === 'zip' ? '（ZIP格式）' : ''}`);
  } catch (error: any) {
    params.setProgressDialog(null);
    console.error('restore failed:', error);
    params.showToast(buildRestoreErrorMessage(error));
  }
};
