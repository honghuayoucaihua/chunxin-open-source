import React from 'react';
import { Contact } from '../types';

const ChatsTabSwipeActions: React.FC<{
  contact: Contact;
  isOpen: boolean;
  isCurrentSwiping: boolean;
  offset: number;
  onAction?: (action: 'pin' | 'clear' | 'delete', id: string) => void;
  onClose: () => void;
}> = ({ contact, isOpen, isCurrentSwiping, offset, onAction, onClose }) => (
  <div
    className="absolute right-0 top-0 bottom-0 flex"
    style={{
      transform: isOpen
        ? `translateX(${offset}px)`
        : (isCurrentSwiping && offset > 0 ? `translateX(${180 - offset}px)` : 'translateX(100%)'),
      transition: (!isCurrentSwiping || offset === 0) ? 'transform 200ms ease-out' : 'none'
    }}
  >
    <button
      className="app-button app-button-muted w-[60px] rounded-none text-sm whitespace-nowrap border-none shadow-none"
      onClick={(event) => {
        event.stopPropagation();
        onAction?.('pin', contact.id);
        onClose();
      }}
    >
      {contact.isPinned ? '取消置顶' : '置顶'}
    </button>
    <button
      className="app-button w-[60px] rounded-none text-sm whitespace-nowrap border-none shadow-none text-white"
      style={{ backgroundColor: '#FF9500' }}
      onClick={(event) => {
        event.stopPropagation();
        onAction?.('clear', contact.id);
        onClose();
      }}
    >
      清空
    </button>
    <button
      className="app-button app-button-danger w-[60px] rounded-none text-sm whitespace-nowrap border-none shadow-none"
      onClick={(event) => {
        event.stopPropagation();
        onAction?.('delete', contact.id);
        onClose();
      }}
    >
      删除
    </button>
  </div>
);

export default ChatsTabSwipeActions;
