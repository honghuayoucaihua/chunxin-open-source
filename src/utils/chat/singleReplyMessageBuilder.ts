import type { Message, ChatMode } from '../../types';
import { splitReplyToMessages } from './messageSegmentation.ts';
import type { AIDialogueTurn, AIOrderedSegment, AIQuote } from './aiReplyParser';
import {
  normalizeGeneratedActionText,
  normalizeGeneratedInnerVoiceText,
  normalizeGeneratedStrictNonSystemEventText,
  normalizeGeneratedTranslationText,
} from '../generatedVisibleText.ts';

export type ParsedSingleReplyPayload = {
  text?: string;
  sentences?: string[];
  translatedContentZhCN?: string;
  translatedSentencesZhCN?: string[];
  dialogueTurns?: unknown;
  orderedSegments?: unknown;
};

export type SingleReplyMessageMeta = {
  innerVoice?: string;
  actionDesc?: string;
};

export type SingleReplyNpcMeta = {
  isNpc?: boolean;
  npcName?: string;
};

export type NormalizedSingleReplyStructures = {
  dialogueTurns: AIDialogueTurn[];
  orderedSegments: AIOrderedSegment[];
};

const normalizeText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'bigint') return String(value);
  return '';
};

export const hasLandableSingleReplyContent = (
  payload: Pick<ParsedSingleReplyPayload, 'text' | 'sentences'> & SingleReplyMessageMeta,
  structures: NormalizedSingleReplyStructures,
  hasLandableSpecialMessages: boolean
): boolean => Boolean(
  normalizeText(payload.text)
  || (Array.isArray(payload.sentences) && payload.sentences.length > 0)
  || normalizeText(payload.innerVoice)
  || normalizeText(payload.actionDesc)
  || structures.dialogueTurns.length > 0
  || structures.orderedSegments.length > 0
  || hasLandableSpecialMessages
);

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const normalizeVisibleInline = (value: unknown): string =>
  normalizeGeneratedStrictNonSystemEventText(value, { collapseWhitespace: true });
const normalizeInnerMeta = (value: unknown): string | undefined =>
  normalizeGeneratedInnerVoiceText(value, { collapseWhitespace: true }) || undefined;
const normalizeActionMeta = (value: unknown): string | undefined =>
  normalizeGeneratedActionText(value, { collapseWhitespace: true }) || undefined;

export const toDialogueTurns = (value: unknown): AIDialogueTurn[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): AIDialogueTurn | null => {
      if (!isRecord(item)) return null;
      const text = normalizeVisibleInline(item.text);
      if (!text) return null;
      const role = String(item.role ?? '').trim().toLowerCase();
      const npcName = normalizeVisibleInline(item.npcName);
      const isNpc = !!item.isNpc || role === 'npc';
      return {
        text,
        isNpc: isNpc ? true : undefined,
        npcName: isNpc ? (npcName || undefined) : undefined
      };
    })
    .filter((item): item is AIDialogueTurn => Boolean(item));
};

export const toOrderedSegments = (value: unknown): AIOrderedSegment[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): AIOrderedSegment | null => {
      if (!isRecord(item)) return null;
      const type = String(item.type ?? '').trim();
      const normalizedType = type === 'inner' || type === 'action' ? type : type === 'text' ? 'text' : '';
      const segmentValue = normalizedType === 'text'
        ? normalizeVisibleInline(item.value)
        : normalizedType === 'inner'
          ? normalizeGeneratedInnerVoiceText(item.value, { collapseWhitespace: true })
          : normalizeGeneratedActionText(item.value, { collapseWhitespace: true });
      if (!normalizedType || !segmentValue) return null;
      return { type: normalizedType, value: segmentValue };
    })
    .filter((item): item is AIOrderedSegment => Boolean(item));
};

export const normalizeSingleReplyStructures = (
  payload: Pick<ParsedSingleReplyPayload, 'dialogueTurns' | 'orderedSegments'>
): NormalizedSingleReplyStructures => {
  return {
    dialogueTurns: toDialogueTurns(payload.dialogueTurns),
    orderedSegments: toOrderedSegments(payload.orderedSegments)
  };
};

const buildTextMessage = (
  chunk: Message,
  messageIndex: number,
  selectedContactId: string,
  modeMeta: SingleReplyMessageMeta,
  translatedContentZhCN?: string,
  npcMeta?: SingleReplyNpcMeta
): Message => ({
  ...chunk,
  id: `${Date.now()}-${messageIndex}`,
  senderId: selectedContactId,
  timestamp: Date.now() + messageIndex,
  innerVoice: messageIndex === 0 ? normalizeInnerMeta(modeMeta.innerVoice) : undefined,
  actionDesc: messageIndex === 0 ? normalizeActionMeta(modeMeta.actionDesc) : undefined,
  translatedContentZhCN,
  isNpc: npcMeta?.isNpc ? true : undefined,
  npcName: npcMeta?.isNpc ? npcMeta.npcName : undefined
});

const getTranslatedSentenceAt = (
  payload: Pick<ParsedSingleReplyPayload, 'translatedContentZhCN' | 'translatedSentencesZhCN'>,
  index: number
): string | undefined => {
  const item = payload.translatedSentencesZhCN?.[index];
  const text = normalizeGeneratedTranslationText(item, { collapseWhitespace: true });
  return text || undefined;
};

const getTranslationForSourceSegment = (
  payload: Pick<ParsedSingleReplyPayload, 'translatedContentZhCN' | 'translatedSentencesZhCN'>,
  sourceIndex: number,
  chunkIndexInSource: number
): string | undefined => {
  if (chunkIndexInSource > 0) return undefined;
  const sentenceTranslation = getTranslatedSentenceAt(payload, sourceIndex);
  if (sentenceTranslation) return sentenceTranslation;
  return undefined;
};

export const buildDialogueTurnMessages = (input: {
  dialogueTurns: AIDialogueTurn[];
  payload: Pick<ParsedSingleReplyPayload, 'translatedContentZhCN' | 'translatedSentencesZhCN'>;
  modeMeta: SingleReplyMessageMeta;
  npcMeta?: SingleReplyNpcMeta;
  aiQuotedMsg?: Message | null;
  selectedContactId: string;
  useNpcFallbackName?: boolean;
}): Message[] => {
  const baseMsgs: Message[] = [];
  let sentCount = 0;
  let attachedMeta = false;
  const firstMainTurnIndex = input.dialogueTurns.findIndex((item) => !item.isNpc);
  let hasQuoted = false;
  input.dialogueTurns.forEach((turn, turnIdx) => {
    const chunks = splitReplyToMessages(input.selectedContactId, turn.text, !hasQuoted ? (input.aiQuotedMsg || undefined) : undefined);
    if (chunks.length > 0) hasQuoted = true;
    chunks.forEach((chunk, chunkIdx) => {
      const shouldAttachMeta = !attachedMeta && (turnIdx === firstMainTurnIndex || (firstMainTurnIndex < 0 && sentCount === 0));
      baseMsgs.push({
        ...chunk,
        id: `${Date.now()}-dialogue-${sentCount}`,
        timestamp: Date.now() + sentCount,
        innerVoice: shouldAttachMeta ? normalizeInnerMeta(input.modeMeta.innerVoice) : undefined,
        actionDesc: shouldAttachMeta ? normalizeActionMeta(input.modeMeta.actionDesc) : undefined,
        translatedContentZhCN: getTranslationForSourceSegment(input.payload, turnIdx, chunkIdx),
        isNpc: turn.isNpc ? true : undefined,
        npcName: turn.isNpc
          ? (turn.npcName || (input.useNpcFallbackName ? input.npcMeta?.npcName : undefined))
          : undefined
      } as Message);
      if (shouldAttachMeta) attachedMeta = true;
      sentCount += 1;
    });
  });
  return baseMsgs;
};

export const buildOrderedSequenceMessages = (input: {
  orderedSegments: AIOrderedSegment[];
  payload: Pick<ParsedSingleReplyPayload, 'translatedContentZhCN' | 'translatedSentencesZhCN'>;
  modeMeta: SingleReplyMessageMeta;
  npcMeta?: SingleReplyNpcMeta;
  aiQuotedMsg?: Message | null;
  selectedContactId: string;
  effectiveChatMode: ChatMode;
}): Message[] => {
  let textSegmentIdx = 0;
  let orderedTextMsgCount = 0;
  let hasQuoted = false;
  const orderedQueue: Message[] = [];
  input.orderedSegments.forEach((segment) => {
    if (segment.type === 'text') {
      const chunks = splitReplyToMessages(input.selectedContactId, segment.value, !hasQuoted ? (input.aiQuotedMsg || undefined) : undefined);
      if (chunks.length > 0) hasQuoted = true;
      chunks.forEach((chunk, chunkIdx) => {
        const chunkIndex = orderedTextMsgCount;
        orderedQueue.push({
          ...chunk,
          id: `${Date.now()}-${orderedQueue.length}`,
          timestamp: Date.now() + orderedQueue.length,
          innerVoice: input.effectiveChatMode === 'story' && chunkIndex === 0 ? normalizeInnerMeta(input.modeMeta.innerVoice) : undefined,
          actionDesc: input.effectiveChatMode === 'story' && chunkIndex === 0 ? normalizeActionMeta(input.modeMeta.actionDesc) : undefined,
          translatedContentZhCN: getTranslationForSourceSegment(input.payload, textSegmentIdx, chunkIdx),
          isNpc: input.npcMeta?.isNpc ? true : undefined,
          npcName: input.npcMeta?.isNpc ? input.npcMeta.npcName : undefined
        } as Message);
        orderedTextMsgCount += 1;
      });
      textSegmentIdx += 1;
      return;
    }
    if (segment.type === 'inner') {
      orderedQueue.push({
        id: `${Date.now()}-ordered-inner-${orderedQueue.length}`,
        senderId: input.selectedContactId,
        content: '',
        timestamp: Date.now() + orderedQueue.length,
        type: 'text',
        innerVoice: normalizeInnerMeta(segment.value),
        isNpc: input.npcMeta?.isNpc ? true : undefined,
        npcName: input.npcMeta?.isNpc ? input.npcMeta.npcName : undefined
      } as Message);
      return;
    }
    if (segment.type === 'action') {
      orderedQueue.push({
        id: `${Date.now()}-ordered-action-${orderedQueue.length}`,
        senderId: input.selectedContactId,
        content: '',
        timestamp: Date.now() + orderedQueue.length,
        type: 'text',
        actionDesc: normalizeActionMeta(segment.value),
        isNpc: input.npcMeta?.isNpc ? true : undefined,
        npcName: input.npcMeta?.isNpc ? input.npcMeta.npcName : undefined
      } as Message);
    }
  });
  return orderedQueue;
};

export const buildPlainReplyMessages = (input: {
  replyText: string;
  payload: Pick<ParsedSingleReplyPayload, 'translatedContentZhCN' | 'translatedSentencesZhCN'>;
  modeMeta: SingleReplyMessageMeta;
  npcMeta?: SingleReplyNpcMeta;
  aiQuotedMsg?: Message | null;
  selectedContactId: string;
}): Message[] => {
  if (!input.replyText.trim()) return [];
  const chunks = splitReplyToMessages(input.selectedContactId, input.replyText, input.aiQuotedMsg || undefined);
  return chunks.map((item, idx) => {
    const fullTranslation = normalizeGeneratedTranslationText(input.payload.translatedContentZhCN, { collapseWhitespace: true });
    const translation = idx === 0
      ? (fullTranslation || getTranslatedSentenceAt(input.payload, 0))
      : undefined;
    return buildTextMessage(
      item,
      idx,
      input.selectedContactId,
      input.modeMeta,
      translation,
      input.npcMeta
    );
  });
};

export const buildSplitSentenceReplyMessages = (input: {
  pieces: string[];
  payload: Pick<ParsedSingleReplyPayload, 'translatedContentZhCN' | 'translatedSentencesZhCN'>;
  modeMeta: SingleReplyMessageMeta;
  npcMeta?: SingleReplyNpcMeta;
  aiQuotedMsg?: Message | null;
  selectedContactId: string;
}): Message[] => {
  let sentMsgCount = 0;
  let hasQuoted = false;
  const scheduledMsgs: Message[] = [];
  input.pieces.forEach((piece, pieceIdx) => {
    const chunkMsgs = splitReplyToMessages(input.selectedContactId, piece, !hasQuoted ? (input.aiQuotedMsg || undefined) : undefined);
    if (chunkMsgs.length > 0) hasQuoted = true;
    chunkMsgs.forEach((chunk, chunkIdx) => {
      const msgIndex = sentMsgCount;
      scheduledMsgs.push(buildTextMessage(
        chunk,
        msgIndex,
        input.selectedContactId,
        input.modeMeta,
        getTranslationForSourceSegment(input.payload, pieceIdx, chunkIdx),
        input.npcMeta
      ));
      sentMsgCount += 1;
    });
  });
  return scheduledMsgs;
};

export const buildMetaOnlyReplyMessage = (input: {
  selectedContactId: string;
  modeMeta: SingleReplyMessageMeta;
  npcMeta?: SingleReplyNpcMeta;
  translatedContentZhCN?: string;
}): Message => ({
  id: `${Date.now()}-meta-only`,
  senderId: input.selectedContactId,
  content: '',
  timestamp: Date.now(),
  type: 'text',
  innerVoice: normalizeInnerMeta(input.modeMeta.innerVoice),
  actionDesc: normalizeActionMeta(input.modeMeta.actionDesc),
  translatedContentZhCN: normalizeGeneratedTranslationText(input.translatedContentZhCN, { collapseWhitespace: true }) || undefined,
  isNpc: input.npcMeta?.isNpc ? true : undefined,
  npcName: input.npcMeta?.isNpc ? input.npcMeta.npcName : undefined
});

export const buildQuotedMessageFromAIQuote = (
  quote: AIQuote | null | undefined,
  resolveQuoteSenderId: (target?: string) => string
): Message | null => {
  const content = normalizeVisibleInline(quote?.text);
  if (!content) return null;
  const target = normalizeVisibleInline(quote?.target);
  return {
    id: `quote-${Date.now()}`,
    senderId: resolveQuoteSenderId(target || undefined),
    content,
    timestamp: Date.now(),
    type: 'text'
  };
};
