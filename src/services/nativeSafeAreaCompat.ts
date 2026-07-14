import { Capacitor } from '@capacitor/core';
import { getNativeVersionCode } from './appVersionService.ts';

const LEGACY_ANDROID_SAFE_AREA_MAX_VERSION_CODE = 10187;
const LEGACY_ANDROID_SAFE_TOP_CAP_PX = 59;
const LEGACY_ANDROID_SAFE_BOTTOM_CAP_PX = 16;

export const resolveLegacyAndroidSafeAreaCompat = (params: {
  isNativeAndroid: boolean;
  versionCode: number;
}): {
  legacy: boolean;
  safeTopCapPx: number;
  safeBottomCapPx: number;
} => {
  if (!params.isNativeAndroid) {
    return { legacy: false, safeTopCapPx: 59, safeBottomCapPx: 34 };
  }
  const versionCode = Math.floor(Number(params.versionCode || 0));
  if (versionCode > 0 && versionCode <= LEGACY_ANDROID_SAFE_AREA_MAX_VERSION_CODE) {
    return {
      legacy: true,
      safeTopCapPx: LEGACY_ANDROID_SAFE_TOP_CAP_PX,
      safeBottomCapPx: LEGACY_ANDROID_SAFE_BOTTOM_CAP_PX
    };
  }
  return { legacy: false, safeTopCapPx: 59, safeBottomCapPx: 34 };
};

export const applyLegacyAndroidSafeAreaCompat = async (): Promise<void> => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  if (!isNativeAndroid) {
    root.classList.remove('legacy-android-safe-area');
    root.style.removeProperty('--safe-top-cap');
    root.style.removeProperty('--safe-bottom-cap');
    delete root.dataset.nativeVersionCode;
    return;
  }

  const versionCode = await getNativeVersionCode();
  root.dataset.nativeVersionCode = String(versionCode || 0);
  const compat = resolveLegacyAndroidSafeAreaCompat({ isNativeAndroid, versionCode });
  if (compat.legacy) {
    root.classList.add('legacy-android-safe-area');
  } else {
    root.classList.remove('legacy-android-safe-area');
  }
  root.style.setProperty('--safe-top-cap', `${compat.safeTopCapPx}px`);
  root.style.setProperty('--safe-bottom-cap', `${compat.safeBottomCapPx}px`);
};
