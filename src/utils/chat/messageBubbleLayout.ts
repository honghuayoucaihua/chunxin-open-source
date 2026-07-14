export type ResolveBottomMetaPaddingInput = {
  msgType: string;
  emojiOnly: boolean;
  textWithoutEmoji: string;
  hasHtmlTag: boolean;
  needsOutsideReadPadding: boolean;
  showBottomMetaRow: boolean;
  isRetroSkin: boolean;
};

export const shouldRenderChatMessageBubble = (
  input: Pick<ResolveBottomMetaPaddingInput, 'msgType' | 'emojiOnly' | 'textWithoutEmoji' | 'hasHtmlTag'>
): boolean => {
  if (input.emojiOnly) return false;
  if (input.msgType !== 'text') return true;
  return Boolean(input.textWithoutEmoji) || input.hasHtmlTag;
};

export const resolveChatMessageBottomMetaPadding = (input: ResolveBottomMetaPaddingInput): number => {
  const DEFAULT_BOTTOM_META_PADDING = 22;
  const COMPACT_BOTTOM_META_PADDING = 6;
  const bottomMetaPaddingValue = input.isRetroSkin ? COMPACT_BOTTOM_META_PADDING : DEFAULT_BOTTOM_META_PADDING;

  const shouldReserveBottomMetaSpace = input.msgType !== 'image' && shouldRenderChatMessageBubble({
    msgType: input.msgType,
    emojiOnly: input.emojiOnly,
    textWithoutEmoji: input.textWithoutEmoji,
    hasHtmlTag: input.hasHtmlTag
  });
  return shouldReserveBottomMetaSpace && (input.needsOutsideReadPadding || input.showBottomMetaRow) ? bottomMetaPaddingValue : 0;
};
