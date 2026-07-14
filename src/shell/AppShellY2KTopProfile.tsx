import React from 'react';
import { AppTab } from '../types';

const AppShellY2KTopProfile: React.FC<{
  userAvatar: string;
  userName?: string;
  userSignature?: string;
  setActiveTab: (tab: AppTab) => void;
  onResetNavigation?: () => void;
  setActiveSubView: (sub: 'search') => void;
  setShowPlusMenu: (show: boolean) => void;
}> = ({
  userAvatar,
  userName,
  userSignature,
  setActiveTab,
  onResetNavigation,
  setActiveSubView,
  setShowPlusMenu
}) => (
  <div
    className="render-y2k-top-profile px-3 py-2 border-b render-border-subtle flex items-center gap-3.5 w-full text-left cursor-pointer"
    onClick={() => { setActiveTab(AppTab.ME); onResetNavigation?.(); }}
  >
    <img src={userAvatar} className="render-y2k-top-avatar w-16 h-16 object-cover rounded-sm border border-[#98b5d4]" />
    <div className="min-w-0 flex-1">
      <div className="text-[20px] leading-tight font-semibold truncate">{(userName || '用户').trim() || '用户'}</div>
      <div className="text-[14px] leading-tight mt-1 render-text-secondary truncate">{(userSignature || '这个人很懒，什么都没写').trim() || '这个人很懒，什么都没写'}</div>
    </div>
    <button
      type="button"
      className="w-9 h-9 rounded-sm border border-[#9bb6d1] text-[14px] render-y2k-profile-btn"
      onClick={(event) => { event.stopPropagation(); setActiveSubView('search'); }}
    >
      <i className="fa-solid fa-magnifying-glass"></i>
    </button>
    <button
      type="button"
      className="w-9 h-9 rounded-sm border border-[#9bb6d1] text-[14px] render-y2k-profile-btn"
      onClick={(event) => { event.stopPropagation(); setShowPlusMenu(true); }}
    >
      <i className="fa-solid fa-plus"></i>
    </button>
  </div>
);

export default AppShellY2KTopProfile;
