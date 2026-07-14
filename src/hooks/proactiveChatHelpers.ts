import type {
  Contact,
  Message,
  AISettings,
  UserProfile,
  ContactMemories,
  Mask,
  WorldBook,
  ProactiveChatDraft
} from '../types';
import { getGeminiChatReply } from '../services/geminiServiceLoader';
import { parseAIReply } from '../utils/chatHelpers';
import {
  applyChatModePolicy,
  getChatModePolicy,
  shouldIncludeTranslationForContact
} from '../utils/chat/chatModePolicy';
import { getDraftContextKey, getValidDrafts } from './proactiveDraftContext';
import { withTypingContact } from '../utils/chat/replyLifecycle';
import { buildSingleReplyRequestContext } from '../utils/chat/singleReplyRequest';
import { getProactivePrimaryText, hasUnsupportedProactiveReplyShape } from './proactiveReplyText.ts';
import { normalizeProactiveReplyPayload, type ProactiveReplyPayload } from './proactiveReplyPayload.ts';
import {
  BACKGROUND_REMINDER_LEAD_MS,
  BACKGROUND_REMINDER_WINDOW_MS,
  MAX_BACKGROUND_REMINDERS,
  getLastUserMessageAt,
  getWindowMs,
  MAX_DRAFT_WARMUP_CONTACTS_PER_ROUND,
  MAX_PROACTIVE_TRIGGERS_PER_CHECK,
  PROACTIVE_DRAFT_BATCH_LIMIT,
  PROACTIVE_DRAFT_MAX_STOCK,
  PROACTIVE_DRAFT_TARGET_STOCK,
  PROACTIVE_DRAFT_TRIGGER_TEXT,
  PROACTIVE_DRAFT_TTL_MS,
  PROACTIVE_DRAFT_WARMUP_INTERVAL_MS,
  PROACTIVE_TEXT_ONLY_RUNTIME_GUARD,
  PROACTIVE_TRIGGER_TEXT
} from './proactiveChatConfig';

export {
  BACKGROUND_REMINDER_LEAD_MS,
  BACKGROUND_REMINDER_WINDOW_MS,
  MAX_BACKGROUND_REMINDERS,
  PROACTIVE_TRIGGER_TEXT,
  PROACTIVE_DRAFT_TRIGGER_TEXT,
  PROACTIVE_DRAFT_TTL_MS,
  PROACTIVE_DRAFT_TARGET_STOCK,
  PROACTIVE_DRAFT_MAX_STOCK,
  PROACTIVE_DRAFT_BATCH_LIMIT,
  PROACTIVE_DRAFT_WARMUP_INTERVAL_MS,
  MAX_DRAFT_WARMUP_CONTACTS_PER_ROUND,
  MAX_PROACTIVE_TRIGGERS_PER_CHECK,
  getWindowMs,
  getLastUserMessageAt
};

export interface BuildProactiveReplyOptions {
  contact: Contact;
  triggerText: string;
  useTypingIndicator: boolean;
  messages: Record<string, Message[]>;
  worldBooks: WorldBook[];
  masks: Mask[];
  user: UserProfile;
  aiSettings: AISettings;
  extraSystemPrompt: string;
  contactMemories: ContactMemories;
  resolveContextLimit: (contact?: Contact | null) => number;
  setTypingContactIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export const buildProactiveReply = async (options: BuildProactiveReplyOptions): Promise<ProactiveReplyPayload | null> => {
  const {
    contact, triggerText, useTypingIndicator,
    messages, worldBooks, masks, user, aiSettings,
    extraSystemPrompt, contactMemories,
    resolveContextLimit, setTypingContactIds
  } = options;

  const requestContext = await buildSingleReplyRequestContext({
    contact,
    historyMessages: (messages[contact.id] || []).slice(-resolveContextLimit(contact)),
    contactMemories,
    worldBooks,
    masks,
    user,
    aiSettings,
    extraSystemPrompt,
    includeTruthOrDareRuntime: false
  });
  const modePolicy = requestContext.modePolicy;
  const proactiveRuntimeUserPrompt = [
    requestContext.runtimeUserPrompt,
    PROACTIVE_TEXT_ONLY_RUNTIME_GUARD
  ].filter(Boolean).join('\n\n');

  let reply = '';
  try {
    reply = useTypingIndicator
      ? await withTypingContact(setTypingContactIds, contact.id, () => getGeminiChatReply(
          requestContext.history.concat({ role: 'user', text: triggerText }),
          requestContext.systemPrompt,
          aiSettings,
          proactiveRuntimeUserPrompt
        ))
      : await getGeminiChatReply(
          requestContext.history.concat({ role: 'user', text: triggerText }),
          requestContext.systemPrompt,
          aiSettings,
          proactiveRuntimeUserPrompt
        );
  } catch (apiError) {
    console.error('[ProactiveChat] AI API 调用失败:', apiError);
    return null;
  }

  const normalizedReply = (reply || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  if (hasUnsupportedProactiveReplyShape(
    normalizedReply,
    modePolicy,
    shouldIncludeTranslationForContact(contact)
  )) return null;

  const parsed = parseAIReply(
    normalizedReply,
    modePolicy.innerEnabled,
    modePolicy.actionEnabled,
    { allowSocial: !contact.isGroup, requireStructured: true, allowStoryTags: modePolicy.isStory }
  );
  if ((parsed.specials || []).length > 0) return null;
  const parsedPrimaryText = getProactivePrimaryText(parsed, modePolicy);
  const modeResult = applyChatModePolicy(parsedPrimaryText, contact, modePolicy, {
    innerVoice: parsed.innerVoice,
    actionDesc: parsed.actionDesc
  });
  const clippedReply = contact.replyLimit ? modeResult.content.slice(0, contact.replyLimit) : modeResult.content;
  if (!clippedReply.trim()) return null;

  return normalizeProactiveReplyPayload({
    text: clippedReply,
    innerVoice: modeResult.innerVoice,
    actionDesc: modeResult.actionDesc,
    translatedContentZhCN: parsed.translatedContentZhCN
  });
};
