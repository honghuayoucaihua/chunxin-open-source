import React from 'react';
import { MailLetter } from '../types';
import { MailboxThemeSettings } from './MailboxSubPages';
import { MobileHeader } from '../Common';
import { resolveMailboxPageStyle, resolveMailboxRowClass, resolveMailboxContainerClass } from './mailboxThemeUtils';
import { RetroNokiaStatus, RetroNokiaSoftKeys } from './MailboxHomeView';

const MailLetterRow: React.FC<{
  item: MailLetter;
  onOpen: () => void;
  role: 'inbox' | 'sent';
  theme: MailboxThemeSettings;
}> = ({ item, onOpen, role, theme }) => (
  <button
    className={`${resolveMailboxRowClass(theme)} h-auto py-3 text-left`}
    onClick={onOpen}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[14px] font-medium truncate">{role === 'inbox' ? `来自 ${item.fromName}` : `致 ${item.toName}`}</div>
        <div className="text-[12px] render-text-secondary truncate mt-1">{item.content}</div>
        {(item.signatureImage || item.stampImage) && (
          <div className="mt-2 flex items-center gap-2">
            {item.signatureImage && <img src={item.signatureImage} className="w-[58px] h-[20px] object-contain" />}
            {item.stampImage && <img src={item.stampImage} className="w-5 h-5 rounded-full object-cover" />}
          </div>
        )}
      </div>
      <div className="text-[12px] render-text-secondary shrink-0">{item.date}</div>
    </div>
  </button>
);

export { MailLetterRow };

export const MailInboxView: React.FC<{
  onBack: () => void;
  inboxLetters: MailLetter[];
  onOpenLetter: (letter: MailLetter) => void;
  theme: MailboxThemeSettings;
}> = ({ onBack, inboxLetters, onOpenLetter, theme }) => (
  <div className="fixed inset-0 z-[300] flex flex-col animate-in slide-in-from-bottom duration-300" style={resolveMailboxPageStyle(theme)}>
    <MobileHeader title="收信箱" onBack={onBack} />
    {theme.skin === 'retro' && <RetroNokiaStatus title="收件箱" subtitle={`${inboxLetters.length} 条`} />}
    <div className={`flex-1 overflow-y-auto no-scrollbar mt-3 mx-4 overflow-hidden ${resolveMailboxContainerClass(theme)}`}>
      {inboxLetters.length === 0
        ? <div className={`text-center text-[13px] py-10 ${theme.skin === 'retro' ? 'bg-[#bccca0] text-[#22311f]' : theme.skin === 'postbox' ? 'bg-[#f6ead4] text-[#4a3221]' : 'bg-[#f6f9ff] text-[#2a3547]'}`}>收信箱暂无信件</div>
        : inboxLetters.slice().reverse().map(item => <MailLetterRow key={item.id} item={item} role="inbox" onOpen={() => onOpenLetter(item)} theme={theme} />)}
    </div>
    {theme.skin === 'retro' && <RetroNokiaSoftKeys left="选项" center="阅读" right="返回" />}
  </div>
);

export const MailSentView: React.FC<{
  onBack: () => void;
  sentLetters: MailLetter[];
  onOpenLetter: (letter: MailLetter) => void;
  theme: MailboxThemeSettings;
}> = ({ onBack, sentLetters, onOpenLetter, theme }) => (
  <div className="fixed inset-0 z-[300] flex flex-col animate-in slide-in-from-bottom duration-300" style={resolveMailboxPageStyle(theme)}>
    <MobileHeader title="发信箱" onBack={onBack} />
    {theme.skin === 'retro' && <RetroNokiaStatus title="发件箱" subtitle={`${sentLetters.length} 条`} />}
    <div className={`flex-1 overflow-y-auto no-scrollbar mt-3 mx-4 overflow-hidden ${resolveMailboxContainerClass(theme)}`}>
      {sentLetters.length === 0
        ? <div className={`text-center text-[13px] py-10 ${theme.skin === 'retro' ? 'bg-[#bccca0] text-[#22311f]' : theme.skin === 'postbox' ? 'bg-[#f6ead4] text-[#4a3221]' : 'bg-[#f6f9ff] text-[#2a3547]'}`}>发信箱暂无信件</div>
        : sentLetters.slice().reverse().map(item => <MailLetterRow key={item.id} item={item} role="sent" onOpen={() => onOpenLetter(item)} theme={theme} />)}
    </div>
    {theme.skin === 'retro' && <RetroNokiaSoftKeys left="选项" center="打开" right="返回" />}
  </div>
);
