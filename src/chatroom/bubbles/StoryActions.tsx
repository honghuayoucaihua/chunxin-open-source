import React from 'react';

interface StoryActionsProps {
  msgId: string;
  showAdvance: boolean;
  showInsight: boolean;
  onStoryAdvance?: (msgId: string) => void;
  onStoryInsight?: (msgId: string) => void;
}

const StoryActions: React.FC<StoryActionsProps> = ({ msgId, showAdvance, showInsight, onStoryAdvance, onStoryInsight }) => {
  if (!showAdvance && !showInsight) return null;

  return (
    <div className="mt-1 flex justify-end items-center gap-1.5">
      {showAdvance && (
        <button
          className="w-5 h-5 rounded-full bg-black/15 text-[10px] text-white/90 flex items-center justify-center active:opacity-70"
          onClick={(e) => {
            e.stopPropagation();
            onStoryAdvance?.(msgId);
          }}
          title="推动剧情"
        >
          <i className="fa-solid fa-forward"></i>
        </button>
      )}
      {showInsight && (
        <button
          className="w-5 h-5 rounded-full bg-black/15 text-[10px] text-white/90 flex items-center justify-center active:opacity-70"
          onClick={(e) => {
            e.stopPropagation();
            onStoryInsight?.(msgId);
          }}
          title="查看心声"
        >
          <i className="fa-solid fa-eye"></i>
        </button>
      )}
    </div>
  );
};

export default StoryActions;
