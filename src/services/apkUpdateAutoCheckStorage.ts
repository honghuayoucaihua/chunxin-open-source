const APK_AUTO_CHECK_STORAGE_KEY = 'apk_auto_update_last_checked_at_v1';

let memoryLastApkAutoCheckAt = 0;

const normalizeTimestamp = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};

export function readLastApkAutoCheckAt(): number {
  try {
    const storedValue = normalizeTimestamp(localStorage.getItem(APK_AUTO_CHECK_STORAGE_KEY));
    return storedValue || memoryLastApkAutoCheckAt;
  } catch {
    return memoryLastApkAutoCheckAt;
  }
}

export function saveLastApkAutoCheckAt(value: number): void {
  memoryLastApkAutoCheckAt = normalizeTimestamp(value);
  try {
    localStorage.setItem(APK_AUTO_CHECK_STORAGE_KEY, String(memoryLastApkAutoCheckAt));
  } catch {
    // 本地存储不可用时保留内存值，避免本次运行反复检查更新。
  }
}

export const __apkUpdateAutoCheckStorageInternals = {
  key: APK_AUTO_CHECK_STORAGE_KEY,
  resetMemoryForTest: () => {
    memoryLastApkAutoCheckAt = 0;
  }
};
