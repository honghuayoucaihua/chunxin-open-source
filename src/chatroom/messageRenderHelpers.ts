import { useCallback } from 'react';
import type { Contact } from '../types';
import { formatChatMessageTime, resolveChatSenderName } from './chatRoomViewUtils';
import {
  getBubbleStyleBySettings,
  getEmojiOnlyToken,
  renderTextWithEmojiToken
} from './chatRoomMessageUtils';
import { resolveEmojiTokenValue } from './emojiToken';

export const useMessageRenderHelpers = (params: any) => {
  const resolveEmojiByToken = useCallback((tokenValue: string) => (
    resolveEmojiTokenValue(tokenValue, params.customEmojis, params.emojiGroups, params.groupEmojis)
  ), [params.customEmojis, params.emojiGroups, params.groupEmojis]);

  const renderTextWithEmoji = useCallback((content: string) => (
    renderTextWithEmojiToken(content, params.imageFallbackSrc, resolveEmojiByToken)
  ), [params.imageFallbackSrc, resolveEmojiByToken]);

  const getEmojiOnly = useCallback((content: string) => (
    getEmojiOnlyToken(content, resolveEmojiByToken)
  ), [resolveEmojiByToken]);

  const getBubbleStyle = useCallback((isMe: boolean, type: string) => (
    getBubbleStyleBySettings(params.settings, isMe, type)
  ), [params.settings]);

  const resolveSenderName = useCallback((senderId: string) => (
    resolveChatSenderName(senderId, params.meName || '我', params.contactById as Record<string, Contact>, params.contact)
  ), [params.meName, params.contactById, params.contact]);

  return {
    renderTextWithEmoji,
    getEmojiOnly,
    getBubbleStyle,
    resolveSenderName,
    formatMessageTime: formatChatMessageTime
  };
};
