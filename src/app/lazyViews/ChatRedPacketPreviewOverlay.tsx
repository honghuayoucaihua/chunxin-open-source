import React from 'react';
import type { Contact, Message } from '../../types';

interface ChatRedPacketPreviewOverlayProps {
  contact: Contact;
  paymentMsg: Message;
  previewBg?: string;
  onClose: () => void;
  onConfirm: () => void;
}

const ChatRedPacketPreviewOverlay: React.FC<ChatRedPacketPreviewOverlayProps> = ({
  contact,
  paymentMsg,
  previewBg,
  onClose,
  onConfirm
}) => (
  <div className="fixed inset-0 z-[410] bg-black/35 backdrop-blur-[1px] flex flex-col items-center justify-center px-6" onClick={onClose}>
    <div
      className="w-full max-w-[332px] rounded-2xl overflow-hidden shadow-[0_14px_34px_rgba(0,0,0,0.26)] relative"
      style={previewBg
        ? {
            backgroundImage: `linear-gradient(rgba(246,90,77,0.72), rgba(244,81,69,0.82)), url(${previewBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }
        : { backgroundColor: '#F65A4D' }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="relative h-[468px] px-6 pt-10 text-center text-[#F7D9A3]">
        <img src={contact.avatar} className="w-10 h-10 rounded-md object-cover mx-auto" />
        <div className="mt-3 text-[15px] font-medium opacity-95">{contact.name}的红包</div>
        <div className="mt-6 text-[34px] leading-tight text-[#EED39D] tracking-[0.5px]">
          {String(paymentMsg.content || '').trim() || '恭喜发财，大吉大利'}
        </div>

        <div className="absolute left-0 right-0 bottom-0 h-[160px]" style={{ background: 'inherit' }}>
          <div
            className="absolute -top-[44px] left-1/2 -translate-x-1/2 w-[122%] h-[92px] rounded-[50%] shadow-[0_5px_9px_rgba(0,0,0,0.12)]"
            style={{ background: 'inherit' }}
          ></div>
        </div>

        <button
          className="absolute left-1/2 -translate-x-1/2 bottom-[54px] w-20 h-20 rounded-full bg-[#E9CE9A] text-[#404040] text-[40px] leading-none pb-1 shadow-[0_4px_10px_rgba(0,0,0,0.16)] active:scale-[0.97]"
          onClick={onConfirm}
        >
          開
        </button>
      </div>
    </div>

    <button
      className="mt-9 w-12 h-12 rounded-full border-2 border-[#D8B66C] text-[#D8B66C] text-[28px] leading-none active:scale-95"
      onClick={onClose}
    >
      ×
    </button>
  </div>
);

export default ChatRedPacketPreviewOverlay;
