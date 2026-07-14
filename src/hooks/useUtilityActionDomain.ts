import { buildMailboxActionHandlers } from '../app/mailboxActionHandlers';
import { buildWalletActionHandlers } from '../app/walletActionHandlers';
import { buildDataMaintenanceActionHandlers } from '../app/dataMaintenanceActionHandlers';
import { forceReloadApp } from '../appBootstrapUtils';
import { ANONYMOUS_CHAT_ID } from '../app/anonymousChatUtils';
import { useDivinationFlow } from './useDivinationFlow';
import { getGeminiChatReply } from '../services/geminiServiceLoader';
import type { UseAppActionHandlersParams } from './appActionHandlersTypes';

export const useUtilityActionDomain = (params: UseAppActionHandlersParams) => {
  const { state: s } = params;

  const {
    buildSnapshot,
    estimateTokens,
    handleBackup,
    handleRestore,
    handleClearMailboxData,
    handleClearForumData,
    handleClearMusicData,
    handleClearAnonymousData,
    handleClearStorage
  } = buildDataMaintenanceActionHandlers({
    backupAbortControllerRef: s.backupAbortControllerRef,
    setProgressDialog: s.setProgressDialog,
    showToast: s.showToast,
    contacts: s.contacts,
    user: s.user,
    walletBalance: s.walletBalance,
    messages: s.messages,
    favorites: s.favorites,
    moments: s.moments,
    settings: s.settings,
    aiSettings: s.aiSettings,
    worldBooks: s.worldBooks,
    officialArticles: s.officialArticles,
    contactMemories: s.contactMemories,
    friendRequests: s.friendRequests,
    discoverUnreadCount: s.discoverUnreadCount,
    inboxLetters: s.inboxLetters,
    sentLetters: s.sentLetters,
    soundVibrationSettings: s.soundVibrationSettings,
    hasAgreedTerms: s.hasAgreedTerms,
    walletBank: s.walletBank,
    musicState: s.musicState,
    masks: s.masks,
    htmlTemplates: s.htmlTemplates,
    bubbleTemplates: s.bubbleTemplates,
    forums: s.forums,
    mailboxTheme: s.mailboxTheme,
    anonymousChatSettings: s.anonymousChatSettings,
    anonymousHistory: s.anonymousHistory,
    anonymousHasUnfinishedSession: s.anonymousHasUnfinishedSession,
    anonymousUnfinishedSession: s.anonymousUnfinishedSession,
    divinationHistory: s.divinationHistory,
    setContacts: s.setContacts,
    setUser: s.setUser,
    setWalletBalance: s.setWalletBalance,
    setMessages: s.setMessages,
    setFavorites: s.setFavorites,
    setMoments: s.setMoments,
    setSettings: s.setSettings,
    setAiSettings: s.setAiSettings,
    setWorldBooks: s.setWorldBooks,
    setMasks: s.setMasks,
    setHtmlTemplates: s.setHtmlTemplates,
    setBubbleTemplates: s.setBubbleTemplates,
    setForums: s.setForums,
    setSoundVibrationSettings: s.setSoundVibrationSettings,
    setContactMemories: s.setContactMemories,
    setOfficialArticles: s.setOfficialArticles,
    setFriendRequests: s.setFriendRequests,
    setDiscoverUnreadCount: s.setDiscoverUnreadCount,
    setInboxLetters: s.setInboxLetters,
    setSentLetters: s.setSentLetters,
    setMailboxTheme: s.setMailboxTheme,
    setAnonymousChatSettings: s.setAnonymousChatSettings,
    setAnonymousHistory: s.setAnonymousHistory,
    setAnonymousHasUnfinishedSession: s.setAnonymousHasUnfinishedSession,
    setAnonymousUnfinishedSession: s.setAnonymousUnfinishedSession,
    setDivinationHistory: s.setDivinationHistory,
    setHasAgreedTerms: s.setHasAgreedTerms,
    setWalletBank: s.setWalletBank,
    setMusicState: s.setMusicState,
    setIsStateLoaded: s.setIsStateLoaded,
    openConfirm: s.openConfirm,
    setSelectedMailboxLetter: s.setSelectedMailboxLetter,
    setAnonymousSessionActive: s.setAnonymousSessionActive,
    setAnonymousPartner: s.setAnonymousPartner,
    setAnonymousSessionStartedAt: s.setAnonymousSessionStartedAt,
    setAnonymousPeerLeft: s.setAnonymousPeerLeft,
    setAnonymousInputValue: s.setAnonymousInputValue,
    setAnonymousViewingHistoryId: s.setAnonymousViewingHistoryId,
    setAnonymousIsMatching: s.setAnonymousIsMatching,
    setDivinationDraft: s.setDivinationDraft,
    anonymousChatId: ANONYMOUS_CHAT_ID,
    openAlert: s.openAlert,
    forceReloadApp,
    setSelectedContactId: s.setSelectedContactId,
    setActiveSubView: s.setActiveSubView,
    setSubViewStack: s.setSubViewStack,
    setCurrentDivinationRecord: s.setCurrentDivinationRecord,
    setDivinationSubmitting: s.setDivinationSubmitting
  });

  const {
    handleEditWalletBank,
    handleWalletTopUpConfirm,
    handleWalletWithdrawConfirm,
    handleSendRedPacket,
    handleSendTransfer,
    handleSendLocation
  } = buildWalletActionHandlers({
    walletBank: s.walletBank,
    openPrompt: s.openPrompt,
    setWalletBank: s.setWalletBank,
    walletBalance: s.walletBalance,
    setWalletBalance: s.setWalletBalance,
    setUser: s.setUser,
    selectedContactId: s.selectedContactId,
    setMessages: s.setMessages,
    setContacts: s.setContacts,
    applyContactBalanceDelta: s.applyContactBalanceDelta,
    goBackSubView: s.goBackSubView
  });

  const {
    handleSelectMailboxLetter,
    handleSendMailboxLetter
  } = buildMailboxActionHandlers({
    contacts: s.contacts,
    user: s.user,
    mailboxTheme: s.mailboxTheme,
    aiSettings: s.aiSettings,
    buildRuntimePromptWithMemory: params.buildRuntimePromptWithMemory,
    setSelectedMailboxType: s.setSelectedMailboxType,
    setSelectedMailboxLetter: s.setSelectedMailboxLetter,
    pushSubView: s.pushSubView,
    setSentLetters: s.setSentLetters,
    setInboxLetters: s.setInboxLetters,
    showToast: s.showToast,
    getChatReply: getGeminiChatReply
  });

  const {
    handleSubmitDivination,
    handleOpenDivinationHistory,
    handleSelectDivinationHistory
  } = useDivinationFlow({
    divinationSubmitting: s.divinationSubmitting,
    setDivinationDraft: s.setDivinationDraft,
    setDivinationSubmitting: s.setDivinationSubmitting,
    setCurrentDivinationRecord: s.setCurrentDivinationRecord,
    setDivinationHistory: s.setDivinationHistory,
    pushSubView: s.pushSubView,
    showToast: s.showToast
  });

  return {
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
  };
};
