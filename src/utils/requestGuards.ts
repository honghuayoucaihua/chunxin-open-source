export const tryEnterBooleanGuard = (guard: { current: boolean }): boolean => {
  if (guard.current) return false;
  guard.current = true;
  return true;
};

export const leaveBooleanGuard = (guard: { current: boolean }): void => {
  guard.current = false;
};

export const tryEnterKeyedGuard = (guard: Set<string>, key: string): boolean => {
  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) return false;
  if (guard.has(normalizedKey)) return false;
  guard.add(normalizedKey);
  return true;
};

export const leaveKeyedGuard = (guard: Set<string>, key: string): void => {
  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) return;
  guard.delete(normalizedKey);
};
