import type { ContactMemories, ContactMemoryEntry } from '../../types/index.ts';
import {
  cleanText,
  normalizeForDedup,
  formatDate,
  getMemoryCategory,
  memoryCategoryBoost
} from './textProcessing.ts';
import { clearPendingMessages } from './pendingMessageBuffer.ts';

// 长期记忆配置
const MAX_MEMORIES_PER_CONTACT = 50;
const DEFAULT_CONTEXT_LIMIT = 12;
const DEFAULT_SUMMARY_THRESHOLD = 30;
const STABLE_MEMORY_CATEGORIES = new Set(['identity', 'relationship', 'preference', 'habit']);
const CORRECTIVE_MEMORY_STATUSES = new Set(['ended', 'corrected']);
const MEMORY_CATEGORIES = new Set(['identity', 'preference', 'relationship', 'event', 'emotion', 'habit', 'health', 'other']);
const MEMORY_TEMPORAL_TYPES = new Set(['stable', 'short_term', 'one_time', 'unknown']);
const MEMORY_STATUSES = new Set(['active', 'ended', 'corrected', 'unknown']);
const DAY_MS = 1000 * 60 * 60 * 24;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normalizeText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'bigint') return String(value);
  return '';
};

const getEntryRank = (entry: ContactMemoryEntry, now: number) => {
  const ageDays = Math.max(0, (now - entry.timestamp) / (1000 * 60 * 60 * 24));
  const freshness = 1 / (1 + ageDays / 14);
  const confidence = clamp(Number(entry.confidence || 0.55), 0.2, 1);
  const occurrences = clamp(Number(entry.occurrenceCount || 1), 1, 8);
  const category = getMemoryCategory(entry);
  return (entry.weight || 1)
    + confidence * 2
    + Math.log2(occurrences + 1)
    + freshness
    + memoryCategoryBoost(category);
};

const normalizeMemoryEntry = (entry: ContactMemoryEntry, fallbackTimestamp: number): ContactMemoryEntry => {
  const timestamp = Number(entry.timestamp || fallbackTimestamp);
  const occurrenceCount = clamp(Math.round(Number(entry.occurrenceCount || 1)), 1, 99);
  const confidence = clamp(Number(entry.confidence || 0.55), 0.2, 1);
  return {
    ...entry,
    timestamp,
    weight: clamp(Number(entry.weight || 1), 0.5, 5),
    confidence,
    occurrenceCount,
    lastReinforcedAt: Number(entry.lastReinforcedAt || timestamp)
  };
};

const getMemoryTouchedAt = (entry: ContactMemoryEntry): number =>
  Number(entry.lastReinforcedAt || entry.timestamp || 0);

const normalizeStructuredTopic = (value: unknown): string =>
  normalizeForDedup(normalizeText(value)).slice(0, 48);

const isCorrectiveMemory = (entry: ContactMemoryEntry): boolean =>
  CORRECTIVE_MEMORY_STATUSES.has(normalizeText(entry.status));

const getShortTermMemoryTtl = (entry: ContactMemoryEntry): number | null => {
  if (entry.temporalType === 'stable' || entry.temporalType === 'unknown') return null;
  if (entry.temporalType === 'short_term' || entry.temporalType === 'one_time') {
    const expiresAt = Number(entry.expiresAt || 0);
    const touchedAt = getMemoryTouchedAt(entry);
    return expiresAt > touchedAt ? expiresAt - touchedAt : null;
  }
  return null;
};

const isShortTermMemory = (entry: ContactMemoryEntry): boolean =>
  getShortTermMemoryTtl(entry) !== null;

const isExpiredForPrompt = (entry: ContactMemoryEntry, now: number): boolean => {
  if (entry.temporalType === 'short_term' || entry.temporalType === 'one_time') {
    const expiresAt = Number(entry.expiresAt || 0);
    return expiresAt > 0 && now > expiresAt;
  }
  const ttl = getShortTermMemoryTtl(entry);
  if (!ttl) return false;
  const lastTouchedAt = getMemoryTouchedAt(entry) || now;
  return now - lastTouchedAt > ttl;
};

type SummarizedMemoryEntry = Required<Pick<ContactMemoryEntry, 'category' | 'topic' | 'temporalType' | 'status'>>
  & Partial<Pick<ContactMemoryEntry, 'validDays' | 'expiresAt'>>
  & {
    text: string;
    source: ContactMemoryEntry['source'];
    weight: number;
    confidence: number;
  };

const isValidSummarizedMemoryEntry = (
  entry: Partial<SummarizedMemoryEntry>,
  timestamp: number
): entry is SummarizedMemoryEntry => {
  const text = cleanText(normalizeText(entry.text));
  const category = normalizeText(entry.category);
  const topic = normalizeText(entry.topic);
  const temporalType = normalizeText(entry.temporalType);
  const status = normalizeText(entry.status);
  const source = normalizeText(entry.source);
  const weight = Number(entry.weight);
  const confidence = Number(entry.confidence);
  if (
    !text
    || !topic
    || !MEMORY_CATEGORIES.has(category)
    || !MEMORY_TEMPORAL_TYPES.has(temporalType)
    || !MEMORY_STATUSES.has(status)
    || (source !== 'user' && source !== 'model' && source !== 'system')
    || !Number.isFinite(weight)
    || !Number.isFinite(confidence)
  ) return false;

  if (temporalType === 'short_term' || temporalType === 'one_time') {
    const validDays = Number(entry.validDays);
    const expiresAt = Number(entry.expiresAt);
    return (Number.isFinite(validDays) && validDays >= 1) || (Number.isFinite(expiresAt) && expiresAt > timestamp);
  }

  return true;
};

const normalizeSummarizedMemoryForStorage = (
  entry: SummarizedMemoryEntry,
  timestamp: number
): SummarizedMemoryEntry => {
  if (entry.temporalType !== 'short_term' && entry.temporalType !== 'one_time') return entry;
  const expiresAt = Number(entry.expiresAt);
  if (Number.isFinite(expiresAt) && expiresAt > timestamp) return { ...entry, expiresAt };
  const validDays = Number(entry.validDays);
  if (!Number.isFinite(validDays) || validDays < 1) return entry;
  return {
    ...entry,
    validDays,
    expiresAt: timestamp + Math.round(validDays) * DAY_MS
  };
};

const isPromptEligibleMemoryEntry = (entry: ContactMemoryEntry): boolean => {
  const text = cleanText(normalizeText(entry.text));
  const category = normalizeText(entry.category);
  const topic = normalizeText(entry.topic);
  const temporalType = normalizeText(entry.temporalType);
  const status = normalizeText(entry.status);
  if (
    !text
    || !topic
    || !MEMORY_CATEGORIES.has(category)
    || !MEMORY_TEMPORAL_TYPES.has(temporalType)
    || !MEMORY_STATUSES.has(status)
  ) return false;

  if (temporalType === 'short_term' || temporalType === 'one_time') {
    const touchedAt = getMemoryTouchedAt(entry);
    const expiresAt = Number(entry.expiresAt || 0);
    return touchedAt > 0 && expiresAt > touchedAt;
  }

  return true;
};

const buildStructuredCorrectionSuppressors = (
  activeList: ContactMemoryEntry[]
): Array<{ category: string; topic: string; timestamp: number }> => (
  activeList
    .filter(isCorrectiveMemory)
    .map((entry) => ({
      category: getMemoryCategory(entry),
      topic: normalizeStructuredTopic(entry.topic),
      timestamp: getMemoryTouchedAt(entry)
    }))
    .filter((item) => item.category && item.topic && item.timestamp > 0)
);

const isSuppressedByStructuredCorrection = (
  entry: ContactMemoryEntry,
  suppressors: Array<{ category: string; topic: string; timestamp: number }>
): boolean => {
  if (isCorrectiveMemory(entry)) return false;
  const category = getMemoryCategory(entry);
  const topic = normalizeStructuredTopic(entry.topic);
  if (!category || !topic) return false;
  const touchedAt = getMemoryTouchedAt(entry);
  return suppressors.some((item) => (
    item.timestamp >= touchedAt
    && item.category === category
    && item.topic === topic
  ));
};

export type ContactMemoryPromptSelection = {
  coreMemories: ContactMemoryEntry[];
  relatedMemories: ContactMemoryEntry[];
};

export const selectContactMemoriesForPrompt = (
  memoryMap: ContactMemories,
  contactId: string,
  limit = DEFAULT_CONTEXT_LIMIT
): ContactMemoryPromptSelection => {
  const list = (memoryMap[contactId] || []).filter(isPromptEligibleMemoryEntry);
  const now = Date.now();
  const buildSelection = (coreMemories: ContactMemoryEntry[], relatedMemories: ContactMemoryEntry[]) => ({
    coreMemories,
    relatedMemories
  });

  if (list.length === 0) return buildSelection([], []);

  const notExpiredList = list.filter((entry) => !isExpiredForPrompt(entry, now));
  const structuredCorrectionSuppressors = buildStructuredCorrectionSuppressors(notExpiredList);
  const activeList = notExpiredList.filter((entry) => (
    !isSuppressedByStructuredCorrection(entry, structuredCorrectionSuppressors)
  ));
  if (activeList.length === 0) return buildSelection([], []);

  const safeLimit = Math.max(1, Math.round(Number(limit || DEFAULT_CONTEXT_LIMIT)));
  const isStableMemory = (entry: ContactMemoryEntry) => {
    const category = getMemoryCategory(entry);
    if (isShortTermMemory(entry)) return false;
    return STABLE_MEMORY_CATEGORIES.has(category)
      || Number(entry.weight || 0) >= 4
      || Number(entry.confidence || 0) >= 0.85
      || Number(entry.occurrenceCount || 0) >= 2;
  };

  const coreLimit = Math.min(safeLimit, Math.max(2, Math.ceil(safeLimit * 0.45)));
  const coreMemories = [...activeList]
    .filter(isStableMemory)
    .sort((a, b) => {
      const rankDiff = getEntryRank(b, now) - getEntryRank(a, now);
      if (rankDiff !== 0) return rankDiff;
      return b.timestamp - a.timestamp;
    })
    .slice(0, coreLimit);

  const selectedKeys = new Set(coreMemories.map((item) => item.id || normalizeForDedup(normalizeText(item.text))));
  const relatedMemories = [...activeList]
    .filter((item) => !selectedKeys.has(item.id || normalizeForDedup(normalizeText(item.text))))
    .sort((a, b) => {
      const rankDiff = getEntryRank(b, now) - getEntryRank(a, now);
      if (rankDiff !== 0) return rankDiff;
      return b.timestamp - a.timestamp;
    })
    .slice(0, Math.max(0, safeLimit - coreMemories.length));

  return buildSelection(coreMemories, relatedMemories);
};

const reinforceMemoryEntry = (
  existing: ContactMemoryEntry,
  incoming: SummarizedMemoryEntry,
  timestamp: number
): ContactMemoryEntry => {
  const occurrenceCount = clamp(Math.round(Number(existing.occurrenceCount || 1)) + 1, 1, 99);
  const incomingWeight = clamp(Number(incoming.weight || 2), 1, 5);
  const incomingConfidence = Number(incoming.confidence || 0);
  const confidence = clamp(
    Math.max(Number(existing.confidence || 0.55), incomingConfidence)
      + 0.08
      + incomingWeight * 0.015,
    0.2,
    1
  );
  const temporalType = incoming.temporalType || existing.temporalType;
  const isTimedMemory = temporalType === 'short_term' || temporalType === 'one_time';
  return {
    ...existing,
    text: cleanText(normalizeText(incoming.text)).slice(0, 120),
    source: incoming.source,
    timestamp,
    weight: clamp(Math.max(existing.weight || 1, incomingWeight) + 0.12, 1, 5),
    confidence,
    occurrenceCount,
    lastReinforcedAt: timestamp,
    category: incoming.category || existing.category,
    topic: incoming.topic || existing.topic,
    temporalType,
    status: incoming.status || existing.status,
    validDays: isTimedMemory ? incoming.validDays : undefined,
    expiresAt: isTimedMemory ? incoming.expiresAt : undefined
  };
};

/**
 * 直接添加总结后的长期记忆（不经过缓冲区）
 */
export const addSummarizedMemory = (
  memoryMap: ContactMemories,
  contactId: string,
  entries: SummarizedMemoryEntry[]
): ContactMemories => {
  const timestamp = Date.now();
  if (!entries.every((entry) => isValidSummarizedMemoryEntry(entry, timestamp))) {
    throw new Error('总结记忆缺少必需结构字段');
  }
  const existing = (memoryMap[contactId] || []).map(item => normalizeMemoryEntry(item, timestamp));
  let next = [...existing];

  entries.forEach(entry => {
    const storageEntry = normalizeSummarizedMemoryForStorage(entry, timestamp);
    const text = cleanText(normalizeText(entry.text)).slice(0, 120);
    if (!text) return;

    const normalized = normalizeForDedup(text);
    if (!normalized) return;

    // 检查是否已存在类似记忆
    const hitIndex = next.findIndex(item => normalizeForDedup(normalizeText(item.text)) === normalized);
    if (hitIndex >= 0) {
      next[hitIndex] = reinforceMemoryEntry(next[hitIndex], { ...storageEntry, text }, timestamp);
      return;
    }

    next.push({
      id: `mem-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      source: entry.source,
      timestamp,
      weight: clamp(Number(storageEntry.weight || 2), 1, 5),
      confidence: clamp(Number(storageEntry.confidence || (0.5 + Number(storageEntry.weight || 2) * 0.06)), 0.2, 0.95),
      occurrenceCount: 1,
      lastReinforcedAt: timestamp,
      category: storageEntry.category,
      topic: storageEntry.topic,
      temporalType: storageEntry.temporalType,
      status: storageEntry.status,
      validDays: storageEntry.validDays,
      expiresAt: storageEntry.expiresAt
    });
  });

  // 按权重和时间排序，保留前 MAX_MEMORIES_PER_CONTACT 条
  next = next
    .sort((a, b) => {
      const rankDiff = getEntryRank(b, timestamp) - getEntryRank(a, timestamp);
      if (rankDiff !== 0) return rankDiff;
      return b.timestamp - a.timestamp;
    })
    .slice(0, MAX_MEMORIES_PER_CONTACT)
    .sort((a, b) => b.timestamp - a.timestamp);

  return {
    ...memoryMap,
    [contactId]: next
  };
};

export const getContactMemoryPrompt = (
  memoryMap: ContactMemories,
  contactId: string,
  limit = DEFAULT_CONTEXT_LIMIT,
  contactName = ''
): string => {
  const { coreMemories, relatedMemories } = selectContactMemoriesForPrompt(memoryMap, contactId, limit);
  const selected = [...coreMemories, ...relatedMemories];
  if (selected.length === 0) return '';

  // 使用联系人名字替代通用标签
  const customSourceLabel: Record<ContactMemoryEntry['source'], string> = {
    user: '用户',
    model: contactName.trim() || '联系人（未提供姓名）',
    system: '系统'
  };

  const formatMemoryLine = (item: ContactMemoryEntry) => {
    const stateHint = item.status === 'corrected'
      ? '；状态已修正'
      : (isCorrectiveMemory(item) ? '；状态已结束' : (isShortTermMemory(item) ? '；短期状态，可能已变化' : ''));
    return `- (${formatDate(item.timestamp)}${stateHint}) ${customSourceLabel[item.source]}：${normalizeText(item.text)}`;
  };
  const sections: string[] = [
    '【联系人记忆】',
    '以下内容是历史对话中沉淀出的关键记忆，请用来保持关系、偏好、身份和事件连续。'
  ];
  if (coreMemories.length > 0) {
    sections.push('【核心稳定记忆】', ...coreMemories.map(formatMemoryLine));
  }
  if (relatedMemories.length > 0) {
    sections.push('【补充记忆】', ...relatedMemories.map(formatMemoryLine));
  }
  sections.push(
    '【记忆使用方式】',
    '- 优先保持角色资料、双方关系、长期偏好和已确认事实一致。',
    '- 带“短期状态”的记忆只代表当时情况；如果时间已过、用户没有再次提起，或本轮表达了变化，不要当成永久事实。',
    '- 带“状态已结束”的记忆表示旧状态已经变化，不要继续按旧状态回复。',
    '- 当新旧记忆冲突时，优先相信时间更近、用户本轮明确说出的内容。',
    '- 把记忆作为自然聊天背景，不要逐条复述，也不要主动解释“我记得”。',
    '- 如果用户本轮明确修正了旧记忆，以本轮说法为准，并在后续对话中自然更新。'
  );
  return sections.join('\n');
};

export const rankContactMemories = (
  memories: ContactMemoryEntry[]
): ContactMemoryEntry[] => {
  const now = Date.now();
  return [...(memories || [])].sort((a, b) => {
    return getEntryRank(b, now) - getEntryRank(a, now);
  });
};

export const clearContactMemories = (memoryMap: ContactMemories, contactId: string): ContactMemories => {
  if (!memoryMap[contactId]) return memoryMap;
  const next = { ...memoryMap };
  delete next[contactId];
  // 同时清理临时缓冲区
  clearPendingMessages(contactId);
  return next;
};

/**
 * 检查是否需要触发自动总结（基于长期记忆数量）
 */
export const shouldTriggerMemorySummary = (
  memoryMap: ContactMemories,
  contactId: string,
  lastSummaryCount: number,
  summaryThreshold = DEFAULT_SUMMARY_THRESHOLD
): boolean => {
  const memories = memoryMap[contactId] || [];
  const newMemoriesCount = memories.length - lastSummaryCount;
  return newMemoriesCount >= Math.max(1, Number(summaryThreshold || DEFAULT_SUMMARY_THRESHOLD));
};
