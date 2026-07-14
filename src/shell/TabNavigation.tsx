
import React from 'react';
import { AppTab } from '../types';
import SkinIcon from './SkinIcon';

interface TabNavigationProps {
  position: 'top' | 'bottom';
  tabItems: Array<{ tab: AppTab; icon: string; label: string }>;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  tabBadges: Partial<Record<AppTab, number>>;
  onResetNavigation?: () => void;
  isY2KSkin: boolean;
  footerImage?: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  position,
  tabItems,
  activeTab,
  setActiveTab,
  tabBadges,
  onResetNavigation,
  isY2KSkin,
  footerImage
}) => {
  return (
    <nav
      className={[
        position === 'bottom'
          ? 'fixed left-0 right-0'
          : 'flex-shrink-0',
        'render-bg-tertiary',
        position === 'top' ? 'border-b' : 'border-t',
        'render-border flex flex-col z-50 render-tab-bar',
        `render-tab-bar-${position}`
      ].join(' ')}
      style={
          position === 'bottom'
            ? {
              bottom: 'var(--app-tabbar-bottom-offset, 0px)',
              maxWidth: 'var(--app-content-max-width)',
              ...(footerImage
                ? {
                    backgroundImage: `url(${footerImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }
                : {})
            }
          : (footerImage
              ? {
                  backgroundImage: `url(${footerImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }
              : undefined)
      }
    >
      <div
        className="flex items-center justify-around"
        style={
          position === 'bottom'
            ? {
                paddingTop: '6px',
                paddingBottom: 'calc(6px + var(--tabbar-safe-bottom, 0px))'
              }
            : { paddingTop: '6px', paddingBottom: '6px' }
        }
      >
        {tabItems.map(({ tab, icon, label }) => {
          const count = Number(tabBadges[tab] || 0);
          return (
            <div
              key={tab}
              onClick={() => { setActiveTab(tab); onResetNavigation?.(); }}
              className={`flex flex-col items-center justify-center flex-1 cursor-pointer transition-colors ${activeTab === tab ? 'tab-item-active' : 'text-gray-600 dark:text-[#888]'}`}
              style={activeTab === tab ? { color: 'var(--app-accent-color)' } : {}}
            >
              <div className="relative leading-none pt-0.5">
                <SkinIcon icon={icon} style={{ fontSize: 'var(--render-tab-icon-size, 20px)' }} />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] leading-4 text-center font-semibold">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </div>
              {!isY2KSkin && <span className="mt-0.5 font-medium leading-tight" style={{ fontSize: 'var(--render-tab-label-size, 10px)' }}>{label}</span>}
            </div>
          );
        })}
      </div>
    </nav>
  );
};
