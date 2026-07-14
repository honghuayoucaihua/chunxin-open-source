let contactMemoryAiRuntimePromise: Promise<typeof import('./memory/aiSummarization')> | null = null;

export const loadContactMemoryAiRuntime = () => {
  if (!contactMemoryAiRuntimePromise) {
    contactMemoryAiRuntimePromise = import('./memory/aiSummarization');
  }
  return contactMemoryAiRuntimePromise;
};
