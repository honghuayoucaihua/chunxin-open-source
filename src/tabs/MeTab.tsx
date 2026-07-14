
import React from 'react';
import { UserProfile } from '../types';
import { MobileHeader, SectionDivider } from '../Common';
import SkinIcon from '../shell/SkinIcon';
const MeTabQQView = React.lazy(() => import('./MeTabQQView'));

const TabEntryRow: React.FC<{
  icon: string;
  color: string;
  label: string;
  rightContent?: React.ReactNode;
  onClick?: () => void;
}> = ({ icon, color, label, rightContent, onClick }) => (
  <button type="button" className="app-list-item app-list-item--interactive w-full text-left render-bg-secondary" onClick={onClick}>
    <div className={`wechat-cell-icon wechat-cell-icon-${icon} w-9 h-9 rounded flex items-center justify-center mr-3 flex-shrink-0 shadow-sm`} style={{ backgroundColor: color }}>
      <SkinIcon icon={icon} className="text-white text-[18px]" />
    </div>
    <div className="app-list-item-main">
      <div className="app-list-item-title">{label}</div>
    </div>
    {rightContent ? <div className="app-list-item-side">{rightContent}</div> : null}
  </button>
);

export const MeTab: React.FC<{ user: UserProfile, setUser?: (updater: any) => void, onSub: (v: any) => void }> = ({ user, setUser, onSub }) => {
  const rootSkinId = (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-render-skin') : null) || 'wechat';
  const isQQSkin = rootSkinId === 'qq';
  const isKakaoSkin = rootSkinId === 'kakao';
  const isY2KSkin = rootSkinId === 'y2k';
  const meSettingColor = isKakaoSkin ? '#7a6200' : '#4F86F6';

  return (
    <div className="flex flex-col render-bg-primary render-text-primary overflow-hidden h-full render-me-tab-root">
      {!isY2KSkin && !isQQSkin && <MobileHeader title="我" actions={null} className="border-none render-bg-secondary render-me-header" />}
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ paddingBottom: 'var(--tab-scroll-pb)' }}>
        {isQQSkin && !isY2KSkin && (
          <React.Suspense fallback={<div className="render-qq-me-top-gap" />}>
            <MeTabQQView
              user={user}
              onSub={onSub}
              setUser={setUser}
            />
          </React.Suspense>
        )}
        {!isQQSkin && (
          <>
        {!isY2KSkin && (
          <>
            <div className="render-bg-secondary p-6 flex items-center active:bg-[var(--bg-hover)] cursor-pointer render-me-profile-card" onClick={() => onSub('editProfile')}>
              <img src={user.avatar} className="w-16 h-16 app-avatar-radius mr-4 object-cover shadow-sm render-bg-tertiary" />
              <div className="flex-1 overflow-hidden">
                <h2 className="text-xl font-bold truncate">{user.name}</h2>
                <p className="text-[14px] render-text-secondary mt-1 truncate leading-tight">账号ID: {user.wechatId}</p>
                {user.status && <p className="text-[12px] text-gray-400 mt-1 truncate leading-tight">{user.status}</p>}
              </div>
              <div className="flex items-center space-x-2">
                <i className="fa-solid fa-qrcode render-text-secondary"></i>
                <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
              </div>
            </div>
            <SectionDivider />
          </>
        )}
        <div className="render-bg-secondary">
          <TabEntryRow icon="fa-wallet" color="#10AD7A" label="服务" onClick={() => onSub('pay')} />
        </div>
        <SectionDivider />
        <div className="render-bg-secondary">
          <TabEntryRow icon="fa-heart" color="#FA5151" label="收藏" onClick={() => onSub('favorites')} />
          <TabEntryRow icon="fa-images" color="#5B8CFF" label="相册" onClick={() => onSub('imageLibraryGroups')} />
          <TabEntryRow icon="fa-face-smile" color="#FFC300" label="表情" onClick={() => onSub('emojiGroups')} />
        </div>
        <SectionDivider />
        <div className="render-bg-secondary">
          <TabEntryRow icon="fa-gear" color={meSettingColor} label="设置" onClick={() => onSub('settings')} />
        </div>
          </>
        )}
      </div>
    </div>
  );
};
