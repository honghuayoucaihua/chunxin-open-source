import React from 'react';

interface TransferBubbleProps {
  amount: number;
  isOpened: boolean;
  isMe: boolean;
  paymentStatus?: 'pending' | 'received' | 'refunded' | 'expired';
}

const TransferBubble: React.FC<TransferBubbleProps> = ({ amount, isOpened, isMe, paymentStatus }) => {
  const isExpired = paymentStatus === 'expired';
  const statusText = isExpired
    ? '转账已失效'
    : isOpened
      ? (isMe ? '对方已收款' : '已收款')
      : (isMe ? '待对方确认收款' : '待确认收款');
  return (
    <div
      className={`flex flex-col w-[200px] overflow-hidden shadow-md cursor-pointer transition-all ${isOpened ? 'active:brightness-100' : 'active:brightness-90'}`}
      style={{
        borderRadius: 'var(--app-card-radius)',
        background: isOpened
          ? 'linear-gradient(to bottom, #E6C59E, #D7B288)'
          : 'linear-gradient(to bottom, #FA9D3B, #E0892C)'
      }}
    >
      <div className="p-3 flex items-center space-x-3">
        <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center">
          <i className="fa-solid fa-arrow-right-arrow-left text-white text-sm"></i>
        </div>
        <div className="flex flex-col text-white flex-1">
          <span className="text-[18px] font-bold">¥ {Number(amount).toFixed(2)}</span>
          <span className="text-[11px] opacity-80">{statusText}</span>
        </div>
      </div>
      <div
        className="px-3 py-1.5 flex items-center justify-between"
        style={{ backgroundColor: isOpened ? '#F6F1EA' : '#FFFFFF' }}
      >
        <span className="text-[10px] text-[#4E6A86]">转账</span>
        <i className="fa-solid fa-chevron-right text-[#9FB0C0] text-[10px]"></i>
      </div>
    </div>
  );
};

export default TransferBubble;
