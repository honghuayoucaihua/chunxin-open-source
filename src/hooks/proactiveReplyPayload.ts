import {
  normalizeGeneratedActionText,
  normalizeGeneratedInnerVoiceText,
  normalizeGeneratedStrictNonSystemEventText,
  normalizeGeneratedTranslationText
} from '../utils/generatedVisibleText.ts';
import {
  applyChatModePolicy,
  getChatModePolicy
} from '../utils/chat/chatModePolicy.ts';
import type { Contact } from '../types';

export interface ProactiveReplyPayload {
  text: string;
  innerVoice?: string;
  actionDesc?: string;
  translatedContentZhCN?: string;
}

export const normalizeProactiveReplyPayload = (payload: ProactiveReplyPayload | null | undefined): ProactiveReplyPayload | null => {
  if (!payload) return null;
  const text = normalizeGeneratedStrictNonSystemEventText(payload.text, { collapseWhitespace: true });
  if (!text) return null;
  return {
    text,
    innerVoice: normalizeGeneratedInnerVoiceText(payload.innerVoice, { collapseWhitespace: true }) || undefined,
    actionDesc: normalizeGeneratedActionText(payload.actionDesc, { collapseWhitespace: true }) || undefined,
    translatedContentZhCN: normalizeGeneratedTranslationText(payload.translatedContentZhCN, { collapseWhitespace: true }) || undefined
  };
};

export const normalizeProactiveReplyPayloadForContact = (
  payload: ProactiveReplyPayload | null | undefined,
  contact: Pick<Contact, 'chatMode' | 'descriptionFeatureEnabled' | 'descriptionSayEnabled' | 'descriptionDoEnabled' | 'innerVoiceLimit' | 'actionDescLimit'>
): ProactiveReplyPayload | null => {
  const normalized = normalizeProactiveReplyPayload(payload);
  if (!normalized) return null;
  const policy = getChatModePolicy(contact);
  const modeResult = applyChatModePolicy(normalized.text, contact, policy, {
    innerVoice: normalized.innerVoice,
    actionDesc: normalized.actionDesc
  });
  return normalizeProactiveReplyPayload({
    ...normalized,
    text: modeResult.content,
    innerVoice: modeResult.innerVoice,
    actionDesc: modeResult.actionDesc
  });
};
