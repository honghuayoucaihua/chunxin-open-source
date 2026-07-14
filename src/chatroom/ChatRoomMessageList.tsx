import React from 'react';
import ChatMessageItem from '../ChatMessageItem';
import { buildMessageMenuItems } from './messageMenuFlow';
import SkinIcon from '../shell/SkinIcon';
import { DropdownItem, DropdownMenu } from '../utils/DropdownPrimitives';
import { resolveMessageMenuLayout } from './chatRoomUiUtils';

const ChatRoomMessageList: React.FC<any> = (props) => {
  const containerWidth = props.scrollRef.current?.clientWidth || window.innerWidth;
  const scrollTop = props.scrollRef.current?.scrollTop || 0;
  const containerHeight = props.scrollRef.current?.clientHeight || window.innerHeight;
  const iMessageHeaderOffset = props.headerOverlayOffset || 'calc(var(--safe-top) + 104px)';
  const menuItems = props.menuMsgId
    ? buildMessageMenuItems({
        messages: props.messages,
        menuMsgId: props.menuMsgId,
        menuSourceField: props.menuSourceField,
        onAction: props.onAction,
        setMenuMsgId: props.setMenuMsgId,
        setMenuSourceField: props.setMenuSourceField,
        setIsMultiSelecting: props.setIsMultiSelecting,
        setMultiSelectIds: props.setMultiSelectIds
      })
    : [];
  const menuLayout = props.menuAnchorRect
    ? resolveMessageMenuLayout({
        containerWidth,
        containerHeight,
        scrollTop,
        anchorRect: props.menuAnchorRect
      })
    : null;

  return (
    <div
    ref={props.scrollRef}
    className="flex-1 overflow-y-auto no-scrollbar relative render-chat-message-scroll"
    onScroll={props.onScroll}
      style={{
        fontSize: 'var(--app-font-size)',
        paddingLeft: 'var(--app-content-padding)',
        paddingRight: 'var(--app-content-padding)',
        paddingBottom: 'var(--app-content-padding)',
        paddingTop: props.isIMessageSkin
          ? `calc(${iMessageHeaderOffset} + var(--app-content-padding) + 8px)`
          : 'var(--app-content-padding)',
        marginTop: props.isIMessageSkin
          ? `calc(-1 * (${iMessageHeaderOffset}))`
          : undefined
      }}
  >
    {props.renderedMessages.length < props.messages.length && (
      <div className="px-3 pt-2 pb-1 text-center">
        <button
          className="h-8 px-3 rounded-lg text-xs render-bg-secondary render-text-secondary active:opacity-80"
          onClick={props.onLoadMore}
        >
          加载更早消息（{props.renderedMessages.length}/{props.messages.length}）
        </button>
      </div>
    )}
    {props.renderedMessages.map((msg: any, idx: number) => {
      const isMe = msg.senderId === 'me';
      const isSpecial = ['redpacket', 'transfer', 'location', 'miniprogram', 'truthdare', 'image'].includes(msg.type);
      const isSelected = props.selectedMessageIdSet.has(msg.id);
      const isSystem = msg.type === 'system' || !!msg.pat;
      const showMeta = props.contact.chatMode !== 'story' && !!(msg.innerVoice || msg.actionDesc || msg.narrationDesc);
      const prevMsg = props.renderedMessages[idx - 1];
      const isPrevSystem = !!prevMsg && (prevMsg.type === 'system' || !!prevMsg.pat);
      const isConsecutiveSameSender = !!prevMsg && prevMsg.senderId === msg.senderId;
      const shouldCollapseAvatarForSkin = !!props.isAvatarCollapseSkin && isConsecutiveSameSender && !isSystem && !isPrevSystem;
      const shouldHideBubbleTailForSkin = shouldCollapseAvatarForSkin && !isSpecial;
      const showTime = !prevMsg || Math.abs(msg.timestamp - prevMsg.timestamp) > 5 * 60 * 1000;
      return (
        <ChatMessageItem
          key={`${msg.id}-${msg.timestamp}-${idx}`}
          msg={msg}
          contact={props.contact}
          messageContact={!isMe && props.contact.isGroup ? (props.contactById[msg.senderId] || null) : null}
          resolveSenderName={props.resolveSenderName}
          me={props.me}
          settings={props.settings}
          isMe={isMe}
          isSpecial={isSpecial}
          isSelected={isSelected}
          isSystem={isSystem}
          showMeta={showMeta}
          showTime={showTime}
          isMultiSelecting={props.isMultiSelecting}
          onToggleSelect={(msgId, selected) => {
            props.setMultiSelectIds((prev: string[]) => (selected ? prev.filter((id) => id !== msgId) : [...prev, msgId]));
          }}
          hideAvatar={props.hideMessageAvatar || shouldCollapseAvatarForSkin}
          reserveAvatarSpace={shouldCollapseAvatarForSkin}
          hideBubbleTail={shouldHideBubbleTailForSkin}
          hideSenderName={props.hideMessageSenderName}
          onMenuClick={props.onMenuClick}
          onPaymentClick={props.onPaymentClick}
          onAvatarTap={props.onAvatarTap}
          getBubbleStyle={props.getBubbleStyle}
          getEmojiOnly={props.getEmojiOnly}
          renderTextWithEmoji={props.renderTextWithEmoji}
          formatMessageTime={props.formatMessageTime}
          aiSettings={props.aiSettings}
          onStoryAdvance={props.onStoryAdvance}
          onStoryInsight={props.onStoryInsight}
        />
      );
    })}
    <div ref={props.endRef} />

    {props.menuMsgId && menuLayout && (
      <DropdownMenu
        className="absolute z-[200] w-64 py-1 app-dropdown-grid animate-in zoom-in duration-200 render-msg-menu"
        style={{
          top: menuLayout.top,
          left: menuLayout.left
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {menuItems.map((item) => (
          <DropdownItem key={item.label} className="flex flex-col items-center justify-center cursor-pointer render-msg-menu-item" onClick={(e) => { e.stopPropagation(); item.onClick(); }}>
            <SkinIcon icon={item.icon} className="text-lg" />
            <span className="text-[10px]">{item.label}</span>
          </DropdownItem>
        ))}
        <div
          className={`absolute w-4 h-4 rotate-45 app-dropdown-arrow ${menuLayout.placeAboveAnchor ? '-bottom-2' : '-top-2'}`}
          style={{ left: menuLayout.arrowLeft }}
        ></div>
      </DropdownMenu>
    )}
  </div>
  );
};

export default ChatRoomMessageList;
