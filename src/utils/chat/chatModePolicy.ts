import type { ChatMode, Message } from '../../types/message';
import type { Contact } from '../../types/contact';
import { clipActionDescForContact, clipInnerVoiceForContact } from './contactReplyLimits.ts';
import { resolveDescriptionComposerAvailability } from './descriptionComposerCapabilities.ts';
import { formatMessageForModelHistory, type ModelHistoryFormatOptions } from './modelHistoryFormat.ts';

type ContactModePolicyInput = Pick<Contact,
  'chatMode' | 'descriptionFeatureEnabled' | 'descriptionSayEnabled' | 'descriptionDoEnabled' | 'innerVoiceLimit' | 'actionDescLimit'
>;

type ContactTranslationPolicyInput = Pick<Contact, 'language' | 'translateToChinese'>;

export type ChatModePolicy = {
  mode: ChatMode;
  isStory: boolean;
  descriptionFeatureEnabled: boolean;
  descriptionSayEnabled: boolean;
  descriptionDoEnabled: boolean;
  innerEnabled: boolean;
  actionEnabled: boolean;
  narrationEnabled: boolean;
  historyMeta: NonNullable<ModelHistoryFormatOptions['allowedMeta']>;
};

export type ReplyMeta = {
  innerVoice?: string;
  actionDesc?: string;
};

export type OrderedReplySegment = {
  type: 'text' | 'inner' | 'action';
  value: string;
};

const resolveChatMode = (mode: Contact['chatMode'] | undefined): ChatMode => mode || 'online';

const getDefaultMetaFlagsByMode = (mode: ChatMode) => ({
  innerEnabled: mode === 'online-inner' || mode === 'offline-inner' || mode === 'story',
  actionEnabled: mode === 'offline' || mode === 'offline-inner' || mode === 'story'
});

export const getChatModePolicy = (contact: ContactModePolicyInput): ChatModePolicy => {
  const mode = resolveChatMode(contact.chatMode);
  const isStory = mode === 'story';
  const defaults = getDefaultMetaFlagsByMode(mode);
  const descriptionAvailability = resolveDescriptionComposerAvailability(contact);
  const descriptionFeatureEnabled = descriptionAvailability.featureEnabled;
  const descriptionSayEnabled = descriptionAvailability.sayEnabled;
  const descriptionDoEnabled = descriptionAvailability.doEnabled;
  const innerEnabled = defaults.innerEnabled;
  const actionEnabled = defaults.actionEnabled;
  const narrationEnabled = isStory;

  return {
    mode,
    isStory,
    descriptionFeatureEnabled,
    descriptionSayEnabled,
    descriptionDoEnabled,
    innerEnabled,
    actionEnabled,
    narrationEnabled,
    historyMeta: {
      inner: innerEnabled,
      action: actionEnabled,
      narration: narrationEnabled
    }
  };
};

export const sanitizeReplyMetaForPolicy = (
  contact: Pick<Contact, 'innerVoiceLimit' | 'actionDescLimit'>,
  policy: ChatModePolicy,
  meta: ReplyMeta
): ReplyMeta => ({
  innerVoice: policy.innerEnabled ? clipInnerVoiceForContact(contact, meta.innerVoice) : undefined,
  actionDesc: policy.actionEnabled ? clipActionDescForContact(contact, meta.actionDesc) : undefined
});

export const applyChatModePolicy = (
  text: string,
  contact: Pick<Contact, 'innerVoiceLimit' | 'actionDescLimit'>,
  policy: ChatModePolicy,
  meta: ReplyMeta
) => ({
  content: text,
  ...sanitizeReplyMetaForPolicy(contact, policy, meta)
});

export const formatMessageForPolicyHistory = (
  message: Message,
  policy: ChatModePolicy,
  options: Omit<ModelHistoryFormatOptions, 'allowedMeta'> = {}
) => formatMessageForModelHistory(message, {
  ...options,
  allowedMeta: policy.historyMeta
});

export const shouldIncludeTranslationForContact = (
  contact: ContactTranslationPolicyInput | null | undefined
): boolean => {
  const language = String(contact?.language || '').trim();
  const normalizedLanguage = language.toLowerCase();
  const chineseLanguages = new Set(['普通话', '中文', '汉语', '国语', 'chinese', 'mandarin']);
  return !!contact?.translateToChinese && !!language && !chineseLanguages.has(normalizedLanguage);
};

export const getMessageTextForPolicy = (
  message: Message | undefined,
  policy: ChatModePolicy,
  options: Omit<ModelHistoryFormatOptions, 'allowedMeta'> = {}
): string => message ? (formatMessageForPolicyHistory(message, policy, options)?.text || '') : '';

export const filterOrderedSegmentsForPolicy = (
  segments: OrderedReplySegment[],
  policy: ChatModePolicy
): OrderedReplySegment[] => segments.filter((segment) => {
  if (!String(segment.value || '').trim()) return false;
  if (segment.type === 'text') return true;
  if (segment.type === 'inner') return policy.innerEnabled && !policy.isStory;
  if (segment.type === 'action') return policy.actionEnabled && !policy.isStory;
  return false;
});
