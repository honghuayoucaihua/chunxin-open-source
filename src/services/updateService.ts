/**
 * PWA 更新服务
 * 基于 Service Worker 检测应用更新
 */

import { registerSW } from 'virtual:pwa-register';
import {
  claimPwaUpdateRegistration,
  releasePwaUpdateRegistration,
  type PwaUpdateRegistrationGuard
} from './pwaUpdateRegistrationGuard';

export interface PWAUpdateInfo {
  needRefresh: boolean;
  offlineReady: boolean;
}

export type UpdateCallback = (updateInfo: PWAUpdateInfo) => void;

// 当前版本 - 从 package.json 同步
const CURRENT_VERSION = '1.0.0';

const updateRegistrationGuard: PwaUpdateRegistrationGuard<UpdateCallback> = {
  callback: null,
  registered: false
};
let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null;
let currentUpdateInfo: PWAUpdateInfo = { needRefresh: false, offlineReady: false };
let updateCheckIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * 获取当前版本信息
 */
export function getCurrentVersion(): string {
  return CURRENT_VERSION;
}

/**
 * 注册 PWA 更新监听
 */
export function registerPWAUpdate(callback?: UpdateCallback): void {
  if (!claimPwaUpdateRegistration(updateRegistrationGuard, callback)) return;
  
  try {
    updateServiceWorker = registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('[PWA] 检测到新版本，自动刷新');
        currentUpdateInfo = { needRefresh: true, offlineReady: false };
        updateRegistrationGuard.callback?.(currentUpdateInfo);
        // autoUpdate + skipWaiting 场景下主动触发更新应用，避免长期命中旧缓存
        updateServiceWorker?.(true).catch((err) => {
          console.warn('[PWA] 自动应用更新失败，回退为手动刷新:', err);
          window.location.reload();
        });
      },
      onOfflineReady() {
        console.log('[PWA] 应用已准备好离线使用');
        currentUpdateInfo = { needRefresh: false, offlineReady: true };
        updateRegistrationGuard.callback?.(currentUpdateInfo);
      },
      onRegisteredSW(swUrl, registration) {
        console.log('[PWA] Service Worker 已注册:', swUrl);
        // 每小时检查一次更新
        if (registration && updateCheckIntervalId === null) {
          updateCheckIntervalId = setInterval(() => {
            registration.update().catch(err => {
              console.warn('[PWA] 检查更新失败:', err);
            });
          }, 60 * 60 * 1000);
        }
      },
      onRegisterError(error) {
        console.error('[PWA] Service Worker 注册失败:', error);
      }
    });
  } catch (error) {
    releasePwaUpdateRegistration(updateRegistrationGuard);
    console.warn('[PWA] PWA 功能不可用:', error);
  }
}

/**
 * 手动检查更新
 */
export async function checkForUpdate(): Promise<PWAUpdateInfo> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
      return currentUpdateInfo;
    } catch (error) {
      console.warn('[PWA] 检查更新失败:', error);
      return { needRefresh: false, offlineReady: false };
    }
  }
  return { needRefresh: false, offlineReady: false };
}

/**
 * 应用更新（刷新页面）
 */
export async function applyUpdate(): Promise<void> {
  if (updateServiceWorker) {
    await updateServiceWorker(true);
  } else {
    // 直接刷新页面
    window.location.reload();
  }
}

/**
 * 获取当前更新状态
 */
export function getUpdateStatus(): PWAUpdateInfo {
  return { ...currentUpdateInfo };
}

/**
 * 设置更新回调
 */
export function setUpdateCallback(callback: UpdateCallback): void {
  updateRegistrationGuard.callback = callback;
}

/**
 * 检查 PWA 是否支持
 */
export function isPWASupported(): boolean {
  return 'serviceWorker' in navigator;
}

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

/**
 * 检查是否已安装为 PWA
 */
export function isPWAInstalled(): boolean {
  const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;
  return window.matchMedia('(display-mode: standalone)').matches ||
         navigatorWithStandalone.standalone === true;
}
