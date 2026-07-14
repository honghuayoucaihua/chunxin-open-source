
import React from 'react';
import { AppTab, SubView } from '../types';
import { DropdownItem, DropdownMenu } from '../utils/DropdownPrimitives';

interface PlusMenuProps {
  showPlusMenu: boolean;
  setShowPlusMenu: (show: boolean) => void;
  setActiveSubView: (sub: SubView) => void;
  isMobile: boolean;
  isTelegramLayout: boolean;
  activeTab: AppTab;
}

export const PlusMenu: React.FC<PlusMenuProps> = ({
  showPlusMenu,
  setShowPlusMenu,
  setActiveSubView,
  isMobile,
  isTelegramLayout,
  activeTab
}) => {
  if (!showPlusMenu) return null;

  return (
    <div className={`${isMobile ? 'fixed' : 'absolute'} inset-0 z-[100]`} onClick={() => setShowPlusMenu(false)}>
      <DropdownMenu
        className={`absolute w-44 app-plus-menu py-1 animate-in fade-in zoom-in duration-200 ${
          isMobile && isTelegramLayout && activeTab === AppTab.CHATS
            ? 'right-4 bottom-[calc(var(--safe-bottom)+76px)] origin-bottom-right'
            : isMobile
              ? 'top-12 right-2 origin-top-right'
              : 'top-12 left-[calc(var(--render-desktop-sidebar-width,64px)+8.5rem)] origin-top-right'
        }`}
      >
        {[
          { icon: 'fa-comment-dots', label: '发起群聊', onClick: () => setActiveSubView('createGroup') },
          { icon: 'fa-user-plus', label: '添加朋友', onClick: () => setActiveSubView('addFriend') },
          { icon: 'fa-qrcode', label: '扫一扫', onClick: () => setActiveSubView('scan') },
          { icon: 'fa-envelope', label: '收付款', onClick: () => setActiveSubView('receivePay') }
        ].map(item => (
          <DropdownItem key={item.label} onClick={item.onClick} className="app-plus-menu-item px-4 py-3 flex items-center space-x-4 cursor-pointer">
            <i className={`fa-solid ${item.icon} text-lg w-6 text-center`}></i>
            <span className="text-[16px]">{item.label}</span>
          </DropdownItem>
        ))}
      </DropdownMenu>
    </div>
  );
};
