import type { EmojiGroup } from '../types/index.ts';

export const EMOJI_GROUPS_STORAGE_KEY = 'xushuo_emoji_groups';
export const HIDDEN_EMOJI_IDS_STORAGE_KEY = 'xushuo_hidden_emoji_ids';
export const CUSTOM_EMOJI_ORDER_STORAGE_KEY = 'xushuo_custom_emoji_order';

const readStoredJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
};

export const collectEmojiUiStateFromLocalStorage = (): {
  emojiGroups: EmojiGroup[];
  hiddenEmojiIds: string[];
  customEmojiOrder: string[];
} => ({
  emojiGroups: readStoredJson(EMOJI_GROUPS_STORAGE_KEY, [] as EmojiGroup[]),
  hiddenEmojiIds: readStoredJson(HIDDEN_EMOJI_IDS_STORAGE_KEY, [] as string[]),
  customEmojiOrder: readStoredJson(CUSTOM_EMOJI_ORDER_STORAGE_KEY, [] as string[])
});

export const persistEmojiUiStateToLocalStorage = (state: {
  emojiGroups: EmojiGroup[];
  hiddenEmojiIds: string[];
  customEmojiOrder: string[];
}): void => {
  try {
    localStorage.setItem(EMOJI_GROUPS_STORAGE_KEY, JSON.stringify(state.emojiGroups));
    localStorage.setItem(HIDDEN_EMOJI_IDS_STORAGE_KEY, JSON.stringify(state.hiddenEmojiIds));
    localStorage.setItem(CUSTOM_EMOJI_ORDER_STORAGE_KEY, JSON.stringify(state.customEmojiOrder));
  } catch (error) {
    console.warn('[Emoji] Failed to persist emoji ui state:', error);
  }
};
