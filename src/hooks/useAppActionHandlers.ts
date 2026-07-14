import { loadContactCardRuntime } from '../app/contactCardRuntimeLoader';
import type { UseAppActionHandlersParams } from './appActionHandlersTypes';
import { useChatActionDomain } from './useChatActionDomain';
import { useContentActionDomain } from './useContentActionDomain';
import { useSocialActionDomain } from './useSocialActionDomain';
import { useUtilityActionDomain } from './useUtilityActionDomain';

export const useAppActionHandlers = (params: UseAppActionHandlersParams) => {
  const {
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
  } = useChatActionDomain(params);

  const {
    buildSnapshot,
    estimateTokens,
    handleBackup,
    handleRestore,
    handleClearMailboxData,
    handleClearForumData,
    handleClearMusicData,
    handleClearAnonymousData,
    handleClearStorage,
    handleEditWalletBank,
    handleWalletTopUpConfirm,
    handleWalletWithdrawConfirm,
    handleSendRedPacket,
    handleSendTransfer,
    handleSendLocation,
    handleSelectMailboxLetter,
    handleSendMailboxLetter,
    handleSubmitDivination,
    handleOpenDivinationHistory,
    handleSelectDivinationHistory
  } = useUtilityActionDomain(params);

  const {
    handleOpenOfficialArticle,
    handleManualGenerateOfficialArticle,
    handleGenerateInitialArticleComments,
    handleGenerateReplyToArticleComment,
    handleOfficialArticleCommentsChange,
    handleDeleteCurrentOfficialArticle,
    handleContactPickerConfirm,
    handleStickerImportConfirm
  } = useContentActionDomain(params);

  const {
    handleScanRequestCreated,
    handleShakeCreateContact,
    handleOpenGroupChat,
    handleCreateGroupConfirm,
    resetAddFriendDraft,
    handleAIGenerateContactForm,
    handleCreateFriendContact,
    handleFriendRequestIncoming,
    handleExportContactQr,
    handleAcceptFriendRequest,
    handleSetContactChatBg,
    handleEditWorldBook,
    handleSaveWorldBook,
    handleEditMask,
    handleSaveMask,
    handleOpenProfileChat,
    handleSetProfileRemark,
    handleOpenProfileMoments,
    handleContactPersonaUpdate,
    handleContactMemoriesChange,
    handleNavigateEditProfileField,
    handleSearchSelectContact,
    handleSelectAnonymousHistory,
    handleMomentsAvatarClick,
    handleManualGenerateMoment,
    handleMomentCommentCreate,
    handlePublishMoment,
    handleRemindWhoPost
  } = useSocialActionDomain(params);

  const parseContactFromCardImage = async (file: File) => {
    const runtime = await loadContactCardRuntime();
    return runtime.parseContactFromCardImage(file);
  };

  return {
    handleSendMessage,
    handleMessageAction,
    buildSnapshot,
    estimateTokens,
    handleBackup,
    handleRestore,
    handleClearMailboxData,
    handleClearForumData,
    handleClearMusicData,
    handleClearAnonymousData,
    handleClearStorage,
    handleOpenOfficialArticle,
    handleManualGenerateOfficialArticle,
    handleGenerateInitialArticleComments,
    handleGenerateReplyToArticleComment,
    handleOfficialArticleCommentsChange,
    handleDeleteCurrentOfficialArticle,
    handleContactPickerConfirm,
    handleStickerImportConfirm,
    handleEditWalletBank,
    handleWalletTopUpConfirm,
    handleWalletWithdrawConfirm,
    handleSendRedPacket,
    handleSendTransfer,
    handleSendLocation,
    handleScanRequestCreated,
    handleShakeCreateContact,
    handleOpenGroupChat,
    handleCreateGroupConfirm,
    resetAddFriendDraft,
    handleAIGenerateContactForm,
    handleCreateFriendContact,
    handleFriendRequestIncoming,
    handleExportContactQr,
    handleAcceptFriendRequest,
    handleSetContactChatBg,
    handleEditWorldBook,
    handleSaveWorldBook,
    handleEditMask,
    handleSaveMask,
    handleOpenProfileChat,
    handleSetProfileRemark,
    handleOpenProfileMoments,
    handleContactPersonaUpdate,
    handleContactMemoriesChange,
    handleNavigateEditProfileField,
    handleSearchSelectContact,
    handleSelectAnonymousHistory,
    handleMomentsAvatarClick,
    handleManualGenerateMoment,
    handleMomentCommentCreate,
    handlePublishMoment,
    handleRemindWhoPost,
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
    handleConfirmReceiveRedPacket,
    handleSelectMailboxLetter,
    handleSendMailboxLetter,
    handleSubmitDivination,
    handleOpenDivinationHistory,
    handleSelectDivinationHistory,
    parseContactFromCardImage
  };
};

export type AppActionHandlers = ReturnType<typeof useAppActionHandlers>;
