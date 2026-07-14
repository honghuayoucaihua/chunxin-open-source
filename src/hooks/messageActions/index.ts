import { useCallback } from 'react';
import { UseMessageActionsParams } from './types';
import { handleDelete, handleFavorite, handleEdit, handleQuote, handleSendEmoji } from './messageOperations';
import { handleDeleteMultiple, handleFavoriteMultiple, handleIfLineMultiple } from './batchActions';
import { loadResendFlow } from './runtimeLoader';

export type { UseMessageActionsParams };

type MessageActionData = unknown;

export const useMessageActions = ({
  selectedContactId,
  messages,
  favorites,
  contacts,
  aiSettings,
  worldBooks,
  masks,
  htmlTemplates,
  contactMemories,
  user,
  setMessages,
  setFavorites,
  setContacts,
  setSelectedContactId,
  pushSubView,
  setTypingContactIds,
  replyTaskVersionRef,
  setQuotedMessage,
  setMoments,
  setOfficialArticles,
  setContactMemories,
  setWalletBalance,
  setUser,
  applyContactBalanceDelta,
  playReceiveSignal,
  warnAiContextRiskIfNeeded,
  openPrompt,
  showToast,
  extraSystemPrompt
}: UseMessageActionsParams) => {
  return useCallback((action: string, msgId: string, data?: MessageActionData) => {
    if (!selectedContactId) return;
    const currentMsgs = messages[selectedContactId] || [];
    const targetMsg = currentMsgs.find(m => m.id === msgId);

    const params: UseMessageActionsParams = {
      selectedContactId,
      messages,
      favorites,
      contacts,
      aiSettings,
      worldBooks,
      masks,
      htmlTemplates,
      contactMemories,
      user,
      setMessages,
      setFavorites,
      setContacts,
      setSelectedContactId,
      pushSubView,
      setTypingContactIds,
      replyTaskVersionRef,
      setQuotedMessage,
      setMoments,
      setOfficialArticles,
      setContactMemories,
      setWalletBalance,
      setUser,
      applyContactBalanceDelta,
      playReceiveSignal,
      warnAiContextRiskIfNeeded,
      openPrompt,
      showToast,
      extraSystemPrompt
    };

    switch (action) {
      case 'delete':
        handleDelete(params, selectedContactId, targetMsg);
        break;
      case 'favorite':
        handleFavorite(params, targetMsg, msgId);
        break;
      case 'edit':
        handleEdit(params, selectedContactId, targetMsg, msgId, data);
        break;
      case 'quote':
        handleQuote(params, targetMsg);
        break;
      case 'sendEmoji':
        handleSendEmoji(params, selectedContactId, data);
        break;
      case 'deleteMultiple':
        handleDeleteMultiple(params, selectedContactId, data);
        break;
      case 'favoriteMultiple':
        handleFavoriteMultiple(params, currentMsgs, data);
        break;
      case 'ifLineMultiple':
        handleIfLineMultiple(params, selectedContactId, currentMsgs, data);
        break;
      case 'resendFrom':
        void loadResendFlow()
          .then(({ handleResendFrom }) => {
            handleResendFrom(params, selectedContactId, msgId);
          })
          .catch((error) => {
            console.error('[useMessageActions] 加载重发流程失败:', error);
            showToast('重发失败');
          });
        break;
      default:
        break;
    }
  }, [
    selectedContactId,
    messages,
    favorites,
    contacts,
    aiSettings,
    worldBooks,
    masks,
    htmlTemplates,
    contactMemories,
    user,
    setMessages,
    setFavorites,
    setContacts,
    setSelectedContactId,
    pushSubView,
    setTypingContactIds,
    replyTaskVersionRef,
    setQuotedMessage,
    setMoments,
    setOfficialArticles,
    setContactMemories,
    setWalletBalance,
    setUser,
    applyContactBalanceDelta,
    playReceiveSignal,
    warnAiContextRiskIfNeeded,
    openPrompt,
    showToast,
    extraSystemPrompt
  ]);
};
