import { getGeminiChatReply } from '../services/geminiServiceLoader';
import { extractStrictJsonObjectLazy } from '../utils/chatParserLoader';
import {
  buildChatReplySuggestionHistory,
  buildChatReplySuggestionInstruction,
  buildChatReplySuggestionPrompt,
  buildChatReplySuggestionRuntimePrompt,
  parseReplySuggestions
} from './chatReplySuggestionFlow';
import { buildContactPersonaSummary, buildUserPersonaSummary } from '../services/personaSummary';

export const runGenerateChatReplies = async (params: any): Promise<string[]> => {
  if (!params.selectedContactId || !params.currentChat || !params.currentChat.isAi) return [];
  const contextLimit = params.resolveContextLimit(params.currentChat);
  const chatHistory = buildChatReplySuggestionHistory(
    (params.messages[params.selectedContactId] || []).slice(-contextLimit),
    params.currentChat,
    params.user,
    params.aiSettings
  );
  const isStoryChat = params.currentChat.chatMode === 'story';
  const myPersona = buildUserPersonaSummary(params.user) || params.user.description || params.user.personalityTraits || '';
  const contactPersona = buildContactPersonaSummary(params.currentChat) || params.currentChat.personality || params.currentChat.description || '';
  const myName = params.user.name?.trim() || '';
  const contactName = params.currentChat.remark?.trim() || params.currentChat.name?.trim() || '';
  const instruction = buildChatReplySuggestionInstruction({ isStoryChat, myName, contactName, myPersona, contactPersona });
  const memoryPrompt = params.getContactMemoryPrompt(
    params.contactMemories,
    params.currentChat.id,
    10,
    params.currentChat.remark?.trim() || params.currentChat.name
  );
  const runtimeUserPrompt = buildChatReplySuggestionRuntimePrompt({
    runtimeUserPromptBase: params.runtimeUserPromptBase,
    memoryPrompt,
    user: params.user,
    contact: params.currentChat,
    masks: params.masks
  });
  const raw = await getGeminiChatReply(
    [{ role: 'user', text: buildChatReplySuggestionPrompt(chatHistory, isStoryChat) }],
    instruction,
    params.aiSettings,
    runtimeUserPrompt
  );
  const parsed = await extractStrictJsonObjectLazy(raw || '');
  const list = parseReplySuggestions(parsed);
  if (list.length > 0) return list;
  throw new Error('AI 未返回有效 suggestions');
};
