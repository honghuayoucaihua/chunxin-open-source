import React from 'react';
import type { SubView } from '../../types';
import { renderChatPaymentSubView } from '../subviews/chatPaymentSubViews';
import { renderChatSubView } from '../subviews/chatSubView';
import { getImageLibraryGroups } from '../../services/imageLibraryStore';
import { AnonymousChatSubViewRouter, ChatDetailsSubViewRouter } from '../AppLazySubViews';
import type { AppSubViewRenderParams } from '../subviewRenderParams/types';

type ChatSubView = Extract<SubView, 'chat'>;
type AnonymousChatSubView = Extract<SubView, 'anonymousChat'>;
type ChatDetailsSubView = Extract<SubView, 'chatDetails' | 'groupDetails'>;
type ChatPaymentSubView = Extract<SubView, 'redPacket' | 'transfer' | 'sendLocation'>;

export const renderConversationSubView = (params: AppSubViewRenderParams, subView: SubView): React.ReactNode => {
  const chatSubView: ChatSubView | null = subView === 'chat' ? subView : null;
  if (chatSubView) {
    return renderChatSubView({
      subView: chatSubView,
      currentChat: params.currentChat || null,
      selectedContactId: params.selectedContactId,
      user: params.user,
      contacts: params.contacts,
      messages: params.messages,
      aiSettings: params.aiSettings,
      buildRuntimePromptWithMemory: params.buildRuntimePromptWithMemory,
      settings: params.settings,
      soundVibrationSettings: params.soundVibrationSettings,
      inputValue: params.inputValue,
      setInputValue: params.setInputValue,
      inputMode: params.inputMode,
      setInputMode: params.setInputMode,
      showPanel: params.showPanel,
      setShowPanel: params.setShowPanel,
      typingContactIds: params.typingContactIds,
      enableSentenceSend: params.aiSettings.enableSentenceSend,
      quotedMessage: params.quotedMessage,
      onCancelQuote: () => params.setQuotedMessage(null),
      activePaymentMessage: params.activePaymentMessage,
      setActivePaymentMessage: params.setActivePaymentMessage,
      showRedPacketPreview: params.showRedPacketPreview,
      setShowRedPacketPreview: params.setShowRedPacketPreview,
      onSend: params.handleSendMessage,
      onSendWithOptions: params.handleSendMessage,
      onGenerateReplies: params.handleGenerateChatReplies,
      onTempSend: params.handleChatTempSend,
      onBack: params.handleChatBack,
      onMore: params.handleChatMore,
      onVoiceCallStateChange: params.handleChatVoiceCallStateChange,
      hideHeaderAvatar: !params.resolvedRenderConfig.header.showAvatar,
      onAvatarClick: params.handleChatAvatarClick,
      onSub: params.pushSubView,
      onAction: params.handleMessageAction,
      onPaymentClick: params.handleChatPaymentClick,
      onAppendMessage: params.handleChatAppendMessage,
      onPat: params.handleChatPat,
      onConfirmReceiveTransfer: params.handleConfirmReceiveTransfer,
      onConfirmReceiveRedPacket: params.handleConfirmReceiveRedPacket,
      onInputFocusChange: params.onChatInputFocusChange
    });
  }

  const anonymousChatSubView: AnonymousChatSubView | null = subView === 'anonymousChat' ? subView : null;
  if (anonymousChatSubView) {
    return (
      <AnonymousChatSubViewRouter
        subView={anonymousChatSubView}
        goBackSubView={params.goBackSubView}
        pushSubView={params.pushSubView}
        anonymousChatId={params.ANONYMOUS_CHAT_ID}
        messages={params.messages}
        typingContactIds={params.typingContactIds}
        anonymousViewingHistoryId={params.anonymousViewingHistoryId}
        anonymousPartner={params.anonymousPartner}
        anonymousSessionActive={params.anonymousSessionActive}
        anonymousIsMatching={params.anonymousIsMatching}
        anonymousHasUnfinishedSession={params.anonymousHasUnfinishedSession}
        anonymousUnfinishedSession={params.anonymousUnfinishedSession}
        anonymousSettingsVisible={params.anonymousSettingsVisible}
        anonymousChatSettings={params.anonymousChatSettings}
        anonymousTagDraft={params.anonymousTagDraft}
        setAnonymousTagDraft={params.setAnonymousTagDraft}
        setAnonymousChatSettings={params.setAnonymousChatSettings}
        setAnonymousSettingsVisible={params.setAnonymousSettingsVisible}
        anonymousPeerLeft={params.anonymousPeerLeft}
        aiSettings={params.aiSettings}
        user={params.user}
        settings={params.settings}
        soundVibrationSettings={params.soundVibrationSettings}
        inputMode={params.inputMode}
        setInputMode={params.setInputMode}
        showPanel={params.showPanel}
        setShowPanel={params.setShowPanel}
        anonymousInputValue={params.anonymousInputValue}
        setAnonymousInputValue={params.setAnonymousInputValue}
        contacts={params.contacts}
        hideHeaderAvatar={!params.resolvedRenderConfig.header.showAvatar}
        rootSkinId={params.rootSkinId}
        onStartAnonymousMatch={params.handleStartAnonymousMatch}
        onResumeAnonymousSession={params.handleResumeAnonymousSession}
        onAnonymousSend={params.handleAnonymousSend}
        onAnonymousLeave={params.handleAnonymousLeave}
      />
    );
  }

  const chatDetailsSubView: ChatDetailsSubView | null = (
    subView === 'chatDetails'
    || subView === 'groupDetails'
  ) ? subView : null;
  if (chatDetailsSubView) {
    return (
      <ChatDetailsSubViewRouter
        subView={chatDetailsSubView}
        currentChat={params.currentChat || null}
        contacts={params.contacts}
        user={params.user}
        masks={params.masks}
        worldBooks={params.worldBooks}
        htmlTemplates={params.htmlTemplates || []}
        imageLibraryGroups={getImageLibraryGroups().map((group) => ({ id: group.id, name: group.name }))}
        goBackSubView={params.goBackSubView}
        pushSubView={params.pushSubView}
        onHighContextLimitWarning={params.handleHighContextLimitWarning}
        onUpdateCurrentChat={params.handleUpdateCurrentChat}
        onUpdateCurrentChatGroupRelations={params.handleUpdateCurrentChatGroupRelations}
        onOpenGroupMemberProfile={params.handleOpenGroupMemberProfile}
        onOpenCurrentChatProfile={params.handleOpenCurrentChatProfile}
        onConfirmClearCurrentChatMessages={params.handleConfirmClearCurrentChatMessages}
        onConfirmDeleteCurrentContact={params.handleConfirmDeleteCurrentContact}
        onConfirmExitCurrentGroup={params.handleConfirmExitCurrentGroup}
      />
    );
  }

  const chatPaymentSubView: ChatPaymentSubView | null = (
    subView === 'redPacket'
    || subView === 'transfer'
    || subView === 'sendLocation'
  ) ? subView : null;
  if (chatPaymentSubView) {
    return renderChatPaymentSubView({
      subView: chatPaymentSubView,
      goBackSubView: params.goBackSubView,
      selectedContactMessages: params.selectedContactId ? (params.messages[params.selectedContactId] || []) : [],
      currentChat: params.currentChat || undefined,
      onSendRedPacket: params.handleSendRedPacket,
      onSendTransfer: params.handleSendTransfer,
      onSendLocation: params.handleSendLocation
    });
  }

  return null;
};
