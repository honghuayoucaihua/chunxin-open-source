import React from 'react';
import type { EmojiGroup, EmojiItem } from '../types';
import type { SubView } from '../types';
import { DEFAULT_EMOJI_GROUP_ID, DEFAULT_EMOJI_GROUP_NAME } from './emojiStore';

type ChatRoomEmojiPanelProps = {
  visible: boolean;
  panel: {
    activeEmojiGroupId: string;
    emojiGroups: EmojiGroup[];
    isManagingEmojis: boolean;
    pagedDisplayEmojis: EmojiItem[];
    dragOverEmojiId: string | null;
    draggedEmojiId: string | null;
    selectedEmojiIds: string[];
    currentDisplayEmojis: EmojiItem[];
    hasMoreDisplayEmojis: boolean;
    emojiPanelPageSize: number;
    handleEmojiPanelScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    handleDragStart: (e: React.DragEvent, emojiId: string) => void;
    handleDragOver: (e: React.DragEvent, emojiId: string) => void;
    handleDragLeave: () => void;
    handleDrop: (e: React.DragEvent, targetEmojiId: string) => void;
    handleDragEnd: () => void;
    setActiveGroup: (id: string) => void;
    openAddMenu: () => void;
    send: (emoji: EmojiItem) => void;
    loadMore: () => void;
    batchDelete: () => void;
    toggleManage: () => void;
  };
  onSub: (s: SubView) => void;
};

const ChatRoomEmojiPanel: React.FC<ChatRoomEmojiPanelProps> = (props) => {
  if (!props.visible) return null;
  const { panel } = props;
  return (
    <div className="h-[320px] render-bg-tertiary border-t render-border animate-in slide-in-from-bottom duration-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center border-b render-border-subtle overflow-x-auto no-scrollbar">
        <div className="flex flex-1 px-2 py-2 space-x-1">
          <button
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${panel.activeEmojiGroupId === DEFAULT_EMOJI_GROUP_ID ? 'text-white' : 'render-bg-secondary render-text-secondary'}`}
            style={panel.activeEmojiGroupId === DEFAULT_EMOJI_GROUP_ID ? { backgroundColor: 'var(--app-accent-color)' } : {}}
            onClick={() => panel.setActiveGroup(DEFAULT_EMOJI_GROUP_ID)}
          >
            {DEFAULT_EMOJI_GROUP_NAME}
          </button>
          {panel.emojiGroups.filter((g) => g.enabled).sort((a, b) => a.order - b.order).map((group) => (
            <button
              key={group.id}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${panel.activeEmojiGroupId === group.id ? 'text-white' : 'render-bg-secondary render-text-secondary'}`}
              style={panel.activeEmojiGroupId === group.id ? { backgroundColor: 'var(--app-accent-color)' } : {}}
              onClick={() => panel.setActiveGroup(group.id)}
            >
              {group.name}
            </button>
          ))}
          <button
            className="flex-shrink-0 w-8 h-8 render-bg-secondary rounded-full flex items-center justify-center render-text-secondary"
            onClick={() => props.onSub('emojiGroups')}
          >
            <i className="fa-solid fa-plus text-xs"></i>
          </button>
        </div>
      </div>

      <div onScroll={panel.handleEmojiPanelScroll} className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-4 gap-3 p-4">
        {panel.activeEmojiGroupId === DEFAULT_EMOJI_GROUP_ID && !panel.isManagingEmojis && (
          <button className="w-full aspect-square border-2 border-dashed render-border rounded-xl flex items-center justify-center text-gray-400 active:bg-[var(--bg-hover)]" onClick={(e) => { e.stopPropagation(); panel.openAddMenu(); }}>
            <i className="fa-solid fa-plus text-2xl"></i>
          </button>
        )}
        {panel.pagedDisplayEmojis.map((item) => (
          <div
            key={item.id}
            className={`relative group w-full aspect-square ${panel.isManagingEmojis ? 'cursor-grab active:cursor-grabbing' : ''} ${panel.dragOverEmojiId === item.id ? 'ring-2 ring-blue-400 rounded-lg' : ''} ${panel.draggedEmojiId === item.id ? 'opacity-50' : ''}`}
            onClick={() => panel.send(item)}
            draggable={panel.isManagingEmojis}
            onDragStart={(ev) => panel.handleDragStart(ev, item.id)}
            onDragOver={(ev) => panel.handleDragOver(ev, item.id)}
            onDragLeave={panel.handleDragLeave}
            onDrop={(ev) => panel.handleDrop(ev, item.id)}
            onDragEnd={panel.handleDragEnd}
          >
            <img src={item.url} loading="lazy" decoding="async" className={`w-full h-full object-cover rounded-xl shadow-sm bg-white dark:bg-black/20 transition-transform ${panel.selectedEmojiIds.includes(item.id) ? 'scale-90 border-2' : ''}`} style={panel.selectedEmojiIds.includes(item.id) ? { borderColor: 'var(--app-accent-color)' } : {}} />
            {panel.isManagingEmojis && (
              <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-in zoom-in ${panel.selectedEmojiIds.includes(item.id) ? 'text-white' : 'bg-white border border-gray-300'}`} style={panel.selectedEmojiIds.includes(item.id) ? { backgroundColor: 'var(--app-accent-color)' } : {}}>
                {panel.selectedEmojiIds.includes(item.id) && <i className="fa-solid fa-check text-[8px]"></i>}
              </div>
            )}
            {!panel.isManagingEmojis && panel.activeEmojiGroupId === DEFAULT_EMOJI_GROUP_ID && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[10px] py-1 text-center opacity-0 group-hover:opacity-100 rounded-b-xl transition-opacity truncate px-1">{item.desc}</div>
            )}
          </div>
        ))}
        {panel.activeEmojiGroupId !== DEFAULT_EMOJI_GROUP_ID && panel.currentDisplayEmojis.length === 0 && !panel.isManagingEmojis && (
          <div className="col-span-4 flex items-center justify-center py-8 render-text-secondary text-sm">
            该分组暂无表情
          </div>
        )}
        {panel.hasMoreDisplayEmojis && !panel.isManagingEmojis && (
          <button
            className="col-span-4 h-9 rounded-lg text-xs render-bg-secondary render-text-secondary active:opacity-80"
            onClick={panel.loadMore}
          >
            加载更多（{panel.pagedDisplayEmojis.length}/{panel.currentDisplayEmojis.length}）
          </button>
        )}
      </div>

      <div className="h-12 render-bg-secondary flex items-center justify-between px-4 border-t render-border">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 flex items-center justify-center render-bg-tertiary rounded-md" style={{ color: 'var(--app-accent-color)' }}>
            <i className="fa-regular fa-heart text-lg"></i>
          </div>
        </div>
        {panel.currentDisplayEmojis.length > 0 && (
          <div className="flex space-x-4">
            {panel.isManagingEmojis && panel.selectedEmojiIds.length > 0 && (
              <button className="text-xs text-danger font-bold whitespace-nowrap" onClick={panel.batchDelete}>
                删除({panel.selectedEmojiIds.length})
              </button>
            )}
            <button className="text-xs text-link font-bold whitespace-nowrap" onClick={panel.toggleManage}>
              {panel.isManagingEmojis ? '完成' : '整理'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatRoomEmojiPanel;
