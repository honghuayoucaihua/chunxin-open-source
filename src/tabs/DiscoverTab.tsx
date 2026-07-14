
import React from 'react';
import { MobileHeader, SectionDivider } from '../Common';
import SkinIcon from '../shell/SkinIcon';

const TabEntryRow: React.FC<{
  icon: string;
  color: string;
  label: string;
  onClick?: () => void;
}> = ({ icon, color, label, onClick }) => (
  <button type="button" className="app-list-item app-list-item--interactive w-full text-left render-bg-secondary" onClick={onClick}>
    <div className={`wechat-cell-icon wechat-cell-icon-${icon} w-9 h-9 rounded flex items-center justify-center mr-3 flex-shrink-0 shadow-sm`} style={{ backgroundColor: color }}>
      <SkinIcon icon={icon} className="text-white text-[18px]" />
    </div>
    <div className="app-list-item-main">
      <div className="app-list-item-title">{label}</div>
    </div>
  </button>
);

interface DiscoverTabProps {
  onMoments: () => void;
  onMiniPrograms: () => void;
  onScan: () => void;
  onShake: () => void;
  onListenMusic: () => void;
  onForum: () => void;
  onMailbox: () => void;
  onAnonymousChat: () => void;
  onNovelDiscover: () => void;
  onIfLine: () => void;
  onCommunity: () => void;
  onDivination: () => void;
  isDesktopMode?: boolean;
}

export const DiscoverTab: React.FC<DiscoverTabProps> = ({
  onMoments,
  onMiniPrograms,
  onScan,
  onShake,
  onListenMusic,
  onForum,
  onMailbox,
  onAnonymousChat,
  onNovelDiscover,
  onIfLine,
  onCommunity,
  onDivination,
  isDesktopMode = false
}) => {
  const rootSkinId = (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-render-skin') : null) || 'wechat';
  const isQQSkin = rootSkinId === 'qq';
  const isKakaoSkin = rootSkinId === 'kakao';
  const isY2KSkin = rootSkinId === 'y2k';
  const discoverBlue = isKakaoSkin ? '#7a6200' : '#1082FF';

  // 桌面模式下只显示朋友圈、扫一扫、摇一摇、if线
  if (isDesktopMode) {
    return (
      <div className="flex flex-col render-bg-primary render-text-primary overflow-hidden h-full render-discover-tab-root">
        {!isY2KSkin && <MobileHeader title={isQQSkin ? '动态' : '发现'} className="render-discover-header" />}
        <div className="flex-1 overflow-y-auto no-scrollbar" style={{ paddingBottom: 'var(--tab-scroll-pb)' }}>
          <div className="render-bg-secondary">
            <TabEntryRow icon={isQQSkin ? 'fa-star' : 'fa-circle-nodes'} color="#10AD7A" label={isQQSkin ? '空间动态' : '朋友圈'} onClick={onMoments} />
          </div>
          <SectionDivider />
          <div className="render-bg-secondary">
            <TabEntryRow icon="fa-qrcode" color={discoverBlue} label="扫一扫" onClick={onScan} />
            <TabEntryRow icon="fa-hand-point-up" color={discoverBlue} label="摇一摇" onClick={onShake} />
          </div>
          <SectionDivider />
          <div className="render-bg-secondary">
            <TabEntryRow icon="fa-code-branch" color="#0EA5E9" label="if线" onClick={onIfLine} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col render-bg-primary render-text-primary overflow-hidden h-full render-discover-tab-root">
      {!isY2KSkin && <MobileHeader title={isQQSkin ? '动态' : '发现'} className="render-discover-header" />}
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ paddingBottom: 'var(--tab-scroll-pb)' }}>
         <div className="render-bg-secondary">
           <TabEntryRow icon={isQQSkin ? 'fa-star' : 'fa-circle-nodes'} color="#10AD7A" label={isQQSkin ? '空间动态' : '朋友圈'} onClick={onMoments} />
         </div>
         <SectionDivider />
         <div className="render-bg-secondary">
           <TabEntryRow icon="fa-qrcode" color={discoverBlue} label="扫一扫" onClick={onScan} />
           <TabEntryRow icon="fa-hand-point-up" color={discoverBlue} label="摇一摇" onClick={onShake} />
           <TabEntryRow icon="fa-dice" color="#7C5CFC" label="占卜" onClick={onDivination} />
           <TabEntryRow icon="fa-headphones" color="#FA5151" label="听音乐" onClick={onListenMusic} />
         </div>
          <SectionDivider />
          <div className="render-bg-secondary">
            <TabEntryRow icon="fa-code-branch" color="#0EA5E9" label="if线" onClick={onIfLine} />
          </div>
          <SectionDivider />
          <div className="render-bg-secondary">
            <TabEntryRow icon="fa-book-open-reader" color="#FF5B47" label="小说" onClick={onNovelDiscover} />
            <TabEntryRow icon="fa-envelope-open-text" color="#F59E0B" label="信箱" onClick={onMailbox} />
            <TabEntryRow icon="fa-user-secret" color="#8B5CF6" label="匿名聊天" onClick={onAnonymousChat} />
            <TabEntryRow icon="fa-comments" color="#7D5FFF" label="论坛" onClick={onForum} />
            <TabEntryRow icon="fa-globe" color="#3B82F6" label="社区" onClick={onCommunity} />
          </div>
      </div>
    </div>
  );
};
