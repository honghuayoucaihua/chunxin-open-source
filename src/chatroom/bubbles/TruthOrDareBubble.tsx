import React from 'react';

interface TruthOrDareBubbleProps {
  kind?: 'invite' | 'accepted';
  themeName?: string;
  isMe: boolean;
}

const TruthOrDareBubble: React.FC<TruthOrDareBubbleProps> = ({ kind = 'invite', themeName, isMe }) => {
  const isAccepted = kind === 'accepted';
  return (
    <div
      className="flex flex-col w-[220px] overflow-hidden shadow-md cursor-pointer transition-all active:brightness-95"
      style={{
        borderRadius: 'var(--app-card-radius)',
        background: isAccepted
          ? 'linear-gradient(to bottom, #7A9EFF, #5B7DE2)'
          : 'linear-gradient(to bottom, #F47C9B, #E65D84)'
      }}
    >
      <div className="p-3 flex items-center space-x-2">
        <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center">
          <i className={`fa-solid ${isAccepted ? 'fa-check' : 'fa-dice'} text-white text-sm`}></i>
        </div>
        <div className="flex flex-col text-white flex-1 min-w-0">
          <span className="text-[14px] font-medium leading-tight">{isAccepted ? '已接受真心话大冒险' : '真心话大冒险邀请'}</span>
          <span className="text-[11px] opacity-85 truncate">主题：{String(themeName || '经典局')}</span>
        </div>
      </div>
      <div className="px-3 py-1.5 flex items-center justify-between" style={{ backgroundColor: isAccepted ? '#4D69BD' : '#CF4871' }}>
        <span className="text-[10px] text-white/80">{isMe ? '你发起的互动' : '点击查看进度'}</span>
        <i className="fa-solid fa-chevron-right text-white/60 text-[10px]"></i>
      </div>
    </div>
  );
};

export default TruthOrDareBubble;
