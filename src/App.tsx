import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppState } from './hooks/useAppState';
import { useAppLifecycle } from './hooks/useAppLifecycle';
import { useAppUpdate } from './hooks/useAppUpdate';
import { useApkUpdateDismiss } from './hooks/useApkUpdateDismiss';
import { setStatusBarStyle, setStatusBarColor } from './services/nativeService';
import { isAndroidStandalonePwa, syncBrowserShellSurface } from './services/browserShellSurface';
import { resolveThemeSurfaceColor } from './services/themeSurfaceColor';
import { applyLegacyAndroidSafeAreaCompat } from './services/nativeSafeAreaCompat';
import { applyRenderConfigToRoot } from './render-engine';
import { syncGlobalPixelIcons } from './pixelIconRuntime';
import { useEdgeSwipeBack, useBottomSwipeUp } from './hooks/useSwipeBack';
import {
  upsertCustomFontFace,
  waitForSelectedFontReady
} from './appBootstrapUtils';
import { isAndroidPlatform } from './services/apkUpdateService';
import { resolveBubbleTemplateForStyle } from './utils/encryptedReadModel';
import type { DesktopSystemNavigationAction } from './types';
import { DESKTOP_SYSTEM_NAV_BUTTONS_RESERVED_SPACE } from './desktopSystemNavigationConstants';
import { APP_LOGO_COMPACT_SRC } from './services/staticAssetPaths';

const AppCore = React.lazy(() => import('./AppCore'));
const DesktopModeShell = React.lazy(() => import('./DesktopModeShell'));
const DesktopSystemNavigation = React.lazy(() => import('./DesktopSystemNavigation'));

const THEME_COLOR_META_SELECTOR = 'meta[name="theme-color"]';

const syncThemeMetas = (surfaceColor: string): void => {
  const themeColorMeta = document.querySelector<HTMLMetaElement>(THEME_COLOR_META_SELECTOR);
  if (!themeColorMeta) return;
  themeColorMeta.setAttribute('content', surfaceColor);
  syncBrowserShellSurface(surfaceColor);
};

const syncVisibleThemeColor = (
  lastThemeColorRef: React.MutableRefObject<string>,
  preferTopBarSurface: boolean,
): string => {
  const resolvedSurfaceColor = resolveThemeSurfaceColor({ preferTopBarSurface });
  if (resolvedSurfaceColor !== lastThemeColorRef.current) {
    lastThemeColorRef.current = resolvedSurfaceColor;
    syncThemeMetas(resolvedSurfaceColor);
    void setStatusBarColor(resolvedSurfaceColor);
  }
  return resolvedSurfaceColor;
};

const App: React.FC = () => {
  const state = useAppState();
  const lastThemeColorRef = useRef('');
  const desktopLockBootstrappedRef = useRef(false);
  const [isDesktopUnlocked, setIsDesktopUnlocked] = useState(true);
  const [desktopRequestedPanel, setDesktopRequestedPanel] = useState<'settings' | 'diy' | null>(null);
  const { isApkUpdateDismissed } = useApkUpdateDismiss();
  const handlePersistError = useCallback((message: string) => {
    state.showToast(message, 3000);
  }, [state.showToast]);

  useEffect(() => {
    void applyLegacyAndroidSafeAreaCompat();
  }, []);

  useEffect(() => {
    if (!state.isStateLoaded) return;
    if (!desktopLockBootstrappedRef.current) {
      desktopLockBootstrappedRef.current = true;
      setIsDesktopUnlocked(state.settings.desktopLockEnabled !== true);
      return;
    }
    if (state.settings.desktopLockEnabled !== true) {
      setIsDesktopUnlocked(true);
    }
  }, [state.isStateLoaded, state.settings.desktopLockEnabled]);

  // ==================== State Persistence (Load + Save) ====================
  useAppLifecycle(
    {
      setContacts: state.setContacts, setMessages: state.setMessages, setUser: state.setUser,
      setWalletBalance: state.setWalletBalance, setMoments: state.setMoments,
      setFavorites: state.setFavorites, setSettings: state.setSettings,
      setIsAppearanceReady: state.setIsAppearanceReady, setAiSettings: state.setAiSettings,
      setWorldBooks: state.setWorldBooks, setMasks: state.setMasks, setForums: state.setForums,
      setSoundVibrationSettings: state.setSoundVibrationSettings,
      setWalletBank: state.setWalletBank, setMusicState: state.setMusicState,
      setContactMemories: state.setContactMemories, setOfficialArticles: state.setOfficialArticles,
      setFriendRequests: state.setFriendRequests, setDiscoverUnreadCount: state.setDiscoverUnreadCount,
      setInboxLetters: state.setInboxLetters, setSentLetters: state.setSentLetters,
      setMailboxTheme: state.setMailboxTheme,
      setAnonymousChatSettings: state.setAnonymousChatSettings,
      setAnonymousHistory: state.setAnonymousHistory,
      setAnonymousHasUnfinishedSession: state.setAnonymousHasUnfinishedSession,
      setAnonymousUnfinishedSession: state.setAnonymousUnfinishedSession,
      setDivinationHistory: state.setDivinationHistory,
      setHasAgreedTerms: state.setHasAgreedTerms,
      setHtmlTemplates: state.setHtmlTemplates,
      setBubbleTemplates: state.setBubbleTemplates,
      setIsStateLoaded: state.setIsStateLoaded,
    },
    {
      contacts: state.contacts, user: state.user, walletBalance: state.walletBalance,
      walletBank: state.walletBank, musicState: state.musicState, messages: state.messages,
      favorites: state.favorites, moments: state.moments, settings: state.settings,
      aiSettings: state.aiSettings, worldBooks: state.worldBooks, masks: state.masks,
      forums: state.forums, officialArticles: state.officialArticles,
      contactMemories: state.contactMemories, friendRequests: state.friendRequests,
      discoverUnreadCount: state.discoverUnreadCount,
      inboxLetters: state.inboxLetters, sentLetters: state.sentLetters,
      mailboxTheme: state.mailboxTheme,
      soundVibrationSettings: state.soundVibrationSettings,
      hasAgreedTerms: state.hasAgreedTerms, isStateLoaded: state.isStateLoaded,
      anonymousChatSettings: state.anonymousChatSettings,
      anonymousHistory: state.anonymousHistory,
      anonymousHasUnfinishedSession: state.anonymousHasUnfinishedSession,
      anonymousUnfinishedSession: state.anonymousUnfinishedSession,
      divinationHistory: state.divinationHistory,
      htmlTemplates: state.htmlTemplates,
      bubbleTemplates: state.bubbleTemplates,
    },
    {
      onPersistError: handlePersistError,
    }
  );

  // ==================== Theme / Appearance Effects ====================
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const isDark = state.settings.themeMode === 'dark' || (state.settings.themeMode === 'auto' && media.matches);
      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.style.color = 'var(--text-primary)';
      document.body.style.backgroundColor = 'var(--bg-primary)';
      document.body.style.color = 'var(--text-primary)';
      syncVisibleThemeColor(lastThemeColorRef, isAndroidStandalonePwa());
      setStatusBarStyle(isDark);
    };
    applyTheme();
    if (state.settings.themeMode === 'auto') {
      const onSystemThemeChange = () => applyTheme();
      media.addEventListener('change', onSystemThemeChange);
      return () => media.removeEventListener('change', onSystemThemeChange);
    }
  }, [state.settings.themeMode]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      syncVisibleThemeColor(lastThemeColorRef, isAndroidStandalonePwa());
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [
    state.activeTab,
    state.activeSubView,
    state.selectedContactId,
    state.profileId,
    state.settings,
    state.isAppearanceReady,
  ]);
  useEffect(() => {
    if (state.settings.globalBg) {
      document.documentElement.classList.add('has-global-bg');
    } else {
      document.documentElement.classList.remove('has-global-bg');
    }
    return () => document.documentElement.classList.remove('has-global-bg');
  }, [state.settings.globalBg]);

  useEffect(() => {
    const s = state.settings;
    const renderCfg = applyRenderConfigToRoot(s);
    syncGlobalPixelIcons(renderCfg.skinId === 'pixel');
    const root = document.documentElement;

    const uiScale = Math.max(80, Math.min(130, Number(s.uiScale || 100)));
    const uiScaleFactor = uiScale / 100;
    const densityFactorMap: Record<string, number> = { compact: 0.9, default: 1, comfortable: 1.12 };
    const densityFactor = densityFactorMap[s.interfaceDensity || 'default'] ?? 1;

    let baseSpacing = Math.max(8, Math.min(28, Number(renderCfg.chat.messageSpacing || 20)));
    if (renderCfg.skinId === 'wechat' || renderCfg.skinId === 'qq' || renderCfg.skinId === 'y2k') baseSpacing = Math.min(baseSpacing, 14);
    else if (renderCfg.skinId === 'telegram') baseSpacing = Math.max(baseSpacing, 18);
    const spacingLevel = Math.max(6, Math.min(34, Math.round(baseSpacing * densityFactor)));
    const cellPadding = Math.max(5, Math.min(18, Math.round(spacingLevel * 0.55)));
    const contentPadding = Math.max(8, Math.min(28, Math.round(spacingLevel * 0.85)));
    const baseFontSize = Math.max(12, Math.min(24, Number(renderCfg.typography.fontSize || 16)));
    const scaledFontSize = Math.max(11, Math.min(32, Number((baseFontSize * uiScaleFactor).toFixed(2))));

    root.style.setProperty('--app-font-size', `${scaledFontSize}px`);
    root.style.setProperty('--app-bubble-radius', `${renderCfg.chat.bubble.radius}px`);
    root.style.setProperty('--app-ui-scale', `${uiScaleFactor}`);
    root.style.setProperty('--app-card-radius', `${renderCfg.radius.card}px`);
    root.style.setProperty('--app-message-spacing', `${spacingLevel}px`);
    root.style.setProperty('--app-cell-padding-y', `${cellPadding}px`);
    root.style.setProperty('--app-content-padding', `${contentPadding}px`);
    root.style.setProperty('--app-content-max-width', s.contentWidth === 'narrow' ? '920px' : s.contentWidth === 'wide' ? '1400px' : '100%');
    root.style.setProperty('--app-avatar-radius', `${renderCfg.chat.meta.avatarRadius}px`);
    root.style.setProperty('--app-message-max-width', `${Math.max(60, Math.min(95, renderCfg.chat.bubble.maxWidthPercent || 85))}%`);
    root.style.setProperty('--app-font-line-height', `${Math.max(1.2, Math.min(2, renderCfg.typography.lineHeight || 1.6))}`);
    root.style.setProperty('--app-letter-spacing', `${Math.max(-0.5, Math.min(2, renderCfg.typography.letterSpacing || 0))}px`);
    root.style.setProperty('--app-density-factor', `${densityFactor}`);

    if (s.customFontName && s.customFontDataUrl) upsertCustomFontFace(s.customFontName, s.customFontDataUrl);

    const fontFamilyMap: Record<string, string> = {
      system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      pingfang: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
      noto: '"Noto Sans SC", "Noto Sans", "Microsoft YaHei", sans-serif',
      serif: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", serif',
      mono: '"JetBrains Mono", "Cascadia Mono", "SFMono-Regular", Consolas, monospace',
      custom: s.customFontDataUrl ? '"app-custom-font", "Noto Sans SC", "Microsoft YaHei", sans-serif' : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    };
    root.style.setProperty('--app-font-family', fontFamilyMap[s.fontFamily] || fontFamilyMap.system);

    const targetSurfaceClass = `surface-${s.surfaceStyle || 'flat'}`;
    if (!root.classList.contains(targetSurfaceClass)) {
      root.classList.remove('surface-flat', 'surface-glass', 'surface-neumorphism');
      root.classList.add(targetSurfaceClass);
    }
    if (!root.classList.contains('avatar-radius-global')) {
      root.classList.add('avatar-radius-global');
    }

    const glassOpacity = s.glassOpacity ?? 72;
    const glassBlur = s.glassBlur ?? 16;
    const globalBgOverlayOpacity = Math.max(0, Math.min(1, Number(s.globalBgOverlayOpacity ?? 0.2)));
    const globalBgBlur = Math.max(0, Math.min(30, Number(s.globalBgBlur ?? 10)));
    root.style.setProperty('--glass-opacity', `${glassOpacity}%`);
    root.style.setProperty('--glass-opacity-inverse', `${100 - glassOpacity}%`);
    root.style.setProperty('--glass-blur', `${glassBlur}px`);
    root.style.setProperty('--global-bg-overlay-opacity', String(globalBgOverlayOpacity));
    root.style.setProperty('--global-bg-blur', `${globalBgBlur}px`);

    const targetContrastClass = `dark-contrast-${s.darkContrast || 'standard'}`;
    if (!root.classList.contains(targetContrastClass)) {
      root.classList.remove('dark-contrast-soft', 'dark-contrast-standard', 'dark-contrast-high');
      root.classList.add(targetContrastClass);
    }
    document.body.style.fontWeight = s.enableFontBold ? 'bold' : 'normal';

    // DIY theme extended properties
    const hasBubbleWorkshop = (state.bubbleTemplates || []).some(t => t.enabled);
    if (s.primaryBgColor) root.style.setProperty('--app-bg-primary', s.primaryBgColor);
    if (s.secondaryBgColor) root.style.setProperty('--app-bg-secondary', s.secondaryBgColor);
    if (s.tertiaryBgColor) root.style.setProperty('--app-bg-tertiary', s.tertiaryBgColor);
    if (s.primaryTextColor) root.style.setProperty('--app-text-primary', s.primaryTextColor);
    if (s.secondaryTextColor) root.style.setProperty('--app-text-secondary', s.secondaryTextColor);
    if (s.tertiaryTextColor) root.style.setProperty('--app-text-tertiary', s.tertiaryTextColor);
    if (s.borderColor) root.style.setProperty('--app-border-color', s.borderColor);
    if (s.borderWidth !== undefined) root.style.setProperty('--app-border-width', `${s.borderWidth}px`);
    if (!hasBubbleWorkshop && s.bubbleShadow) root.style.setProperty('--app-bubble-shadow', s.bubbleShadow);
    if (s.cardShadow) root.style.setProperty('--app-card-shadow', s.cardShadow);
    if (s.headerShadow) root.style.setProperty('--app-header-shadow', s.headerShadow);
    if (!hasBubbleWorkshop && s.bubblePadding !== undefined) root.style.setProperty('--app-bubble-padding', `${s.bubblePadding}px`);
    if (!hasBubbleWorkshop && s.bubbleBorderWidth !== undefined) root.style.setProperty('--app-bubble-border-width', `${s.bubbleBorderWidth}px`);
    if (!hasBubbleWorkshop && s.bubbleBorderColorMe) root.style.setProperty('--app-bubble-border-me', s.bubbleBorderColorMe);
    if (!hasBubbleWorkshop && s.bubbleBorderColorOther) root.style.setProperty('--app-bubble-border-other', s.bubbleBorderColorOther);
    if (!hasBubbleWorkshop && s.bubbleOpacity !== undefined) root.style.setProperty('--app-bubble-opacity', String(s.bubbleOpacity));
    if (s.headerBgColor) root.style.setProperty('--app-header-bg', s.headerBgColor);
    if (s.headerTextColor) root.style.setProperty('--app-header-text', s.headerTextColor);
    root.style.setProperty('--app-header-height', `${renderCfg.header.height}px`);
    if (s.inputBgColor) root.style.setProperty('--app-input-bg', s.inputBgColor);
    if (s.inputTextColor) root.style.setProperty('--app-input-text', s.inputTextColor);
    if (s.inputBorderColor) root.style.setProperty('--app-input-border', s.inputBorderColor);
    if (s.contactItemBgColor) root.style.setProperty('--app-contact-bg', s.contactItemBgColor);
    if (s.contactItemHoverColor) root.style.setProperty('--app-contact-hover', s.contactItemHoverColor);
    if (s.contactItemActiveColor) root.style.setProperty('--app-contact-active', s.contactItemActiveColor);
    root.style.setProperty('--app-inner-notice-text', s.innerNoticeTextColor || '');
    root.style.setProperty('--app-action-notice-text', s.actionNoticeTextColor || '');
    if (s.enableAnimations === false) root.style.setProperty('--app-animation-duration', '0ms');
    else if (s.animationDuration !== undefined) root.style.setProperty('--app-animation-duration', `${s.animationDuration}ms`);
    if (s.animationTimingFunction) root.style.setProperty('--app-animation-timing', s.animationTimingFunction);
    if (s.scrollbarWidth !== undefined) root.style.setProperty('--app-scrollbar-width', `${s.scrollbarWidth}px`);
    if (s.scrollbarColor) root.style.setProperty('--app-scrollbar-color', s.scrollbarColor);
    if (s.scrollbarHoverColor) root.style.setProperty('--app-scrollbar-hover', s.scrollbarHoverColor);
    root.style.setProperty('--app-pixel-grid-opacity', `${Math.max(0, Math.min(100, Number(s.pixelGridOpacity ?? 22)))}%`);
    const crtOpacity = Math.max(0, Math.min(100, Number(s.pixelCrtOpacity ?? 22)));
    root.style.setProperty('--app-pixel-crt-opacity', (crtOpacity / 100).toFixed(2));
    root.style.setProperty('--app-pixel-crt-opacity-dark', (Math.min(100, crtOpacity + 8) / 100).toFixed(2));

    // Custom CSS
    let customStyleEl = document.getElementById('custom-user-css');
    if (s.customCSSEnabled !== false && s.customCSS) {
      if (!customStyleEl) { customStyleEl = document.createElement('style'); customStyleEl.id = 'custom-user-css'; document.head.appendChild(customStyleEl); }
      customStyleEl.textContent = s.customCSS;
    } else if (customStyleEl) { customStyleEl.textContent = ''; }

    // Icon image DIY
    let iconMapStyleEl = document.getElementById('icon-image-map-css');
    const iconMap = s.iconImageMap || {};
    const iconEntries = Object.entries(iconMap).filter(([key, value]) => key && value);
    if (iconEntries.length > 0) {
      if (!iconMapStyleEl) { iconMapStyleEl = document.createElement('style'); iconMapStyleEl.id = 'icon-image-map-css'; document.head.appendChild(iconMapStyleEl); }
      iconMapStyleEl.textContent = iconEntries.map(([iconKey, src]) => {
        const safeSrc = String(src).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return `.wechat-cell-icon-${iconKey} { background-image: url("${safeSrc}") !important; background-size: cover; background-repeat: no-repeat; background-position: center; background-color: transparent !important; } .wechat-cell-icon-${iconKey} > i { opacity: 0; }`;
      }).join('\n');
    } else if (iconMapStyleEl) { iconMapStyleEl.textContent = ''; }

    state.setIsAppearanceReady(true);
    void waitForSelectedFontReady(s).catch((error) => console.warn('Font load check failed:', error));
    return () => {
      if (renderCfg.skinId === 'pixel') syncGlobalPixelIcons(false);
    };
  }, [state.settings]);

  // ==================== Bubble Workshop CSS (independent, highest priority) ====================
  useEffect(() => {
    let bubbleWorkshopStyleEl = document.getElementById('bubble-workshop-css');
    const enabledTemplates = (state.bubbleTemplates || [])
      .filter(t => t.enabled)
      .map((tpl) => resolveBubbleTemplateForStyle(tpl));
    const rawCSS = enabledTemplates.map(t => t.cssContent || '').join('\n');
    // Auto-fix common CSS syntax: remove spaces between function names and parentheses
    const enabledBubbleCSS = rawCSS.replace(/(var|calc|rgba?|hsla?|linear-gradient|radial-gradient|conic-gradient|drop-shadow|blur|brightness|contrast|grayscale|hue-rotate|invert|opacity|saturate|sepia|rotate|scale|translate|skew|matrix|perspective|clamp|min|max|env|url|attr)\s+\(/gi, '$1(');
    if (enabledTemplates.length > 0) {
      if (!bubbleWorkshopStyleEl) {
        bubbleWorkshopStyleEl = document.createElement('style');
        bubbleWorkshopStyleEl.id = 'bubble-workshop-css';
      }
      const bubbleWorkshopBaseCSS = `
/* Bubble Workshop：默认不使用系统/皮肤自带的气泡伪元素装饰（如小尾巴、贴纸等），如需请在模板中自行定义 ::before/::after */
[data-bubble-workshop] .message-bubble-me::before,
[data-bubble-workshop] .message-bubble-me::after,
[data-bubble-workshop] .message-bubble-other::before,
[data-bubble-workshop] .message-bubble-other::after {
  content: none !important;
  display: none !important;
}
`.trim();
      // Always move to end of <head> to ensure highest priority
      document.head.appendChild(bubbleWorkshopStyleEl);
      bubbleWorkshopStyleEl.textContent = enabledBubbleCSS ? `${bubbleWorkshopBaseCSS}\n\n${enabledBubbleCSS}` : bubbleWorkshopBaseCSS;
      document.documentElement.setAttribute('data-bubble-workshop', '1');
    } else if (bubbleWorkshopStyleEl) {
      bubbleWorkshopStyleEl.textContent = '';
      document.documentElement.removeAttribute('data-bubble-workshop');
    }
  }, [state.bubbleTemplates]);

  // ==================== APK/PWA Update ====================
  useAppUpdate({
    setShowPwaUpdateDialog: state.setShowPwaUpdateDialog,
    setApkUpdateInfo: state.setApkUpdateInfo,
    setShowApkUpdateDialog: state.setShowApkUpdateDialog,
    showApkUpdateDialog: state.showApkUpdateDialog,
    isDownloading: state.isDownloading,
    isApkUpdateDismissed,
  });

  // ==================== Desktop Mode Edge Swipe Back ====================
  // 桌面模式下，只有当应用内没有子视图打开时才启用边缘滑动返回桌面
  // 否则由 useNavigationStack 处理正常的子视图返回
  const isDesktopModeActive = !!(state.settings.enableDesktopMode && state.isInDesktopApp);
  const hasActiveSubView = state.activeSubView !== 'none';
  const desktopSystemNavigationMode = state.settings.desktopSystemNavigationMode ?? 'gesture';
  const appReserveBottomInset = state.settings.enableDesktopMode && state.isInDesktopApp && desktopSystemNavigationMode === 'buttons'
    ? DESKTOP_SYSTEM_NAV_BUTTONS_RESERVED_SPACE
    : '0px';

  const handleDesktopModeBack = () => {
    if (state.settings.enableDesktopMode && state.isInDesktopApp && !hasActiveSubView) {
      state.setIsInDesktopApp(false);
    }
  };

  const handleDesktopSystemNavigationAction = (action: DesktopSystemNavigationAction) => {
    if (!state.settings.enableDesktopMode) return;
    if (action === 'back') {
      if (state.activeSubView !== 'none') {
        state.goBackSubView();
        return;
      }
      if (state.isInDesktopApp) {
        state.setIsInDesktopApp(false);
      }
      return;
    }
    if (action === 'home') {
      setDesktopRequestedPanel(null);
      state.setIsInDesktopApp(false);
      return;
    }
    if (action === 'settings') {
      setDesktopRequestedPanel('settings');
      state.setIsInDesktopApp(false);
      return;
    }
    if (action === 'lock') {
      setDesktopRequestedPanel(null);
      setIsDesktopUnlocked(false);
      state.setIsInDesktopApp(false);
    }
  };

  // 只在桌面模式下且没有子视图时启用边缘滑动返回桌面
  useEdgeSwipeBack(
    isDesktopModeActive && !hasActiveSubView && desktopSystemNavigationMode === 'gesture',
    handleDesktopModeBack
  );

  // 底部上滑返回桌面
  useBottomSwipeUp(
    isDesktopModeActive && desktopSystemNavigationMode === 'gesture',
    () => state.setIsInDesktopApp(false)
  );

  // ==================== Desktop Mode Rendering ====================
  if (!state.isStateLoaded) {
    return (
      <div className="h-screen w-screen bg-[#f5f5f5] flex items-center justify-center overflow-hidden">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-[#d7d7d7]"></div>
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#a8a8a8] animate-spin"></div>
          <img
            src={APP_LOGO_COMPACT_SRC}
            alt="logo"
            className="shadow-sm block"
            width={56}
            height={56}
            fetchPriority="high"
            decoding="async"
            style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 14 }}
          />
        </div>
      </div>
    );
  }

  // 桌面模式：显示模拟桌面
  if (state.settings.enableDesktopMode && !state.isInDesktopApp) {
    return (
      <React.Suspense fallback={<div className="h-screen w-screen render-bg-primary" />}>
        <DesktopModeShell
          settings={state.settings}
          onEnterApp={() => state.setIsInDesktopApp(true)}
          onOpenSubView={(subView) => {
            state.setIsInDesktopApp(true);
            // 延迟打开子视图，等待应用渲染完成
            setTimeout(() => {
              if (subView === 'moments') {
                state.setProfileId('me');
              }
              state.pushSubView(subView as any);
            }, 50);
          }}
          onSettingsChange={(patch) => state.setSettings(prev => ({ ...prev, ...patch }))}
          musicState={state.musicState}
          isLocked={!isDesktopUnlocked}
          onUnlock={() => setIsDesktopUnlocked(true)}
          onLock={() => setIsDesktopUnlocked(false)}
          forcedOverlayPanel={desktopRequestedPanel}
          onConsumeForcedOverlayPanel={() => setDesktopRequestedPanel(null)}
        />
      </React.Suspense>
    );
  }

  // 正常应用渲染
  return (
    <>
      <React.Suspense fallback={<div className="h-screen w-screen render-bg-primary" />}>
        <AppCore state={state} reserveBottomInset={appReserveBottomInset} />
      </React.Suspense>
      {state.settings.enableDesktopMode && state.isInDesktopApp && (
        <React.Suspense fallback={null}>
          <DesktopSystemNavigation
            settings={state.settings}
            context="app"
            onAction={handleDesktopSystemNavigationAction}
            onSettingsChange={(patch) => state.setSettings(prev => ({ ...prev, ...patch }))}
          />
        </React.Suspense>
      )}
    </>
  );
};

export default App;
