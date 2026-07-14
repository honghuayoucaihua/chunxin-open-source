/**
 * 原生功能服务
 * 封装 Capacitor 插件，提供统一的 API
 * 
 * 已移除问题插件：browser, clipboard, local-notifications, 
 *                push-notifications, share, status-bar, toast
 */

import { Capacitor, PluginListenerHandle } from '@capacitor/core';

// ==================== 平台检测 ====================

let _nativeChecked = false;
let _isNativeValue = false;
let _isAndroidValue = false;
let _isIOSValue = false;

function ensurePlatformChecked(): void {
  if (_nativeChecked) return;
  _nativeChecked = true;
  
  try {
    _isNativeValue = Capacitor.isNativePlatform();
    if (_isNativeValue) {
      const platform = Capacitor.getPlatform();
      _isAndroidValue = platform === 'android';
      _isIOSValue = platform === 'ios';
    }
  } catch (e) {
    console.warn('[Native] Platform check failed:', e);
    _isNativeValue = false;
    _isAndroidValue = false;
    _isIOSValue = false;
  }
}

export const isNative = {
  valueOf() { ensurePlatformChecked(); return _isNativeValue; },
  toString() { ensurePlatformChecked(); return String(_isNativeValue); },
  [Symbol.toPrimitive]() { ensurePlatformChecked(); return _isNativeValue; }
} as unknown as boolean;

export const isAndroid = {
  valueOf() { ensurePlatformChecked(); return _isAndroidValue; },
  toString() { ensurePlatformChecked(); return String(_isAndroidValue); },
  [Symbol.toPrimitive]() { ensurePlatformChecked(); return _isAndroidValue; }
} as unknown as boolean;

export const isIOS = {
  valueOf() { ensurePlatformChecked(); return _isIOSValue; },
  toString() { ensurePlatformChecked(); return String(_isIOSValue); },
  [Symbol.toPrimitive]() { ensurePlatformChecked(); return _isIOSValue; }
} as unknown as boolean;

// ==================== 动态导入辅助函数 ====================

const modulesCache: {
  App?: any;
  Keyboard?: any;
  Haptics?: any;
  ImpactStyle?: any;
  NotificationType?: any;
  Preferences?: any;
  Filesystem?: any;
} = {};

async function getApp() {
  if (modulesCache.App) return modulesCache.App;
  try {
    const mod = await import('@capacitor/app');
    modulesCache.App = mod.App;
    return modulesCache.App;
  } catch {
    return null;
  }
}

async function getKeyboard() {
  if (modulesCache.Keyboard) return modulesCache.Keyboard;
  try {
    const mod = await import('@capacitor/keyboard');
    modulesCache.Keyboard = mod.Keyboard;
    return modulesCache.Keyboard;
  } catch {
    return null;
  }
}

async function getHaptics() {
  if (modulesCache.Haptics) return modulesCache.Haptics;
  try {
    const mod = await import('@capacitor/haptics');
    modulesCache.Haptics = mod.Haptics;
    modulesCache.ImpactStyle = mod.ImpactStyle;
    modulesCache.NotificationType = mod.NotificationType;
    return modulesCache.Haptics;
  } catch {
    return null;
  }
}

async function getPreferences() {
  if (modulesCache.Preferences) return modulesCache.Preferences;
  try {
    const mod = await import('@capacitor/preferences');
    modulesCache.Preferences = mod.Preferences;
    return modulesCache.Preferences;
  } catch {
    return null;
  }
}

// ==================== 键盘 ====================

export async function showKeyboard(): Promise<void> {
  ensurePlatformChecked();
  if (!_isNativeValue) return;
  try {
    const Keyboard = await getKeyboard();
    if (Keyboard) await Keyboard.show();
  } catch (e) {
    console.warn('[Native] showKeyboard failed:', e);
  }
}

export async function hideKeyboard(): Promise<void> {
  ensurePlatformChecked();
  if (!_isNativeValue) return;
  try {
    const Keyboard = await getKeyboard();
    if (Keyboard) await Keyboard.hide();
  } catch (e) {
    console.warn('[Native] hideKeyboard failed:', e);
  }
}

export function onKeyboardShow(callback: (info: { keyboardHeight: number }) => void): () => void {
  ensurePlatformChecked();
  if (!_isNativeValue) return () => {};

  const cleanup = { fn: null as (() => void) | null };
  getKeyboard().then(Keyboard => {
    if (!Keyboard) return;
    Keyboard.addListener('keyboardWillShow', callback).then((sub: { remove(): void }) => {
      cleanup.fn = () => sub.remove();
    }).catch(() => {});
  });

  return () => { cleanup.fn?.(); };
}

export function onKeyboardHide(callback: () => void): () => void {
  ensurePlatformChecked();
  if (!_isNativeValue) return () => {};

  const cleanup = { fn: null as (() => void) | null };
  getKeyboard().then(Keyboard => {
    if (!Keyboard) return;
    Keyboard.addListener('keyboardWillHide', callback).then((sub: { remove(): void }) => {
      cleanup.fn = () => sub.remove();
    }).catch(() => {});
  });

  return () => { cleanup.fn?.(); };
}

// ==================== 状态栏（已移除插件，使用空实现）====================

export async function setStatusBarStyle(dark: boolean): Promise<void> {
  // 插件已移除，空实现
}

export async function setStatusBarColor(color: string): Promise<void> {
  // 插件已移除，空实现
}

export async function showStatusBar(): Promise<void> {
  // 插件已移除，空实现
}

export async function hideStatusBar(): Promise<void> {
  // 插件已移除，空实现
}

// ==================== 触觉反馈 ====================

export async function hapticLight(): Promise<void> {
  ensurePlatformChecked();
  if (!_isNativeValue) return;
  try {
    await getHaptics();
    const Haptics = modulesCache.Haptics;
    const ImpactStyle = modulesCache.ImpactStyle;
    if (Haptics && ImpactStyle) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
  } catch (e) {
    console.warn('[Native] hapticLight failed:', e);
  }
}

export async function hapticMedium(): Promise<void> {
  ensurePlatformChecked();
  if (!_isNativeValue) return;
  try {
    await getHaptics();
    const Haptics = modulesCache.Haptics;
    const ImpactStyle = modulesCache.ImpactStyle;
    if (Haptics && ImpactStyle) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
  } catch (e) {
    console.warn('[Native] hapticMedium failed:', e);
  }
}

export async function hapticHeavy(): Promise<void> {
  ensurePlatformChecked();
  if (!_isNativeValue) return;
  try {
    await getHaptics();
    const Haptics = modulesCache.Haptics;
    const ImpactStyle = modulesCache.ImpactStyle;
    if (Haptics && ImpactStyle) {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    }
  } catch (e) {
    console.warn('[Native] hapticHeavy failed:', e);
  }
}

export async function hapticSuccess(): Promise<void> {
  ensurePlatformChecked();
  if (!_isNativeValue) return;
  try {
    await getHaptics();
    const Haptics = modulesCache.Haptics;
    const NotificationType = modulesCache.NotificationType;
    if (Haptics && NotificationType) {
      await Haptics.notification({ type: NotificationType.Success });
    }
  } catch (e) {
    console.warn('[Native] hapticSuccess failed:', e);
  }
}

export async function hapticWarning(): Promise<void> {
  ensurePlatformChecked();
  if (!_isNativeValue) return;
  try {
    await getHaptics();
    const Haptics = modulesCache.Haptics;
    const NotificationType = modulesCache.NotificationType;
    if (Haptics && NotificationType) {
      await Haptics.notification({ type: NotificationType.Warning });
    }
  } catch (e) {
    console.warn('[Native] hapticWarning failed:', e);
  }
}

export async function hapticError(): Promise<void> {
  ensurePlatformChecked();
  if (!_isNativeValue) return;
  try {
    await getHaptics();
    const Haptics = modulesCache.Haptics;
    const NotificationType = modulesCache.NotificationType;
    if (Haptics && NotificationType) {
      await Haptics.notification({ type: NotificationType.Error });
    }
  } catch (e) {
    console.warn('[Native] hapticError failed:', e);
  }
}

export async function hapticSelection(): Promise<void> {
  ensurePlatformChecked();
  if (!_isNativeValue) return;
  try {
    const Haptics = await getHaptics();
    if (Haptics) {
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
    }
  } catch (e) {
    console.warn('[Native] hapticSelection failed:', e);
  }
}

// ==================== 剪贴板（使用 Web API）====================

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function readFromClipboard(): Promise<string> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return '';
  }
}

// ==================== 分享（已移除插件，使用 Web Share API）====================

export async function shareText(text: string, title?: string): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share({ text, title: title || '分享' });
      return true;
    } catch (e: any) {
      if (e?.name === 'AbortError') return false;
      console.warn('[Native] shareText failed:', e);
    }
  }
  return false;
}

export async function shareUrl(url: string, title?: string, text?: string): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share({ url, title: title || '分享链接', text });
      return true;
    } catch (e: any) {
      if (e?.name === 'AbortError') return false;
      console.warn('[Native] shareUrl failed:', e);
    }
  }
  return false;
}

// ==================== Toast（已移除插件，由 App 自行处理）====================

export async function showToast(message: string, duration: 'short' | 'long' = 'short'): Promise<void> {
  // 插件已移除，由 App.tsx 中的自定义 Toast 处理
  console.log('[Toast]', message);
}

export function isNativeToastAvailable(): boolean {
  return false; // 原生 Toast 不可用
}

// ==================== 硬件返回键（Capacitor App 插件）====================

/**
 * 监听硬件返回键事件
 * @param callback 返回键按下时的回调函数
 * @returns 取消监听的函数
 */
export function onBackButton(callback: () => void): () => void {
  ensurePlatformChecked();
  if (!_isNativeValue || !_isAndroidValue) return () => {};

  const cleanup = { fn: null as (() => void) | null };
  getApp().then(App => {
    if (!App) return;
    App.addListener('backButton', callback).then((h: PluginListenerHandle) => {
      cleanup.fn = () => h.remove();
    }).catch(() => {});
  });

  return () => { cleanup.fn?.(); };
}

/**
 * 监听应用状态变化（进入前台/后台）
 * @param onResume 应用进入前台时的回调
 * @param onPause 应用进入后台时的回调
 * @returns 取消监听的函数
 */
export function onAppStateChange(
  onResume?: () => void,
  onPause?: () => void
): () => void {
  ensurePlatformChecked();
  if (!_isNativeValue) return () => {};

  const cleanup = { fn: null as (() => void) | null };
  getApp().then(App => {
    if (!App) return;
    App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
      if (isActive) {
        onResume?.();
      } else {
        onPause?.();
      }
    }).then((h: PluginListenerHandle) => {
      cleanup.fn = () => h.remove();
    }).catch(() => {});
  });

  return () => { cleanup.fn?.(); };
}

/**
 * 退出应用（最小化到后台，Android 特有）
 */
export async function exitApp(): Promise<void> {
  ensurePlatformChecked();
  if (!_isNativeValue || !_isAndroidValue) return;
  try {
    const App = await getApp();
    if (App) {
      await App.exitApp();
    }
  } catch (e) {
    console.warn('[Native] exitApp failed:', e);
  }
}

/**
 * 获取应用信息
 */
export async function getAppInfo(): Promise<{ version: string; build: string; name: string } | null> {
  ensurePlatformChecked();
  if (!_isNativeValue) return null;
  try {
    const App = await getApp();
    if (App) {
      const info = await App.getInfo();
      return {
        version: info.version,
        build: info.build,
        name: info.name
      };
    }
  } catch (e) {
    console.warn('[Native] getAppInfo failed:', e);
  }
  return null;
}
