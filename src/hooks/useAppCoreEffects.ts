import { useEffect } from 'react';
import type { AppState } from './useAppState';
import { ANONYMOUS_CHAT_ID } from '../app/anonymousChatUtils';
import { globalAudioManager } from '../services/globalAudio';
import {
  installReplyTaskDebugBridge,
  uninstallReplyTaskDebugBridge,
  type ReplyTaskDebugWindow
} from '../utils/chat/replyTaskDebugRuntime.ts';
import { isReplyTaskDebugToolingAvailable } from '../utils/chat/replyTaskDebugTools.ts';
import {
  installWechatDialogBridge,
  uninstallWechatDialogBridge,
  type WechatDialogWindow
} from '../utils/wechatDialog.ts';

export const useMobileResizeSync = (setIsMobile: AppState['setIsMobile']): void => {
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile]);
};

export const useGlobalAudioStateSync = (setMusicState: AppState['setMusicState']): void => {
  useEffect(() => {
    const isRecord = (value: unknown): value is Record<string, unknown> =>
      !!value && typeof value === 'object' && !Array.isArray(value);

    const readNumber = (value: unknown, fallback: number): number => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const unsubscribe = globalAudioManager.subscribe((event: string, data: unknown) => {
      setMusicState((prev) => {
        switch (event) {
          case 'timeupdate':
            return { ...prev, currentTime: readNumber(isRecord(data) ? data.currentTime : undefined, prev.currentTime) };
          case 'loadedmetadata':
            return { ...prev, duration: readNumber(isRecord(data) ? data.duration : undefined, prev.duration) };
          case 'play': return { ...prev, isPlaying: true };
          case 'pause': return { ...prev, isPlaying: false };
          default: return prev;
        }
      });
    });
    return unsubscribe;
  }, [setMusicState]);
};

export const useAnonymousSubViewSnapshot = (state: AppState): void => {
  useEffect(() => {
    const previousSubView = state.activeSubViewRef.current;
    if (previousSubView === 'anonymousChat' && state.activeSubView !== 'anonymousChat') {
      const currentAnonymousMessages = state.messages[ANONYMOUS_CHAT_ID] || [];
      if (state.anonymousSessionActive && state.anonymousPartner && currentAnonymousMessages.length > 0) {
        state.setAnonymousHasUnfinishedSession(true);
        state.setAnonymousUnfinishedSession({
          partner: state.anonymousPartner,
          messages: currentAnonymousMessages,
          startedAt: Number(state.anonymousSessionStartedAt || Date.now())
        });
      }
    }
    state.previousSubViewRef.current = previousSubView;
    state.activeSubViewRef.current = state.activeSubView;
  }, [
    state.activeSubView,
    state.messages,
    state.anonymousSessionActive,
    state.anonymousPartner,
    state.anonymousSessionStartedAt
  ]);
};

export const useWechatDialogBridge = (
  openAlert: AppState['openAlert'],
  openConfirm: AppState['openConfirm'],
  openPrompt: AppState['openPrompt']
): void => {
  useEffect(() => {
    const runtimeWindow = window as WechatDialogWindow;
    installWechatDialogBridge(runtimeWindow, {
      alert: (message: string, title?: string) => openAlert(message, title),
      confirm: (message: string, onConfirm: () => void, title?: string) => openConfirm(message, onConfirm, title),
      prompt: (message: string, defaultValue: string, onConfirm: (value?: string) => void, title?: string) => openPrompt(message, defaultValue, onConfirm, title)
    });
    return () => {
      uninstallWechatDialogBridge(runtimeWindow);
    };
  }, [openAlert, openConfirm, openPrompt]);
};

export const useReplyTaskDebugBridge = (): void => {
  const isDev = isReplyTaskDebugToolingAvailable();

  useEffect(() => {
    const runtimeWindow = window as ReplyTaskDebugWindow;
    if (!isDev) {
      uninstallReplyTaskDebugBridge(runtimeWindow);
      return;
    }
    installReplyTaskDebugBridge(runtimeWindow);
    return () => {
      uninstallReplyTaskDebugBridge(runtimeWindow);
    };
  }, [isDev]);
};
