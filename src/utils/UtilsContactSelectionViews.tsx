import React, { useState, useEffect, useMemo } from 'react';
import { Contact, Message, UserProfile } from '../types';
import { MobileHeader } from '../Common';
import { ContactSelectRow, SelectionIndicator } from './SelectionPrimitives';
import { SharedEmptyState } from '../settings/SharedPanelPrimitives';

export const MiniProgramsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
  <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
    <MobileHeader title="小程序" onBack={onBack} actions={<button className="app-icon-button"><i className="fa-solid fa-magnifying-glass"></i></button>} />
    <div className="flex-1 overflow-y-auto p-4">
      <div className="app-surface-panel mb-4">
        <h3 className="text-sm font-bold text-gray-400 mb-4 px-2">最近使用</h3>
        <div className="grid grid-cols-4 gap-y-6">
          {[
            { name: '滴滴出行', icon: 'https://picsum.photos/seed/didi/100' },
            { name: '美团', icon: 'https://picsum.photos/seed/meituan/100' },
            { name: '京东', icon: 'https://picsum.photos/seed/jd/100' },
            { name: '拼多多', icon: 'https://picsum.photos/seed/pdd/100' }
          ].map(app => (
            <button key={app.name} type="button" className="flex flex-col items-center">
              <img src={app.icon} className="w-12 h-12 rounded-full mb-2 shadow-sm" />
              <span className="text-[11px] text-gray-600 dark:text-gray-400">{app.name}</span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="app-surface-panel">
        <h3 className="text-sm font-bold text-gray-400 mb-4 px-2">我的小程序</h3>
        <div className="space-y-4">
          {[
            { name: '健康码', desc: '防疫必备', icon: 'https://picsum.photos/seed/health/100' },
            { name: '乘车码', desc: '便捷出行', icon: 'https://picsum.photos/seed/bus/100' }
          ].map(app => (
            <button key={app.name} type="button" className="app-list-item app-list-item--interactive w-full text-left rounded-lg">
              <img src={app.icon} className="w-10 h-10 rounded-lg mr-3" />
              <div className="app-list-item-main">
                <div className="app-list-item-title">{app.name}</div>
                <div className="app-list-item-desc">{app.desc}</div>
              </div>
              <div className="app-list-item-side">
                <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
  );
};

// 收藏页面
export const FavoritesView: React.FC<{ 
  favorites: Message[], 
  contacts: Contact[], 
  user: UserProfile,
  onBack: () => void 
}> = ({ favorites, contacts, user, onBack }) => {
  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader title="收藏" onBack={onBack} actions={<button className="app-icon-button"><i className="fa-solid fa-magnifying-glass"></i></button>} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {favorites.length === 0 ? (
          <SharedEmptyState
            className="app-surface-panel flex flex-col items-center justify-center h-64"
            iconClassName="fa-solid fa-box-open text-6xl"
            title="暂无收藏内容"
          />
        ) : (
          favorites.map(fav => (
            <button key={fav.id} type="button" className="app-surface-panel w-full text-left active:opacity-90 transition-all">
              <div className="flex items-center text-[11px] text-gray-400 mb-3 space-x-2">
                <span>{fav.senderId === 'me' ? user.name : (contacts.find(c => c.id === fav.senderId)?.name || '未知')}</span>
                <span>·</span>
                <span>2026-02-05</span>
              </div>
              <div className="text-base dark:text-white leading-relaxed line-clamp-3">{fav.content}</div>
              {fav.locationName && (
                <div className="mt-3 p-3 render-bg-tertiary rounded-lg flex items-center">
                  <i className="fa-solid fa-location-dot mr-3" style={{ color: 'var(--app-accent-color)' }}></i>
                  <span className="text-sm dark:text-gray-300">{fav.locationName}</span>
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

// 联系人选择器 (用于朋友圈可见性)
export const ContactPickerView: React.FC<{
  contacts: Contact[],
  onBack: () => void,
  onConfirm: (ids: string[]) => void
}> = ({ contacts, onBack, onConfirm }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const candidates = contacts.filter(c => c.id !== 'officialAccounts' && !c.isGroup);

  return (
    <div className="fixed inset-0 z-[500] render-bg-primary flex flex-col animate-in slide-in-from-bottom duration-300">
      <MobileHeader
        title="选择联系人"
        onBack={onBack}
        actions={<button className="app-button app-button-primary whitespace-nowrap" onClick={() => onConfirm(selected)}>确定({selected.length})</button>}
      />
      <div className="flex-1 overflow-y-auto">
         {candidates.map(c => (
           <ContactSelectRow
             key={c.id}
             avatar={c.avatar}
             name={c.remark?.trim() || c.name}
             checked={selected.includes(c.id)}
             onClick={() => {
               setSelected(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]);
             }}
             className="render-bg-secondary border-b render-border-subtle"
           />
         ))}
      </div>
    </div>
  );
};

export const CreateGroupView: React.FC<{
  contacts: Contact[];
  currentUserName: string;
  onBack: () => void;
  onConfirm: (ids: string[], groupName: string) => void;
}> = ({ contacts, currentUserName, onBack, onConfirm }) => {
  const candidates = contacts.filter(c => c.id !== 'officialAccounts' && !c.isGroup);
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const canCreate = selected.length >= 2;

  const suggestedName = (() => {
    const picked = selected
      .map(id => candidates.find(c => c.id === id)?.remark?.trim() || candidates.find(c => c.id === id)?.name || '')
      .filter(Boolean)
      .slice(0, 2);
    if (picked.length === 0) return '';
    const meName = (currentUserName || '').trim() || '我';
    return [...picked, meName].join('、');
  })();

  return (
    <div className="fixed inset-0 z-[550] render-bg-primary flex flex-col animate-in slide-in-from-bottom duration-300">
      <MobileHeader
        title="发起群聊"
        onBack={onBack}
        actions={
          <button
            className={`app-button whitespace-nowrap ${canCreate ? 'app-button-primary' : 'app-button-muted opacity-60 cursor-not-allowed'}`}
            disabled={!canCreate}
            onClick={() => {
              if (!canCreate) return;
              const finalName = (groupName.trim() || suggestedName || '新建群聊').trim();
              onConfirm(selected, finalName);
            }}
          >
            创建({selected.length})
          </button>
        }
      />

      <div className="app-surface-panel border-b render-border-subtle">
        <div className="app-textarea-block-title px-0 pt-0">群名称（可选）</div>
        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder={suggestedName || '输入群聊名称'}
          className="app-field-input w-full text-[15px] render-text-primary"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {candidates.map(c => (
          <ContactSelectRow
            key={c.id}
            avatar={c.avatar.startsWith('icon:') ? undefined : c.avatar}
            iconName={c.avatar.startsWith('icon:') ? c.avatar.replace('icon:', '') : undefined}
            name={c.remark?.trim() || c.name}
            checked={selected.includes(c.id)}
            onClick={() => setSelected(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])}
            className="render-bg-secondary border-b render-border-subtle"
          />
        ))}
      </div>
    </div>
  );
};

// 表情包批量导入页面
export const StickerImportView: React.FC<{
  files: File[],
  onBack: () => void,
  onConfirm: (stickers: { url: string, desc: string }[]) => void,
  fileToDataUrl?: (file: File) => Promise<string>,
  onImportError?: (error: unknown) => void,
  title?: string,
  confirmLabel?: string,
  descLabel?: string,
  placeholder?: string
}> = ({
  files,
  onBack,
  onConfirm,
  fileToDataUrl,
  onImportError,
  title = '添加表情',
  confirmLabel = '添加',
  descLabel = '表情描述',
  placeholder = '给表情取个名字吧...'
}) => {
  const [data, setData] = useState<{ url: string, desc: string }[]>([]);
  const STICKER_IMPORT_PAGE_SIZE = 20;
  const [stickerPage, setStickerPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const readAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const resolveDataUrl = fileToDataUrl || readAsDataUrl;

    Promise.allSettled(files.map(async (f) => {
      const url = await resolveDataUrl(f);
      const fallbackDesc = f.name.replace(/\.[a-zA-Z0-9]{1,8}$/, '').trim();
      return { url, desc: fallbackDesc };
    }))
      .then((result) => {
        if (cancelled) return;
        const next = result
          .filter((item): item is PromiseFulfilledResult<{ url: string; desc: string }> => item.status === 'fulfilled')
          .map((item) => item.value)
          .filter((item) => !!item.url);
        result
          .filter((item): item is PromiseRejectedResult => item.status === 'rejected')
          .forEach((item) => {
            console.error('[StickerImportView] image load failed:', item.reason);
            onImportError?.(item.reason);
          });
        setData(next);
      });

    return () => {
      cancelled = true;
    };
  }, [files, fileToDataUrl, onImportError]);

  const totalStickerPages = Math.max(1, Math.ceil(data.length / STICKER_IMPORT_PAGE_SIZE));
  const currentStickerPage = Math.min(stickerPage, totalStickerPages);
  const pagedStickerData = useMemo(() => {
    const start = (currentStickerPage - 1) * STICKER_IMPORT_PAGE_SIZE;
    return data.slice(start, start + STICKER_IMPORT_PAGE_SIZE);
  }, [data, currentStickerPage]);

  useEffect(() => {
    setStickerPage(1);
  }, [data.length]);

  return (
    <div className="fixed inset-0 z-[600] render-bg-primary flex flex-col animate-in slide-in-from-bottom duration-300">
      <MobileHeader
        title={title}
        onBack={onBack}
        actions={<button className="app-button app-button-primary whitespace-nowrap" onClick={() => onConfirm(data)}>{confirmLabel}({data.length})</button>}
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
         {pagedStickerData.map((item, i) => {
           const globalIndex = (currentStickerPage - 1) * STICKER_IMPORT_PAGE_SIZE + i;
           return (
             <div key={`${item.url}-${globalIndex}`} className="app-surface-panel flex space-x-4">
                <img src={item.url} loading="lazy" decoding="async" className="w-24 h-24 object-cover rounded-lg border render-border flex-shrink-0" />
                <div className="flex-1 flex flex-col justify-center">
                   <span className="app-textarea-block-title !px-0 !pt-0 !pb-2">{descLabel}</span>
                   <input
                      className="app-field-input w-full render-text-primary"
                      placeholder={placeholder}
                      value={item.desc}
                     onChange={e => {
                       const newData = [...data];
                       newData[globalIndex].desc = e.target.value;
                       setData(newData);
                     }}
                   />
                </div>
             </div>
           );
         })}
         {data.length > STICKER_IMPORT_PAGE_SIZE && (
           <div className="sticky bottom-0 pt-2">
             <div className="app-surface-panel h-10 px-2 flex items-center justify-between text-xs">
               <button className="app-button app-button-muted px-2 h-7 min-h-0 disabled:opacity-40" disabled={currentStickerPage <= 1} onClick={() => setStickerPage(p => Math.max(1, p - 1))}>上一页</button>
               <span className="render-text-secondary">第 {currentStickerPage}/{totalStickerPages} 页</span>
               <button className="app-button app-button-muted px-2 h-7 min-h-0 disabled:opacity-40" disabled={currentStickerPage >= totalStickerPages} onClick={() => setStickerPage(p => Math.min(totalStickerPages, p + 1))}>下一页</button>
             </div>
           </div>
         )}
      </div>
    </div>
  );
};
