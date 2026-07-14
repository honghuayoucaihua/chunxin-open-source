import React from 'react';
import { AppTab } from '../types';
import SkinIcon from './SkinIcon';

type DesktopSidebarNavProps = {
  userAvatar: string;
  isTelegramLayout: boolean;
  activeTab: AppTab;
  isDivinationSubView: boolean;
  tabBadges: Partial<Record<AppTab, number>>;
  onAvatarClick: () => void;
  onTabSelect: (tab: AppTab) => void;
  onDivinationSelect: () => void;
};

export const DesktopSidebarNav: React.FC<DesktopSidebarNavProps> = ({
  userAvatar,
  isTelegramLayout,
  activeTab,
  isDivinationSubView,
  tabBadges,
  onAvatarClick,
  onTabSelect,
  onDivinationSelect
}) => {
  const navItems = isTelegramLayout
    ? [
        { key: 'chats', tab: AppTab.CHATS, icon: 'fa-comment' },
        { key: 'contacts', tab: AppTab.CONTACTS, icon: 'fa-address-book' },
        { key: 'divination', tab: null, icon: 'fa-dice', subView: 'divination' }
      ]
    : [
        { key: 'chats', tab: AppTab.CHATS, icon: 'fa-comment' },
        { key: 'contacts', tab: AppTab.CONTACTS, icon: 'fa-address-book' },
        { key: 'discover', tab: AppTab.DISCOVER, icon: 'fa-compass' },
        { key: 'me', tab: AppTab.ME, icon: 'fa-gear' }
      ];

  return (
    <nav
      className="app-sidebar-nav render-desktop-sidebar flex flex-col items-center py-8 flex-shrink-0 space-y-8 z-50 border-r border-black/10 dark:border-white/5"
      style={{ width: 'var(--render-desktop-sidebar-width, 64px)' }}
    >
      <img
        src={userAvatar}
        className="rounded-sm cursor-pointer shadow-md bg-white"
        style={{ width: 'var(--render-desktop-avatar-size, 40px)', height: 'var(--render-desktop-avatar-size, 40px)' }}
        onClick={onAvatarClick}
      />
      {navItems.map((item) => {
        const isDivinationItem = item.subView === 'divination';
        const count = item.tab ? Number(tabBadges[item.tab] || 0) : 0;
        const isActive = isDivinationItem ? isDivinationSubView : activeTab === item.tab;

        return (
          <div
            key={item.key}
            className={`relative ${isActive ? 'nav-icon-active' : ''}`}
            onClick={() => {
              if (isDivinationItem) {
                onDivinationSelect();
                return;
              }
              if (item.tab) onTabSelect(item.tab);
            }}
          >
            <SkinIcon
              icon={item.icon}
              className={`cursor-pointer transition-colors ${isActive ? '' : 'text-[#999] hover:text-white'}`}
              style={{
                fontSize: 'var(--render-desktop-icon-size, 24px)',
                ...(isActive ? { color: 'var(--app-accent-color)' } : {})
              }}
            />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] leading-4 text-center font-semibold">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default DesktopSidebarNav;
