import React, { useCallback } from 'react';
import type { AppState } from './hooks/useAppState';
import { AppTab } from './types';
import AppShell from './AppShell';
import { TermsNoticeView } from './app/AppLazyOverlays';
import { AppOverlayLayers } from './app/AppOverlayLayers';
import { playReceiveSignal as playReceiveSignalUtil, playSendSignal as playSendSignalUtil } from './utils/audioUtils';
import { useNavigationStack } from './hooks/useNavigationStack';
import { useAnonymousChatFlow } from './hooks/useAnonymousChat';
import { useProactiveChat } from './hooks/useProactiveChat';
import { useAppActionHandlers } from './hooks/useAppActionHandlers';
import { useIdleChat } from './hooks/useIdleChat';
import {
  useAnonymousSubViewSnapshot,
  useGlobalAudioStateSync,
  useMobileResizeSync,
  useReplyTaskDebugBridge,
  useWechatDialogBridge
} from './hooks/useAppCoreEffects';
import { useAiContextRiskWarning } from './hooks/useAiContextRiskWarning';
import { useAppViewStateSync } from './hooks/useAppViewStateSync';
import { useApkUpdateDismiss } from './hooks/useApkUpdateDismiss';
import { useAppRenderBridge } from './hooks/useAppRenderBridge';
import { useChatRuntimeContext } from './hooks/useChatRuntimeContext';
import { useChatContactList } from './hooks/useChatContactList';
import { useTermsNoticeGate } from './hooks/useTermsNoticeGate';

const AppCore: React.FC<{ state: AppState; reserveBottomInset?: string }> = ({ state, reserveBottomInset = '0px' }) => {
  const s = state;

  // ==================== Idle Chat Focus State ====================
  const [isChatInputFocused, setIsChatInputFocused] = React.useState(false);

  // ==================== Audio Callbacks ====================
  const playSendSignal = useCallback(() => {
    playSendSignalUtil(s.soundVibrationSettings);
  }, [s.soundVibrationSettings]);

  const playReceiveSignal = useCallback(() => {
    playReceiveSignalUtil(s.soundVibrationSettings);
  }, [s.soundVibrationSettings]);

  useMobileResizeSync(s.setIsMobile);
  useGlobalAudioStateSync(s.setMusicState);
  useReplyTaskDebugBridge();

  // ==================== Navigation Stack Hook ====================
  useNavigationStack({
    isMobile: s.isMobile,
    activeSubView: s.activeSubView,
    activeSubViewRef: s.activeSubViewRef,
    historyBackSyncRef: s.historyBackSyncRef,
    subViewStack: s.subViewStack,
    goBackSubView: s.goBackSubView,
    uiDialog: s.uiDialog,
    setUiDialog: s.setUiDialog,
    showToast: s.showToast,
  });

  useAnonymousSubViewSnapshot(s);
  useWechatDialogBridge(s.openAlert, s.openConfirm, s.openPrompt);

  const {
    currentChat,
    currentProfile,
    runtimeUserPromptBase,
    buildRuntimePromptWithMemory,
    resolveContextLimit,
    resolveMemorySummaryThreshold,
    updateMemoryWithAutoSummary,
    getProfilePlaceholder
  } = useChatRuntimeContext(s);

  const { warnAiContextRiskIfNeeded, handleHighContextLimitWarning } = useAiContextRiskWarning(s.aiSettings.provider, s.openConfirm);
  const { dismissApkUpdate } = useApkUpdateDismiss();
  const { shouldShowTermsNotice, handleAgreeTermsNotice } = useTermsNoticeGate(s.hasAgreedTerms, s.setHasAgreedTerms);
  const {
    isInChatView,
    chatUnreadCount,
    ifLineUnreadCount,
    contactUnreadCount
  } = useAppViewStateSync({
    activeSubView: s.activeSubView,
    selectedContactId: s.selectedContactId,
    contacts: s.contacts,
    setContacts: s.setContacts,
    setIsChatInputFocused,
    profileId: s.profileId,
    user: s.user,
    setProfileSnapshot: s.setProfileSnapshot,
    friendRequests: s.friendRequests,
    momentsLength: s.moments.length,
    activeTab: s.activeTab,
    isStateLoaded: s.isStateLoaded,
    setDiscoverUnreadCount: s.setDiscoverUnreadCount,
    isTelegramLayout: s.isTelegramLayout,
    setActiveTab: s.setActiveTab,
    setProfileId: s.setProfileId
  });
  const {
    handleDeleteContact,
    handleConfirmDeleteCurrentContact,
    handleConfirmExitCurrentGroup,
    handleChatAction,
    handleIfLineSelect,
    handleIfLineAction,
    chatContacts,
    ifLineContacts
  } = useChatContactList({
    contacts: s.contacts,
    messages: s.messages,
    officialArticles: s.officialArticles,
    selectedContactId: s.selectedContactId,
    profileId: s.profileId,
    currentChat,
    setContacts: s.setContacts,
    setMessages: s.setMessages,
    setContactMemories: s.setContactMemories,
    setSelectedContactId: s.setSelectedContactId,
    setProfileId: s.setProfileId,
    pushSubView: s.pushSubView,
    resetNavigation: s.resetNavigation,
    openConfirm: s.openConfirm,
    showToast: s.showToast
  });

  // ==================== Proactive Chat Hook ====================
  const { triggerProactiveChat } = useProactiveChat({
    isStateLoaded: s.isStateLoaded, contacts: s.contacts, messages: s.messages,
    worldBooks: s.worldBooks, masks: s.masks, user: s.user, aiSettings: s.aiSettings,
    extraSystemPrompt: '', contactMemories: s.contactMemories,
    resolveContextLimit, resolveMemorySummaryThreshold, updateMemoryWithAutoSummary,
    setContacts: s.setContacts, setMessages: s.setMessages,
    setTypingContactIds: s.setTypingContactIds, showToast: s.showToast,
    activeSubView: s.activeSubView, selectedContactId: s.selectedContactId,
    playReceiveSignal,
  });

  // ==================== Idle Chat Hook ====================
  useIdleChat({
    isInChatView,
    isInputFocused: isChatInputFocused,
    currentContact: currentChat,
    triggerProactiveChat,
    setContacts: s.setContacts,
  });

  // ==================== Anonymous Chat Hook ====================
  const {
    handleStartAnonymousMatch, handleAnonymousLeave, handleResumeAnonymousSession,
    handleAnonymousSend,
  } = useAnonymousChatFlow({
    anonymousChatSettings: s.anonymousChatSettings, anonymousPartner: s.anonymousPartner,
    anonymousSessionStartedAt: s.anonymousSessionStartedAt,
    anonymousSessionActive: s.anonymousSessionActive, anonymousPeerLeft: s.anonymousPeerLeft,
    anonymousInputValue: s.anonymousInputValue, anonymousIsMatching: s.anonymousIsMatching,
    anonymousUnfinishedSession: s.anonymousUnfinishedSession,
    messages: s.messages, activeSubView: s.activeSubView,
    previousSubViewRef: s.previousSubViewRef,
    user: s.user, aiSettings: s.aiSettings, worldBooks: s.worldBooks, masks: s.masks,
    extraSystemPrompt: '', runtimeUserPromptBase,
    setAnonymousPartner: s.setAnonymousPartner,
    setAnonymousHistory: s.setAnonymousHistory, setAnonymousSessionStartedAt: s.setAnonymousSessionStartedAt,
    setAnonymousSessionActive: s.setAnonymousSessionActive, setAnonymousPeerLeft: s.setAnonymousPeerLeft,
    setAnonymousInputValue: s.setAnonymousInputValue, setAnonymousSettingsVisible: s.setAnonymousSettingsVisible,
    setAnonymousIsMatching: s.setAnonymousIsMatching, setAnonymousViewingHistoryId: s.setAnonymousViewingHistoryId,
    setAnonymousHasUnfinishedSession: s.setAnonymousHasUnfinishedSession,
    setAnonymousUnfinishedSession: s.setAnonymousUnfinishedSession,
    setMessages: s.setMessages, setShowPanel: s.setShowPanel,
    setTypingContactIds: s.setTypingContactIds,
    playSendSignal, playReceiveSignal, showToast: s.showToast, warnAiContextRiskIfNeeded,
  });

  const appActionHandlers = useAppActionHandlers({
    state: s,
    currentChat,
    runtimeUserPromptBase,
    buildRuntimePromptWithMemory,
    resolveContextLimit,
    resolveMemorySummaryThreshold,
    updateMemoryWithAutoSummary,
    playSendSignal,
    playReceiveSignal,
    warnAiContextRiskIfNeeded
  });
  const { renderActiveTab, renderSubView, tabBadges } = useAppRenderBridge({
    state: s,
    currentChat,
    currentProfile,
    chatContacts,
    ifLineContacts,
    chatUnreadCount,
    ifLineUnreadCount,
    contactUnreadCount,
    getProfilePlaceholder,
    handleHighContextLimitWarning,
    triggerProactiveChat,
    runtimeUserPromptBase,
    buildRuntimePromptWithMemory,
    setIsChatInputFocused,
    contactHandlers: {
      handleDeleteContact,
      handleConfirmDeleteCurrentContact,
      handleConfirmExitCurrentGroup,
      handleChatAction,
      handleIfLineSelect,
      handleIfLineAction
    },
    actionHandlers: {
      ...appActionHandlers,
      handleStartAnonymousMatch,
      handleResumeAnonymousSession,
      handleAnonymousSend,
      handleAnonymousLeave
    }
  });

  // ==================== Main Render ====================
  return (
    <>
      {shouldShowTermsNotice ? (
        <React.Suspense fallback={<div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm" />}>
          <TermsNoticeView onAgree={handleAgreeTermsNotice} />
        </React.Suspense>
      ) : null}
      <React.Suspense fallback={<div className="h-full w-full render-bg-primary" />}>
        <AppShell
          isMobile={s.isMobile} activeTab={s.activeTab} setActiveTab={s.setActiveTab}
          activeSubView={s.activeSubView} setActiveSubView={s.pushSubView}
          renderActiveTab={renderActiveTab} renderSubView={renderSubView}
          showPlusMenu={s.showPlusMenu} setShowPlusMenu={s.setShowPlusMenu}
          userAvatar={s.user.avatar} userName={s.user.name} userSignature={s.user.signature}
          toast={s.toast} uiDialog={s.uiDialog} setUiDialog={s.setUiDialog}
          uiDialogInput={s.uiDialogInput} setUiDialogInput={s.setUiDialogInput}
          progressDialog={s.progressDialog}
          globalBg={s.settings.globalBg} headerImage={s.settings.headerImage}
          footerImage={s.settings.footerImage} isTelegramLayout={s.isTelegramLayout}
          tabsPosition={s.resolvedRenderConfig.tabs.position}
          tabBadges={{
            [AppTab.CHATS]: tabBadges.chats,
            [AppTab.CONTACTS]: tabBadges.contacts,
            [AppTab.DISCOVER]: tabBadges.discover
          }}
          onEdgeBack={() => {
            if (!s.isMobile || s.activeSubView === 'none') return;
            s.goBackSubView();
          }}
          onResetNavigation={s.resetNavigation}
          showStatusBar={s.settings.enableDesktopMode && s.settings.desktopShowStatusBar !== false}
          showBatteryPercent={s.settings.desktopBatteryPercent !== false}
          showStatusBarDate={s.settings.statusBarShowDate === true}
          onReturnToDesktop={() => s.setIsInDesktopApp(false)}
          reserveBottomInset={reserveBottomInset}
        />
        <AppOverlayLayers
          settings={s.settings} rainDrops={s.rainDrops} snowFlakes={s.snowFlakes}
          thunderFlashes={s.thunderFlashes} activeSubView={s.activeSubView}
          musicState={s.musicState} onOpenMusic={() => s.pushSubView('listenMusic')}
          showApkUpdateDialog={s.showApkUpdateDialog} apkUpdateInfo={s.apkUpdateInfo}
          isDownloading={s.isDownloading} apkDownloadProgress={s.apkDownloadProgress}
          dismissApkUpdate={dismissApkUpdate}
          setApkUpdateInfo={s.setApkUpdateInfo}
          setShowApkUpdateDialog={s.setShowApkUpdateDialog}
          setIsDownloading={s.setIsDownloading}
          setApkDownloadProgress={s.setApkDownloadProgress}
          showPwaUpdateDialog={s.showPwaUpdateDialog}
          setShowPwaUpdateDialog={s.setShowPwaUpdateDialog}
        />
      </React.Suspense>
    </>
  );
};

export default AppCore;
