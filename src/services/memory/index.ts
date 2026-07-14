// Re-export all public functions and types from submodules

// Types
export type { PendingMessage } from './pendingMessageBuffer.ts';

// Pending message buffer
export {
  addPendingMessage,
  getPendingMessageCount,
  consumePendingMessages,
  shouldTriggerSummary,
  clearPendingMessages,
  SUMMARY_THRESHOLD
} from './pendingMessageBuffer.ts';

// AI summarization
export {
  summarizeMessagesWithAI,
  summarizeMemoriesWithAI,
  checkAndSummarizeMemories,
  processPendingMessagesWithAI
} from './aiSummarization.ts';

// Memory retrieval and management
export {
  addSummarizedMemory,
  getContactMemoryPrompt,
  selectContactMemoriesForPrompt,
  rankContactMemories,
  clearContactMemories,
  shouldTriggerMemorySummary
} from './memoryRetrieval.ts';

// Text processing utilities
export {
  cleanText,
  normalizeForDedup,
  formatDate,
  extractJsonArrayFromText
} from './textProcessing.ts';
