import { useEffect, useCallback, useRef } from 'react';
import type { Message, SubView } from '../types';
import { ANONYMOUS_CHAT_ID } from '../app/anonymousChatUtils';
import type { AnonymousChatPartner, AnonymousChatSettings } from '../app/anonymousChatUtils';
import {
  runAnonymousLeave,
  runAnonymousSend,
  runPushAnonymousHistory,
  runResumeAnonymousSession,
  runStartAnonymousMatch
} from './anonymousSessionFlowLoader';
import type { AnonymousChatHistoryItem } from '../app/anonymousChatUtils';
import type { AISettings, UserProfile, Mask, WorldBook } from '../types';

interface UseAnonymousChatParams {
  anonymousChatSettings: AnonymousChatSettings;
  anonymousPartner: AnonymousChatPartner | null;
  anonymousSessionStartedAt: number | null;
  anonymousSessionActive: boolean;
  anonymousPeerLeft: boolean;
  anonymousInputValue: string;
  anonymousIsMatching: boolean;
  anonymousUnfinishedSession: { partner: AnonymousChatPartner; messages: Message[]; startedAt: number } | null;
  messages: Record<string, Message[]>;
  activeSubView: SubView;
  previousSubViewRef: React.MutableRefObject<SubView>;
  user: UserProfile;
  aiSettings: AISettings;
  worldBooks: WorldBook[];
  masks: Mask[];
  extraSystemPrompt: string;
  runtimeUserPromptBase: string;
  setAnonymousPartner: React.Dispatch<React.SetStateAction<AnonymousChatPartner | null>>;
  setAnonymousHistory: React.Dispatch<React.SetStateAction<AnonymousChatHistoryItem[]>>;
  setAnonymousSessionStartedAt: React.Dispatch<React.SetStateAction<number | null>>;
  setAnonymousSessionActive: React.Dispatch<React.SetStateAction<boolean>>;
  setAnonymousPeerLeft: React.Dispatch<React.SetStateAction<boolean>>;
  setAnonymousInputValue: React.Dispatch<React.SetStateAction<string>>;
  setAnonymousSettingsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setAnonymousIsMatching: React.Dispatch<React.SetStateAction<boolean>>;
  setAnonymousViewingHistoryId: React.Dispatch<React.SetStateAction<string | null>>;
  setAnonymousHasUnfinishedSession: React.Dispatch<React.SetStateAction<boolean>>;
  setAnonymousUnfinishedSession: React.Dispatch<React.SetStateAction<{ partner: AnonymousChatPartner; messages: Message[]; startedAt: number } | null>>;
  setMessages: React.Dispatch<React.SetStateAction<Record<string, Message[]>>>;
  setShowPanel: React.Dispatch<React.SetStateAction<'emoji' | 'more' | 'none'>>;
  setTypingContactIds: React.Dispatch<React.SetStateAction<string[]>>;
  playSendSignal: () => void;
  playReceiveSignal: () => void;
  showToast: (message: string) => void;
  warnAiContextRiskIfNeeded: (input: {
    personality: string;
    runtimeUserPrompt?: string;
    history: Array<{ role: 'user' | 'model'; text: string; imageUrl?: string }>;
  }) => Promise<void>;
}

export function useAnonymousChatFlow(params: UseAnonymousChatParams) {
  const {
    anonymousChatSettings, anonymousPartner,
    anonymousSessionStartedAt, anonymousSessionActive, anonymousPeerLeft,
    anonymousInputValue, anonymousIsMatching,
    anonymousUnfinishedSession,
    messages, activeSubView, previousSubViewRef, user, aiSettings, worldBooks, masks,
    extraSystemPrompt, runtimeUserPromptBase,
    setAnonymousPartner, setAnonymousHistory,
    setAnonymousSessionStartedAt, setAnonymousSessionActive, setAnonymousPeerLeft,
    setAnonymousInputValue, setAnonymousSettingsVisible, setAnonymousIsMatching,
    setAnonymousViewingHistoryId, setAnonymousHasUnfinishedSession,
    setAnonymousUnfinishedSession, setMessages, setShowPanel, setTypingContactIds,
    playSendSignal, playReceiveSignal, showToast, warnAiContextRiskIfNeeded
  } = params;
  const anonymousSessionVersionRef = useRef(0);

  const bumpAnonymousSessionVersion = useCallback(() => {
    anonymousSessionVersionRef.current += 1;
    return anonymousSessionVersionRef.current;
  }, []);

  const handleStartAnonymousMatch = useCallback(async () => {
    const anonymousSessionVersion = bumpAnonymousSessionVersion();
    await runStartAnonymousMatch({
      anonymousIsMatching,
      anonymousChatSettings,
      user,
      aiSettings,
      runtimeUserPromptBase,
      anonymousSessionVersion,
      getAnonymousSessionVersion: () => anonymousSessionVersionRef.current,
      anonymousChatId: ANONYMOUS_CHAT_ID,
      setAnonymousIsMatching,
      setAnonymousViewingHistoryId,
      setAnonymousPartner,
      setAnonymousSessionStartedAt,
      setAnonymousSessionActive,
      setAnonymousPeerLeft,
      setAnonymousHasUnfinishedSession,
      setAnonymousUnfinishedSession,
      setAnonymousInputValue,
      setMessages,
      showToast
    });
  }, [anonymousIsMatching, anonymousChatSettings, user, aiSettings, runtimeUserPromptBase, showToast, bumpAnonymousSessionVersion]);

  const pushAnonymousHistory = useCallback((reason: 'leftByMe' | 'leftByPeer', sessionMessages: Message[]) => {
    void runPushAnonymousHistory({
      anonymousPartner,
      anonymousSessionStartedAt,
      setAnonymousHistory
    }, reason, sessionMessages);
  }, [anonymousPartner, anonymousSessionStartedAt]);

  const handleAnonymousLeave = useCallback((reason: 'leftByMe' | 'leftByPeer') => {
    bumpAnonymousSessionVersion();
    void runAnonymousLeave({
      anonymousSessionActive,
      anonymousChatId: ANONYMOUS_CHAT_ID,
      messages,
      pushAnonymousHistory,
      setMessages,
      setAnonymousSessionActive,
      setAnonymousPeerLeft,
      setAnonymousHasUnfinishedSession,
      setAnonymousUnfinishedSession,
      setShowPanel
    }, reason);
  }, [anonymousSessionActive, messages, pushAnonymousHistory, bumpAnonymousSessionVersion]);

  const handleResumeAnonymousSession = useCallback(() => {
    const anonymousSessionVersion = bumpAnonymousSessionVersion();
    void runResumeAnonymousSession({
      anonymousUnfinishedSession,
      anonymousSessionVersion,
      anonymousChatId: ANONYMOUS_CHAT_ID,
      setAnonymousViewingHistoryId,
      setAnonymousPartner,
      setAnonymousSessionStartedAt,
      setAnonymousSessionActive,
      setAnonymousPeerLeft,
      setAnonymousInputValue,
      setMessages,
      setAnonymousHasUnfinishedSession,
      setAnonymousUnfinishedSession
    });
  }, [anonymousUnfinishedSession, bumpAnonymousSessionVersion]);

  const handleAnonymousSend = useCallback(async () => {
    await runAnonymousSend({
      anonymousSessionActive,
      anonymousPartner,
      getAnonymousSessionVersion: () => anonymousSessionVersionRef.current,
      anonymousInputValue,
      anonymousChatId: ANONYMOUS_CHAT_ID,
      messages,
      worldBooks,
      masks,
      user,
      extraSystemPrompt,
      aiSettings,
      runtimeUserPromptBase,
      setMessages,
      setAnonymousInputValue,
      playSendSignal,
      playReceiveSignal,
      setTypingContactIds,
      showToast,
      warnAiContextRiskIfNeeded
    });
  }, [anonymousSessionActive, anonymousPartner, anonymousInputValue, messages, worldBooks, masks, user, extraSystemPrompt, aiSettings, runtimeUserPromptBase, playSendSignal, playReceiveSignal, showToast, warnAiContextRiskIfNeeded]);

  // Save unfinished session when leaving anonymous chat
  useEffect(() => {
    if (!anonymousSessionActive || !anonymousPartner || activeSubView !== 'anonymousChat') return;
    const currentAnonymousMessages = messages[ANONYMOUS_CHAT_ID] || [];
    if (currentAnonymousMessages.length === 0) return;
    setAnonymousHasUnfinishedSession(true);
    setAnonymousUnfinishedSession({
      partner: anonymousPartner,
      messages: currentAnonymousMessages,
      startedAt: Number(anonymousSessionStartedAt || Date.now())
    });
  }, [anonymousSessionActive, anonymousPartner, activeSubView, messages, anonymousSessionStartedAt]);

  // Reset anonymous state when entering anonymous chat
  useEffect(() => {
    if (activeSubView === 'anonymousChat') {
      setAnonymousSettingsVisible(false);
      setAnonymousViewingHistoryId(null);
      setAnonymousIsMatching(false);
      if (previousSubViewRef.current === 'anonymousHistory') return;
      const currentAnonymousMessages = messages[ANONYMOUS_CHAT_ID] || [];
      if (anonymousSessionActive && anonymousPartner && currentAnonymousMessages.length > 0) {
        setAnonymousHasUnfinishedSession(true);
        setAnonymousUnfinishedSession({
          partner: anonymousPartner,
          messages: currentAnonymousMessages,
          startedAt: Number(anonymousSessionStartedAt || Date.now())
        });
      }
      bumpAnonymousSessionVersion();
      setAnonymousSessionActive(false);
      setAnonymousPeerLeft(false);
      setAnonymousInputValue('');
      setMessages(prev => ({ ...prev, [ANONYMOUS_CHAT_ID]: [] }));
    }
  }, [activeSubView]);

  return {
    handleStartAnonymousMatch,
    handleAnonymousLeave,
    handleResumeAnonymousSession,
    handleAnonymousSend
  };
}
