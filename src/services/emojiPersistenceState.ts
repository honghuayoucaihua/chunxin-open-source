import {
  loadCustomEmojisFromIDB,
  loadGroupEmojiMapFromIDB,
  normalizeCustomEmojis,
  normalizeEmojiGroups,
  normalizeGroupEmojiMap as normalizeGroupEmojiMapBase,
  persistGroupEmojiMap,
  saveCustomEmojisToIDB,
  type CustomEmoji,
  type GroupEmojiMap
} from '../chatroom/emojiState.ts';
import { isFullAppSnapshotPayload } from '../appStateNormalizeUtils.ts';
import {
  collectEmojiStoreStateFromWindow,
  collectEmojiUiStateFromLocalStorage,
  normalizeEmojiStoreState,
  persistEmojiUiStateToLocalStorage,
  syncAllEnabledEmojisFromState,
  syncEmojiStoreStateToWindow
} from '../chatroom/emojiStore.ts';
import type { EmojiGroup } from '../types/index.ts';

interface RestoredEmojiPersistedState {
  customEmojis?: unknown;
  emojiGroups?: unknown;
  groupEmojis?: unknown;
  hiddenEmojiIds?: unknown;
  customEmojiOrder?: unknown;
}

export type EmojiPersistRestoreMode = 'hydrate' | 'overwrite' | 'merge';

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const hasOwn = (value: object, key: keyof RestoredEmojiPersistedState): boolean => (
  Object.prototype.hasOwnProperty.call(value, key)
);

const normalizeRestoredState = (restored: unknown): RestoredEmojiPersistedState => (
  isRecord(restored) ? restored : {}
);

const normalizeRestoredEmojiGroups = (input: unknown): EmojiGroup[] => (
  Array.isArray(input) ? normalizeEmojiGroups(input as EmojiGroup[]) : []
);

const normalizeGroupEmojiMap = (input: unknown): GroupEmojiMap => {
  return normalizeGroupEmojiMapBase(input);
};

const mergeGroupEmojiMaps = (
  restored: GroupEmojiMap,
  stored: GroupEmojiMap
): GroupEmojiMap => {
  const merged: GroupEmojiMap = { ...stored };
  Object.entries(restored).forEach(([groupId, list]) => {
    if (Array.isArray(list) && list.length > 0) {
      merged[groupId] = list;
      return;
    }
    if (!(groupId in merged)) {
      merged[groupId] = Array.isArray(list) ? list : [];
    }
  });
  return merged;
};

const mergeCustomEmojis = (
  stored: CustomEmoji[],
  restored: CustomEmoji[]
): CustomEmoji[] => {
  const merged = [...stored];
  const existingKeys = new Set(stored.map((item) => String(item.url || item.id || '')));
  restored.forEach((item) => {
    const key = String(item.url || item.id || '');
    if (!key || existingKeys.has(key)) return;
    existingKeys.add(key);
    merged.push(item);
  });
  return merged;
};

const mergeEmojiGroups = (
  stored: EmojiGroup[],
  restored: EmojiGroup[]
): EmojiGroup[] => {
  const merged = new Map<string, EmojiGroup>();
  stored.forEach((group) => {
    const id = String(group?.id || '').trim();
    if (!id) return;
    merged.set(id, { ...group, id });
  });
  restored.forEach((group) => {
    const id = String(group?.id || '').trim();
    if (!id) return;
    merged.set(id, { ...group, id });
  });
  return Array.from(merged.values());
};

export interface EmojiPersistedState {
  customEmojis: CustomEmoji[];
  emojiGroups: EmojiGroup[];
  groupEmojis: GroupEmojiMap;
  hiddenEmojiIds: string[];
  customEmojiOrder: string[];
}

export const collectEmojiPersistedState = (): EmojiPersistedState => ({
  ...(() => {
    const state = collectEmojiStoreStateFromWindow();
    return {
      customEmojis: state.customEmojis,
      emojiGroups: state.emojiGroups,
      groupEmojis: state.groupEmojis,
      hiddenEmojiIds: state.hiddenEmojiIds,
      customEmojiOrder: state.customEmojiOrder
    };
  })()
});

export const applyEmojiPersistedState = async (
  restored: unknown,
  mode: EmojiPersistRestoreMode = 'hydrate'
): Promise<void> => {
  const restoredState = normalizeRestoredState(restored);
  const isFullSnapshot = mode !== 'merge' && isFullAppSnapshotPayload(restored);
  const hasCustomEmojis = hasOwn(restoredState, 'customEmojis');
  const hasEmojiGroups = hasOwn(restoredState, 'emojiGroups');
  const hasGroupEmojis = hasOwn(restoredState, 'groupEmojis');
  const hasHiddenEmojiIds = hasOwn(restoredState, 'hiddenEmojiIds');
  const hasCustomEmojiOrder = hasOwn(restoredState, 'customEmojiOrder');
  const currentState = collectEmojiStoreStateFromWindow();
  const storedUiState = collectEmojiUiStateFromLocalStorage();
  const [idbCustomEmojis, idbGroupEmojis] = await Promise.all([
    loadCustomEmojisFromIDB(),
    loadGroupEmojiMapFromIDB()
  ]);
  const baseState = normalizeEmojiStoreState({
    ...currentState,
    customEmojis: currentState.customEmojis.length > 0 ? currentState.customEmojis : idbCustomEmojis,
    emojiGroups: currentState.emojiGroups.length > 0 ? currentState.emojiGroups : storedUiState.emojiGroups,
    groupEmojis: Object.keys(currentState.groupEmojis || {}).length > 0 ? currentState.groupEmojis : idbGroupEmojis,
    hiddenEmojiIds: currentState.hiddenEmojiIds.length > 0 ? currentState.hiddenEmojiIds : storedUiState.hiddenEmojiIds,
    customEmojiOrder: currentState.customEmojiOrder.length > 0 ? currentState.customEmojiOrder : storedUiState.customEmojiOrder
  });
  const restoredCustomEmojis = normalizeCustomEmojis(
    Array.isArray(restoredState.customEmojis) ? restoredState.customEmojis : []
  );
  const restoredEmojiGroups = normalizeRestoredEmojiGroups(restoredState.emojiGroups);
  const restoredGroupEmojis = normalizeGroupEmojiMap(restoredState.groupEmojis);
  const nextCustomEmojis = mode === 'merge'
    ? (hasCustomEmojis ? mergeCustomEmojis(baseState.customEmojis, restoredCustomEmojis) : baseState.customEmojis)
    : hasCustomEmojis
      ? restoredCustomEmojis
      : (isFullSnapshot ? [] : baseState.customEmojis);
  const nextEmojiGroups = mode === 'merge'
    ? (hasEmojiGroups ? mergeEmojiGroups(baseState.emojiGroups, restoredEmojiGroups) : baseState.emojiGroups)
    : (
      mode === 'hydrate' && !isFullSnapshot && hasEmojiGroups && restoredEmojiGroups.length === 0
        ? baseState.emojiGroups
        : hasEmojiGroups
          ? restoredEmojiGroups
          : (isFullSnapshot ? [] : baseState.emojiGroups)
    );
  const nextGroupEmojis = mode === 'merge'
    ? (hasGroupEmojis ? mergeGroupEmojiMaps(restoredGroupEmojis, baseState.groupEmojis) : baseState.groupEmojis)
    : (
      mode === 'hydrate' && !isFullSnapshot
        ? (hasGroupEmojis ? mergeGroupEmojiMaps(restoredGroupEmojis, baseState.groupEmojis) : baseState.groupEmojis)
        : hasGroupEmojis
          ? restoredGroupEmojis
          : (isFullSnapshot ? {} : baseState.groupEmojis)
    );
  const nextState = normalizeEmojiStoreState({
    ...baseState,
    customEmojis: nextCustomEmojis,
    emojiGroups: nextEmojiGroups,
    groupEmojis: nextGroupEmojis,
    hiddenEmojiIds: Array.isArray(restoredState.hiddenEmojiIds)
      ? restoredState.hiddenEmojiIds
      : (isFullSnapshot ? [] : baseState.hiddenEmojiIds),
    customEmojiOrder: Array.isArray(restoredState.customEmojiOrder)
      ? restoredState.customEmojiOrder
      : (isFullSnapshot ? [] : baseState.customEmojiOrder)
  });

  syncEmojiStoreStateToWindow(nextState);
  syncAllEnabledEmojisFromState(nextState);
  persistEmojiUiStateToLocalStorage(nextState);
  if (mode === 'merge' ? hasCustomEmojis : (hasCustomEmojis || isFullSnapshot)) {
    await saveCustomEmojisToIDB(nextState.customEmojis);
  }
  await persistGroupEmojiMap(nextState.groupEmojis);
};
