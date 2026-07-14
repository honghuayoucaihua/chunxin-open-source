import React from 'react';
import { Contact } from '../types';
import { WeChatBadge } from '../Common';

type PinnedContactCardProps = {
  contact: Contact;
  onSelect: (id: string) => void;
  onOpenTeam?: () => void;
  onAction?: (action: 'pin' | 'clear' | 'delete', id: string) => void;
  getDisplayContactName: (contact: Contact) => string;
};

const PinnedContactCard = React.memo(function PinnedContactCard({
  contact,
  onSelect,
  onOpenTeam,
  onAction,
  getDisplayContactName
}: PinnedContactCardProps) {
  return (
    <div className="relative flex flex-col items-center w-[78px] flex-shrink-0">
      <button
        className="flex flex-col items-center w-full cursor-pointer bg-transparent border-none p-0"
        onClick={() => {
          if (contact.id === '__xushuo_team__') {
            onOpenTeam?.();
            return;
          }
          onSelect(contact.id);
        }}
      >
        <div className="relative">
          {(typeof contact.avatar === 'string' && contact.avatar.startsWith('icon:')) ? (
            <div className="w-16 h-16 flex items-center justify-center shadow-sm icon-bg-blue app-avatar-radius render-imessage-pinned-avatar">
              <i className={`fa-solid ${contact.avatar.replace('icon:', '')} text-white text-[28px]`}></i>
            </div>
          ) : (
            <img
              src={typeof contact.avatar === 'string' ? contact.avatar : ''}
              alt={getDisplayContactName(contact)}
              className="w-16 h-16 object-cover shadow-sm app-avatar-radius render-imessage-pinned-avatar"
              width={64}
              height={64}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
          )}
          <div className="absolute -top-1.5 -right-0.5">
            <WeChatBadge count={contact.unreadCount} />
          </div>
        </div>
        <span className="mt-1 text-[11px] leading-tight text-center truncate w-full render-text-secondary">{getDisplayContactName(contact)}</span>
      </button>
      {(contact.unreadCount || 0) <= 0 && (
        <button
          className="absolute top-0 right-1 w-5 h-5 rounded-full text-[11px] leading-none flex items-center justify-center render-imessage-unpin-btn"
          onClick={(event) => {
            event.stopPropagation();
            onAction?.('pin', contact.id);
          }}
          title="取消置顶"
        >
          <i className="fa-solid fa-thumbtack text-[10px]"></i>
        </button>
      )}
    </div>
  );
});

const ChatsTabIMessagePinnedStrip: React.FC<{
  pinnedContacts: Contact[];
  onSelect: (id: string) => void;
  onOpenTeam?: () => void;
  onAction?: (action: 'pin' | 'clear' | 'delete', id: string) => void;
  getDisplayContactName: (contact: Contact) => string;
}> = ({ pinnedContacts, onSelect, onOpenTeam, onAction, getDisplayContactName }) => (
  <div className="px-3 pt-2 pb-1 render-imessage-pinned-strip">
    <div className="flex items-start gap-4 overflow-x-auto no-scrollbar justify-center min-w-full">
      {pinnedContacts.map((contact) => (
        <PinnedContactCard
          key={`pin-${contact.id}`}
          contact={contact}
          onSelect={onSelect}
          onOpenTeam={onOpenTeam}
          onAction={onAction}
          getDisplayContactName={getDisplayContactName}
        />
      ))}
    </div>
  </div>
);

export default ChatsTabIMessagePinnedStrip;
