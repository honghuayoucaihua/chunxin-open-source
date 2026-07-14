// Backward compatibility: re-export everything from the new modular structure
export { parseAIReply, extractFirstJsonObject, extractStrictJsonObject } from './chat/aiReplyParser.ts';
export type { AIQuote, AIOrderedSegment, AIDialogueTurn, AISpecial } from './chat/aiReplyParser.ts';

export { splitReplyToMessages } from './chat/messageSegmentation.ts';

export { applyChatMode } from './chat/chatModeProcessor.ts';
export {
  applyChatModePolicy,
  filterOrderedSegmentsForPolicy,
  formatMessageForPolicyHistory,
  getChatModePolicy,
  getMessageTextForPolicy,
  sanitizeReplyMetaForPolicy
} from './chat/chatModePolicy.ts';
export type { ChatModePolicy, OrderedReplySegment, ReplyMeta } from './chat/chatModePolicy.ts';

export { formatChatTime, getMessagePreview, getLastDisplayMessage } from './chat/messagePreview.ts';
export { syncContactPreviewFromMessages } from './chat/contactPreviewSync.ts';

export { createQuotedMessageSnapshot, getQuotePreviewText } from './chat/messageQuote.ts';
