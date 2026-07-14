export const DESKTOP_LOCK_PASSCODE_MIN_LENGTH = 4;
export const DESKTOP_LOCK_PASSCODE_MAX_LENGTH = 6;

export const normalizeDesktopLockPasscode = (value: unknown): string => {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, DESKTOP_LOCK_PASSCODE_MAX_LENGTH);
};

export const hasDesktopLockPasscode = (value: unknown): boolean => {
  return normalizeDesktopLockPasscode(value).length >= DESKTOP_LOCK_PASSCODE_MIN_LENGTH;
};
