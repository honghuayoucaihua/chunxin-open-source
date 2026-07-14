import { DEFAULT_EMOJI_GROUP_ID } from './emojiStore';
import { confirmWechatAction } from '../utils/wechatDialog';
import type { CustomEmoji } from './emojiState';

type EmojiManageFlowParams = {
  customEmojis: CustomEmoji[];
  hiddenEmojiIds: string[];
  selectedEmojiIds: string[];
  activeEmojiGroupId: string;
  setCustomEmojis: (next: CustomEmoji[]) => void;
  setHiddenEmojiIds: (next: string[]) => void;
  setSelectedEmojiIds: (next: string[]) => void;
  setIsManagingEmojis: (next: boolean) => void;
};

const clearEmojiManageState = (params: Pick<EmojiManageFlowParams, 'setSelectedEmojiIds' | 'setIsManagingEmojis'>) => {
  params.setSelectedEmojiIds([]);
  params.setIsManagingEmojis(false);
};

const removeCustomEmojis = (params: EmojiManageFlowParams) => {
  const selectedIds = new Set(params.selectedEmojiIds);
  const next = params.customEmojis.filter((item) => !selectedIds.has(item.id));
  params.setCustomEmojis(next);
  clearEmojiManageState(params);
};

const hideBuiltinEmojis = (params: EmojiManageFlowParams) => {
  const next = [...new Set([...params.hiddenEmojiIds, ...params.selectedEmojiIds])];
  params.setHiddenEmojiIds(next);
  clearEmojiManageState(params);
};

export const runBatchDeleteEmojis = (params: EmojiManageFlowParams): void => {
  if (!Array.isArray(params.selectedEmojiIds) || params.selectedEmojiIds.length === 0) return;
  const message = `确定删除选中的 ${params.selectedEmojiIds.length} 个表情？`;
  if (params.activeEmojiGroupId === DEFAULT_EMOJI_GROUP_ID) {
    confirmWechatAction(message, () => removeCustomEmojis(params));
    return;
  }
  confirmWechatAction(message, () => hideBuiltinEmojis(params));
};
