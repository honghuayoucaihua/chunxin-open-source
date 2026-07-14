import React from 'react';
import { MobileHeader } from '../Common';
import { ForumSpace } from '../types';
import { formatRelativeTime } from './forumUtils';

type ForumArchiveViewProps = {
  onBack: () => void;
  onCreate: () => void;
  forums: ForumSpace[];
  onOpenForum: (forumId: string) => void;
};

const ForumArchiveView: React.FC<ForumArchiveViewProps> = ({ onBack, onCreate, forums, onOpenForum }) => (
  <div className="flex flex-col h-full render-bg-primary render-text-primary">
    <MobileHeader
      title="论坛"
      onBack={onBack}
      actions={
        <button className="app-icon-button" onClick={onCreate}>
          <i className="fa-solid fa-plus"></i>
        </button>
      }
    />
    <div className="flex-1 overflow-y-auto no-scrollbar">
      {forums.length === 0 ? (
        <div className="py-16 text-center text-sm render-text-secondary">还没有论坛，点击右上角创建</div>
      ) : (
        <div className="px-3 py-3 space-y-3">
          {forums
            .slice()
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((forum) => (
              <div
                key={forum.id}
                className="render-bg-secondary border render-border-subtle rounded-xl p-3.5 cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => onOpenForum(forum.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-semibold truncate">{forum.name}</span>
                  <span className="text-xs render-text-tertiary">{formatRelativeTime(forum.updatedAt)}</span>
                </div>
                {!!forum.tags?.length && <div className="mt-1 text-xs render-text-secondary">{forum.tags.map((t) => `#${t}`).join(' ')}</div>}
                <div className="mt-2 text-[12px] render-text-secondary">{forum.posts.length} 帖 · 最近活跃</div>
              </div>
            ))}
        </div>
      )}
    </div>
  </div>
);

export default ForumArchiveView;
