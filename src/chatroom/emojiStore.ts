import type { EmojiGroup, EmojiItem } from '../types/index.ts';
import type { CustomEmoji, GroupEmojiMap } from './emojiState.ts';
import { buildEnabledEmojiList } from './emojiCollectionUtils.ts';
import { buildEmojiToken } from './emojiToken.ts';
import {
  collectEmojiUiStateFromLocalStorage as collectEmojiUiStateFromLocalStorageBase,
  persistEmojiUiStateToLocalStorage as persistEmojiUiStateToLocalStorageBase
} from './emojiUiState.ts';

export const DEFAULT_EMOJI_GROUP_ID = 'custom';
export const DEFAULT_EMOJI_GROUP_NAME = '自定义';

export interface EmojiStoreState {
  customEmojis: CustomEmoji[];
  emojiGroups: EmojiGroup[];
  groupEmojis: GroupEmojiMap;
  hiddenEmojiIds: string[];
  customEmojiOrder: string[];
}

export interface EmojiGroupView {
  id: string;
  name: string;
  enabled: boolean;
  isBuiltIn: boolean;
  order: number;
  isDefault: boolean;
}

export interface EmojiPromptEntry {
  id: string;
  desc: string;
  groupId: string;
  groupName: string;
  token: string;
  isDefault: boolean;
}

export const normalizeEmojiStoreState = (input?: Partial<EmojiStoreState> | null): EmojiStoreState => {
  if (!input) {
    return {
      customEmojis: [],
      emojiGroups: [],
      groupEmojis: {},
      hiddenEmojiIds: [],
      customEmojiOrder: []
    };
  }
  return {
    customEmojis: Array.isArray(input.customEmojis) ? input.customEmojis : [],
    emojiGroups: Array.isArray(input.emojiGroups) ? input.emojiGroups : [],
    groupEmojis: input.groupEmojis && typeof input.groupEmojis === 'object' ? input.groupEmojis : {},
    hiddenEmojiIds: Array.isArray(input.hiddenEmojiIds) ? input.hiddenEmojiIds.map((id) => String(id)) : [],
    customEmojiOrder: Array.isArray(input.customEmojiOrder) ? input.customEmojiOrder.map((id) => String(id)) : []
  };
};

export const collectEmojiStoreStateFromWindow = (): EmojiStoreState => normalizeEmojiStoreState({
  customEmojis: Array.isArray((window as any).customEmojis) ? (window as any).customEmojis : [],
  emojiGroups: Array.isArray((window as any).emojiGroups) ? (window as any).emojiGroups : [],
  groupEmojis: ((window as any).allGroupEmojis && typeof (window as any).allGroupEmojis === 'object')
    ? (window as any).allGroupEmojis
    : {},
  hiddenEmojiIds: Array.isArray((window as any).hiddenEmojiIds) ? (window as any).hiddenEmojiIds : [],
  customEmojiOrder: Array.isArray((window as any).customEmojiOrder) ? (window as any).customEmojiOrder : []
});

export const collectEmojiUiStateFromLocalStorage = (): Pick<EmojiStoreState, 'emojiGroups' | 'hiddenEmojiIds' | 'customEmojiOrder'> => normalizeEmojiStoreState({
  ...collectEmojiUiStateFromLocalStorageBase()
});

export const collectEmojiBootstrapState = (): EmojiStoreState => {
  const runtimeState = collectEmojiStoreStateFromWindow();
  const storedUiState = collectEmojiUiStateFromLocalStorage();
  return normalizeEmojiStoreState({
    ...runtimeState,
    emojiGroups: runtimeState.emojiGroups.length > 0 ? runtimeState.emojiGroups : storedUiState.emojiGroups,
    hiddenEmojiIds: runtimeState.hiddenEmojiIds.length > 0 ? runtimeState.hiddenEmojiIds : storedUiState.hiddenEmojiIds,
    customEmojiOrder: runtimeState.customEmojiOrder.length > 0 ? runtimeState.customEmojiOrder : storedUiState.customEmojiOrder
  });
};

export const syncEmojiStoreStateToWindow = (state: EmojiStoreState): EmojiStoreState => {
  const normalized = normalizeEmojiStoreState(state);
  (window as any).customEmojis = normalized.customEmojis;
  (window as any).emojiGroups = normalized.emojiGroups;
  (window as any).allGroupEmojis = normalized.groupEmojis;
  (window as any).hiddenEmojiIds = normalized.hiddenEmojiIds;
  (window as any).customEmojiOrder = normalized.customEmojiOrder;
  Object.keys(window as any).forEach((key) => {
    if (key.startsWith('groupEmojis_')) {
      delete (window as any)[key];
    }
  });
  Object.entries(normalized.groupEmojis).forEach(([groupId, list]) => {
    (window as any)[`groupEmojis_${groupId}`] = list;
  });
  return normalized;
};

export const patchEmojiStoreState = (
  updater: Partial<EmojiStoreState> | ((prev: EmojiStoreState) => Partial<EmojiStoreState>)
): EmojiStoreState => {
  const prev = collectEmojiStoreStateFromWindow();
  const patch = typeof updater === 'function' ? updater(prev) : updater;
  return syncEmojiStoreStateToWindow({
    ...prev,
    ...patch
  });
};

export const patchEmojiRuntimeState = (
  updater: Partial<EmojiStoreState> | ((prev: EmojiStoreState) => Partial<EmojiStoreState>)
): EmojiStoreState => {
  const next = patchEmojiStoreState(updater);
  syncAllEnabledEmojisFromState(next);
  return next;
};

export const persistEmojiUiStateToLocalStorage = (
  state: Pick<EmojiStoreState, 'emojiGroups' | 'hiddenEmojiIds' | 'customEmojiOrder'>
): void => {
  persistEmojiUiStateToLocalStorageBase({
    emojiGroups: state.emojiGroups,
    hiddenEmojiIds: state.hiddenEmojiIds,
    customEmojiOrder: state.customEmojiOrder
  });
};

export const syncAllEnabledEmojisFromState = (
  state: Pick<EmojiStoreState, 'customEmojis' | 'emojiGroups' | 'groupEmojis' | 'hiddenEmojiIds'>
): Array<CustomEmoji | EmojiItem> => {
  const enabled = buildEnabledEmojiList(
    state.customEmojis,
    state.emojiGroups,
    state.groupEmojis,
    state.hiddenEmojiIds
  );
  (window as any).allEnabledEmojis = enabled;
  return enabled;
};

export const collectAllEnabledEmojis = (
  state?: Pick<EmojiStoreState, 'customEmojis' | 'emojiGroups' | 'groupEmojis' | 'hiddenEmojiIds'>
): Array<CustomEmoji | EmojiItem> => {
  const source = state ?? collectEmojiBootstrapState();
  return buildEnabledEmojiList(
    source.customEmojis,
    source.emojiGroups,
    source.groupEmojis,
    source.hiddenEmojiIds
  );
};

export const collectEnabledEmojiPromptEntries = (
  state?: Pick<EmojiStoreState, 'customEmojis' | 'emojiGroups' | 'groupEmojis' | 'hiddenEmojiIds'>
): EmojiPromptEntry[] => {
  const source = state ?? collectEmojiBootstrapState();
  const hiddenIdSet = new Set((source.hiddenEmojiIds || []).map((id) => String(id)));
  const entries: EmojiPromptEntry[] = (Array.isArray(source.customEmojis) ? source.customEmojis : [])
    .filter((item) => !hiddenIdSet.has(String(item.id)))
    .map((item) => ({
      id: String(item.id),
      desc: String(item.desc || '').trim(),
      groupId: DEFAULT_EMOJI_GROUP_ID,
      groupName: DEFAULT_EMOJI_GROUP_NAME,
      token: buildEmojiToken({ id: String(item.id), groupId: DEFAULT_EMOJI_GROUP_ID, desc: String(item.desc || '').trim() }),
      isDefault: true
    }))
    .filter((item) => item.id && item.desc);

  const enabledGroups = [...(Array.isArray(source.emojiGroups) ? source.emojiGroups : [])]
    .filter((group) => group.enabled !== false)
    .sort((left, right) => {
      const orderDiff = Number(left?.order || 0) - Number(right?.order || 0);
      if (orderDiff !== 0) return orderDiff;
      return String(left?.name || left?.id || '').localeCompare(String(right?.name || right?.id || ''), 'zh-CN');
    });

  enabledGroups.forEach((group) => {
    const list = Array.isArray(source.groupEmojis?.[group.id]) ? source.groupEmojis[group.id] : [];
    list
      .filter((item) => !hiddenIdSet.has(String(item.id)))
      .forEach((item) => {
        const desc = String(item?.desc || '').trim();
        const id = String(item?.id || '').trim();
        if (!id || !desc) return;
        entries.push({
          id,
          desc,
          groupId: String(group.id),
          groupName: String(group.name || group.id || '未命名分组'),
          token: buildEmojiToken({ id, groupId: String(group.id), desc }),
          isDefault: false
        });
      });
  });

  return entries;
};

export const buildEnabledEmojiPromptText = (
  state?: Pick<EmojiStoreState, 'customEmojis' | 'emojiGroups' | 'groupEmojis' | 'hiddenEmojiIds'>
): string => {
  const entries = collectEnabledEmojiPromptEntries(state);
  if (entries.length === 0) return '';

  const duplicateDescCount = new Map<string, number>();
  entries.forEach((entry) => {
    const key = String(entry.desc || '').trim().toLowerCase();
    duplicateDescCount.set(key, (duplicateDescCount.get(key) || 0) + 1);
  });

  const lines = [
    '只能使用下方给出的表情 token，输出时必须原样复制。',
    '不要自行编造 token，也不要只写 [emoji:描述]。',
    ...entries.map((entry) => {
      const key = String(entry.desc || '').trim().toLowerCase();
      const duplicateHint = (duplicateDescCount.get(key) || 0) > 1 ? '（同名，必须复制本行 token）' : '';
      return `- ${entry.groupName}：${entry.desc}${duplicateHint} -> ${entry.token}`;
    })
  ];

  return lines.join('\n');
};

export const buildEmojiGroupViews = (state: Pick<EmojiStoreState, 'emojiGroups'>): EmojiGroupView[] => {
  const customGroup: EmojiGroupView = {
    id: DEFAULT_EMOJI_GROUP_ID,
    name: DEFAULT_EMOJI_GROUP_NAME,
    enabled: true,
    isBuiltIn: true,
    order: -1,
    isDefault: true
  };
  const customGroups = state.emojiGroups.map((group) => ({
    id: String(group.id),
    name: String(group.name || group.id || '未命名分组'),
    enabled: group.enabled !== false,
    isBuiltIn: !!group.isBuiltIn,
    order: Number.isFinite(Number(group.order)) ? Number(group.order) : 0,
    isDefault: false
  }));
  return [customGroup, ...customGroups.sort((a, b) => a.order - b.order)];
};

export const getGroupEmojisForView = (
  groupId: string,
  state: Pick<EmojiStoreState, 'customEmojis' | 'groupEmojis' | 'hiddenEmojiIds'>
): Array<CustomEmoji | EmojiItem> => {
  if (groupId === DEFAULT_EMOJI_GROUP_ID) {
    return state.customEmojis;
  }
  const hiddenIdSet = new Set((state.hiddenEmojiIds || []).map((id) => String(id)));
  const list = Array.isArray(state.groupEmojis[groupId]) ? state.groupEmojis[groupId] : [];
  return list.filter((item) => !hiddenIdSet.has(String(item.id)));
};

export const buildEmojiExportTargets = (
  state: Pick<EmojiStoreState, 'customEmojis' | 'emojiGroups' | 'groupEmojis'>
): Array<{ id: string; name: string; count: number; isDefault: boolean }> => {
  const groupViews = buildEmojiGroupViews({ emojiGroups: state.emojiGroups });
  return groupViews.map((group) => ({
    id: group.isDefault ? DEFAULT_EMOJI_GROUP_ID : `group:${group.id}`,
    name: group.name,
    count: group.isDefault
      ? (Array.isArray(state.customEmojis) ? state.customEmojis.length : 0)
      : (Array.isArray(state.groupEmojis[group.id]) ? state.groupEmojis[group.id].length : 0),
    isDefault: group.isDefault
  }));
};
