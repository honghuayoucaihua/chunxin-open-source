import { useEffect, useCallback, useRef } from 'react';
import type { Contact } from '../types';
import { onAppStateChange } from '../services/nativeService';
import { loadProactiveChatRuntime } from './proactiveChatRuntimeLoader';
import type { ProactiveChatRuntimeArgs, UseProactiveChatParams } from './proactiveChatTypes';

/**
 * Handles AI proactive chat initiation
 */
export function useProactiveChat(params: UseProactiveChatParams) {
  const { isStateLoaded } = params;

  const proactiveRunningRef = useRef<Set<string>>(new Set());
  const draftRunningRef = useRef<Set<string>>(new Set());
  const draftWarmupAtRef = useRef<Record<string, number>>({});
  const runtimeArgsRef = useRef<ProactiveChatRuntimeArgs | null>(null);
  runtimeArgsRef.current = {
    ...params,
    proactiveRunningRef,
    draftRunningRef,
    draftWarmupAtRef
  };

  const getRuntimeArgs = useCallback((): ProactiveChatRuntimeArgs => {
    if (!runtimeArgsRef.current) {
      throw new Error('主动消息运行时参数尚未准备好');
    }
    return runtimeArgsRef.current;
  }, []);

  const triggerProactiveChat = useCallback(async (contact: Contact) => {
    const { triggerProactiveChatRuntime } = await loadProactiveChatRuntime();
    await triggerProactiveChatRuntime(getRuntimeArgs(), contact);
  }, [getRuntimeArgs]);

  const runProactiveCheck = useCallback(async () => {
    const { runProactiveCheckRuntime } = await loadProactiveChatRuntime();
    await runProactiveCheckRuntime(getRuntimeArgs());
  }, [getRuntimeArgs]);

  const warmupDraftsOnPause = useCallback(async () => {
    const { pauseProactiveWarmupRuntime } = await loadProactiveChatRuntime();
    await pauseProactiveWarmupRuntime(getRuntimeArgs());
  }, [getRuntimeArgs]);

  useEffect(() => {
    if (!isStateLoaded) return;
    void runProactiveCheck();
    const handler = window.setInterval(() => {
      void runProactiveCheck();
    }, 30 * 1000);
    return () => window.clearInterval(handler);
  }, [isStateLoaded, runProactiveCheck]);

  useEffect(() => {
    if (!isStateLoaded) return;
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        void warmupDraftsOnPause();
        return;
      }
      void runProactiveCheck();
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    const unsubscribeAppState = onAppStateChange(
      () => {
        void runProactiveCheck();
      },
      () => {
        void warmupDraftsOnPause();
      }
    );

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
      unsubscribeAppState();
    };
  }, [isStateLoaded, runProactiveCheck, warmupDraftsOnPause]);

  return { triggerProactiveChat };
}
