import { MAX_CONTEXT_MESSAGE_LIMIT } from '../services/aiRequestBudget.ts';

type AnonymousHistoryMessage = {
  senderId?: string;
  content?: unknown;
};

export const MAX_ANONYMOUS_CONTEXT_MESSAGES = MAX_CONTEXT_MESSAGE_LIMIT;

const normalizeAnonymousHistoryText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'bigint') return String(value);
  return '';
};

export const buildAnonymousModelHistory = (
  messages: AnonymousHistoryMessage[],
  maxMessages: number = MAX_ANONYMOUS_CONTEXT_MESSAGES
): Array<{ role: 'user' | 'model'; text: string }> => {
  const safeLimit = Math.max(1, Number(maxMessages || MAX_ANONYMOUS_CONTEXT_MESSAGES));
  return (messages || [])
    .slice(-safeLimit)
    .map((item) => ({
      role: item.senderId === 'me' ? 'user' as const : 'model' as const,
      text: normalizeAnonymousHistoryText(item.content)
    }));
};
