import { useEffect, useCallback, useRef } from 'react';
import type { SubView, UiDialogState } from '../types';
import { onBackButton, exitApp } from '../services/nativeService';
import { useEdgeSwipeBack } from './useSwipeBack';

interface UseNavigationStackParams {
  isMobile: boolean;
  activeSubView: SubView;
  activeSubViewRef: React.MutableRefObject<SubView>;
  historyBackSyncRef: React.MutableRefObject<boolean>;
  subViewStack: SubView[];
  goBackSubView: (source?: 'app' | 'history') => void;
  uiDialog: UiDialogState;
  setUiDialog: React.Dispatch<React.SetStateAction<UiDialogState>>;
  showToast: (message: string) => void;
}

/**
 * Manages browser history sync, popstate events, back button, and edge swipe
 */
export function useNavigationStack({
  isMobile,
  activeSubView,
  activeSubViewRef,
  historyBackSyncRef,
  subViewStack,
  goBackSubView,
  uiDialog,
  setUiDialog,
  showToast,
}: UseNavigationStackParams): void {
  const lastBackPressRef = useRef<number>(0);

  // Sync browser history when sub view stack changes
  useEffect(() => {
    if (!isMobile) return;

    if (historyBackSyncRef.current) {
      historyBackSyncRef.current = false;
      return;
    }

    if (subViewStack.length === 1 && subViewStack[0] === 'none') return;

    try {
      window.history.pushState(
        {
          __navStack: [...subViewStack],
          ts: Date.now()
        },
        ''
      );
    } catch {
      // ignore history errors
    }
  }, [subViewStack, isMobile]);

  const handleBackPress = useCallback(() => {
    if (activeSubViewRef.current !== 'none') {
      goBackSubView('history');
      return;
    }

    if (uiDialog) {
      setUiDialog(null);
      return;
    }

    const now = Date.now();
    if (now - lastBackPressRef.current < 2000) {
      exitApp();
    } else {
      lastBackPressRef.current = now;
      showToast('再按一次退出应用');
    }
  }, [goBackSubView, uiDialog, showToast]);

  // Listen for popstate events
  useEffect(() => {
    if (!isMobile) return;

    let lastPopTime = 0;

    const onPopState = (e: PopStateEvent) => {
      const now = Date.now();
      if (now - lastPopTime < 300) return;
      lastPopTime = now;

      historyBackSyncRef.current = true;

      if (activeSubViewRef.current !== 'none') {
        goBackSubView('history');
        return;
      }

      handleBackPress();
    };

    window.addEventListener('popstate', onPopState, true);
    return () => window.removeEventListener('popstate', onPopState, true);
  }, [goBackSubView, isMobile, handleBackPress]);

  // Android hardware back button
  useEffect(() => {
    if (!isMobile) return () => {};

    const cleanup = onBackButton(() => {
      handleBackPress();
    });

    return cleanup;
  }, [isMobile, handleBackPress]);

  // Edge swipe gesture
  useEdgeSwipeBack(
    isMobile && activeSubView !== 'none',
    () => {
      goBackSubView('app');
    }
  );
}
