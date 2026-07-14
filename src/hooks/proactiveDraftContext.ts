import type { AISettings, Contact, ContactMemories, Mask, ProactiveChatDraft, UserProfile, WorldBook } from '../types';
import { DEFAULT_EMOJI_GROUP_ID } from '../chatroom/emojiStore.ts';
import {
  PROACTIVE_DRAFT_TRIGGER_TEXT,
  PROACTIVE_TEXT_ONLY_RUNTIME_GUARD
} from './proactiveChatConfig.ts';

type EmojiDraftWindow = Window & {
  allEnabledEmojis?: unknown;
  customEmojis?: unknown;
};

const getEmojiDraftWindow = (): EmojiDraftWindow | null =>
  typeof window === 'undefined' ? null : window as EmojiDraftWindow;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const buildEmojiDraftFingerprint = (): string => {
  const source = getEmojiDraftWindow();
  const emojis = Array.isArray(source?.allEnabledEmojis)
    ? source.allEnabledEmojis
    : Array.isArray(source?.customEmojis)
      ? source.customEmojis
      : [];
  return emojis
    .map((item) => {
      const emoji = isRecord(item) ? item : {};
      return {
        groupId: String(emoji.groupId || DEFAULT_EMOJI_GROUP_ID).trim() || DEFAULT_EMOJI_GROUP_ID,
        id: String(emoji.id || '').trim(),
        desc: String(emoji.desc || emoji.caption || emoji.name || '').trim()
      };
    })
    .filter((item) => !!(item.id || item.desc))
    .map((item) => `${item.groupId}:${item.id}:${item.desc}`)
    .sort()
    .join('|');
};

const normalizeDraftKeyPart = (value: unknown): string =>
  String(value ?? '').trim().replace(/\s+/g, ' ');

const fingerprintDraftText = (value: unknown): string => {
  const text = normalizeDraftKeyPart(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${text.length}:${(hash >>> 0).toString(36)}`;
};

type DraftRuntimeContext = {
  user?: UserProfile | null;
  masks?: Mask[];
  contactMemories?: ContactMemories;
  worldBooks?: WorldBook[];
  now?: number;
};

const buildUserDraftFingerprint = (user: UserProfile | null | undefined): string => {
  if (!user) return '';
  return [
    user.name,
    user.wechatId,
    user.gender,
    user.age,
    user.region,
    user.signature,
    user.status,
    user.constellation,
    user.mbti,
    user.occupation,
    user.personalityTraits,
    user.hobbies,
    user.description,
    user.persona,
    user.background,
    user.expressionStyle,
    user.styleFeatures,
    user.speakingStyle,
    user.personality,
    user.goals,
    user.catchphrase,
    user.patDesc
  ].map(normalizeDraftKeyPart).join('\u001f');
};

const buildSelectedMaskDraftFingerprint = (
  selectedMaskId: string | undefined,
  masks: Mask[] | undefined
): string => {
  const mask = selectedMaskId
    ? (Array.isArray(masks) ? masks.find((item) => item.id === selectedMaskId) : null)
    : null;
  if (!mask) return '';
  return [
    mask.id,
    mask.name,
    mask.age,
    mask.gender,
    mask.constellation,
    mask.mbti,
    mask.occupation,
    mask.personalityTraits,
    mask.hobbies,
    mask.description,
    mask.catchphrase,
    mask.updatedAt,
    mask.createdAt
  ].map(normalizeDraftKeyPart).join('\u001f');
};

const buildContactMemoryDraftFingerprint = (
  contactId: string,
  contactMemories: ContactMemories | undefined,
  now: number
): string => {
  const memories = Array.isArray(contactMemories?.[contactId]) ? contactMemories[contactId] : [];
  return memories
    .map((item) => {
      const expiresAt = Number(item.expiresAt || 0);
      const temporalState = (
        (item.temporalType === 'short_term' || item.temporalType === 'one_time')
        && expiresAt > 0
      )
        ? (now > expiresAt ? 'expired' : `active-until:${expiresAt}`)
        : '';
      return [
        item.id,
        item.text,
        item.source,
        item.timestamp,
        item.weight,
        item.confidence,
        item.occurrenceCount,
        item.lastReinforcedAt,
        item.category,
        item.topic,
        item.temporalType,
        item.status,
        item.validDays,
        item.expiresAt,
        temporalState
      ].map(normalizeDraftKeyPart).join('\u001e');
    })
    .sort()
    .join('\u001f');
};

const buildWorldBookDraftFingerprint = (
  contact: Contact,
  worldBooks: WorldBook[] | undefined
): string => {
  const books = Array.isArray(worldBooks) ? worldBooks : [];
  const selectedBooks = contact.useCustomWorldBooks === true
    ? books.filter((book) => book.enabled && (contact.worldBookIds || []).includes(book.id))
    : books.filter((book) => book.enabled);
  return selectedBooks
    .map((book) => [
      book.id,
      book.name,
      book.description,
      book.enabled === true ? 'enabled' : 'disabled',
      book.encryptedHiddenRaw,
      ...(Array.isArray(book.entries)
        ? book.entries.map((entry) => `${normalizeDraftKeyPart(entry.id)}:${normalizeDraftKeyPart(entry.text)}`)
        : [])
    ].map(normalizeDraftKeyPart).join('\u001e'))
    .sort()
    .join('\u001f');
};

export const getDraftContextKey = (
  contact: Contact,
  aiSettings: AISettings,
  extraSystemPrompt: string,
  runtimeContext: DraftRuntimeContext = {}
): string => {
  const mode = normalizeDraftKeyPart(contact.chatMode || 'online');
  const provider = normalizeDraftKeyPart(aiSettings.provider);
  const model = normalizeDraftKeyPart(aiSettings.model);
  const responseFormat = normalizeDraftKeyPart(aiSettings.responseFormat);
  const now = Number.isFinite(Number(runtimeContext.now)) ? Number(runtimeContext.now) : Date.now();
  const emojiFingerprint = buildEmojiDraftFingerprint();
  const contactFingerprint = [
    contact.selectedMaskId,
    contact.persona,
    contact.background,
    contact.expressionStyle,
    contact.personality,
    contact.personalityTraits,
    contact.relationship,
    contact.status,
    contact.signature,
    contact.hobbies,
    contact.description,
    contact.catchphrase,
    contact.userPersona,
    contact.language,
    contact.useCustomWorldBooks === true ? 'worldbooks:custom' : 'worldbooks:global',
    ...(Array.isArray(contact.worldBookIds) ? [...contact.worldBookIds].sort() : []),
    contact.translateToChinese === true ? 'translate:on' : 'translate:off',
    contact.descriptionFeatureEnabled === true ? 'desc:on' : 'desc:off',
    contact.descriptionSayEnabled === false ? 'say:off' : 'say:on',
    contact.descriptionDoEnabled === false ? 'do:off' : 'do:on',
    contact.replyLimit,
    contact.innerVoiceLimit,
    contact.actionDescLimit,
    contact.sentenceRange?.min,
    contact.sentenceRange?.max
  ].map(normalizeDraftKeyPart).join('\u001f');
  const userFingerprint = buildUserDraftFingerprint(runtimeContext.user);
  const selectedMaskFingerprint = buildSelectedMaskDraftFingerprint(contact.selectedMaskId, runtimeContext.masks);
  const memoryFingerprint = buildContactMemoryDraftFingerprint(contact.id, runtimeContext.contactMemories, now);
  const worldBookFingerprint = buildWorldBookDraftFingerprint(contact, runtimeContext.worldBooks);
  const proactivePromptPolicyFingerprint = [
    PROACTIVE_DRAFT_TRIGGER_TEXT,
    PROACTIVE_TEXT_ONLY_RUNTIME_GUARD
  ].map(fingerprintDraftText).join('\u001f');
  return [
    mode,
    provider,
    model,
    responseFormat,
    fingerprintDraftText(proactivePromptPolicyFingerprint),
    fingerprintDraftText(extraSystemPrompt),
    fingerprintDraftText(contactFingerprint),
    fingerprintDraftText(userFingerprint),
    fingerprintDraftText(selectedMaskFingerprint),
    fingerprintDraftText(memoryFingerprint),
    fingerprintDraftText(worldBookFingerprint),
    emojiFingerprint
  ].join('|');
};

export const getValidDrafts = (
  contact: Contact,
  now: number,
  aiSettings: AISettings,
  extraSystemPrompt: string,
  runtimeContext: DraftRuntimeContext = {}
): ProactiveChatDraft[] => {
  const drafts = Array.isArray(contact.proactiveDrafts) ? contact.proactiveDrafts : [];
  const contextKey = getDraftContextKey(contact, aiSettings, extraSystemPrompt, {
    ...runtimeContext,
    now
  });
  return drafts
    .filter((item) => Number(item.expiresAt) > now && String(item.contextKey || '') === contextKey)
    .sort((a, b) => Number(a.generatedAt || 0) - Number(b.generatedAt || 0));
};
