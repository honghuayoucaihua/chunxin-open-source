// Backward compatibility: re-export everything from the new modular structure
export type { PendingMessage } from './memory/index.ts';

export {
  addPendingMessage,
  getPendingMessageCount,
  consumePendingMessages,
  shouldTriggerSummary,
  clearPendingMessages,
  SUMMARY_THRESHOLD,
  summarizeMessagesWithAI,
  summarizeMemoriesWithAI,
  checkAndSummarizeMemories,
  processPendingMessagesWithAI,
  addSummarizedMemory,
  getContactMemoryPrompt,
  selectContactMemoriesForPrompt,
  rankContactMemories,
  clearContactMemories,
  shouldTriggerMemorySummary,
  cleanText,
  normalizeForDedup,
  formatDate,
  extractJsonArrayFromText
} from './memory/index.ts';
