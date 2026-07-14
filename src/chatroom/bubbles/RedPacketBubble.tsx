import React from 'react';

interface RedPacketBubbleProps {
  content: string;
  isOpened: boolean;
  isMe: boolean;
  paymentStatus?: 'pending' | 'received' | 'refunded' | 'expired';
}

const RedPacketBubble: React.FC<RedPacketBubbleProps> = ({ content, isOpened, isMe, paymentStatus }) => {
  const isExpired = paymentStatus === 'expired';
  const statusText = isExpired
    ? '红包已失效'
    : isOpened
      ? (isMe ? '红包已被领取' : '已领取红包')
      : (isMe ? '等待对方领取' : '待领取红包');
  return (
    <div
      className={`flex flex-col w-[200px] overflow-hidden shadow-md cursor-pointer transition-all ${isOpened ? 'active:brightness-100' : 'active:brightness-90'}`}
      style={{
        borderRadius: 'var(--app-card-radius)',
        background: isOpened
          ? 'linear-gradient(to bottom, #E59A90, #D7867B)'
          : 'linear-gradient(to bottom, #E03C24, #C62817)'
      }}
    >
      <div className="p-3 flex items-center space-x-2">
        <div className="w-10 h-12 bg-[#FFE4B5] rounded-sm flex items-center justify-center shadow-sm">
          <span className="text-[#C62817] font-bold text-base" style={{ fontFamily: 'serif' }}>福</span>
        </div>
        <div className="flex flex-col text-white flex-1">
          <span className="text-[14px] font-medium leading-tight">{content}</span>
          <span className="text-[11px] opacity-80 mt-0.5">{statusText}</span>
        </div>
      </div>
      <div
        className="px-3 py-1.5 flex items-center justify-between"
        style={{ backgroundColor: isOpened ? '#C97A70' : '#D32F2F' }}
      >
        <span className="text-[10px] text-white/80">红包</span>
        <i className="fa-solid fa-chevron-right text-white/60 text-[10px]"></i>
      </div>
    </div>
  );
};

export default RedPacketBubble;
