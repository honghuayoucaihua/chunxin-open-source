
import React from 'react';
import { AppTab, SubView, UiDialogState } from './types';
import { buildAppShellLayoutVars, resolveAppShellLayout } from './app/shellLayout';

const AppModalDialogs = React.lazy(() => import('./shell/AppModalDialogs'));
const AppShellStatusBar = React.lazy(() => import('./shell/AppShellStatusBar'));
const DesktopSidebarNav = React.lazy(() => import('./shell/DesktopSidebarNav'));
const TabNavigation = React.lazy(() => import('./shell/TabNavigation').then((m) => ({ default: m.TabNavigation })));
const PlusMenu = React.lazy(() => import('./shell/PlusMenu').then((m) => ({ default: m.PlusMenu })));
const AppShellTelegramChrome = React.lazy(() => import('./shell/AppShellTelegramChrome'));
const AppShellY2KTopProfile = React.lazy(() => import('./shell/AppShellY2KTopProfile'));

/** 进度对话框状态 */
export type ProgressDialogState = null | {
  title?: string;
  message: string;
  progress?: number; // 0-100，不设置则显示不确定进度
  cancellable?: boolean;
  onCancel?: () => void;
};

interface AppShellProps {
  isMobile: boolean;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  activeSubView: SubView;
  setActiveSubView: (sub: SubView) => void;
  renderActiveTab: () => React.ReactNode;
  renderSubView: (sub: SubView) => React.ReactNode;
  showPlusMenu: boolean;
  setShowPlusMenu: (show: boolean) => void;
  userAvatar: string;
  userName?: string;
  userSignature?: string;
  isTelegramLayout?: boolean;
  toast: { id: number; message: string } | null;
  uiDialog: UiDialogState;
  setUiDialog: (dialog: UiDialogState) => void;
  uiDialogInput: string;
  setUiDialogInput: (value: string) => void;
  tabBadges?: Partial<Record<AppTab, number>>;
  onEdgeBack?: () => void;
  /** 用于重置导航栈，清除所有子页面 */
  onResetNavigation?: () => void;
  /** 进度对话框状态 */
  progressDialog?: ProgressDialogState;
  /** 全局背景图片 */
  globalBg?: string;
  tabsPosition?: 'top' | 'bottom';
  headerImage?: string;
  footerImage?: string;
  showStatusBar?: boolean;
  showBatteryPercent?: boolean;
  showStatusBarDate?: boolean;
  /** 返回桌面 */
  onReturnToDesktop?: () => void;
  reserveBottomInset?: string;
}

const AppShell: React.FC<AppShellProps> = ({
  isMobile,
  activeTab,
  setActiveTab,
  activeSubView,
  setActiveSubView,
  renderActiveTab,
  renderSubView,
  showPlusMenu,
  setShowPlusMenu,
  userAvatar,
  userName,
  userSignature,
  isTelegramLayout = false,
  toast,
  uiDialog,
  setUiDialog,
  uiDialogInput,
  setUiDialogInput,
  tabBadges = {},
  onEdgeBack,
  onResetNavigation,
  progressDialog,
  globalBg,
  tabsPosition = 'bottom',
  headerImage,
  footerImage,
  showStatusBar = false,
  showBatteryPercent = true,
  showStatusBarDate = false,
  onReturnToDesktop,
  reserveBottomInset = '0px'
}) => {
  // 边缘手势检测现在由 App.tsx 中的 useEdgeSwipeBack hook 统一处理
  // 这里仅保留必要的 UI 渲染逻辑
  const [showTelegramMenu, setShowTelegramMenu] = React.useState(false);
  const rootSkinId = (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-render-skin') : null) || 'wechat';
  const isY2KSkin = rootSkinId === 'y2k';
  const isQQSkin = rootSkinId === 'qq';
  const shellLayout = resolveAppShellLayout({
    isMobile,
    activeSubView,
    tabsPosition,
    isTelegramLayout,
    showStatusBar,
    reserveBottomInset
  });
  const telegramMenuTopOffset = showStatusBar ? 'calc(32px + var(--safe-top, 0px))' : '0px';

  // 标签项定义（顶部和底部导航共用）
  const tabItems = isTelegramLayout
    ? [
        { tab: AppTab.CHATS, icon: 'fa-comment', label: '叙说' },
        { tab: AppTab.CONTACTS, icon: 'fa-address-book', label: isQQSkin ? '联系人' : '通讯录' }
      ]
    : [
        { tab: AppTab.CHATS, icon: 'fa-comment', label: '叙说' },
        { tab: AppTab.CONTACTS, icon: 'fa-address-book', label: isQQSkin ? '联系人' : '通讯录' },
        { tab: AppTab.DISCOVER, icon: 'fa-compass', label: isQQSkin ? '动态' : '发现' },
        { tab: AppTab.ME, icon: 'fa-user', label: '我' }
      ];

  const isDivinationSubView = activeSubView === 'divination' || activeSubView === 'divinationResult' || activeSubView === 'divinationHistory';

  const handleDesktopSidebarClick = (tab: AppTab) => {
    if (!isMobile && isTelegramLayout) {
      if (tab === AppTab.DISCOVER) {
        setShowTelegramMenu(true);
        return;
      }
      if (tab === AppTab.ME) {
        setActiveSubView('settings');
        return;
      }
    }
    setActiveTab(tab);
    onResetNavigation?.();
  };

  return (
    <div
      className="fixed inset-0 flex flex-col md:flex-row render-bg-primary overflow-hidden font-sans select-none antialiased render-text-primary safe-area-container"
      style={{
        margin: '0 auto',
        width: '100%',
        maxWidth: 'var(--app-content-max-width)',
        ...buildAppShellLayoutVars(shellLayout),
        ['--app-header-image' as any]: headerImage ? `url(${headerImage})` : 'none',
        ['--app-global-bg-image' as any]: globalBg ? `url(${globalBg})` : 'none',
        ...(globalBg ? {
          backgroundImage: `url(${globalBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        } : {}),
        ...(showStatusBar ? { paddingTop: 'calc(32px + var(--safe-top, 0px))' } : {})
      }}
    >
      {showStatusBar && (
        <React.Suspense fallback={<div className="absolute top-0 left-0 right-0 z-[80] render-bg-primary" style={{ height: '32px' }} />}>
          <AppShellStatusBar
            isMobile={isMobile}
            showBatteryPercent={showBatteryPercent}
            showStatusBarDate={showStatusBarDate}
            onReturnToDesktop={onReturnToDesktop}
          />
        </React.Suspense>
      )}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-4 py-2 rounded-full bg-black/70 text-white text-[13px] shadow-lg">{toast.message}</div>
      )}
      {(uiDialog || progressDialog) ? (
        <React.Suspense fallback={null}>
          <AppModalDialogs
            uiDialog={uiDialog}
            setUiDialog={setUiDialog}
            uiDialogInput={uiDialogInput}
            setUiDialogInput={setUiDialogInput}
            progressDialog={progressDialog}
          />
        </React.Suspense>
      ) : null}

      {!isMobile && (
        <React.Suspense fallback={null}>
          <DesktopSidebarNav
            userAvatar={userAvatar}
            isTelegramLayout={isTelegramLayout}
            activeTab={activeTab}
            isDivinationSubView={isDivinationSubView}
            tabBadges={tabBadges}
            onAvatarClick={() => { setActiveTab(AppTab.ME); onResetNavigation?.(); }}
            onTabSelect={handleDesktopSidebarClick}
            onDivinationSelect={() => setActiveSubView('divination')}
          />
        </React.Suspense>
      )}

      <div className={`${isMobile && activeSubView !== 'none' ? 'hidden' : 'flex'} flex-1 md:flex-none md:w-80 flex-col border-r render-border h-full render-bg-secondary relative`}>
        {isMobile && isY2KSkin && activeSubView === 'none' && (
          <React.Suspense fallback={<div className="h-[88px] border-b render-border-subtle" />}>
            <AppShellY2KTopProfile
              userAvatar={userAvatar}
              userName={userName}
              userSignature={userSignature}
              setActiveTab={setActiveTab}
              onResetNavigation={onResetNavigation}
              setActiveSubView={setActiveSubView}
              setShowPlusMenu={setShowPlusMenu}
            />
          </React.Suspense>
        )}
        {/* 顶部标签栏（top-tabs 布局，非固定，在普通流中占位） */}
        {shellLayout.shouldShowTabNav && shellLayout.isTopTabs && (
          <React.Suspense fallback={null}>
            <TabNavigation
              position="top"
              tabItems={tabItems}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              tabBadges={tabBadges}
              onResetNavigation={onResetNavigation}
              isY2KSkin={isY2KSkin}
              footerImage={footerImage}
            />
          </React.Suspense>
        )}
        {renderActiveTab()}
        {/* 底部标签栏（bottom-tabs 布局，固定定位） */}
        {shellLayout.hasVisibleBottomTabs && (
          <React.Suspense fallback={null}>
            <TabNavigation
              position="bottom"
              tabItems={tabItems}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              tabBadges={tabBadges}
              onResetNavigation={onResetNavigation}
              isY2KSkin={isY2KSkin}
              footerImage={footerImage}
            />
          </React.Suspense>
        )}
        {!isMobile && isTelegramLayout && activeSubView === 'none' && (
          <button
            className={`absolute left-3 z-[80] w-9 h-9 flex items-center justify-center render-telegram-hamburger-btn render-telegram-btn-on-light ${showStatusBar ? 'top-[calc(32px+var(--safe-top,0px)+12px)]' : 'top-3'}`}
            onClick={() => setShowTelegramMenu(true)}
            title="打开菜单"
          >
            <i className="fa-solid fa-bars text-[16px] text-white drop-shadow-sm"></i>
          </button>
        )}
      </div>

      <div
        className={`${isMobile && activeSubView === 'none' ? 'hidden' : 'flex'} flex-1 flex-col h-full render-bg-tertiary relative z-40 overflow-hidden`}
      >
        {renderSubView(activeSubView)}
        {activeSubView === 'none' && !isMobile && (
          <div className="render-empty-state flex-1 flex flex-col items-center justify-center render-text-tertiary opacity-30">
            <i className="fa-solid fa-comment text-[120px] mb-6"></i>
            <p className="text-2xl font-bold tracking-[0.3em] uppercase">Xushuo</p>
          </div>
        )}
      </div>

      {isTelegramLayout && activeSubView === 'none' && (
        <React.Suspense fallback={null}>
          <AppShellTelegramChrome
            isMobile={isMobile}
            activeTab={activeTab}
            activeSubView={activeSubView}
            showStatusBar={showStatusBar}
            showTelegramMenu={showTelegramMenu}
            setShowTelegramMenu={setShowTelegramMenu}
            telegramMenuTopOffset={telegramMenuTopOffset}
            userAvatar={userAvatar}
            userName={userName}
            userSignature={userSignature}
            setActiveTab={setActiveTab}
            setActiveSubView={setActiveSubView}
            onResetNavigation={onResetNavigation}
            setShowPlusMenu={setShowPlusMenu}
          />
        </React.Suspense>
      )}

      {showPlusMenu ? (
        <React.Suspense fallback={null}>
          <PlusMenu
            showPlusMenu={showPlusMenu}
            setShowPlusMenu={setShowPlusMenu}
            setActiveSubView={setActiveSubView}
            isMobile={isMobile}
            isTelegramLayout={isTelegramLayout}
            activeTab={activeTab}
          />
        </React.Suspense>
      ) : null}
    </div>
  );
};

export default AppShell;
