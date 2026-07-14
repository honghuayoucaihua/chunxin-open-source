import React from 'react';
import { AppTab, SubView } from '../types';

type TelegramNavigationMenuProps = {
  isMobile: boolean;
  showTelegramMenu: boolean;
  setShowTelegramMenu: (show: boolean) => void;
  telegramMenuTopOffset: string;
  userAvatar: string;
  userName?: string;
  userSignature?: string;
  setActiveTab: (tab: AppTab) => void;
  setActiveSubView: (sub: SubView) => void;
  onResetNavigation?: () => void;
};

const TelegramNavigationMenu: React.FC<TelegramNavigationMenuProps> = ({
  isMobile,
  showTelegramMenu,
  setShowTelegramMenu,
  telegramMenuTopOffset,
  userAvatar,
  userName,
  userSignature,
  setActiveTab,
  setActiveSubView,
  onResetNavigation
}) => {
  if (!showTelegramMenu) return null;

  return (
    <div className="fixed inset-0 z-[130]" onClick={() => setShowTelegramMenu(false)}>
      <div className="absolute inset-0 bg-black/45"></div>
      <aside
        className="absolute left-0 w-[78%] max-w-[320px] bg-[#1f2b38] text-[#d7e3ef] shadow-2xl flex flex-col overflow-hidden"
        style={{
          top: telegramMenuTopOffset,
          height: isMobile ? '100%' : `calc(100% - ${telegramMenuTopOffset})`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="w-full px-5 pt-[calc(var(--safe-top)+16px)] pb-4 border-b border-white/10 text-left hover:bg-white/5 flex-shrink-0"
          onClick={() => { setActiveSubView('editProfile'); setShowTelegramMenu(false); }}
        >
          <img src={userAvatar} className="w-14 h-14 rounded-full object-cover mb-3" />
          <div className="text-[16px] font-semibold">{(userName || '用户').trim() || '用户'}</div>
          <div className="text-[12px] opacity-70 mt-1">{(userSignature || '这个人很懒，什么都没写').trim() || '这个人很懒，什么都没写'}</div>
        </button>
        <div className="flex-1 overflow-y-auto no-scrollbar py-2" style={{ paddingBottom: 'calc(16px + var(--safe-bottom, 0px))' }}>
          {[
            { tab: AppTab.CHATS, icon: 'fa-comment', label: '叙说' },
            { tab: AppTab.CONTACTS, icon: 'fa-address-book', label: '通讯录' }
          ].map(item => (
            <button
              key={item.tab}
              className="w-full px-5 py-3 text-left flex items-center gap-3 hover:bg-white/10"
              onClick={() => { setActiveTab(item.tab); onResetNavigation?.(); setShowTelegramMenu(false); }}
            >
              <i className={`fa-solid ${item.icon} w-5 text-center`}></i>
              <span>{item.label}</span>
            </button>
          ))}
          <div className="mt-2 border-t border-white/10"></div>
          <button className="w-full px-5 py-3 text-left flex items-center gap-3 hover:bg-white/10" onClick={() => { setActiveSubView('moments'); setShowTelegramMenu(false); }}>
            <i className="fa-solid fa-circle-nodes w-5 text-center"></i>
            <span>朋友圈</span>
          </button>
          <button className="w-full px-5 py-3 text-left flex items-center gap-3 hover:bg-white/10" onClick={() => { setActiveSubView('mailbox'); setShowTelegramMenu(false); }}>
            <i className="fa-solid fa-envelope-open-text w-5 text-center"></i>
            <span>信箱</span>
          </button>
          <button className="w-full px-5 py-3 text-left flex items-center gap-3 hover:bg-white/10" onClick={() => { setActiveSubView('forum'); setShowTelegramMenu(false); }}>
            <i className="fa-solid fa-comments w-5 text-center"></i>
            <span>论坛</span>
          </button>
          <button className="w-full px-5 py-3 text-left flex items-center gap-3 hover:bg-white/10" onClick={() => { setActiveSubView('community'); setShowTelegramMenu(false); }}>
            <i className="fa-solid fa-globe w-5 text-center"></i>
            <span>社区</span>
          </button>
          <button className="w-full px-5 py-3 text-left flex items-center gap-3 hover:bg-white/10" onClick={() => { setActiveSubView('ifLine'); setShowTelegramMenu(false); }}>
            <i className="fa-solid fa-code-branch w-5 text-center"></i>
            <span>if线</span>
          </button>
          <button className="w-full px-5 py-3 text-left flex items-center gap-3 hover:bg-white/10" onClick={() => { setActiveSubView('divination'); setShowTelegramMenu(false); }}>
            <i className="fa-solid fa-dice w-5 text-center"></i>
            <span>占卜</span>
          </button>
          <button className="w-full px-5 py-3 text-left flex items-center gap-3 hover:bg-white/10" onClick={() => { setActiveSubView('novelDiscover'); setShowTelegramMenu(false); }}>
            <i className="fa-solid fa-book-open w-5 text-center"></i>
            <span>小说</span>
          </button>
          <button className="w-full px-5 py-3 text-left flex items-center gap-3 hover:bg-white/10" onClick={() => { setActiveSubView('anonymousChat'); setShowTelegramMenu(false); }}>
            <i className="fa-solid fa-user-secret w-5 text-center"></i>
            <span>匿名聊天</span>
          </button>
          <button className="w-full px-5 py-3 text-left flex items-center gap-3 hover:bg-white/10" onClick={() => { setActiveSubView('pay'); setShowTelegramMenu(false); }}>
            <i className="fa-solid fa-wallet w-5 text-center"></i>
            <span>服务</span>
          </button>
          <button className="w-full px-5 py-3 text-left flex items-center gap-3 hover:bg-white/10" onClick={() => { setActiveSubView('favorites'); setShowTelegramMenu(false); }}>
            <i className="fa-solid fa-heart w-5 text-center"></i>
            <span>收藏</span>
          </button>
          <button className="w-full px-5 py-3 text-left flex items-center gap-3 hover:bg-white/10" onClick={() => { setActiveSubView('imageLibraryGroups'); setShowTelegramMenu(false); }}>
            <i className="fa-solid fa-images w-5 text-center"></i>
            <span>相册</span>
          </button>
          <button className="w-full px-5 py-3 text-left flex items-center gap-3 hover:bg-white/10" onClick={() => { setActiveSubView('emojiGroups'); setShowTelegramMenu(false); }}>
            <i className="fa-solid fa-face-smile w-5 text-center"></i>
            <span>表情</span>
          </button>
          <button className="w-full px-5 py-3 text-left flex items-center gap-3 hover:bg-white/10" onClick={() => { setActiveSubView('settings'); setShowTelegramMenu(false); }}>
            <i className="fa-solid fa-gear w-5 text-center"></i>
            <span>设置</span>
          </button>
        </div>
      </aside>
    </div>
  );
};

export default TelegramNavigationMenu;
