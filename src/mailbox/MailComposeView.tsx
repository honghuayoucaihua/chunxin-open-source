import React, { useState } from 'react';
import { Contact } from '../types';
import { MailboxThemeSettings } from './MailboxSubPages';
import { MobileHeader } from '../Common';
import {
  resolveMailboxPageStyle,
  resolveMailboxPaperStyle,
  resolveMailboxLetterClass,
  resolveMailboxRecipientLineClass,
  resolveMailboxPanelClass
} from './mailboxThemeUtils';

export const MailComposeView: React.FC<{
  contacts: Contact[];
  currentUserName: string;
  theme: MailboxThemeSettings;
  onBack: () => void;
  onSendLetter: (payload: { toContactId: string; subject?: string; content: string; blessing: string }) => void;
}> = ({ contacts, currentUserName, theme, onBack, onSendLetter }) => {
  const candidates = contacts.filter(c => !c.isGroup && c.id !== 'officialAccounts');
  const [toContactId, setToContactId] = useState('');
  const [subject, setSubject] = useState('来自叙说的新邮件');
  const [content, setContent] = useState('');
  const [showRecipientPicker, setShowRecipientPicker] = useState(false);
  const [isSealing, setIsSealing] = useState(false);

  const canSend = !!toContactId && !!content.trim() && !isSealing;
  const today = new Date().toLocaleDateString('zh-CN');
  const selected = candidates.find(c => c.id === toContactId);
  const selectedName = selected?.remark?.trim() || selected?.name || '';
  const isRetro = theme.skin === 'retro';
  const isMailbox = theme.skin === 'mailbox';

  const handleSealSend = () => {
    if (!toContactId) {
      setShowRecipientPicker(true);
      return;
    }
    if (!content.trim() || isSealing) return;
    setIsSealing(true);
    window.setTimeout(() => {
      onSendLetter({
        toContactId,
        subject: isMailbox ? subject.trim() || '来自叙说的新邮件' : undefined,
        content: content.trim(),
        blessing: '此致 敬礼'
      });
      setContent('');
      setIsSealing(false);
    }, 380);
  };

  return (
    <div className="fixed inset-0 z-[300] flex flex-col animate-in slide-in-from-bottom duration-300" style={resolveMailboxPageStyle(theme)}>
      <MobileHeader title="写信" onBack={onBack} />
      <div className={`relative flex-1 overflow-y-auto no-scrollbar ${isRetro || isMailbox || theme.skin === 'postbox' ? 'pb-0' : 'pb-40'}`}>
        <div className="min-h-full" style={resolveMailboxPaperStyle(theme)}>
          {isRetro ? (
            <div className="min-h-full px-4 py-3 text-[#21321c] flex flex-col">
              <div className="flex items-center justify-between text-[12px] border-b border-[#4f6746] pb-1">
                <span>新短信</span>
                <span>{today}</span>
              </div>
              <button
                className="w-full text-left text-[12px] border-b border-dashed border-[#4f6746] py-1 mt-2"
                onClick={() => setShowRecipientPicker(true)}
                title={selectedName || '选择联系人'}
              >
                收件人: {selectedName || '________'}
              </button>
              <textarea
                className="w-full flex-1 min-h-0 bg-transparent px-0 py-2 outline-none resize-none text-[14px] leading-6"
                placeholder="输入短信内容..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          ) : isMailbox ? (
            <div className="min-h-full px-4 py-3 overflow-hidden flex flex-col">
              <div className="border-b border-[#b7cae9] pb-2 space-y-1 text-[13px]">
                <div className="flex items-center gap-2">
                  <span className="w-12 text-[#4b658f]">To</span>
                  <button className="flex-1 text-left border-b border-dashed border-[#7f9cca] h-7" onClick={() => setShowRecipientPicker(true)}>
                    {selectedName || ''}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-12 text-[#4b658f]">From</span>
                  <span>{currentUserName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-12 text-[#4b658f]">Date</span>
                  <span>{today}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-12 text-[#4b658f]">Subject</span>
                  <input
                    className="flex-1 bg-transparent outline-none border-b border-dashed border-[#7f9cca] h-7"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="填写邮件主题"
                  />
                </div>
              </div>
              <textarea
                className="w-full flex-1 min-h-0 bg-transparent px-0 py-2 outline-none resize-none text-[15px] leading-8 mt-2"
                placeholder="撰写邮件内容..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          ) : (
            <div className={theme.skin === 'postbox' ? 'px-6 py-5 relative' : 'px-6 py-5'}>
              <div className={`${resolveMailboxLetterClass(theme)} flex items-center flex-wrap gap-1`}>
                <span className="tracking-[0.06em]">致</span>
                <button
                  className={resolveMailboxRecipientLineClass(theme, selectedName)}
                  onClick={() => setShowRecipientPicker(true)}
                  aria-label={selectedName ? `收件人：${selectedName}` : '选择收件人'}
                  title={selectedName || '点击选择联系人'}
                >
                  {selectedName ? <span>{selectedName}</span> : <span className="sr-only">点击选择联系人</span>}
                </button>
              </div>
              <textarea
                className={`w-full min-h-[250px] bg-transparent outline-none resize-none mt-0 pt-0 [text-indent:2em] ${resolveMailboxLetterClass(theme)}`}
                placeholder="写下你想说的话..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              {theme.skin === 'postbox' && (
                <>
                  <div className="fixed right-6 text-right text-[14px] leading-6 z-[301] pointer-events-none" style={{ bottom: 'calc(16px + var(--safe-bottom))' }}>
                    {theme.signatureImage ? <img src={theme.signatureImage} className="w-[90px] h-[34px] object-contain ml-auto mb-1" /> : <div>{currentUserName}</div>}
                    {!theme.signatureImage && <div>{today}</div>}
                  </div>
                  <button
                    className={`fixed right-3 w-[102px] h-[102px] rounded-full text-[#8f3c2e] bg-[#fbf3e8] flex items-center justify-center rotate-[-10deg] transition-transform z-[302] ${canSend ? 'active:scale-95' : 'opacity-40'}`}
                    disabled={!canSend}
                    onClick={handleSealSend}
                    style={{ bottom: 'calc(8px + var(--safe-bottom))', boxShadow: 'inset 0 0 0 2px #8f3c2e, inset 0 0 0 8px #fbf3e8, inset 0 0 0 10px #8f3c2e' }}
                  >
                    {theme.stampImage
                      ? <img src={theme.stampImage} className="w-[88px] h-[88px] object-contain rounded-full" />
                      : (
                        <div className="text-center leading-tight">
                          <div className="text-[11px] tracking-[0.3em] mb-1">{isSealing ? '寄送中' : '寄出'}</div>
                          <div className="text-[22px] font-bold">邮</div>
                        </div>
                      )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {isRetro ? (
        <div className="fixed left-0 right-0 bottom-0 z-[302] border-t-2 border-[#3a5234] bg-[#c2d49f] px-4 py-2 flex items-center justify-between text-[13px]" style={{ paddingBottom: 'calc(8px + var(--safe-bottom))' }}>
          <span className="opacity-80">字数 {content.length}/500</span>
          <button className={`px-5 py-1 border border-[#3a5234] ${canSend ? 'bg-[#dce9bc]' : 'opacity-50'}`} disabled={!canSend} onClick={handleSealSend}>
            {isSealing ? '发送中' : '发送'}
          </button>
          <span className="opacity-80">短信</span>
        </div>
      ) : isMailbox ? (
        <div className="fixed left-0 right-0 bottom-0 z-[302] border-t border-[#8db0e3] bg-[#d8e8ff] px-4 py-2 flex items-center justify-between text-[13px]" style={{ paddingBottom: 'calc(8px + var(--safe-bottom))' }}>
          <span className="text-[#4b658f]">已输入 {content.length} 字</span>
          <button
            className={`h-10 px-4 rounded-md border border-[#4f78b6] bg-[#5a86c9] text-white ${canSend ? 'active:scale-95' : 'opacity-50'}`}
            disabled={!canSend}
            onClick={handleSealSend}
          >
            {isSealing ? '发送中...' : '发送邮件'}
          </button>
        </div>
      ) : null}

      {showRecipientPicker && (
        <div className="fixed inset-0 z-[320] bg-black/40 flex items-end" onClick={() => setShowRecipientPicker(false)}>
          <div className={`w-full p-3 max-h-[62vh] overflow-y-auto ${resolveMailboxPanelClass(theme)}`} onClick={(e) => e.stopPropagation()}>
            <div className="text-[14px] font-semibold mb-2">选择联系人</div>
            {candidates.map(c => {
              const name = c.remark?.trim() || c.name;
              const active = c.id === toContactId;
              return (
                <button
                  key={c.id}
                  className={`w-full h-11 px-3 text-left border-b flex items-center justify-between ${theme.skin === 'retro' ? 'border-[#445a3d] bg-[#bccca0]' : theme.skin === 'postbox' ? 'border-[#ccb28f] bg-[#f6ead4]' : 'border-[#c7d4ea] bg-[#f6f9ff]'} ${active ? 'text-[var(--app-accent-color)]' : ''}`}
                  onClick={() => {
                    setToContactId(c.id);
                    setShowRecipientPicker(false);
                  }}
                >
                  <span>{name}</span>
                  {active && <i className="fa-solid fa-check text-[12px]"></i>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
