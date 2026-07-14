import { useCallback } from 'react';
import type { ApkUpdateInfo } from '../services/apkUpdateService';
import { APK_UPDATE_DISMISS_STORAGE_KEY, buildApkUpdateIdentity } from '../appBootstrapUtils';

type DismissedApkUpdate = {
  version: string;
  versionCode: number;
  id: string;
  skippedAt: number;
};

const readDismissedApkUpdate = (): DismissedApkUpdate | null => {
  try {
    const raw = localStorage.getItem(APK_UPDATE_DISMISS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      version: String(parsed.version || ''),
      versionCode: Number(parsed.versionCode || 0),
      id: String(parsed.id || ''),
      skippedAt: Number(parsed.skippedAt || 0)
    };
  } catch {
    return null;
  }
};

export const useApkUpdateDismiss = () => {
  const dismissApkUpdate = useCallback((info: ApkUpdateInfo | null | undefined) => {
    const id = info ? buildApkUpdateIdentity(info) : null;
    if (!id) return;
    try {
      localStorage.setItem(APK_UPDATE_DISMISS_STORAGE_KEY, JSON.stringify({
        version: String(info?.version || ''),
        versionCode: Number(info?.versionCode || 0),
        id,
        skippedAt: Date.now()
      }));
    } catch {
      // ignore storage failures
    }
  }, []);

  const isApkUpdateDismissed = useCallback((info: ApkUpdateInfo): boolean => {
    const nextId = buildApkUpdateIdentity(info);
    if (!nextId) return false;
    const dismissed = readDismissedApkUpdate();
    return !!dismissed && dismissed.id === nextId;
  }, []);

  return {
    dismissApkUpdate,
    isApkUpdateDismissed
  };
};
