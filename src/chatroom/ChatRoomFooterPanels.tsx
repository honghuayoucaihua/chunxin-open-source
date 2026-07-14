import React from 'react';
import type { SubView } from '../types';
import SkinIcon from '../shell/SkinIcon';

type ChatRoomFooterPanelsProps = {
  renderMultiSelectBar?: boolean;
  renderMorePanel?: boolean;
  isMultiSelecting: boolean;
  multiSelectIds: string[];
  setIsMultiSelecting: (value: boolean) => void;
  setMultiSelectIds: (ids: string[]) => void;
  onAction?: (action: string, msgId: string, data?: any) => void;
  showPanel: 'emoji' | 'more' | 'none';
  isStoryMode: boolean;
  canOpenInnerActionPanel?: boolean;
  onSub: (s: SubView) => void;
  onStartVoiceCall: () => void;
  onOpenInnerActionPanel: () => void;
  onPickAlbum: () => void;
  onOpenTruthOrDare: () => void;
};

const clearMultiSelect = (setIsMultiSelecting: (value: boolean) => void, setMultiSelectIds: (ids: string[]) => void) => {
  setIsMultiSelecting(false);
  setMultiSelectIds([]);
};

const ChatRoomFooterPanels: React.FC<ChatRoomFooterPanelsProps> = ({
  renderMultiSelectBar = true,
  renderMorePanel = true,
  isMultiSelecting,
  multiSelectIds,
  setIsMultiSelecting,
  setMultiSelectIds,
  onAction,
  showPanel,
  isStoryMode,
  canOpenInnerActionPanel = true,
  onSub,
  onStartVoiceCall,
  onOpenInnerActionPanel,
  onPickAlbum,
  onOpenTruthOrDare
}) => (
  <>
    {renderMultiSelectBar && isMultiSelecting ? (
      <div className="h-14 flex items-center justify-around px-4 animate-in slide-in-from-bottom duration-200 render-bg-secondary border-t render-border-subtle">
        <div className="flex flex-col items-center text-gray-500 cursor-pointer" onClick={() => { onAction?.('ifLineMultiple', '', multiSelectIds); clearMultiSelect(setIsMultiSelecting, setMultiSelectIds); }}>
          <SkinIcon icon="fa-code-branch" className="text-xl mb-0.5" />
          <span className="text-[10px]">if线</span>
        </div>
        <div className="flex flex-col items-center text-gray-500 cursor-pointer" onClick={() => { onAction?.('favoriteMultiple', '', multiSelectIds); clearMultiSelect(setIsMultiSelecting, setMultiSelectIds); }}>
          <SkinIcon icon="fa-star" className="text-xl mb-0.5" />
          <span className="text-[10px]">收藏</span>
        </div>
        <div className="flex flex-col items-center text-gray-500 active:text-danger cursor-pointer" onClick={() => { onAction?.('deleteMultiple', '', multiSelectIds); clearMultiSelect(setIsMultiSelecting, setMultiSelectIds); }}>
          <SkinIcon icon="fa-trash" className="text-xl mb-0.5" />
          <span className="text-[10px]">删除</span>
        </div>
        <div className="flex flex-col items-center text-gray-500 cursor-pointer" onClick={() => setIsMultiSelecting(false)}>
          <SkinIcon icon="fa-envelope" className="text-xl mb-0.5" />
          <span className="text-[10px]">更多</span>
        </div>
      </div>
    ) : null}

    {renderMorePanel && showPanel === 'more' && !isMultiSelecting && !isStoryMode && (
      <div className="h-64 render-bg-tertiary p-6 grid grid-cols-4 gap-y-6 border-t render-border animate-in slide-in-from-bottom duration-200" onClick={(e) => e.stopPropagation()}>
        {[
          { icon: 'fa-image', label: '相册', onClick: onPickAlbum },
          { icon: 'fa-dice', label: '真心话大冒险', onClick: onOpenTruthOrDare },
          { icon: 'fa-phone', label: '语音通话', onClick: onStartVoiceCall },
          { icon: 'fa-location-dot', label: '位置', onClick: () => onSub('sendLocation') },
          { icon: 'fa-gift', label: '红包', onClick: () => onSub('redPacket') },
          { icon: 'fa-arrow-right-arrow-left', label: '转账', onClick: () => onSub('transfer') },
          ...(canOpenInnerActionPanel ? [{ icon: 'fa-heart', label: '心声/动作', onClick: onOpenInnerActionPanel }] : [])
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center" onClick={item.onClick}>
            <div className="w-14 h-14 render-bg-secondary rounded-xl flex items-center justify-center text-2xl text-gray-700 dark:text-[#CCC] active:bg-[var(--bg-hover)] shadow-sm cursor-pointer active:opacity-80 transition-all border render-border-subtle"><SkinIcon icon={item.icon} /></div>
            <span className="text-[12px] text-gray-500 mt-2 font-medium">{item.label}</span>
          </div>
        ))}
      </div>
    )}
  </>
);

export default ChatRoomFooterPanels;
