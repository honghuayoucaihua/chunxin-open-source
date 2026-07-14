import type { EmojiGroup, EmojiItem } from '../types';
import { DEFAULT_EMOJI_GROUP_ID } from './emojiStore.ts';

type EmojiLike = {
  id: string;
  url: string;
  desc: string;
  groupId?: string;
};

export const buildEnabledEmojiList = (
  customEmojis: EmojiLike[],
  emojiGroups: EmojiGroup[],
  groupEmojis: Record<string, EmojiItem[]>,
  hiddenEmojiIds: string[] = []
): EmojiLike[] => {
  const allEmojis: EmojiLike[] = customEmojis.map((item) => ({
    ...item,
    groupId: String((item as EmojiLike).groupId || DEFAULT_EMOJI_GROUP_ID)
  }));
  const enabledGroupIds = new Set(emojiGroups.filter(group => group.enabled).map(group => group.id));
  const hiddenIdSet = new Set(hiddenEmojiIds.map((id) => String(id)));
  Object.entries(groupEmojis).forEach(([groupId, emojis]) => {
    if (groupId !== DEFAULT_EMOJI_GROUP_ID && enabledGroupIds.has(groupId)) {
      allEmojis.push(...emojis.filter((item) => !hiddenIdSet.has(String(item.id))));
    }
  });
  return allEmojis;
};

export const orderCustomEmojisByIds = (
  customEmojis: EmojiLike[],
  customEmojiOrder: string[]
): EmojiLike[] => {
  if (customEmojiOrder.length === 0) return customEmojis;
  const ordered = customEmojiOrder
    .map(id => customEmojis.find(item => item.id === id))
    .filter(Boolean) as EmojiLike[];
  const newlyAdded = customEmojis.filter(item => !customEmojiOrder.includes(item.id));
  return [...ordered, ...newlyAdded];
};

export const hasEmojiGroupConfigChanges = (
  prevGroups: EmojiGroup[],
  nextGroups: EmojiGroup[]
): boolean => {
  if (prevGroups.length !== nextGroups.length) return true;
  return nextGroups.some((group, index) => (
    group.id !== prevGroups[index]?.id || group.enabled !== prevGroups[index]?.enabled
  ));
};
