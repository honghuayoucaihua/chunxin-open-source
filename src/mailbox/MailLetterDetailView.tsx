import React from 'react';
import { MailLetter } from '../types';
import { MailboxThemeSettings } from './MailboxSubPages';
import { MobileHeader } from '../Common';
import { resolveMailboxPageStyle, resolveMailboxPaperStyle, resolveMailboxLetterClass } from './mailboxThemeUtils';
import { RetroNokiaStatus, RetroNokiaSoftKeys } from './MailboxHomeView';

const MailLetterCard: React.FC<{ item: MailLetter; theme: MailboxThemeSettings }> = ({ item, theme }) => (
  theme.skin === 'retro' ? (
    <div className="text-[13px] leading-6 text-[#1f2f1f]">
      <div className="flex items-center justify-between text-[12px] border-b border-[#556f4b] pb-1 mb-2">
        <span>短信</span>
        <span>{item.date}</span>
      </div>
      <div className="text-[12px] mb-1">发件人: {item.fromName}</div>
      <div className="text-[12px] mb-2">收件人: {item.toName}</div>
      <div className="whitespace-pre-wrap break-words">{item.content}</div>
      <div className="mt-3 text-right">
        {item.signatureImage ? <img src={item.signatureImage} className="w-[86px] h-[30px] object-contain ml-auto" /> : <span>{item.fromName}</span>}
      </div>
      {item.stampImage && <img src={item.stampImage} className="w-9 h-9 rounded-full object-cover mt-2 ml-auto" />}
    </div>
  ) : theme.skin === 'mailbox' ? (
    <div className="text-[15px] leading-8 text-[#2a3547]">
      <div className="text-[13px] border-b border-[#b7cae9] pb-2 mb-3">
        <div><span className="text-[#4b658f]">From:</span> {item.fromName}</div>
        <div><span className="text-[#4b658f]">To:</span> {item.toName}</div>
        <div><span className="text-[#4b658f]">Date:</span> {item.date}</div>
        <div><span className="text-[#4b658f]">Subject:</span> {item.subject || '一封来自叙说的邮件'}</div>
      </div>
      <div className="whitespace-pre-wrap break-words">{item.content}</div>
      <div className="pt-4 text-right text-[13px] text-[#4b658f]">
        {item.signatureImage ? <img src={item.signatureImage} className="w-[96px] h-[36px] object-contain ml-auto mb-1" /> : <div>{item.fromName}</div>}
      </div>
      {item.stampImage && <img src={item.stampImage} className="w-9 h-9 rounded-full object-cover ml-auto" />}
    </div>
  ) : (
    <div className={`relative pb-28 ${resolveMailboxLetterClass(theme)}`}>
      <div className="text-[14px] opacity-80 mb-1">收件人</div>
      <div className="mb-3">致 {item.toName}</div>
      <div className="whitespace-pre-wrap [text-indent:2em] mt-1 tracking-[0.01em]">{item.content}</div>
      {item.blessing?.trim() && <div className="mt-2">{item.blessing}</div>}
      <div className="absolute right-1 bottom-2 text-right text-[14px] leading-6 pr-2 z-[2]">
        {item.signatureImage ? <img src={item.signatureImage} className="w-[96px] h-[36px] object-contain ml-auto mb-1" /> : <div>{item.fromName}</div>}
        {!item.signatureImage && <div>{item.date}</div>}
      </div>
      {item.stampImage ? (
        <div className="absolute right-0 bottom-0 w-[94px] h-[94px] opacity-90 pointer-events-none z-[3] rotate-[-13deg]">
          <img src={item.stampImage} className="w-full h-full object-contain rounded-full" />
        </div>
      ) : (
        <div className="absolute right-0 bottom-0 w-[94px] h-[94px] border-2 rounded-full rotate-[-13deg] border-[#b43a34] text-[#b43a34] flex items-center justify-center opacity-60 pointer-events-none z-[3]">
          邮
        </div>
      )}
    </div>
  )
);

export const MailLetterDetailView: React.FC<{
  onBack: () => void;
  letter: MailLetter;
  title: string;
  theme: MailboxThemeSettings;
}> = ({ onBack, letter, title, theme }) => (
  <div className="fixed inset-0 z-[300] flex flex-col animate-in slide-in-from-bottom duration-300" style={resolveMailboxPageStyle(theme)}>
    <MobileHeader title={title} onBack={onBack} />
    {theme.skin === 'retro' && <RetroNokiaStatus title="阅读短信" subtitle={letter.date} />}
    <div className="flex-1 overflow-y-auto no-scrollbar">
      <div className={`min-h-full ${theme.skin === 'postbox' ? 'px-6 py-5' : 'px-4 py-3'}`} style={resolveMailboxPaperStyle(theme)}>
        <MailLetterCard item={letter} theme={theme} />
      </div>
    </div>
    {theme.skin === 'retro' && <RetroNokiaSoftKeys left="回复" center="继续" right="返回" />}
  </div>
);
