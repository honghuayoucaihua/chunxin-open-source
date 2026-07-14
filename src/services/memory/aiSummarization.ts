import type { ContactMemories, ContactMemoryEntry } from '../../types/index.ts';
import { loadGeminiService } from '../geminiServiceLoader.ts';
import { extractJsonArrayFromText } from './textProcessing.ts';
import {
  SUMMARY_THRESHOLD,
  shouldTriggerSummary,
  peekPendingMessages,
  dropPendingMessages
} from './pendingMessageBuffer.ts';
import type { PendingMessage } from './pendingMessageBuffer.ts';
import { addSummarizedMemory, shouldTriggerMemorySummary } from './memoryRetrieval.ts';
import { formatSafeLogError } from '../../utils/logRedaction.ts';

type SummarizedMemoryDraft = {
  text: string;
  source: ContactMemoryEntry['source'];
  weight: number;
  confidence: number;
  category: NonNullable<ContactMemoryEntry['category']>;
  topic: string;
  temporalType: NonNullable<ContactMemoryEntry['temporalType']>;
  status: NonNullable<ContactMemoryEntry['status']>;
  validDays?: number;
  expiresAt?: number;
};

const MEMORY_CATEGORIES = new Set<NonNullable<ContactMemoryEntry['category']>>([
  'identity',
  'preference',
  'relationship',
  'event',
  'emotion',
  'habit',
  'health',
  'other'
]);
const MEMORY_TEMPORAL_TYPES = new Set<NonNullable<ContactMemoryEntry['temporalType']>>([
  'stable',
  'short_term',
  'one_time',
  'unknown'
]);
const MEMORY_STATUSES = new Set<NonNullable<ContactMemoryEntry['status']>>([
  'active',
  'ended',
  'corrected',
  'unknown'
]);
const DAY_MS = 1000 * 60 * 60 * 24;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const normalizeText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'bigint') return String(value);
  return '';
};

const normalizeEnum = <T extends string>(value: unknown, allowed: Set<T>): T | undefined => {
  const normalized = normalizeText(value);
  return allowed.has(normalized as T) ? normalized as T : undefined;
};

const normalizeStrictMemorySource = (value: unknown): ContactMemoryEntry['source'] | undefined => {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'user') return 'user';
  if (raw === 'model' || raw === 'self') return 'model';
  if (raw === 'system') return 'system';
  return undefined;
};

const normalizeValidDays = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return undefined;
  return clamp(Math.round(normalized), 1, 365);
};

const normalizeTopic = (value: unknown): string | undefined => {
  const normalized = normalizeText(value).replace(/\s+/g, ' ');
  return normalized ? normalized.slice(0, 24) : undefined;
};

const formatMemoryContactLabel = (value: unknown): string => {
  const name = normalizeText(value);
  return name || '当前联系人（未提供姓名）';
};

const normalizeSummarizedMemoryDraft = (item: any, timestamp: number): SummarizedMemoryDraft | null => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const text = normalizeText(item.text);
  const source = normalizeStrictMemorySource(item.source);
  const rawWeight = Number(item.weight);
  const rawConfidence = Number(item.confidence);
  const category = normalizeEnum(item.category, MEMORY_CATEGORIES);
  const topic = normalizeTopic(item.topic);
  const temporalType = normalizeEnum(item.temporalType, MEMORY_TEMPORAL_TYPES);
  const status = normalizeEnum(item.status, MEMORY_STATUSES);
  if (
    !text
    || !source
    || !Number.isFinite(rawWeight)
    || !Number.isFinite(rawConfidence)
    || !category
    || !topic
    || !temporalType
    || !status
  ) return null;

  const validDays = normalizeValidDays(item?.validDays);
  const rawExpiresAt = Number(item?.expiresAt);
  const hasFutureExpiresAt = Number.isFinite(rawExpiresAt) && rawExpiresAt > timestamp;
  if ((temporalType === 'short_term' || temporalType === 'one_time') && !validDays && !hasFutureExpiresAt) {
    return null;
  }
  const expiresAt = hasFutureExpiresAt
    ? rawExpiresAt
    : (validDays ? timestamp + validDays * DAY_MS : undefined);
  return {
    text,
    source,
    weight: clamp(rawWeight, 1, 5),
    confidence: clamp(rawConfidence, 0.2, 1),
    category,
    topic,
    temporalType,
    status,
    validDays,
    expiresAt
  };
};

export const normalizeSummarizedMemoryDrafts = (items: unknown[], timestamp: number): SummarizedMemoryDraft[] => {
  const normalized = items.map((item) => normalizeSummarizedMemoryDraft(item, timestamp));
  if (normalized.some((item) => !item)) {
    throw new Error('AI 记忆总结返回了不完整的结构化记忆');
  }
  return normalized as SummarizedMemoryDraft[];
};

export const formatMemorySummaryLogError = (error: unknown): { name: string; message: string } => {
  return formatSafeLogError(error, 240);
};

/**
 * 使用 AI 总结待处理的消息
 * 将缓冲区的消息总结后存入长期记忆
 */
export const summarizeMessagesWithAI = async (
  messages: PendingMessage[],
  contactName: string,
  aiSettings: { provider: string; apiKey: string; model: string; baseUrl: string },
  minMessages: number = SUMMARY_THRESHOLD
): Promise<SummarizedMemoryDraft[]> => {
  const threshold = Math.max(1, Number(minMessages || SUMMARY_THRESHOLD));
  if (messages.length < threshold) {
    throw new Error(`待总结消息不足（当前 ${messages.length}，阈值 ${threshold}）`);
  }

  const systemPrompt = `你是一个专业的记忆整理助手。你的任务是分析对话内容，提取出值得长期记住的关键信息。

重要原则：
1. **提取关键信息**: 重点关注个人喜好、重要事件、关系变化、习惯特征、情感状态、身份背景等
2. **去除琐碎内容**: 跳过日常寒暄、无意义的闲聊、纯情绪表达
3. **整合相关信息**: 将相关的多条消息合并为一条完整的记忆
4. **保持准确**: 总结的内容必须基于原始对话，不能编造
5. **优先稳定事实**: 明确表达的长期偏好、身份、关系、习惯优先；临时情绪和一次性事件降低重要度
6. **识别时效性**: 像“最近感冒了”“这几天很焦虑”“今天要考试”这类只代表短期状态，必须在 text 中保留时间词（如“最近/今天/这几天”），不要改写成永久事实
7. **识别状态结束**: 如果对话明确表示某个状态已经好了、结束、取消或解决，要提取“状态已结束”的记忆，而不是继续保留旧状态
8. **识别用户纠正**: 如果用户明确否定或更新旧偏好/身份/关系/习惯（如“不喜欢拿铁了”“现在改喝红茶”“不是同事了”“现在不熬夜了”），提取新的说法，不要继续强化旧说法
9. **简洁明了**: 每条记忆控制在50字以内

请直接返回一个JSON数组，每个元素是一个对象，包含：
- text: 总结后的记忆内容（字符串）
- source: 主要来源，可选值为 "user"（用户说的）、"self"（我说的/你扮演角色说的）
- weight: 重要程度 1-5（数字，越重要越高）
- confidence: 可信度 0.2-1（越确定越高；推测内容必须低于0.5）
- category: "identity" | "preference" | "relationship" | "event" | "emotion" | "habit" | "health" | "other"
- topic: 这条记忆的具体主题，24字以内；用于判断同一事实是否被结束或修正，如“热拿铁”“同事关系”“感冒”“今晚复诊”
- temporalType: "stable"（长期稳定）| "short_term"（近期状态）| "one_time"（一次性日程/事件）| "unknown"（无法判断）
- status: "active"（仍可能有效）| "ended"（已结束/已恢复/已取消）| "corrected"（修正了旧事实）| "unknown"
- validDays: 当 temporalType 为 "short_term" 或 "one_time" 时必须给 1-365 的数字；稳定事实可省略

示例输出格式：
[
  {"text": "用户喜欢喝咖啡，尤其偏爱拿铁", "source": "user", "weight": 3, "confidence": 0.9, "category": "preference", "topic": "拿铁", "temporalType": "stable", "status": "active"},
  {"text": "用户最近在准备考试，压力较大", "source": "user", "weight": 4, "confidence": 0.85, "category": "event", "topic": "考试", "temporalType": "short_term", "status": "active", "validDays": 14},
  {"text": "用户感冒已经好了", "source": "user", "weight": 3, "confidence": 0.9, "category": "health", "topic": "感冒", "temporalType": "short_term", "status": "ended", "validDays": 30}
]

只返回JSON数组，不要添加任何解释性文字。`;

  // 构建对话摘要
  const conversationText = messages
    .map(m => `[${m.source === 'user' ? '用户' : '我'}] ${m.text}`)
    .join('\n');

  const userPrompt = `以下是与"${formatMemoryContactLabel(contactName)}"的对话片段（共${messages.length}条），请提取关键记忆：\n\n${conversationText}`;

  try {
    const { GeminiService } = await loadGeminiService();
    const geminiService = new GeminiService();

    const response = await geminiService.getChatReply(
      [{ role: 'user' as const, text: userPrompt }],
      systemPrompt,
      aiSettings
    );

    const summarized = extractJsonArrayFromText(response);

    console.log(`[MemorySummary] Summarized ${messages.length} messages into ${summarized.length} memories`);
    const now = Date.now();
    return normalizeSummarizedMemoryDrafts(summarized, now);

  } catch (error) {
    console.error('[MemorySummary] AI summarization failed:', formatMemorySummaryLogError(error));
    throw error instanceof Error ? error : new Error('AI 总结消息失败');
  }
};

export const formatMemoryEntryForResummary = (memory: ContactMemoryEntry): string => {
  const record = {
    source: memory.source,
    text: memory.text,
    category: memory.category,
    topic: memory.topic,
    temporalType: memory.temporalType,
    status: memory.status,
    validDays: memory.validDays,
    expiresAt: memory.expiresAt,
    weight: memory.weight,
    confidence: memory.confidence
  };
  return JSON.stringify(record);
};

/**
 * 使用 AI 总结长期记忆（已有记忆的再总结）
 */
export const summarizeMemoriesWithAI = async (
  memories: ContactMemoryEntry[],
  contactName: string,
  aiSettings: { provider: string; apiKey: string; model: string; baseUrl: string }
): Promise<ContactMemoryEntry[]> => {
  if (memories.length < SUMMARY_THRESHOLD) {
    throw new Error(`长期记忆不足（当前 ${memories.length}，阈值 ${SUMMARY_THRESHOLD}）`);
  }

  const systemPrompt = `你是一个专业的记忆整理助手。你的任务是分析并整合对话中积累的记忆条目，将它们总结为更精炼、更有价值的长期记忆。

重要原则：
1. **整合与精炼**: 将相关的多条记忆合并为一条更完整的记忆
2. **保留关键信息**: 重点关注个人喜好、重要事件、关系变化、习惯特征、情感状态等
3. **去除冗余**: 删除重复、琐碎或不再重要的信息
4. **保持准确**: 总结的内容必须基于原始记忆，不能编造
5. **保留确定性**: 多次出现、明确表达的事实可信度更高；含糊或过时内容降低可信度
6. **处理时效性**: 短期身体状态、情绪、日程和事件必须保留时间词；过期、已结束或被新消息修正的状态不要继续总结成当前事实
7. **处理用户纠正**: 当新记忆明确否定或更新旧偏好/身份/关系/习惯时，以更新后的说法为准，不要把相反旧记忆继续合并回结果
8. **结构字段优先**: 输入条目里的 category、topic、temporalType、status、validDays、expiresAt 是结构化事实边界，必须作为权威上下文使用；不要只根据 text 自然语言重新猜测状态是否有效
9. **简洁明了**: 每条总结后的记忆控制在50字以内

请直接返回一个JSON数组，每个元素是一个对象，包含：
- text: 总结后的记忆内容（字符串）
- source: 来源，可选值为 "user"、"self"、"system"（保持原始主要来源）
- weight: 重要程度 1-5（数字，越重要越高）
- confidence: 可信度 0.2-1
- category: "identity" | "preference" | "relationship" | "event" | "emotion" | "habit" | "health" | "other"
- topic: 这条记忆的具体主题，24字以内；用于判断同一事实是否被结束或修正
- temporalType: "stable" | "short_term" | "one_time" | "unknown"
- status: "active" | "ended" | "corrected" | "unknown"
- validDays: 当 temporalType 为 "short_term" 或 "one_time" 时必须给 1-365 的数字；稳定事实可省略

示例输出格式：
[
  {"text": "用户喜欢喝咖啡，尤其偏爱拿铁", "source": "user", "weight": 3, "confidence": 0.9, "category": "preference", "topic": "拿铁", "temporalType": "stable", "status": "active"},
  {"text": "用户最近在准备考试，压力较大", "source": "user", "weight": 4, "confidence": 0.8, "category": "event", "topic": "考试", "temporalType": "short_term", "status": "active", "validDays": 14}
]

只返回JSON数组，不要添加任何解释性文字。`;

  const memoryText = memories
    .map((memory) => `- ${formatMemoryEntryForResummary(memory)}`)
    .join('\n');

  const userPrompt = `以下是"${formatMemoryContactLabel(contactName)}"相关的长期记忆条目（共${memories.length}条）。每条都是结构化 JSON 记录，请整合总结为更精炼的记忆，并保留 topic、temporalType、status 等结构语义：\n\n${memoryText}`;

  try {
    const { GeminiService } = await loadGeminiService();
    const geminiService = new GeminiService();

    const response = await geminiService.getChatReply(
      [{ role: 'user' as const, text: userPrompt }],
      systemPrompt,
      aiSettings
    );

    const summarized = extractJsonArrayFromText(response);

    // 转换为 ContactMemoryEntry 格式
    const now = Date.now();
    const normalizedSummaries = normalizeSummarizedMemoryDrafts(summarized, now);
    const summarizedEntries: ContactMemoryEntry[] = normalizedSummaries.map((normalized, idx) => {
      return {
        id: `mem-summary-${now}-${idx}`,
        text: normalized.text.slice(0, 120),
        source: normalized.source,
        timestamp: now,
        weight: normalized.weight,
        confidence: normalized.confidence,
        occurrenceCount: 1,
        lastReinforcedAt: now,
        category: normalized.category,
        topic: normalized.topic,
        temporalType: normalized.temporalType,
        status: normalized.status,
        validDays: normalized.validDays,
        expiresAt: normalized.expiresAt
      };
    });

    console.log(`[MemorySummary] Summarized ${memories.length} memories into ${summarizedEntries.length} entries`);
    return summarizedEntries;

  } catch (error) {
    console.error('[MemorySummary] AI summarization failed:', formatMemorySummaryLogError(error));
    throw error instanceof Error ? error : new Error('AI 总结长期记忆失败');
  }
};

/**
 * 检查并执行自动记忆总结
 */
export const checkAndSummarizeMemories = async (
  memoryMap: ContactMemories,
  contactId: string,
  contactName: string,
  aiSettings: { provider: string; apiKey: string; model: string; baseUrl: string },
  lastSummaryCount: number,
  onSummaryComplete: (newMemories: ContactMemoryEntry[], newCount: number) => void
): Promise<boolean> => {
  if (!shouldTriggerMemorySummary(memoryMap, contactId, lastSummaryCount)) {
    return false;
  }

  const memories = memoryMap[contactId] || [];
  console.log(`[MemorySummary] Triggering auto-summary for contact ${contactId}, ${memories.length} memories`);

  try {
    const summarized = await summarizeMemoriesWithAI(memories, contactName, aiSettings);

    // 回调通知完成
    onSummaryComplete(summarized, summarized.length);

    return true;
  } catch (error) {
    console.error('[MemorySummary] Auto-summary failed:', formatMemorySummaryLogError(error));
    return false;
  }
};

/**
 * 处理待总结的消息（新接口）
 * 检查缓冲区，如果达到阈值则使用AI总结后存入长期记忆
 */
export const processPendingMessagesWithAI = async (
  memoryMap: ContactMemories,
  contactId: string,
  contactName: string,
  aiSettings: { provider: string; apiKey: string; model: string; baseUrl: string },
  onMemoryUpdate: (newMemories: ContactMemoryEntry[]) => void,
  summaryThreshold: number = SUMMARY_THRESHOLD
): Promise<boolean> => {
  // 检查是否有足够的待处理消息
  const threshold = Math.max(1, Number(summaryThreshold || SUMMARY_THRESHOLD));
  if (!shouldTriggerSummary(contactId, threshold)) {
    return false;
  }

  const messages = peekPendingMessages(contactId);
  if (messages.length < threshold) {
    return false;
  }

  console.log(`[MemorySummary] Processing ${messages.length} pending messages for contact ${contactId}`);

  try {
    // 使用AI总结消息
    const summarized = await summarizeMessagesWithAI(messages, contactName, aiSettings, threshold);

    // 将总结后的记忆添加到长期记忆
    const newMemoryMap = addSummarizedMemory(memoryMap, contactId, summarized);

    dropPendingMessages(contactId, messages);

    // 回调通知
    onMemoryUpdate(newMemoryMap[contactId] || []);

    return true;
  } catch (error) {
    console.error('[MemorySummary] Process pending messages failed:', formatMemorySummaryLogError(error));
    return false;
  }
};
