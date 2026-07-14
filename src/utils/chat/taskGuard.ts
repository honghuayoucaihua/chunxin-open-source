export type TaskGuardState = 'current' | 'stale';

export type TaskGuard = {
  version: number;
  isCurrent: () => boolean;
  getState: () => TaskGuardState;
};

export const createNumericVersionGuard = (
  getCurrentVersion: () => number,
  expectedVersion: number
): TaskGuard => {
  return {
    version: expectedVersion,
    isCurrent: () => Number(getCurrentVersion() || 0) === expectedVersion,
    getState: () => Number(getCurrentVersion() || 0) === expectedVersion ? 'current' : 'stale'
  };
};
