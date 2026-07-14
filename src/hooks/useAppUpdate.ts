import { useEffect, useRef } from 'react';
import { registerPWAUpdate, getUpdateStatus } from '../services/updateService';
import { checkApkUpdate, ApkUpdateInfo, isAndroidPlatform } from '../services/apkUpdateService';
import { onAppStateChange } from '../services/nativeService';
import { resolveApkAutoCheckSkipReason } from '../services/apkUpdateFlowControl';
import { readLastApkAutoCheckAt, saveLastApkAutoCheckAt } from '../services/apkUpdateAutoCheckStorage';

const APK_STARTUP_CHECK_DELAY_MS = 2500;
const APK_AUTO_CHECK_CACHE_MS = 6 * 60 * 60 * 1000;
const APK_PERIODIC_CHECK_INTERVAL_MS = APK_AUTO_CHECK_CACHE_MS;
const APK_MIN_CHECK_GAP_MS = 5000;

interface UseAppUpdateParams {
  setShowPwaUpdateDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setApkUpdateInfo: React.Dispatch<React.SetStateAction<ApkUpdateInfo | null>>;
  setShowApkUpdateDialog: React.Dispatch<React.SetStateAction<boolean>>;
  showApkUpdateDialog: boolean;
  isDownloading: boolean;
  isApkUpdateDismissed: (info: ApkUpdateInfo) => boolean;
}

interface ApkCheckHandlers {
  setApkUpdateInfo: React.Dispatch<React.SetStateAction<ApkUpdateInfo | null>>;
  setShowApkUpdateDialog: React.Dispatch<React.SetStateAction<boolean>>;
  dismissCheckRef: React.MutableRefObject<(info: ApkUpdateInfo) => boolean>;
  dialogVisibleRef: React.MutableRefObject<boolean>;
  downloadingRef: React.MutableRefObject<boolean>;
}

function createApkCheckRunner(handlers: ApkCheckHandlers): (reason: string) => Promise<void> {
  let isChecking = false;
  let lastStartedAt = 0;
  return async (reason: string) => {
    const now = Date.now();
    const skipReason = resolveApkAutoCheckSkipReason({
      now,
      lastStartedAt,
      minGapMs: APK_MIN_CHECK_GAP_MS,
      lastAutoCheckedAt: readLastApkAutoCheckAt(),
      autoCheckCacheMs: APK_AUTO_CHECK_CACHE_MS,
      isChecking,
      hasVisibleDialog: handlers.dialogVisibleRef.current,
      isDownloading: handlers.downloadingRef.current
    });
    if (skipReason) {
      console.log('[APK 更新] 已跳过自动检查:', { reason, skipReason });
      return;
    }
    isChecking = true;
    lastStartedAt = now;
    saveLastApkAutoCheckAt(now);
    try {
      const info = await checkApkUpdate();
      console.log('[APK 更新] 自动检查结果:', { reason, ...info });
      if (info.error) {
        console.warn('[APK 更新] 自动检查异常:', { reason, error: info.error });
      }
      if (!info.hasUpdate) return;
      if (handlers.dismissCheckRef.current(info)) {
        console.log('[APK 更新] 已忽略本次更新提示:', { version: info.version, versionCode: info.versionCode });
        return;
      }
      handlers.setApkUpdateInfo(info);
      handlers.setShowApkUpdateDialog(true);
    } catch (error) {
      console.warn('[APK 更新] 自动检查失败:', error);
    } finally {
      isChecking = false;
    }
  };
}

function setupApkCheckSchedule(checkApk: (reason: string) => Promise<void>): () => void {
  const startupTimer = setTimeout(() => { void checkApk('startup'); }, APK_STARTUP_CHECK_DELAY_MS);
  const periodicTimer = setInterval(() => { void checkApk('periodic-15m'); }, APK_PERIODIC_CHECK_INTERVAL_MS);
  const removeAppStateListener = onAppStateChange(() => {
    void checkApk('app-resume');
  });
  const onOnline = () => {
    void checkApk('network-online');
  };
  globalThis.addEventListener('online', onOnline);
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') void checkApk('visibility-visible');
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  return () => {
    clearTimeout(startupTimer);
    clearInterval(periodicTimer);
    removeAppStateListener();
    globalThis.removeEventListener('online', onOnline);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}

/**
 * Handles PWA update detection and APK update checking
 */
export function useAppUpdate({
  setShowPwaUpdateDialog,
  setApkUpdateInfo,
  setShowApkUpdateDialog,
  showApkUpdateDialog,
  isDownloading,
  isApkUpdateDismissed,
}: UseAppUpdateParams): void {
  const dismissCheckRef = useRef(isApkUpdateDismissed);
  const dialogVisibleRef = useRef(showApkUpdateDialog);
  const downloadingRef = useRef(isDownloading);
  useEffect(() => {
    dismissCheckRef.current = isApkUpdateDismissed;
  }, [isApkUpdateDismissed]);
  useEffect(() => {
    dialogVisibleRef.current = showApkUpdateDialog;
  }, [showApkUpdateDialog]);
  useEffect(() => {
    downloadingRef.current = isDownloading;
  }, [isDownloading]);

  // PWA update detection
  useEffect(() => {
    if (isAndroidPlatform()) return;

    registerPWAUpdate((info) => {
      if (info.needRefresh) {
        setShowPwaUpdateDialog(true);
      }
    });

    const info = getUpdateStatus();
    if (info.needRefresh) {
      setShowPwaUpdateDialog(true);
    }
  }, [setShowPwaUpdateDialog]);

  // APK update detection (Android only)
  useEffect(() => {
    if (!isAndroidPlatform()) return;
    const checkApk = createApkCheckRunner({
      setApkUpdateInfo,
      setShowApkUpdateDialog,
      dismissCheckRef,
      dialogVisibleRef,
      downloadingRef
    });
    return setupApkCheckSchedule(checkApk);
  }, [setApkUpdateInfo, setShowApkUpdateDialog]);
}
