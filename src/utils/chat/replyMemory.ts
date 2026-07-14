import type { AISettings, ContactMemories, ContactMemoryEntry } from '../../types';
import {
  addPendingMessage,
  shouldTriggerSummary
} from '../../services/contactMemoryService.ts';
import { loadContactMemoryAiRuntime } from '../../services/contactMemoryAiRuntimeLoader.ts';

type MemorySource = ContactMemoryEntry['source'];
type SetContactMemories = (
  updater: ContactMemories | ((prev: ContactMemories) => ContactMemories)
) => void;

type AppendMemoryEntriesOptions = {
  contactId: string;
  texts: ReadonlyArray<string | null | undefined>;
  source: MemorySource;
  contactName: string;
  threshold?: number;
  contactMemories: ContactMemories;
  aiSettings: AISettings;
  setContactMemories: SetContactMemories;
  errorLogScope?: string;
};

type RuntimeProcessFn = (
  memoryMap: ContactMemories,
  contactId: string,
  contactName: string,
  aiSettings: AISettings,
  setMemories: (newMemories: ContactMemories[string]) => void,
  threshold?: number
) => Promise<void>;

type AppendMemoryEntriesDeps = {
  addPendingMessageFn?: typeof addPendingMessage;
  shouldTriggerSummaryFn?: typeof shouldTriggerSummary;
  loadRuntime?: () => Promise<{ processPendingMessagesWithAI: RuntimeProcessFn }>;
};

const DEFAULT_ERROR_LOG_SCOPE = '[replyMemory]';
const inFlightSummaryContactIds = new Set<string>();

const normalizeThreshold = (threshold?: number): number => {
  if (!Number.isFinite(threshold)) return 10;
  return Math.max(1, Number(threshold));
};

const normalizeText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'bigint') return String(value);
  return '';
};

const normalizeMemoryTexts = (texts: ReadonlyArray<string | null | undefined>): string[] => (
  texts
    .map((item) => normalizeText(item))
    .filter(Boolean)
);

const normalizeMemoryKey = (value: unknown): string => (
  normalizeText(value)
    .trim()
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '')
);

const getMemoryEntryScore = (entry: ContactMemoryEntry): number => (
  Number(entry.lastReinforcedAt || entry.timestamp || 0)
  + Number(entry.timestamp || 0) * 0.01
  + Math.max(0, Number(entry.occurrenceCount || 1)) * 1000
  + Math.max(0, Number(entry.weight || 1)) * 100
  + Math.max(0, Number(entry.confidence || 0.5)) * 100
);

export const mergeContactMemoryEntries = (
  currentEntries: ReadonlyArray<ContactMemoryEntry> = [],
  incomingEntries: ReadonlyArray<ContactMemoryEntry> = []
): ContactMemoryEntry[] => {
  const byKey = new Map<string, ContactMemoryEntry>();
  [...currentEntries, ...incomingEntries].forEach((entry) => {
    const key = normalizeMemoryKey(entry?.text);
    if (!key) return;
    const existing = byKey.get(key);
    if (!existing || getMemoryEntryScore(entry) >= getMemoryEntryScore(existing)) {
      byKey.set(key, entry);
    }
  });
  return Array.from(byKey.values()).sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
};

export const appendMemoryEntriesWithAutoSummary = (
  options: AppendMemoryEntriesOptions,
  deps: AppendMemoryEntriesDeps = {}
): void => {
  const contactId = String(options.contactId || '').trim();
  if (!contactId) return;

  const normalizedTexts = normalizeMemoryTexts(options.texts);
  if (normalizedTexts.length === 0) return;

  const threshold = normalizeThreshold(options.threshold);
  const addPendingMessageFn = deps.addPendingMessageFn || addPendingMessage;
  const shouldTriggerSummaryFn = deps.shouldTriggerSummaryFn || shouldTriggerSummary;
  const loadRuntime = deps.loadRuntime || loadContactMemoryAiRuntime;
  const pendingSource: 'user' | 'model' = options.source === 'user' ? 'user' : 'model';
  normalizedTexts.forEach((text) => {
    addPendingMessageFn(contactId, text, pendingSource);
  });

  if (!shouldTriggerSummaryFn(contactId, threshold)) return;
  if (inFlightSummaryContactIds.has(contactId)) return;
  inFlightSummaryContactIds.add(contactId);

  void (async () => {
    try {
      const runtime = await loadRuntime();
      await (runtime as { processPendingMessagesWithAI: RuntimeProcessFn }).processPendingMessagesWithAI(
        options.contactMemories,
        contactId,
        options.contactName,
        options.aiSettings,
        (newMemories) => {
          options.setContactMemories((prev) => ({
            ...prev,
            [contactId]: mergeContactMemoryEntries(prev[contactId] || [], newMemories || [])
          }));
        },
        threshold
      );
    } catch (error) {
      const scope = String(options.errorLogScope || DEFAULT_ERROR_LOG_SCOPE).trim() || DEFAULT_ERROR_LOG_SCOPE;
      console.error(`${scope} 加载记忆总结运行时失败:`, error);
    } finally {
      inFlightSummaryContactIds.delete(contactId);
    }
  })();
};

export const appendMemoryEntryWithAutoSummary = (
  options: Omit<AppendMemoryEntriesOptions, 'texts'> & { text: string | null | undefined },
  deps?: AppendMemoryEntriesDeps
): void => {
  appendMemoryEntriesWithAutoSummary({
    ...options,
    texts: [options.text]
  }, deps);
};
