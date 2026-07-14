import React, { useState } from 'react';
import { Contact, UserProfile } from '../types';
import { MailboxSkinMode, MailboxThemeSettings } from './MailboxSubPages';
import { MobileHeader } from '../Common';
import { resolveMailboxPageStyle, resolveMailboxContainerClass } from './mailboxThemeUtils';

export const MailboxContactsView: React.FC<{
  onBack: () => void;
  user: UserProfile;
  contacts: Contact[];
  worldBooks: { id: string; name: string }[];
  masks: { id: string; name: string }[];
  myMaskId?: string;
  onMyMaskChange: (maskId: string) => void;
  onContactWorldBooksChange: (contactId: string, worldBookIds: string[]) => void;
  onSignatureImageChange: (dataUrl: string) => void;
  onStampImageChange: (dataUrl: string) => void;
  onContactSignatureImageChange: (contactId: string, dataUrl: string) => void;
  onContactStampImageChange: (contactId: string, dataUrl: string) => void;
  theme: MailboxThemeSettings;
}> = ({ onBack, user, contacts, worldBooks, masks, myMaskId, onMyMaskChange, onContactWorldBooksChange, onSignatureImageChange, onStampImageChange, onContactSignatureImageChange, onContactStampImageChange, theme }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const all = [{ id: 'me', name: user.name, avatar: user.avatar, isMe: true }, ...contacts.map(c => ({ id: c.id, name: c.remark?.trim() || c.name, avatar: c.avatar, isMe: false }))];

  const fileToDataUrl = (file: File, cb: (data: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => cb(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[300] flex flex-col animate-in slide-in-from-bottom duration-300" style={resolveMailboxPageStyle(theme)}>
      <MobileHeader title="通讯录" onBack={onBack} />
      <div className={`flex-1 overflow-y-auto no-scrollbar mt-3 mx-4 overflow-hidden ${resolveMailboxContainerClass(theme)}`}>
        {all.map((item) => {
          const contact = contacts.find(c => c.id === item.id);
          const expanded = expandedId === item.id;
          const selectedWorldBooks = contact?.worldBookIds || [];
          return (
            <div key={item.id} className={`${theme.skin === 'retro' ? 'border-b border-[#445a3d] bg-[#bccca0]' : theme.skin === 'postbox' ? 'border-b border-[#ccb28f] bg-[#f6ead4]' : 'border-b border-[#c7d4ea] bg-[#f6f9ff]'}`}>
              <button className="w-full h-12 px-4 flex items-center justify-between" onClick={() => setExpandedId(expanded ? null : item.id)}>
                <div className="flex items-center gap-3 min-w-0">
                  <img src={item.avatar} className="w-7 h-7 rounded-md object-cover" />
                  <span className="truncate">{item.name}{item.isMe ? '（我）' : ''}</span>
                </div>
                <i className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'} text-xs render-text-secondary`}></i>
              </button>
              {expanded && (
                <div className={`px-4 pb-3 text-[13px] space-y-2 ${theme.skin === 'retro' ? 'bg-[#b4c493]' : theme.skin === 'postbox' ? 'bg-[#f0e2ca]' : 'bg-[#edf3ff]'}`}>
                  {item.isMe ? (
                    <>
                      <div>
                        <div className="mb-1">面具</div>
                        <select className="app-field-select h-9 px-2" value={myMaskId || ''} onChange={(e) => onMyMaskChange(e.target.value)}>
                          <option value="">不使用面具</option>
                          {masks.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-1.5 border render-border cursor-pointer">上传签名图
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; fileToDataUrl(f, onSignatureImageChange); e.currentTarget.value = ''; }} />
                        </label>
                        <label className="px-3 py-1.5 border render-border cursor-pointer">上传印戳图
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; fileToDataUrl(f, onStampImageChange); e.currentTarget.value = ''; }} />
                        </label>
                      </div>
                      <div className="flex items-center gap-2 text-[12px]">
                        <div className="w-[86px] h-[32px] border render-border flex items-center justify-center overflow-hidden">
                          {theme.signatureImage ? <img src={theme.signatureImage} className="w-full h-full object-contain" /> : <span className="render-text-secondary">签名预览</span>}
                        </div>
                        <div className="w-[48px] h-[48px] border render-border rounded-full flex items-center justify-center overflow-hidden">
                          {theme.stampImage ? <img src={theme.stampImage} className="w-full h-full object-cover" /> : <span className="render-text-secondary text-[10px]">印戳</span>}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="mb-1">世界书（可多选）</div>
                        <div className="grid grid-cols-2 gap-1">
                          {worldBooks.map(wb => {
                            const active = selectedWorldBooks.includes(wb.id);
                            return (
                              <button
                                key={wb.id}
                                className={`h-8 px-2 border text-left truncate ${active ? 'border-[var(--app-accent-color)] text-[var(--app-accent-color)]' : 'render-border'}`}
                                onClick={() => {
                                  const next = active ? selectedWorldBooks.filter(id => id !== wb.id) : [...selectedWorldBooks, wb.id];
                                  onContactWorldBooksChange(item.id, next);
                                }}
                              >
                                {wb.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <label className="px-3 py-1.5 border render-border cursor-pointer">上传签名图
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; fileToDataUrl(f, (data) => onContactSignatureImageChange(item.id, data)); e.currentTarget.value = ''; }} />
                        </label>
                        <label className="px-3 py-1.5 border render-border cursor-pointer">上传印戳图
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; fileToDataUrl(f, (data) => onContactStampImageChange(item.id, data)); e.currentTarget.value = ''; }} />
                        </label>
                      </div>
                      <div className="flex items-center gap-2 text-[12px] mt-1">
                        <div className="w-[86px] h-[32px] border render-border flex items-center justify-center overflow-hidden">
                          {contact?.signatureImage ? <img src={contact.signatureImage} className="w-full h-full object-contain" /> : <span className="render-text-secondary">签名预览</span>}
                        </div>
                        <div className="w-[48px] h-[48px] border render-border rounded-full flex items-center justify-center overflow-hidden">
                          {contact?.stampImage ? <img src={contact.stampImage} className="w-full h-full object-cover" /> : <span className="render-text-secondary text-[10px]">印戳</span>}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const MailboxSettingsView: React.FC<{
  onBack: () => void;
  theme: MailboxThemeSettings;
  onThemeChange: (next: MailboxThemeSettings) => void;
}> = ({ onBack, theme, onThemeChange }) => {
  const skins: { id: MailboxSkinMode; label: string }[] = [
    { id: 'postbox', label: '信箱' },
    { id: 'mailbox', label: '邮箱' },
    { id: 'retro', label: '复古' }
  ];
  const fontPresets = ['#2f2416', '#1f2f1f', '#25364d', '#4a2f26', '#2b2b2b'];
  const containerClass = resolveMailboxContainerClass(theme);
  const sectionClass = theme.skin === 'retro'
    ? 'px-4 py-3 border-b border-[#445a3d] bg-[#c7d6a8]'
    : theme.skin === 'postbox'
      ? 'px-4 py-3 border-b border-[#dbc9ac] bg-[#f8efe0]'
      : 'px-4 py-3 border-b border-[#d9e0ec] bg-[#f6f9ff]';
  return (
    <div className="fixed inset-0 z-[300] flex flex-col animate-in slide-in-from-bottom duration-300" style={resolveMailboxPageStyle(theme)}>
      <MobileHeader title="设置" onBack={onBack} />
      <div className={`flex-1 overflow-y-auto no-scrollbar mt-3 mx-4 overflow-hidden ${containerClass}`}>
        <div className={sectionClass}>
          <div className="text-[13px] render-text-secondary mb-2">皮肤</div>
          <div className="flex flex-wrap gap-2">
            {skins.map(s => (
              <button key={s.id} className={`px-3 h-8 border ${theme.skin === s.id ? 'border-[var(--app-accent-color)] text-[var(--app-accent-color)]' : 'render-border'}`} onClick={() => onThemeChange({ ...theme, skin: s.id })}>{s.label}</button>
            ))}
          </div>
        </div>
        <div className={sectionClass}>
          <div className="text-[13px] render-text-secondary mb-2">字体颜色</div>
          <div className="flex flex-wrap gap-2 items-center">
            {fontPresets.map(color => (
              <button
                key={color}
                className={`w-7 h-7 rounded-full border ${theme.fontColor === color ? 'border-[var(--app-accent-color)]' : 'render-border'}`}
                style={{ backgroundColor: color }}
                onClick={() => onThemeChange({ ...theme, fontColor: color })}
              />
            ))}
            <input
              type="color"
              className="w-8 h-8 border render-border cursor-pointer"
              value={theme.fontColor || '#2f2416'}
              onChange={(e) => onThemeChange({ ...theme, fontColor: e.target.value })}
              title="自定义字体颜色"
            />
          </div>
        </div>
        <div className={sectionClass.replace('border-b', '')}>
          <div className="text-[13px] render-text-secondary mb-2">上传信纸背景</div>
          <label className="inline-flex items-center px-3 h-8 border render-border cursor-pointer">选择图片
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => onThemeChange({ ...theme, paperBackground: String(reader.result || '') });
              reader.readAsDataURL(file);
              e.currentTarget.value = '';
            }} />
          </label>
          {theme.paperBackground && (
            <button className="ml-2 px-3 h-8 border render-border" onClick={() => onThemeChange({ ...theme, paperBackground: '' })}>清除背景</button>
          )}
        </div>
      </div>
    </div>
  );
};
