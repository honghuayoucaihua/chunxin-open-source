import React from 'react';
import { MobileHeader } from '../../Common';
import { formatChatTime } from '../../utils/chatHelpers';
import type { Contact, SubView } from '../../types';
import type { AISettings } from '../../types/settings';
import type { AnonymousChatHistoryItem } from '../anonymousChatUtils';
import { SharedEmptyState } from '../../settings/SharedPanelPrimitives';

const ChatsTab = React.lazy(() => import('../../tabs/ChatsTab').then((module) => ({ default: module.ChatsTab })));
const SearchView = React.lazy(() => import('../../pages/Search').then((module) => ({ default: module.SearchView })));

export type DiscoverListSubView = Extract<SubView, 'search' | 'anonymousHistory' | 'ifLine'>;

type DiscoverListSubViewParams = {
  subView: DiscoverListSubView;
  contacts: Contact[];
  ifLineContacts: Contact[];
  userAvatar: string;
  userName?: string;
  userStatus?: string;
  goBackSubView: () => void;
  pushSubView: (subView: SubView) => void;
  anonymousHistory: AnonymousChatHistoryItem[];
  anonymousHeaderImage?: string;
  aiSettings: AISettings;
  showToast?: (message: string, duration?: number) => void;
  onIfLineSelect: (contactId: string) => void;
  onIfLineAction: (action: 'pin' | 'clear' | 'delete', id: string) => void;
  onSearchSelect: (contactId: string) => void;
  onSelectAnonymousHistory: (item: AnonymousChatHistoryItem) => void;
};

export const renderDiscoverListSubView = (params: DiscoverListSubViewParams) => {
  if (params.subView === 'search') {
    return (
      <React.Suspense fallback={<div className="h-full render-bg-primary" />}>
        <SearchView contacts={params.contacts} onBack={params.goBackSubView} onSelect={params.onSearchSelect} />
      </React.Suspense>
    );
  }
  if (params.subView === 'anonymousHistory') {
    return (
      <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
        <MobileHeader title="匿名聊天历史" onBack={params.goBackSubView} className="render-chatroom-header" backgroundImage={params.anonymousHeaderImage} />
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {params.anonymousHistory.length === 0 ? (
            <SharedEmptyState className="py-16 render-text-secondary text-[14px]">暂无历史记录</SharedEmptyState>
          ) : (
            <div className="p-3 space-y-2">
              {params.anonymousHistory.map(item => {
                const messageCount = Array.isArray(item.messages) ? item.messages.length : 0;
                return (
                  <button
                    key={item.id}
                    className="w-full text-left rounded-lg render-bg-secondary border render-border-subtle p-3"
                    onClick={() => params.onSelectAnonymousHistory(item)}
                  >
                    <div className="text-[13px] font-medium render-text-primary">{item.partner.gender === 'male' ? '男' : '女'} · {item.partner.age}岁 · {item.partner.tags.join(' / ')}</div>
                    <div className="text-[12px] render-text-secondary mt-1">
                      {new Date(item.startedAt).toLocaleString('zh-CN', { hour12: false })}
                    </div>
                    <div className="text-[12px] render-text-secondary mt-1">{messageCount} 条消息</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }
  if (params.subView === 'ifLine') {
    return (
      <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
        <MobileHeader title="if线" onBack={params.goBackSubView} className="render-chatroom-header" />
        <div className="flex-1 min-h-0">
          <React.Suspense fallback={<div className="h-full render-bg-secondary" />}>
            <ChatsTab
              contacts={params.ifLineContacts}
              userAvatar={params.userAvatar}
              userName={params.userName}
              userStatus={params.userStatus}
              hideHeader
              onSelect={params.onIfLineSelect}
              onSearchTrigger={() => params.pushSubView('search')}
              onPlusClick={() => params.showToast?.('if线会话由聊天消息复制生成')}
              onAction={params.onIfLineAction}
              formatTime={formatChatTime}
            />
          </React.Suspense>
        </div>
      </div>
    );
  }
  return null;
};
