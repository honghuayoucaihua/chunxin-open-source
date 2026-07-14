import { getContactMemoryPrompt } from '../../services/contactMemoryService';
import { buildImageLibraryPromptForContact } from '../../services/imageLibraryPrompt';
import { buildRuntimeUserPersonaPrompt } from '../../services/personaSummary';
import { buildChatSystemPromptLazy } from '../../utils/promptLoader';
import { resolveContactForAI, resolveHtmlTemplateForAI, resolveWorldBookForAI } from '../../utils/encryptedReadModel';
import {
  formatMessageForPolicyHistory,
  getChatModePolicy,
  shouldIncludeTranslationForContact
} from './chatModePolicy';
import { buildBeijingTimeAwarenessPrompt } from './modelHistoryFormat';
import { buildEnabledEmojiPromptText } from '../../chatroom/emojiStore';
import { buildTruthOrDareRuntimePrompt, buildTruthOrDareSystemPrompt, getTruthOrDareState } from '../../app/sendMessage/truthOrDareRuntimePrompt';
import { buildStoryRuntimeContextPrompt } from './storyRuntimeContext';
import type { Contact, Message, Mask, UserProfile, WorldBook, ContactMemories, AISettings, ChatMode } from '../../types';
import type { HtmlTemplate } from '../../types/htmlTemplate';

type SingleReplyHistoryItem = { role: 'user' | 'model'; text: string; imageUrl?: string };

type BuildSingleReplyRequestOptions = {
  contact: Contact;
  historyMessages: Message[];
  contactMemories: ContactMemories;
  worldBooks: WorldBook[];
  masks: Mask[];
  user: UserProfile;
  aiSettings: AISettings;
  extraSystemPrompt?: string;
  internalRuntimePrompt?: string;
  htmlTemplates?: HtmlTemplate[];
  includeHistoryTimestamp?: boolean;
  includeRuntimeTimeAwareness?: boolean;
  includeTruthOrDareRuntime?: boolean;
};

type BuildSingleReplyHistoryOptions = Pick<
  BuildSingleReplyRequestOptions,
  'contact' | 'historyMessages' | 'aiSettings'
> & {
  includeTimestamp?: boolean;
};

export type SingleReplyRequestContext = {
  history: SingleReplyHistoryItem[];
  systemPrompt: string;
  runtimeUserPrompt: string;
  effectiveChatMode: ChatMode;
  modePolicy: ReturnType<typeof getChatModePolicy>;
  truthOrDareState: ReturnType<typeof getTruthOrDareState>;
  aiContact: ReturnType<typeof resolveContactForAI>;
};

export const buildSingleReplyHistory = (
  options: BuildSingleReplyHistoryOptions
): SingleReplyHistoryItem[] => {
  const modePolicy = getChatModePolicy(options.contact);
  const includeTimestamp = options.includeTimestamp ?? (options.aiSettings?.enableTimeAwareness === true);
  const includeContactTranslation = shouldIncludeTranslationForContact(options.contact);
  return options.historyMessages
    .map((item) => {
      const role = item.senderId === 'me' ? 'user' as const : 'model' as const;
      const includeTranslation = role === 'model' && includeContactTranslation;
      const mapped = formatMessageForPolicyHistory(item, modePolicy, { includeTimestamp, includeTranslation });
      if (!mapped) return null;
      const useVisionImage = role === 'user'
        && options.aiSettings?.provider !== 'builtin'
        && !!options.aiSettings?.customModelSupportsImageRecognition
        && !!mapped.imageUrl;
      return {
        role,
        text: mapped.text,
        imageUrl: useVisionImage ? mapped.imageUrl : undefined
      };
    })
    .filter(Boolean) as SingleReplyHistoryItem[];
};

export const buildSingleReplyRequestContext = async (
  options: BuildSingleReplyRequestOptions
): Promise<SingleReplyRequestContext> => {
  const modePolicy = getChatModePolicy(options.contact);
  const effectiveChatMode = modePolicy.mode;
  const includeTimestamp = options.includeHistoryTimestamp ?? (options.aiSettings?.enableTimeAwareness === true);
  const includeRuntimeTimeAwareness = options.includeRuntimeTimeAwareness ?? includeTimestamp;
  const history = buildSingleReplyHistory({
    contact: options.contact,
    historyMessages: options.historyMessages,
    aiSettings: options.aiSettings,
    includeTimestamp
  });
  const truthOrDareState = getTruthOrDareState(options.historyMessages);
  const aiContact = resolveContactForAI(options.contact);
  const aiWorldBooks = Array.isArray(options.worldBooks)
    ? options.worldBooks.map((book) => resolveWorldBookForAI(book))
    : [];
  const aiHtmlTemplates = Array.isArray(options.htmlTemplates)
    ? options.htmlTemplates.map((tpl) => resolveHtmlTemplateForAI(tpl))
    : [];
  const imageLibraryPrompt = buildImageLibraryPromptForContact(aiContact);
  const selectedMask = aiContact.selectedMaskId
    ? options.masks.find((mask) => mask.id === aiContact.selectedMaskId) || null
    : null;
  const userInfoPrompt = buildRuntimeUserPersonaPrompt(options.user, {
    selectedMask,
    contactUserPersona: aiContact.userPersona
  });
  const enableImagePrompt = Boolean(imageLibraryPrompt.trim());
  const mergedExtraSystemPrompt = [options.extraSystemPrompt, imageLibraryPrompt].filter(Boolean).join('\n\n');
  const emojiList = buildEnabledEmojiPromptText();
  const defaultSystemPrompt = await buildChatSystemPromptLazy({
    scene: 'single',
    contact: aiContact,
    emojiList,
    worldBooks: aiWorldBooks,
    masks: options.masks,
    user: options.user,
    htmlTemplates: aiHtmlTemplates,
    extraSystemPrompt: mergedExtraSystemPrompt,
    aiSettings: options.aiSettings,
    enableImagePrompt
  });
  const systemPrompt = truthOrDareState.active
    ? buildTruthOrDareSystemPrompt({
        baseSystemPrompt: defaultSystemPrompt,
        contactName: aiContact.remark?.trim() || aiContact.name,
        userName: options.user.name?.trim() || '',
        chatMode: effectiveChatMode,
        persona: aiContact.persona || aiContact.personality || aiContact.description || '',
        descriptionFeatureEnabled: modePolicy.descriptionFeatureEnabled,
        descriptionSayEnabled: modePolicy.descriptionSayEnabled,
        descriptionDoEnabled: modePolicy.descriptionDoEnabled,
        extraSystemPrompt: mergedExtraSystemPrompt
      })
    : defaultSystemPrompt;
  const memoryPrompt = getContactMemoryPrompt(
    options.contactMemories,
    options.contact.id,
    12,
    aiContact.remark?.trim() || aiContact.name
  );
  const timeAwarenessPrompt = buildBeijingTimeAwarenessPrompt(includeRuntimeTimeAwareness);
  const truthOrDareRuntimePrompt = options.includeTruthOrDareRuntime === false
    ? ''
    : buildTruthOrDareRuntimePrompt(options.historyMessages);
  const storyRuntimeContextPrompt = modePolicy.isStory
    ? buildStoryRuntimeContextPrompt(options.historyMessages, {
        userLabel: options.user.name?.trim() || '',
        contactNameById: {
          [aiContact.id]: aiContact.remark?.trim() || aiContact.name
        }
      })
    : '';
  const runtimeUserPrompt = [
    timeAwarenessPrompt,
    userInfoPrompt,
    memoryPrompt,
    truthOrDareRuntimePrompt,
    String(options.internalRuntimePrompt || '').trim(),
    storyRuntimeContextPrompt
  ].filter(Boolean).join('\n\n');

  return {
    history,
    systemPrompt,
    runtimeUserPrompt,
    effectiveChatMode,
    modePolicy,
    truthOrDareState,
    aiContact
  };
};
