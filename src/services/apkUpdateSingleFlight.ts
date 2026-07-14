import type { StartUpdateResult } from './apkUpdateTypes';

export function createApkUpdateSingleFlightRunner() {
  let activePromise: Promise<StartUpdateResult> | null = null;

  return (task: () => Promise<StartUpdateResult>): Promise<StartUpdateResult> => {
    if (activePromise) return activePromise;
    activePromise = Promise.resolve()
      .then(task)
      .finally(() => {
        activePromise = null;
      });
    return activePromise;
  };
}
