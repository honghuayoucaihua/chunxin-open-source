import React from 'react';
import { AppTab, SubView } from '../types';

const TelegramNavigationMenu = React.lazy(() => import('./TelegramNavigationMenu'));

const AppShellTelegramChrome: React.FC<{
  isMobile: boolean;
  activeTab: AppTab;
  activeSubView: SubView;
  showStatusBar: boolean;
  showTelegramMenu: boolean;
  setShowTelegramMenu: (show: boolean) => void;
  telegramMenuTopOffset: string;
  userAvatar: string;
  userName?: string;
  userSignature?: string;
  setActiveTab: (tab: AppTab) => void;
  setActiveSubView: (sub: SubView) => void;
  onResetNavigation?: () => void;
  setShowPlusMenu: (show: boolean) => void;
}> = ({
  isMobile,
  activeTab,
  activeSubView,
  showStatusBar,
  showTelegramMenu,
  setShowTelegramMenu,
  telegramMenuTopOffset,
  userAvatar,
  userName,
  userSignature,
  setActiveTab,
  setActiveSubView,
  onResetNavigation,
  setShowPlusMenu
}) => {
  if (activeSubView !== 'none') return null;

  return (
    <>
      {isMobile && (
        <button
          className={`fixed left-3 z-[120] w-9 h-9 flex items-center justify-center render-telegram-hamburger-btn ${activeTab === AppTab.CHATS ? 'render-telegram-btn-on-accent' : 'render-telegram-btn-on-light'} ${showStatusBar ? 'top-[calc(var(--safe-top)+40px)]' : 'top-[calc(var(--safe-top)+8px)]'}`}
          onClick={() => setShowTelegramMenu(true)}
        >
          <i className="fa-solid fa-bars"></i>
        </button>
      )}
      {isMobile && activeTab === AppTab.CHATS && (
        <button
          className={`fixed right-3 z-[120] w-9 h-9 flex items-center justify-center render-telegram-search-btn render-telegram-btn-on-accent ${showStatusBar ? 'top-[calc(var(--safe-top)+40px)]' : 'top-[calc(var(--safe-top)+8px)]'}`}
          onClick={() => setActiveSubView('search')}
        >
          <i className="fa-solid fa-magnifying-glass"></i>
        </button>
      )}
      {isMobile && activeTab === AppTab.CHATS && (
        <button
          className="fixed right-4 bottom-[calc(var(--safe-bottom)+18px)] z-[120] w-12 h-12 rounded-full flex items-center justify-center render-telegram-fab"
          onClick={() => setShowPlusMenu(true)}
        >
          <i className="fa-solid fa-pen"></i>
        </button>
      )}
      {showTelegramMenu ? (
        <React.Suspense fallback={<div className="fixed inset-0 z-[130] bg-black/45" />}>
          <TelegramNavigationMenu
            isMobile={isMobile}
            showTelegramMenu={showTelegramMenu}
            setShowTelegramMenu={setShowTelegramMenu}
            telegramMenuTopOffset={telegramMenuTopOffset}
            userAvatar={userAvatar}
            userName={userName}
            userSignature={userSignature}
            setActiveTab={setActiveTab}
            setActiveSubView={setActiveSubView}
            onResetNavigation={onResetNavigation}
          />
        </React.Suspense>
      ) : null}
    </>
  );
};

export default AppShellTelegramChrome;
