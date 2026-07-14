import { getGeminiChatReply } from '../services/geminiServiceLoader';
import { buildContactManagementActionHandlers } from '../app/contactManagementActionHandlers';
import { buildMomentsActionHandlers } from '../app/momentsActionHandlers';
import { buildProfileSceneActionHandlers } from '../app/profileSceneActionHandlers';
import { DEFAULT_ADD_FRIEND_GREETING } from '../appBootstrapUtils';
import { ANONYMOUS_CHAT_ID } from '../app/anonymousChatUtils';
import type { UseAppActionHandlersParams } from './appActionHandlersTypes';

export const useSocialActionDomain = (params: UseAppActionHandlersParams) => {
  const {
    state: s,
    runtimeUserPromptBase,
    buildRuntimePromptWithMemory
  } = params;

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
    handleAcceptFriendRequest
  } = buildContactManagementActionHandlers({
    setFriendRequests: s.setFriendRequests,
    pushSubView: s.pushSubView,
    showToast: s.showToast,
    user: s.user,
    setSelectedContactId: s.setSelectedContactId,
    setContacts: s.setContacts,
    setMessages: s.setMessages,
    contacts: s.contacts,
    setAddFriendDraft: s.setAddFriendDraft,
    setAddFriendGreetingDraft: s.setAddFriendGreetingDraft,
    defaultAddFriendGreeting: DEFAULT_ADD_FRIEND_GREETING,
    goBackSubView: s.goBackSubView,
    aiSettings: s.aiSettings,
    runtimeUserPromptBase,
    getChatReply: getGeminiChatReply,
    setContactCardPreview: s.setContactCardPreview,
    setContactCardImage: s.setContactCardImage,
    friendRequests: s.friendRequests
  });

  const {
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
    handleMomentsAvatarClick
  } = buildProfileSceneActionHandlers({
    selectedContactId: s.selectedContactId,
    setContacts: s.setContacts,
    setSettings: s.setSettings,
    setEditingWorldBook: s.setEditingWorldBook,
    pushSubView: s.pushSubView,
    setWorldBooks: s.setWorldBooks,
    goBackSubView: s.goBackSubView,
    setEditingMaskId: s.setEditingMaskId,
    setMasks: s.setMasks,
    setSelectedContactId: s.setSelectedContactId,
    setProfileId: s.setProfileId,
    setMessages: s.setMessages,
    setContactMemories: s.setContactMemories,
    setEditingProfileField: s.setEditingProfileField,
    setAnonymousViewingHistoryId: s.setAnonymousViewingHistoryId,
    setAnonymousPartner: s.setAnonymousPartner,
    setAnonymousSessionStartedAt: s.setAnonymousSessionStartedAt,
    setAnonymousSessionActive: s.setAnonymousSessionActive,
    setAnonymousPeerLeft: s.setAnonymousPeerLeft,
    setAnonymousInputValue: s.setAnonymousInputValue,
    anonymousChatId: ANONYMOUS_CHAT_ID
  });

  const {
    handleManualGenerateMoment,
    handleMomentCommentCreate,
    handlePublishMoment,
    handleRemindWhoPost
  } = buildMomentsActionHandlers({
    contacts: s.contacts,
    aiSettings: s.aiSettings,
    setMoments: s.setMoments,
    getChatReply: getGeminiChatReply,
    buildRuntimePromptWithMemory,
    moments: s.moments,
    user: s.user,
    goBackSubView: s.goBackSubView
  });

  return {
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
  };
};
