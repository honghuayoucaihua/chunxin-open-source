import React from 'react';

const ChatsTabQQSearch: React.FC<{
  onSearchTrigger: () => void;
}> = ({ onSearchTrigger }) => (
  <div className="px-3 pt-2 pb-2 render-bg-tertiary render-qq-chats-search-wrap">
    <button
      type="button"
      className="app-surface-panel w-full h-9 px-3 flex items-center justify-center gap-2 render-qq-chats-search"
      onClick={onSearchTrigger}
    >
      <i className="fa-solid fa-magnifying-glass text-[13px] text-gray-400"></i>
      <span className="text-[13px] text-gray-400">搜索</span>
    </button>
  </div>
);

export default ChatsTabQQSearch;
