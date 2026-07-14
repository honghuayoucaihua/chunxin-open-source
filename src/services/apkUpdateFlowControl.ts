import type { ApkUpdateInfo, DownloadProgress } from './apkUpdateTypes';

export type ApkAutoCheckSkipReason =
  | 'too-soon'
  | 'checking'
  | 'dialog-open'
  | 'downloading'
  | 'recently-checked';

type ResolveApkAutoCheckSkipReasonInput = {
  now: number;
  lastStartedAt: number;
  minGapMs: number;
  lastAutoCheckedAt?: number;
  autoCheckCacheMs?: number;
  isChecking: boolean;
  hasVisibleDialog: boolean;
  isDownloading: boolean;
};

type ApkUpdateDialogState = {
  showDialog: boolean;
  info: ApkUpdateInfo | null;
  progress: DownloadProgress | null;
  isDownloading: boolean;
};

export function resolveApkAutoCheckSkipReason({
  now,
  lastStartedAt,
  minGapMs,
  lastAutoCheckedAt = 0,
  autoCheckCacheMs = 0,
  isChecking,
  hasVisibleDialog,
  isDownloading
}: ResolveApkAutoCheckSkipReasonInput): ApkAutoCheckSkipReason | null {
  if (now - lastStartedAt < minGapMs) return 'too-soon';
  if (isChecking) return 'checking';
  if (isDownloading) return 'downloading';
  if (hasVisibleDialog) return 'dialog-open';
  if (autoCheckCacheMs > 0 && lastAutoCheckedAt > 0 && now - lastAutoCheckedAt < autoCheckCacheMs) {
    return 'recently-checked';
  }
  return null;
}

export function createClosedApkUpdateDialogState(): ApkUpdateDialogState {
  return {
    showDialog: false,
    info: null,
    progress: null,
    isDownloading: false
  };
}
