import { scheduleReplyFollowup } from './replyMessageScheduler.ts';

type ShouldRun = () => boolean;
type TypingContactIdsSetter = (updater: (prev: string[]) => string[]) => void;

const normalizeChatId = (chatId: string): string => String(chatId || '').trim();

export const markTypingContactStart = (
  setTypingContactIds: TypingContactIdsSetter,
  chatId: string
): void => {
  const normalizedChatId = normalizeChatId(chatId);
  if (!normalizedChatId) return;
  setTypingContactIds((prev) => prev.includes(normalizedChatId) ? prev : [...prev, normalizedChatId]);
};

export const markTypingContactEnd = (
  setTypingContactIds: TypingContactIdsSetter,
  chatId: string
): void => {
  const normalizedChatId = normalizeChatId(chatId);
  if (!normalizedChatId) return;
  setTypingContactIds((prev) => prev.filter((id) => id !== normalizedChatId));
};

export const withTypingContact = async <T>(
  setTypingContactIds: TypingContactIdsSetter,
  chatId: string,
  run: () => Promise<T>
): Promise<T> => {
  markTypingContactStart(setTypingContactIds, chatId);
  try {
    return await run();
  } finally {
    markTypingContactEnd(setTypingContactIds, chatId);
  }
};

export const scheduleMainReplyCompletion = (
  mainQueueDelayMs: number | undefined,
  run: () => void,
  shouldRun?: ShouldRun,
  onSkipped?: () => void
): number => {
  const normalizedDelay = Number.isFinite(mainQueueDelayMs) ? Math.max(0, Number(mainQueueDelayMs)) : 0;
  return scheduleReplyFollowup(normalizedDelay > 0 ? normalizedDelay + 1 : 0, run, shouldRun, onSkipped);
};

export const getReplyMemoryText = (
  primaryText: string | null | undefined,
  extraParts: Array<string | null | undefined> = []
): string => {
  const normalizedPrimaryText = String(primaryText || '').trim();
  return [normalizedPrimaryText, ...extraParts]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
    .join(' · ');
};
