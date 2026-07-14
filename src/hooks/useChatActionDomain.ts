import { useCallback } from 'react';
import { useMessageActions } from './useMessageActions';
import { buildChatActionHandlers } from '../app/chatActionHandlers';
import { buildChatSceneActionHandlers } from '../app/chatSceneActionHandlers';
import { loadSendMessageRuntime } from '../app/sendMessageRuntimeLoader';
import { getContactMemoryPrompt } from '../services/contactMemoryService';
import type { SendMessageOverride, UseAppActionHandlersParams } from './appActionHandlersTypes';

export const useChatActionDomain = (params: UseAppActionHandlersParams) => {
  const {
    state: s,
    currentChat,
    runtimeUserPromptBase,
    resolveContextLimit,
    resolveMemorySummaryThreshold,
    updateMemoryWithAutoSummary,
    playSendSignal,
    playReceiveSignal,
    warnAiContextRiskIfNeeded
  } = params;

  const handleSendMessage = useCallback(async (overrideText?: SendMessageOverride) => {
    const { runSendMessageFlow } = await loadSendMessageRuntime();
    await runSendMessageFlow({
        overrideText,
        selectedContactId: s.selectedContactId,
        contacts: s.contacts,
        messages: s.messages,
        inputValue: s.inputValue,
        quotedMessage: s.quotedMessage,
        aiSettings: s.aiSettings,
        worldBooks: s.worldBooks,
        masks: s.masks,
        user: s.user,
        contactMemories: s.contactMemories,
        extraSystemPrompt: '',
        runtimeUserPromptBase,
        htmlTemplates: s.htmlTemplates,
        activeVoiceCallContactId: s.activeVoiceCallContactId,
        setInputValue: s.setInputValue,
        setMessages: s.setMessages,
        setContacts: s.setContacts,
        setQuotedMessage: s.setQuotedMessage,
        setTypingContactIds: s.setTypingContactIds,
        replyTaskVersionRef: s.replyTaskVersionRef,
        playSendSignal,
        playReceiveSignal,
        updateMemoryWithAutoSummary,
        showToast: s.showToast,
        resolveContextLimit,
        resolveMemorySummaryThreshold,
        warnAiContextRiskIfNeeded
    });
  }, [
    s.selectedContactId,
    s.contacts,
    s.messages,
    s.inputValue,
    s.quotedMessage,
    s.aiSettings,
    s.worldBooks,
    s.masks,
    s.user,
    s.contactMemories,
    runtimeUserPromptBase,
    s.htmlTemplates,
    s.activeVoiceCallContactId,
    playSendSignal,
    playReceiveSignal,
    updateMemoryWithAutoSummary,
    s.showToast,
    resolveContextLimit,
    resolveMemorySummaryThreshold,
    warnAiContextRiskIfNeeded
  ]);

  const handleMessageAction = useMessageActions({
    selectedContactId: s.selectedContactId,
    messages: s.messages,
    favorites: s.favorites,
    contacts: s.contacts,
    aiSettings: s.aiSettings,
    worldBooks: s.worldBooks,
    masks: s.masks,
    contactMemories: s.contactMemories,
    user: s.user,
    setMessages: s.setMessages,
    setFavorites: s.setFavorites,
    setContacts: s.setContacts,
    setSelectedContactId: s.setSelectedContactId,
    pushSubView: s.pushSubView,
    setTypingContactIds: s.setTypingContactIds,
    replyTaskVersionRef: s.replyTaskVersionRef,
    setQuotedMessage: s.setQuotedMessage,
    setMoments: s.setMoments,
    setOfficialArticles: s.setOfficialArticles,
    setContactMemories: s.setContactMemories,
    setWalletBalance: s.setWalletBalance,
    setUser: s.setUser,
    applyContactBalanceDelta: s.applyContactBalanceDelta,
    playReceiveSignal,
    warnAiContextRiskIfNeeded,
    openPrompt: s.openPrompt,
    showToast: s.showToast,
    extraSystemPrompt: ''
  });

  const {
    handleUpdateCurrentChat,
    handleUpdateCurrentChatGroupRelations,
    handleOpenGroupMemberProfile,
    handleOpenCurrentChatProfile,
    handleConfirmClearCurrentChatMessages,
    handleGenerateChatReplies
  } = buildChatSceneActionHandlers({
    currentChat,
    setContacts: s.setContacts,
    setProfileId: s.setProfileId,
    pushSubView: s.pushSubView,
    setProfileSnapshot: s.setProfileSnapshot,
    openConfirm: s.openConfirm,
    setMessages: s.setMessages,
    messages: s.messages,
    showToast: s.showToast,
    selectedContactId: s.selectedContactId,
    resolveContextLimit,
    user: s.user,
    masks: s.masks,
    getContactMemoryPrompt,
    contactMemories: s.contactMemories,
    runtimeUserPromptBase,
    aiSettings: s.aiSettings
  });

  const {
    handleChatTempSend,
    handleChatBack,
    handleChatMore,
    handleChatVoiceCallStateChange,
    handleChatAvatarClick,
    handleChatPaymentClick,
    handleChatAppendMessage,
    handleChatPat,
    handleConfirmReceiveTransfer,
    handleConfirmReceiveRedPacket
  } = buildChatActionHandlers({
    inputValue: s.inputValue,
    selectedContactId: s.selectedContactId,
    quotedMessage: s.quotedMessage,
    setMessages: s.setMessages,
    setContacts: s.setContacts,
    playSendSignal,
    setInputValue: s.setInputValue,
    setQuotedMessage: s.setQuotedMessage,
    setSelectedContactId: s.setSelectedContactId,
    goBackSubView: s.goBackSubView,
    currentChat,
    pushSubView: s.pushSubView,
    setActiveVoiceCallContactId: s.setActiveVoiceCallContactId,
    user: s.user,
    contacts: s.contacts,
    setProfileSnapshot: s.setProfileSnapshot,
    setProfileId: s.setProfileId,
    messages: s.messages,
    setActivePaymentMessage: s.setActivePaymentMessage,
    setShowRedPacketPreview: s.setShowRedPacketPreview,
    updateMemoryWithAutoSummary,
    resolveMemorySummaryThreshold,
    aiSettings: s.aiSettings,
    handleSendMessage,
    applyWalletIncome: s.applyWalletIncome,
    applyContactBalanceDelta: s.applyContactBalanceDelta,
    showToast: s.showToast
  });

  return {
    handleSendMessage,
    handleMessageAction,
    handleUpdateCurrentChat,
    handleUpdateCurrentChatGroupRelations,
    handleOpenGroupMemberProfile,
    handleOpenCurrentChatProfile,
    handleConfirmClearCurrentChatMessages,
    handleGenerateChatReplies,
    handleChatTempSend,
    handleChatBack,
    handleChatMore,
    handleChatVoiceCallStateChange,
    handleChatAvatarClick,
    handleChatPaymentClick,
    handleChatAppendMessage,
    handleChatPat,
    handleConfirmReceiveTransfer,
    handleConfirmReceiveRedPacket
  };
};
