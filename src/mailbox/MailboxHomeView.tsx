import React from 'react';
import { MailboxThemeSettings } from './MailboxSubPages';
import { MobileHeader } from '../Common';
import { resolveMailboxPageStyle, resolveMailboxRowClass, resolveMailboxContainerClass } from './mailboxThemeUtils';

const RetroNokiaStatus: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mx-4 mt-2 mb-2 border-2 border-[#33462f] bg-[#bfd0a2] px-2 py-1 text-[#1f2f1f] shadow-[inset_0_0_0_1px_#e5efd2]">
    <div className="flex items-center justify-between text-[10px] leading-none tracking-[0.08em]">
      <span>CMCC</span>
      <div className="flex items-end gap-[2px]">
        <span className="w-[3px] h-[4px] bg-[#1f2f1f]"></span>
        <span className="w-[3px] h-[6px] bg-[#1f2f1f]"></span>
        <span className="w-[3px] h-[8px] bg-[#1f2f1f]"></span>
        <span className="w-[3px] h-[10px] bg-[#1f2f1f]"></span>
      </div>
      <span>12:06</span>
      <div className="w-5 h-2 border border-[#1f2f1f] relative">
        <span className="absolute right-[-2px] top-[2px] w-[2px] h-[4px] bg-[#1f2f1f]"></span>
        <span className="absolute left-[1px] top-[1px] right-[4px] bottom-[1px] bg-[#1f2f1f]"></span>
      </div>
    </div>
    <div className="mt-1 border-t border-[#4f6746] pt-1 flex items-center justify-between text-[11px] tracking-[0.12em]">
      <span>{title}</span>
      <span className="opacity-80">{subtitle || 'MENU'}</span>
    </div>
  </div>
);

const RetroNokiaSoftKeys: React.FC<{ left?: string; center?: string; right?: string }> = ({ left = '选项', center = '确认', right = '返回' }) => (
  <div className="mx-4 mt-3 mb-2 border-2 border-[#32472f] rounded-[8px] bg-[#a9bc8a] px-3 py-2 shadow-[inset_0_0_0_1px_#d8e4bf]">
    <div className="flex items-center justify-between text-[11px] tracking-[0.12em] text-[#1f2f1f]">
      <span>{left}</span>
      <span>{center}</span>
      <span>{right}</span>
    </div>
    <div className="mt-2 grid grid-cols-3 gap-2">
      <div className="h-6 border border-[#384e34] bg-[#c7d7ab]"></div>
      <div className="h-6 border border-[#384e34] bg-[#dce9bf] rounded-full"></div>
      <div className="h-6 border border-[#384e34] bg-[#c7d7ab]"></div>
    </div>
  </div>
);

export { RetroNokiaStatus, RetroNokiaSoftKeys };

export const MailboxHomeView: React.FC<{
  onBack: () => void;
  onCompose: () => void;
  onInbox: () => void;
  onSent: () => void;
  onContacts: () => void;
  onSettings: () => void;
  inboxCount: number;
  sentCount: number;
  theme: MailboxThemeSettings;
}> = ({ onBack, onCompose, onInbox, onSent, onContacts, onSettings, inboxCount, sentCount, theme }) => {
  const rowClass = resolveMailboxRowClass(theme);
  const containerClass = resolveMailboxContainerClass(theme);
  const isRetro = theme.skin === 'retro';
  return (
    <div className="fixed inset-0 z-[300] flex flex-col animate-in slide-in-from-bottom duration-300" style={resolveMailboxPageStyle(theme)}>
      <MobileHeader title="信箱" onBack={onBack} />
      {isRetro && <RetroNokiaStatus title="短信" subtitle="信息中心" />}
      <div className={`${isRetro ? 'mt-0' : 'mt-3'} mx-4 overflow-hidden ${containerClass}`}>
        <button className={rowClass} onClick={onCompose}>
          <div className="flex items-center gap-3">
            <i className={`fa-solid ${isRetro ? 'fa-square-pen text-[#2f4b2c]' : 'fa-pen-nib'} w-4 text-center`} style={isRetro ? undefined : { color: 'var(--app-accent-color)' }}></i>
            <span>写信</span>
          </div>
          <i className={`fa-solid fa-chevron-right text-xs ${isRetro ? 'text-[#2f4b2c]' : 'render-text-secondary'}`}></i>
        </button>
        <button className={rowClass} onClick={onInbox}>
          <div className="flex items-center gap-3">
            <i className={`fa-solid fa-inbox w-4 text-center ${isRetro ? 'text-[#2f4b2c]' : 'text-[#3B82F6]'}`}></i>
            <span>收信箱</span>
          </div>
          <div className="flex items-center gap-2">
            {inboxCount > 0 && <span className={`text-[12px] ${isRetro ? 'text-[#2f4b2c] font-bold' : 'text-[#E02424]'}`}>{inboxCount}</span>}
            <i className={`fa-solid fa-chevron-right text-xs ${isRetro ? 'text-[#2f4b2c]' : 'render-text-secondary'}`}></i>
          </div>
        </button>
        <button className={rowClass} onClick={onSent}>
          <div className="flex items-center gap-3">
            <i className={`fa-solid fa-paper-plane w-4 text-center ${isRetro ? 'text-[#2f4b2c]' : 'text-[#10AD7A]'}`}></i>
            <span>发信箱</span>
          </div>
          <div className="flex items-center gap-2">
            {sentCount > 0 && <span className={`text-[12px] ${isRetro ? 'text-[#2f4b2c] font-bold' : 'render-text-secondary'}`}>{sentCount}</span>}
            <i className={`fa-solid fa-chevron-right text-xs ${isRetro ? 'text-[#2f4b2c]' : 'render-text-secondary'}`}></i>
          </div>
        </button>
        <button className={rowClass} onClick={onContacts}>
          <div className="flex items-center gap-3">
            <i className={`fa-solid fa-address-book w-4 text-center ${isRetro ? 'text-[#2f4b2c]' : 'text-[#4F86F6]'}`}></i>
            <span>通讯录</span>
          </div>
          <i className={`fa-solid fa-chevron-right text-xs ${isRetro ? 'text-[#2f4b2c]' : 'render-text-secondary'}`}></i>
        </button>
        <button className={rowClass.replace('border-b', '')} onClick={onSettings}>
          <div className="flex items-center gap-3">
            <i className={`fa-solid fa-gear w-4 text-center ${isRetro ? 'text-[#2f4b2c]' : 'text-[#7c7c7c]'}`}></i>
            <span>设置</span>
          </div>
          <i className={`fa-solid fa-chevron-right text-xs ${isRetro ? 'text-[#2f4b2c]' : 'render-text-secondary'}`}></i>
        </button>
      </div>
      {isRetro && <RetroNokiaSoftKeys left="菜单" center="打开" right="返回" />}
    </div>
  );
};
