let proactiveChatRuntimePromise: Promise<typeof import('./proactiveChatRuntime')> | null = null;

export const loadProactiveChatRuntime = () => {
  if (!proactiveChatRuntimePromise) {
    proactiveChatRuntimePromise = import('./proactiveChatRuntime');
  }
  return proactiveChatRuntimePromise;
};
