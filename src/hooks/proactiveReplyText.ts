import type { ChatModePolicy } from '../utils/chat/chatModePolicy.ts';
import { extractStrictJsonObject } from '../utils/chat/aiReplyParser.ts';
import { normalizeGeneratedStrictNonSystemEventText } from '../utils/generatedVisibleText.ts';

export type ProactiveParsedTextPayload = {
  text?: string;
  sentences?: string[];
  dialogueTurns?: unknown;
  orderedSegments?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const hasOwnField = (item: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(item, key);

const hasValidProactivePairs = (value: unknown): boolean => {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every((item) => {
    if (!isRecord(item)) return false;
    const keys = Object.keys(item);
    if (keys.some((key) => key !== 'text' && key !== 'translationZh')) return false;
    return typeof item.text === 'string'
      && (!hasOwnField(item, 'translationZh') || typeof item.translationZh === 'string');
  });
};

export const hasUnsupportedProactiveReplyShape = (
  rawReply: string,
  modePolicy: ChatModePolicy,
  allowPairs: boolean
): boolean => {
  const payload = extractStrictJsonObject(String(rawReply || ''));
  if (!payload) return true;

  const allowedFields = new Set([
    'text',
    'translationZh',
    ...(allowPairs ? ['pairs'] : []),
    ...(modePolicy.innerEnabled ? ['innerVoice'] : []),
    ...(modePolicy.actionEnabled ? ['actionDesc'] : [])
  ]);
  if (Object.keys(payload).some((key) => !allowedFields.has(key))) return true;
  if (hasOwnField(payload, 'text') && typeof payload.text !== 'string') return true;
  if (hasOwnField(payload, 'translationZh') && typeof payload.translationZh !== 'string') return true;
  if (hasOwnField(payload, 'innerVoice') && typeof payload.innerVoice !== 'string') return true;
  if (hasOwnField(payload, 'actionDesc') && typeof payload.actionDesc !== 'string') return true;
  if (hasOwnField(payload, 'pairs') && !hasValidProactivePairs(payload.pairs)) return true;
  return false;
};

export const getProactivePrimaryText = (
  parsed: ProactiveParsedTextPayload,
  _modePolicy: ChatModePolicy
): string => {
  const directText = normalizeGeneratedStrictNonSystemEventText(parsed.text, { collapseWhitespace: true });
  if (directText) return directText;
  return '';
};
