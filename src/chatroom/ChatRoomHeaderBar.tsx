import React from 'react';
import type { Contact } from '../types';
import { MobileHeader } from '../Common';
import {
  resolveChatHeaderAvatar,
  resolveChatHeaderSubtitle,
  resolveChatHeaderTitle
} from './chatRoomViewUtils';

type ChatRoomHeaderBarProps = {
  isMultiSelecting: boolean;
  multiSelectCount: number;
  titleOverride?: string;
  subtitleOverride?: string;
  contact: Contact;
  isTyping?: boolean;
  currentSkinId: string;
  onBack: () => void;
  onMore: () => void;
  setIsMultiSelecting: (value: boolean) => void;
  setMultiSelectIds: (ids: string[]) => void;
  headerActions?: React.ReactNode;
  isIMessageSkin: boolean;
  showMoreAction: boolean;
  hideHeaderAvatar: boolean;
  contactById: Record<string, Contact>;
  headerImage?: string;
};

const ChatRoomHeaderBar: React.FC<ChatRoomHeaderBarProps> = (props) => {
  const { resolvedHeaderAvatar, resolvedHeaderAvatarGroup } = resolveChatHeaderAvatar(
    props.hideHeaderAvatar,
    props.contact,
    props.contactById
  );

  return (
    <MobileHeader
      title={resolveChatHeaderTitle({
        isMultiSelecting: props.isMultiSelecting,
        multiSelectCount: props.multiSelectCount,
        titleOverride: props.titleOverride,
        contact: props.contact,
        isTyping: props.isTyping
      })}
      subtitle={resolveChatHeaderSubtitle({
        isMultiSelecting: props.isMultiSelecting,
        chatMode: props.contact.chatMode,
        subtitleOverride: props.subtitleOverride,
        currentSkinId: props.currentSkinId,
        contact: props.contact
      })}
      onBack={props.onBack}
      actions={(() => {
        if (props.isMultiSelecting) {
          return <button className="app-button app-button-muted text-sm font-bold whitespace-nowrap" style={{ color: 'var(--app-accent-color)' }} onClick={() => { props.setIsMultiSelecting(false); props.setMultiSelectIds([]); }}>取消</button>;
        }
        if (props.headerActions) return props.headerActions;
        if (props.isIMessageSkin || !props.showMoreAction) return null;
        const iconClass = props.currentSkinId === 'qq' ? 'fa-bars' : 'fa-ellipsis-h';
        return <button className="app-icon-button w-9 h-9 rounded-full" onClick={props.onMore}><i className={`fa-solid ${iconClass} text-lg`}></i></button>;
      })()}
      onTitleClick={(!props.isMultiSelecting && props.isIMessageSkin && props.showMoreAction) ? props.onMore : undefined}
      className={`render-chatroom-header ${!props.isMultiSelecting && (!props.contact.status || props.contact.chatMode === 'story') ? 'render-chatroom-header-no-subtitle' : ''}`}
      backgroundImage={props.headerImage}
      avatarSrc={resolvedHeaderAvatar}
      avatarGroupSrcs={resolvedHeaderAvatarGroup}
    />
  );
};

export default ChatRoomHeaderBar;
