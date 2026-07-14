import type { RestoreMode } from './restoreFlow';
import { loadDataMaintenanceActionRuntime, loadDataMaintenanceStatsRuntime } from './dataMaintenanceRuntimeLoader';
import type { BuildDataMaintenanceActionHandlersOptions } from './dataMaintenanceActionHandlers';

export const buildSnapshotRuntime = async (
  options: BuildDataMaintenanceActionHandlersOptions
) => {
  const { buildSnapshotPayload } = await loadDataMaintenanceStatsRuntime();
  return buildSnapshotPayload({
    contacts: options.contacts,
    user: options.user,
    walletBalance: options.walletBalance,
    messages: options.messages,
    favorites: options.favorites,
    moments: options.moments,
    settings: options.settings,
    aiSettings: options.aiSettings,
    worldBooks: options.worldBooks,
    officialArticles: options.officialArticles,
    contactMemories: options.contactMemories,
    friendRequests: options.friendRequests,
    discoverUnreadCount: options.discoverUnreadCount,
    inboxLetters: options.inboxLetters,
    sentLetters: options.sentLetters,
    soundVibrationSettings: options.soundVibrationSettings,
    hasAgreedTerms: options.hasAgreedTerms,
    walletBank: options.walletBank,
    musicState: options.musicState,
    masks: options.masks,
    htmlTemplates: options.htmlTemplates || [],
    bubbleTemplates: options.bubbleTemplates || [],
    forums: options.forums,
    mailboxTheme: options.mailboxTheme,
    anonymousChatSettings: options.anonymousChatSettings,
    anonymousChatHistory: options.anonymousHistory,
    anonymousHasUnfinishedSession: options.anonymousHasUnfinishedSession,
    anonymousUnfinishedSession: options.anonymousUnfinishedSession,
    divinationHistory: options.divinationHistory
  });
};

export const estimateTokensRuntime = async (
  options: BuildDataMaintenanceActionHandlersOptions
) => {
  const { estimateTokenUsage } = await loadDataMaintenanceStatsRuntime();
  return estimateTokenUsage(options.messages, {
    inboxLetters: options.inboxLetters,
    sentLetters: options.sentLetters,
    forums: options.forums
  });
};

export const handleBackupRuntime = async (
  options: BuildDataMaintenanceActionHandlersOptions
) => {
  const { runBackupFlow, triggerBackupDownload } = await loadDataMaintenanceActionRuntime();
  await runBackupFlow({
    backupAbortControllerRef: options.backupAbortControllerRef,
    buildSnapshot: () => buildSnapshotRuntime(options),
    setProgressDialog: options.setProgressDialog,
    showToast: options.showToast,
    triggerBackupDownload
  });
};

export const handleRestoreRuntime = async (
  options: BuildDataMaintenanceActionHandlersOptions,
  file: File,
  mode: RestoreMode = 'overwrite'
) => {
  const runtime = await loadDataMaintenanceActionRuntime();
  await runtime.runRestoreFlow({
    showToast: options.showToast,
    setProgressDialog: options.setProgressDialog,
    importBackupFile: runtime.importBackupFile,
    adaptLegacyBackupData: runtime.adaptLegacyBackupData,
    unwrapImportedBackupData: runtime.unwrapImportedBackupData,
    scoreSnapshotShape: runtime.scoreSnapshotShape,
    normalizeLegacyContacts: runtime.normalizeLegacyContacts,
    shouldSkipImportedContact: runtime.shouldSkipImportedContact,
    mergeBuiltInContacts: runtime.mergeBuiltInContacts,
    setContacts: options.setContacts,
    setUser: options.setUser,
    setWalletBalance: options.setWalletBalance,
    normalizeLegacyMessages: runtime.normalizeLegacyMessages,
    setMessages: options.setMessages,
    setFavorites: options.setFavorites,
    setMoments: options.setMoments,
    normalizeAppearanceSettings: runtime.normalizeAppearanceSettings,
    setSettings: options.setSettings,
    normalizeAiSettings: runtime.normalizeAiSettings,
    setAiSettings: options.setAiSettings,
    setWorldBooks: options.setWorldBooks,
    setMasks: options.setMasks,
    setHtmlTemplates: options.setHtmlTemplates,
    setBubbleTemplates: options.setBubbleTemplates,
    setForums: options.setForums,
    normalizeSoundVibrationSettings: runtime.normalizeSoundVibrationSettings,
    setSoundVibrationSettings: options.setSoundVibrationSettings,
    setContactMemories: options.setContactMemories,
    setOfficialArticles: options.setOfficialArticles,
    setFriendRequests: options.setFriendRequests,
    setDiscoverUnreadCount: options.setDiscoverUnreadCount,
    setInboxLetters: options.setInboxLetters,
    setSentLetters: options.setSentLetters,
    setMailboxTheme: options.setMailboxTheme,
    setAnonymousChatSettings: options.setAnonymousChatSettings,
    setAnonymousHistory: options.setAnonymousHistory,
    setAnonymousHasUnfinishedSession: options.setAnonymousHasUnfinishedSession,
    setAnonymousUnfinishedSession: options.setAnonymousUnfinishedSession,
    setDivinationHistory: options.setDivinationHistory,
    setHasAgreedTerms: options.setHasAgreedTerms,
    setWalletBank: options.setWalletBank,
    setMusicState: options.setMusicState
  }, file, mode);
};

export const handleClearMailboxDataRuntime = async (
  options: BuildDataMaintenanceActionHandlersOptions
) => {
  const { runClearMailboxFlow } = await loadDataMaintenanceActionRuntime();
  runClearMailboxFlow({
    openConfirm: options.openConfirm,
    setInboxLetters: options.setInboxLetters,
    setSentLetters: options.setSentLetters,
    setSelectedMailboxLetter: options.setSelectedMailboxLetter,
    setMailboxTheme: options.setMailboxTheme,
    showToast: options.showToast
  });
};

export const handleClearForumDataRuntime = async (
  options: BuildDataMaintenanceActionHandlersOptions
) => {
  const { runClearForumFlow } = await loadDataMaintenanceActionRuntime();
  runClearForumFlow({
    openConfirm: options.openConfirm,
    setForums: options.setForums,
    showToast: options.showToast
  });
};

export const handleClearMusicDataRuntime = async (
  options: BuildDataMaintenanceActionHandlersOptions
) => {
  const { runClearMusicFlow } = await loadDataMaintenanceActionRuntime();
  runClearMusicFlow({
    openConfirm: options.openConfirm,
    setMusicState: options.setMusicState,
    showToast: options.showToast
  });
};

export const handleClearAnonymousDataRuntime = async (
  options: BuildDataMaintenanceActionHandlersOptions
) => {
  const { runClearAnonymousFlow } = await loadDataMaintenanceActionRuntime();
  runClearAnonymousFlow({
    openConfirm: options.openConfirm,
    setAnonymousHistory: options.setAnonymousHistory,
    setAnonymousHasUnfinishedSession: options.setAnonymousHasUnfinishedSession,
    setAnonymousUnfinishedSession: options.setAnonymousUnfinishedSession,
    setAnonymousSessionActive: options.setAnonymousSessionActive,
    setAnonymousPartner: options.setAnonymousPartner,
    setAnonymousSessionStartedAt: options.setAnonymousSessionStartedAt,
    setAnonymousPeerLeft: options.setAnonymousPeerLeft,
    setAnonymousInputValue: options.setAnonymousInputValue,
    setAnonymousViewingHistoryId: options.setAnonymousViewingHistoryId,
    setAnonymousIsMatching: options.setAnonymousIsMatching,
    setMessages: options.setMessages,
    anonymousChatId: options.anonymousChatId,
    showToast: options.showToast
  });
};

export const handleClearStorageRuntime = async (
  options: BuildDataMaintenanceActionHandlersOptions
) => {
  const { runClearStorageFlow, normalizeAiSettings, normalizeSoundVibrationSettings } = await loadDataMaintenanceActionRuntime();
  runClearStorageFlow({
    openConfirm: options.openConfirm,
    openAlert: options.openAlert,
    forceReloadApp: options.forceReloadApp,
    setContacts: options.setContacts,
    setUser: options.setUser,
    setWalletBalance: options.setWalletBalance,
    setMessages: options.setMessages,
    setMoments: options.setMoments,
    setFavorites: options.setFavorites,
    setSettings: options.setSettings,
    setAiSettings: options.setAiSettings,
    normalizeAiSettings,
    normalizeSoundVibrationSettings,
    setWorldBooks: options.setWorldBooks,
    setMasks: options.setMasks,
    setHtmlTemplates: options.setHtmlTemplates,
    setBubbleTemplates: options.setBubbleTemplates,
    setForums: options.setForums,
    setSoundVibrationSettings: options.setSoundVibrationSettings,
    setContactMemories: options.setContactMemories,
    setOfficialArticles: options.setOfficialArticles,
    setFriendRequests: options.setFriendRequests,
    setDiscoverUnreadCount: options.setDiscoverUnreadCount,
    setInboxLetters: options.setInboxLetters,
    setSentLetters: options.setSentLetters,
    setSelectedMailboxLetter: options.setSelectedMailboxLetter,
    setMailboxTheme: options.setMailboxTheme,
    setAnonymousChatSettings: options.setAnonymousChatSettings,
    setAnonymousHistory: options.setAnonymousHistory,
    setAnonymousHasUnfinishedSession: options.setAnonymousHasUnfinishedSession,
    setAnonymousUnfinishedSession: options.setAnonymousUnfinishedSession,
    setAnonymousSessionActive: options.setAnonymousSessionActive,
    setAnonymousPartner: options.setAnonymousPartner,
    setAnonymousSessionStartedAt: options.setAnonymousSessionStartedAt,
    setAnonymousPeerLeft: options.setAnonymousPeerLeft,
    setAnonymousInputValue: options.setAnonymousInputValue,
    setAnonymousViewingHistoryId: options.setAnonymousViewingHistoryId,
    setAnonymousIsMatching: options.setAnonymousIsMatching,
    setDivinationDraft: options.setDivinationDraft,
    setDivinationHistory: options.setDivinationHistory,
    setCurrentDivinationRecord: options.setCurrentDivinationRecord,
    setDivinationSubmitting: options.setDivinationSubmitting,
    setHasAgreedTerms: options.setHasAgreedTerms,
    setWalletBank: options.setWalletBank,
    setMusicState: options.setMusicState,
    setSelectedContactId: options.setSelectedContactId,
    setActiveSubView: options.setActiveSubView,
    setSubViewStack: options.setSubViewStack,
    setIsStateLoaded: options.setIsStateLoaded,
    showToast: options.showToast
  });
};
