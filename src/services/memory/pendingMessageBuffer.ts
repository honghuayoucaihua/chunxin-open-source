import { cleanText } from './textProcessing.ts';

// 长期记忆配置
export const SUMMARY_THRESHOLD = 30;
const MAX_PENDING_MESSAGES_PER_CONTACT = 120;
const MAX_PENDING_MESSAGES_TOTAL = 2000;
const PENDING_MESSAGES_STORAGE_KEY = 'xushuo_contact_pending_memories_v1';

// 临时消息缓冲区类型
export interface PendingMessage {
  text: string;
  source: 'user' | 'model';
  timestamp: number;
}

// 待总结消息缓冲区（内存 + 本地持久化）
const pendingMessages: Record<string, PendingMessage[]> = {};

const getLocalStorage = (): Storage | null => {
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  } catch {
    return null;
  }
};

const normalizePendingMessage = (value: unknown): PendingMessage | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<PendingMessage>;
  if (typeof item.text !== 'string' || item.text.trim().length === 0) return null;
  if (item.source !== 'user' && item.source !== 'model') return null;
  const timestamp = typeof item.timestamp === 'number' && Number.isFinite(item.timestamp)
    ? item.timestamp
    : Date.now();

  return {
    text: item.text,
    source: item.source,
    timestamp
  };
};

const normalizePendingMessagesMap = (value: unknown): Record<string, PendingMessage[]> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const normalized: Record<string, PendingMessage[]> = {};

  Object.entries(value as Record<string, unknown>).forEach(([contactId, messages]) => {
    if (typeof contactId !== 'string' || contactId.trim().length === 0 || !Array.isArray(messages)) return;
    const items = messages
      .map(normalizePendingMessage)
      .filter((item): item is PendingMessage => Boolean(item))
      .slice(-MAX_PENDING_MESSAGES_PER_CONTACT);
    if (items.length > 0) {
      normalized[contactId] = items;
    }
  });

  return normalized;
};

const trimPendingMessages = (): void => {
  Object.entries(pendingMessages).forEach(([contactId, messages]) => {
    if (messages.length > MAX_PENDING_MESSAGES_PER_CONTACT) {
      pendingMessages[contactId] = messages.slice(-MAX_PENDING_MESSAGES_PER_CONTACT);
    }
    if (pendingMessages[contactId].length === 0) {
      delete pendingMessages[contactId];
    }
  });

  const allMessages = Object.entries(pendingMessages)
    .flatMap(([contactId, messages]) => messages.map((message, index) => ({ contactId, index, timestamp: message.timestamp })))
    .sort((a, b) => b.timestamp - a.timestamp);
  const keep = new Set(allMessages.slice(0, MAX_PENDING_MESSAGES_TOTAL).map((item) => `${item.contactId}:${item.index}`));

  if (allMessages.length <= MAX_PENDING_MESSAGES_TOTAL) return;

  Object.entries(pendingMessages).forEach(([contactId, messages]) => {
    const kept = messages.filter((_, index) => keep.has(`${contactId}:${index}`));
    if (kept.length > 0) {
      pendingMessages[contactId] = kept;
    } else {
      delete pendingMessages[contactId];
    }
  });
};

const persistPendingMessages = (): void => {
  const storage = getLocalStorage();
  if (!storage) return;

  trimPendingMessages();

  try {
    if (Object.keys(pendingMessages).length === 0) {
      storage.removeItem(PENDING_MESSAGES_STORAGE_KEY);
      return;
    }
    storage.setItem(PENDING_MESSAGES_STORAGE_KEY, JSON.stringify(pendingMessages));
  } catch {
    // 存储不可用时保留内存缓冲，不影响聊天流程。
  }
};

const hydratePendingMessages = (): void => {
  const storage = getLocalStorage();
  if (!storage) return;

  try {
    const raw = storage.getItem(PENDING_MESSAGES_STORAGE_KEY);
    const restored = normalizePendingMessagesMap(raw ? JSON.parse(raw) : null);
    Object.keys(pendingMessages).forEach((contactId) => delete pendingMessages[contactId]);
    Object.assign(pendingMessages, restored);
    trimPendingMessages();
  } catch {
    Object.keys(pendingMessages).forEach((contactId) => delete pendingMessages[contactId]);
  }
};

hydratePendingMessages();

/**
 * 添加消息到临时缓冲区（不直接存入长期记忆）
 * 返回当前缓冲区消息数量
 */
export const addPendingMessage = (
  contactId: string,
  text: string,
  source: 'user' | 'model'
): number => {
  const messageText = cleanText(text).slice(0, 500);
  if (!messageText) {
    return (pendingMessages[contactId] || []).length;
  }

  if (!pendingMessages[contactId]) {
    pendingMessages[contactId] = [];
  }

  const timestamp = Date.now();
  pendingMessages[contactId].push({
    text: messageText,
    source,
    timestamp
  });

  if (pendingMessages[contactId].length > MAX_PENDING_MESSAGES_PER_CONTACT) {
    pendingMessages[contactId] = pendingMessages[contactId]
      .slice(-MAX_PENDING_MESSAGES_PER_CONTACT);
  }

  persistPendingMessages();
  return pendingMessages[contactId].length;
};

/**
 * 获取待总结的消息数量
 */
export const getPendingMessageCount = (contactId: string): number => {
  return (pendingMessages[contactId] || []).length;
};

/**
 * 预览待总结消息，不清空缓冲区
 */
export const peekPendingMessages = (contactId: string): PendingMessage[] => {
  return [...(pendingMessages[contactId] || [])];
};

/**
 * 根据内容完全清空指定联系人的待总结缓冲区
 */
export const dropPendingMessages = (contactId: string, expected: PendingMessage[]): void => {
  const current = pendingMessages[contactId] || [];
  if (expected.length === 0 || current.length < expected.length) return;
  const isSame = expected.every((item, idx) => current[idx] === item);
  if (!isSame) return;
  const remaining = current.slice(expected.length);
  if (remaining.length > 0) {
    pendingMessages[contactId] = remaining;
  } else {
    delete pendingMessages[contactId];
  }
  persistPendingMessages();
};

/**
 * 获取并清空待总结的消息
 */
export const consumePendingMessages = (contactId: string): PendingMessage[] => {
  const messages = pendingMessages[contactId] || [];
  delete pendingMessages[contactId];
  persistPendingMessages();
  return messages;
};

/**
 * 检查是否需要触发AI总结
 */
export const shouldTriggerSummary = (contactId: string, threshold: number = SUMMARY_THRESHOLD): boolean => {
  const count = getPendingMessageCount(contactId);
  return count >= Math.max(1, Number(threshold || SUMMARY_THRESHOLD));
};

/**
 * 清理指定联系人的临时缓冲区
 */
export const clearPendingMessages = (contactId: string): void => {
  delete pendingMessages[contactId];
  persistPendingMessages();
};
