import { extractStrictJsonObject } from '../utils/chat/aiReplyParser.ts';
import { normalizeGeneratedStrictNonSystemEventText } from '../utils/generatedVisibleText.ts';

type UnknownRecord = Record<string, unknown>;

const normalizeAnonymousReplyText = (rawReply: string): string => {
  return String(rawReply || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
};

const parseAnonymousReplyObject = (rawReply: string): UnknownRecord => {
  const trimmedReply = normalizeAnonymousReplyText(rawReply);
  if (!trimmedReply) {
    throw new Error('匿名聊天回复为空');
  }
  const extracted = extractStrictJsonObject(trimmedReply);
  if (extracted && typeof extracted === 'object' && !Array.isArray(extracted)) {
    return extracted as UnknownRecord;
  }
  try {
    const parsed = JSON.parse(trimmedReply);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('匿名聊天回复必须是 JSON 对象');
    }
    return parsed as UnknownRecord;
  } catch (error) {
    if (error instanceof Error && error.message === '匿名聊天回复必须是 JSON 对象') {
      throw error;
    }
    throw new Error('匿名聊天回复不是合法 JSON');
  }
};

const validateAnonymousReplyShape = (payload: UnknownRecord): void => {
  const keys = Object.keys(payload);
  if (keys.some((key) => key !== 'text')) {
    throw new Error('匿名聊天回复包含不支持的字段');
  }
  if (typeof payload.text !== 'string') {
    throw new Error('匿名聊天回复 text 必须是字符串');
  }
};

export const buildAnonymousReplyChunks = (rawReply: string): string[] => {
  const payload = parseAnonymousReplyObject(rawReply);
  validateAnonymousReplyShape(payload);
  const text = normalizeGeneratedStrictNonSystemEventText(payload.text, { collapseWhitespace: true });
  if (text) return [text];
  throw new Error('匿名聊天回复缺少正文');
};
