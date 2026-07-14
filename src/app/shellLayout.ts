import type { SubView } from '../types';

export type AppTabsPosition = 'top' | 'bottom';

export type AppShellLayoutInput = {
  isMobile: boolean;
  activeSubView: SubView;
  tabsPosition: AppTabsPosition;
  isTelegramLayout: boolean;
  showStatusBar: boolean;
  reserveBottomInset?: string;
};

export type AppShellLayout = {
  isTopTabs: boolean;
  shouldShowTabNav: boolean;
  hasVisibleBottomTabs: boolean;
  desktopSystemNavBottom: string;
  safeContainerBottom: string;
  appSafeTopOffset: string;
  tabbarSafeBottom: string;
  tabbarBottomOffset: string;
  floatingTabbarBottomOffset: string;
  tabScrollPaddingBottom: string;
  chatFooterBottomInset: string;
};

export const APP_TAB_BAR_RESERVED_HEIGHT = '56px';
export const APP_TAB_CONTENT_BOTTOM_GAP = '10px';

const normalizeInset = (value?: string): string => {
  const trimmed = String(value || '').trim();
  return trimmed || '0px';
};

export const resolveAppShellLayout = (input: AppShellLayoutInput): AppShellLayout => {
  const desktopSystemNavBottom = normalizeInset(input.reserveBottomInset);
  const isTopTabs = input.isMobile && input.tabsPosition === 'top';
  const shouldShowTabNav = input.isMobile && !input.isTelegramLayout;
  const hasVisibleBottomTabs = shouldShowTabNav && !isTopTabs && input.activeSubView === 'none';
  const tabbarSafeBottom = hasVisibleBottomTabs ? 'var(--safe-padding-bottom, 0px)' : '0px';
  const tabbarBottomOffset = hasVisibleBottomTabs ? desktopSystemNavBottom : '0px';
  const floatingTabbarBottomOffset = hasVisibleBottomTabs
    ? `calc(var(--safe-padding-bottom, 0px) + ${desktopSystemNavBottom})`
    : '0px';

  return {
    isTopTabs,
    shouldShowTabNav,
    hasVisibleBottomTabs,
    desktopSystemNavBottom,
    safeContainerBottom: hasVisibleBottomTabs ? '0px' : desktopSystemNavBottom,
    appSafeTopOffset: input.showStatusBar ? '0px' : 'var(--safe-top, 0px)',
    tabbarSafeBottom,
    tabbarBottomOffset,
    floatingTabbarBottomOffset,
    chatFooterBottomInset: 'max(var(--chat-footer-safe-bottom, var(--safe-padding-bottom, 0px)), var(--chat-safe-bottom-fallback, 0px))',
    tabScrollPaddingBottom: hasVisibleBottomTabs
      ? `calc(${APP_TAB_BAR_RESERVED_HEIGHT} + var(--safe-padding-bottom, 0px) + ${desktopSystemNavBottom})`
      : APP_TAB_CONTENT_BOTTOM_GAP
  };
};

export const buildAppShellLayoutVars = (layout: AppShellLayout): Record<string, string> => ({
  '--desktop-system-nav-bottom': layout.desktopSystemNavBottom,
  '--safe-container-bottom': layout.safeContainerBottom,
  '--app-safe-top-offset': layout.appSafeTopOffset,
  '--tabbar-safe-bottom': layout.tabbarSafeBottom,
  '--app-tabbar-bottom-offset': layout.tabbarBottomOffset,
  '--app-floating-tabbar-bottom-offset': layout.floatingTabbarBottomOffset,
  '--app-chat-footer-bottom-inset': layout.chatFooterBottomInset,
  '--tab-scroll-pb': layout.tabScrollPaddingBottom
});
