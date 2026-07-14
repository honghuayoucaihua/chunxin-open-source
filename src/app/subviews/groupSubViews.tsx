import React from 'react';
import { MobileHeader } from '../../Common';
import type { Contact, SubView } from '../../types';
import { CreateGroupView } from '../lazyViews/groupForumNovelLazyViews';
import { SharedEmptyState } from '../../settings/SharedPanelPrimitives';

export type GroupSubView = Extract<SubView, 'groupChats' | 'createGroup'>;

type GroupSubViewParams = {
  subView: GroupSubView;
  goBackSubView: () => void;
  contacts: Contact[];
  currentUserName?: string;
  onOpenGroupChat: (groupId: string) => void;
  onCreateGroupConfirm: (ids: string[], groupName: string) => void;
};

const renderGroupChatsView = (params: GroupSubViewParams) => {
  const groupChats = params.contacts.filter(contact => contact.isGroup);
  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader title="群聊" onBack={params.goBackSubView} />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {groupChats.length === 0 ? (
          <SharedEmptyState className="py-16 render-text-secondary text-[15px]">暂无群聊</SharedEmptyState>
        ) : (
          <>
            {groupChats.map(group => (
              <div
                key={group.id}
                className="flex items-center px-4 py-3 render-bg-secondary border-b render-border active:bg-[var(--bg-hover)]"
                onClick={() => params.onOpenGroupChat(group.id)}
              >
                <div className="w-10 h-10 rounded-md bg-[#10AD7A] text-white flex items-center justify-center mr-3 flex-shrink-0">
                  <i className="fa-solid fa-users"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-normal truncate">{group.name}</div>
                  <div className="text-[12px] render-text-secondary truncate mt-0.5">{(group.memberIds?.length || 0) + 1}人</div>
                </div>
              </div>
            ))}
            <div className="py-8 text-center render-text-secondary text-[14px]">共 {groupChats.length} 个群聊</div>
          </>
        )}
      </div>
    </div>
  );
};

export const renderGroupSubView = (params: GroupSubViewParams) => {
  if (params.subView === 'groupChats') return renderGroupChatsView(params);
  if (params.subView === 'createGroup') {
    return (
      <CreateGroupView
        contacts={params.contacts.filter(contact => contact.isAi && !contact.isGroup)}
        currentUserName={params.currentUserName || ''}
        onBack={params.goBackSubView}
        onConfirm={params.onCreateGroupConfirm}
      />
    );
  }
  return null;
};
