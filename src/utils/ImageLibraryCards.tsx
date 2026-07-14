import React from 'react';
import type { ImageLibraryGroup, ImageLibraryItem } from '../services/imageLibraryStore';

export const ImageLibraryGroupCard: React.FC<{
  group: ImageLibraryGroup;
  coverUrl?: string;
  itemCount: number;
  onOpen: () => void;
  onUpload: () => void;
  onImportUrl: () => void;
  onRename: () => void;
  onDelete: () => void;
}> = ({ group, coverUrl, itemCount, onOpen, onUpload, onImportUrl, onRename, onDelete }) => (
  <button className="w-full text-left app-surface-panel app-collection-card app-collection-card--interactive overflow-hidden" onClick={onOpen}>
    <div className="app-list-item">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="app-collection-cover">
          {coverUrl ? <img src={coverUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg"><i className="fa-regular fa-image" /></div>}
        </div>
        <div className="app-list-item-main min-w-0">
          <div className="app-list-item-title text-[15px] font-medium truncate">{group.name}</div>
          <div className="app-list-item-desc">{itemCount} 张图片</div>
        </div>
      </div>
      <div className="app-list-item-side">
        <i className="fa-solid fa-chevron-right text-gray-300 text-xs" />
      </div>
    </div>
    <div className="px-4 pb-4 flex items-center gap-2 flex-wrap text-[12px]">
      <button type="button" className="app-button app-button-muted px-3 py-1 text-[12px] min-h-0" onClick={(event) => { event.stopPropagation(); onUpload(); }}>上传</button>
      <button type="button" className="app-button app-button-muted px-3 py-1 text-[12px] min-h-0" onClick={(event) => { event.stopPropagation(); onImportUrl(); }}>URL导入</button>
      <button type="button" className="app-button app-button-muted px-3 py-1 text-[12px] min-h-0" onClick={(event) => { event.stopPropagation(); onRename(); }}>重命名</button>
      <button type="button" className="app-button app-button-danger px-3 py-1 text-[12px] min-h-0" onClick={(event) => { event.stopPropagation(); onDelete(); }}>删除</button>
    </div>
  </button>
);

export const ImageLibraryItemCard: React.FC<{
  item: ImageLibraryItem;
  selected: boolean;
  isSelecting: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ item, selected, isSelecting, onToggleSelect, onEdit, onDelete }) => (
  <div className="app-surface-panel app-collection-card px-3 py-3 flex items-center gap-3" onClick={onToggleSelect}>
    {isSelecting && (
      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selected ? 'bg-[var(--app-accent-color)] border-[var(--app-accent-color)]' : 'border-gray-300'}`}>
        {selected && <i className="fa-solid fa-check text-white text-[10px]" />}
      </div>
    )}
    <img src={item.url} className="app-collection-cover object-cover" />
    <div className="app-list-item-main min-w-0">
      <div className="app-list-item-title truncate">{item.desc || '未填写描述'}</div>
      <div className="app-list-item-desc">添加于 {new Date(item.createdAt).toLocaleDateString('zh-CN')}</div>
    </div>
    {!isSelecting && (
      <div className="app-list-item-side flex items-center gap-2 text-[12px]">
        <button type="button" className="app-button app-button-muted px-3 py-1 text-[12px] min-h-0" onClick={onEdit}>编辑</button>
        <button type="button" className="app-button app-button-danger px-3 py-1 text-[12px] min-h-0" onClick={onDelete}>删除</button>
      </div>
    )}
  </div>
);
