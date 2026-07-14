
import React, { useMemo, useState } from 'react';
import { Contact } from '../types';
import { SharedEmptyState } from '../settings/SharedPanelPrimitives';

export const SearchView: React.FC<{ contacts: Contact[], onBack: () => void, onSelect: (id: string) => void }> = ({ contacts, onBack, onSelect }) => {
  const [query, setQuery] = useState('');
  const results = useMemo(
    () => (query ? contacts.filter(c => c.name.toLowerCase().includes(query.toLowerCase())) : []),
    [contacts, query]
  );

  return (
    <div className="fixed inset-0 z-[200] render-bg-primary flex flex-col animate-in fade-in duration-200 render-search-root">
      <div className="flex items-center px-4 py-3 render-bg-primary border-b render-border render-search-header">
        <div className="flex items-center gap-2 flex-1">
          <button className="app-icon-button w-8 h-8 rounded-full bg-[var(--bg-strong)] flex items-center justify-center" onClick={onBack}>
            <i className="fa-solid fa-arrow-left text-[13px] text-[var(--text-primary)]"></i>
          </button>
          <div className="text-[16px] font-semibold render-text-primary">搜索</div>
        </div>
        <button className="app-button app-button-muted text-[15px] whitespace-nowrap" onClick={onBack}>取消</button>
      </div>

      <div className="px-4 pt-3 render-search-input-wrap">
        <div className="flex items-center h-10 rounded-xl px-3 render-bg-secondary border render-border-subtle render-search-input-shell">
          <i className="fa-solid fa-magnifying-glass text-gray-400 text-sm"></i>
          <input
            autoFocus
            className="flex-1 bg-transparent outline-none text-[14px] render-text-primary ml-2"
            placeholder="搜索联系人、公众号、小程序"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <i
              className="fa-solid fa-circle-xmark text-gray-300 cursor-pointer"
              onClick={() => setQuery('')}
            ></i>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-2 render-search-body">
        {!query ? (
          <div className="p-6">
            <div className="rounded-2xl border render-border-subtle render-bg-secondary p-5 shadow-sm render-search-suggest-panel">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[15px] font-medium render-text-primary">搜索指定内容</div>
                <span className="text-[12px] text-gray-400">热门入口</span>
              </div>
              <div className="grid grid-cols-3 gap-y-6">
                {['朋友圈', '文章', '公众号', '小程序', '音乐', '表情'].map(item => (
                  <div key={item} className="text-center text-link text-[14px] border-r last:border-none render-border render-search-suggest-item">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-hover)] mx-auto mb-2 flex items-center justify-center">
                      <i className="fa-solid fa-compass text-[13px]"></i>
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : results.length > 0 ? (
          <div>
            <div className="px-4 py-2 text-[12px] text-gray-500">联系人</div>
            {results.map(c => (
              <div key={c.id} className="flex items-center px-4 py-3 render-bg-secondary border-b render-border-subtle active:bg-[var(--bg-hover)] render-search-result-row" onClick={() => onSelect(c.id)}>
                <img src={c.avatar} className="w-10 h-10 rounded-md mr-3 object-cover" />
                <div className="min-w-0">
                  <div className="render-text-primary font-medium text-[15px] truncate">{c.name}</div>
                  <div className="text-[12px] text-gray-400 truncate">微信号：{c.id}</div>
                </div>
                <i className="fa-solid fa-chevron-right ml-auto text-gray-300"></i>
              </div>
            ))}
          </div>
        ) : (
          <SharedEmptyState
            className="flex flex-col items-center justify-center pt-16"
            iconClassName="fa-solid fa-magnifying-glass text-xl w-16 h-16 rounded-full bg-[var(--bg-hover)] flex items-center justify-center mx-auto"
            title="未找到相关结果"
            description="换个关键词试试"
          />
        )}
      </div>
    </div>
  );
};
