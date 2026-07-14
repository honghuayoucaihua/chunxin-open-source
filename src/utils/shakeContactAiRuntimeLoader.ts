type ShakeContactAiRuntimeModule = typeof import('./shakeContactAiRuntime');

let shakeContactAiRuntimePromise: Promise<ShakeContactAiRuntimeModule> | null = null;

const loadShakeContactAiRuntime = (): Promise<ShakeContactAiRuntimeModule> => {
  if (!shakeContactAiRuntimePromise) {
    shakeContactAiRuntimePromise = import('./shakeContactAiRuntime');
  }
  return shakeContactAiRuntimePromise;
};

export const buildShakeContactByAI = async (
  ...args: Parameters<ShakeContactAiRuntimeModule['buildShakeContactByAI']>
) => {
  const runtime = await loadShakeContactAiRuntime();
  return runtime.buildShakeContactByAI(...args);
};
