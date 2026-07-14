import { Capacitor } from '@capacitor/core';

const MS_TILE_COLOR_META_SELECTOR = 'meta[name="msapplication-TileColor"]';
const ANDROID_USER_AGENT_PATTERN = /Android/i;
const IOS_USER_AGENT_PATTERN = /iPhone|iPad|iPod/i;

const isStandaloneDisplayMode = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
};

const isIOSStandalonePwa = (): boolean => {
  return IOS_USER_AGENT_PATTERN.test(window.navigator.userAgent || '')
    && isStandaloneDisplayMode();
};

export const isAndroidStandalonePwa = (): boolean => {
  return !Capacitor.isNativePlatform()
    && ANDROID_USER_AGENT_PATTERN.test(window.navigator.userAgent || '')
    && isStandaloneDisplayMode();
};

const shouldSyncBrowserShellSurface = (): boolean => {
  return !Capacitor.isNativePlatform() && !isIOSStandalonePwa();
};

export const syncBrowserShellSurface = (surfaceColor: string): void => {
  const tileColorMeta = document.querySelector<HTMLMetaElement>(MS_TILE_COLOR_META_SELECTOR);
  tileColorMeta?.setAttribute('content', surfaceColor);

  if (!shouldSyncBrowserShellSurface()) return;

  document.documentElement.style.backgroundColor = surfaceColor;
  document.documentElement.style.colorScheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  document.body.style.backgroundColor = surfaceColor;
};
