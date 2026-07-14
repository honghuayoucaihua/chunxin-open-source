import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * 边缘侧滑手势检测 Hook
 *
 * 仅负责检测边缘侧滑手势，不处理历史记录管理。
 * 历史记录统一由 App.tsx 管理。
 *
 * @param isActive 当前是否可以触发侧滑返回（通常是有子视图打开时）
 * @param onBack 触发返回的回调函数
 *
 * @example
 * useEdgeSwipeBack(activeSubView !== 'none', () => goBackSubView());
 */
export function useEdgeSwipeBack(
  isActive: boolean,
  onBack: () => void
) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const gestureStateRef = useRef<{
    startX: number;
    startY: number;
    startTime: number;
    triggered: boolean;
  } | null>(null);

  const [edgeSwipeOffset, setEdgeSwipeOffset] = useState(0);

  const isAndroidRuntime = /Android/i.test(navigator.userAgent || '');

  // 边缘起始区域配置
  const EDGE_START_MIN = isAndroidRuntime ? 24 : 0;
  const EDGE_START_MAX = isAndroidRuntime ? 96 : 28;
  const TRIGGER_DISTANCE = 72;
  const MAX_OFFSET = 96;

  const shouldIgnoreEdgeSwipe = useCallback((target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    const blocker = target.closest('input, textarea, select, button, a, [data-no-edge-back], .no-edge-back');
    return !!blocker;
  }, []);

  useEffect(() => {
    if (!isActive) {
      // 重置状态
      gestureStateRef.current = null;
      setEdgeSwipeOffset(0);
      return;
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (!isActiveRef.current) return;
      if (shouldIgnoreEdgeSwipe(e.target)) return;

      const touch = e.touches[0];
      if (!touch) return;

      const x = touch.clientX;
      // 检查是否在边缘起始区域内
      if (x < EDGE_START_MIN || x > EDGE_START_MAX) {
        gestureStateRef.current = null;
        return;
      }

      gestureStateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        triggered: false
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      const state = gestureStateRef.current;
      if (!state || state.triggered) return;

      const touch = e.touches[0];
      if (!touch) return;

      const dx = touch.clientX - state.startX;
      const dy = touch.clientY - state.startY;

      // 水平向右滑动
      if (dx > 0 && Math.abs(dx) > Math.abs(dy)) {
        setEdgeSwipeOffset(Math.min(dx, MAX_OFFSET));
        e.preventDefault();
      }

      // 触发返回：滑动距离超过阈值，且水平方向主导
      if (dx > TRIGGER_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.2) {
        state.triggered = true;
        setEdgeSwipeOffset(0);
        onBackRef.current();
        gestureStateRef.current = null;
      }
    };

    const handleTouchEnd = () => {
      gestureStateRef.current = null;
      setEdgeSwipeOffset(0);
    };

    // 在捕获阶段添加监听，确保能正确处理
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart, { passive: true } as AddEventListenerOptions);
      document.removeEventListener('touchmove', handleTouchMove, { passive: false } as AddEventListenerOptions);
      document.removeEventListener('touchend', handleTouchEnd, { passive: true } as AddEventListenerOptions);
    };
  }, [isActive, shouldIgnoreEdgeSwipe, EDGE_START_MIN, EDGE_START_MAX, TRIGGER_DISTANCE, MAX_OFFSET]);

  return { edgeSwipeOffset };
}

/**
 * 底部上滑手势检测 Hook
 *
 * 用于检测从屏幕底部边缘向上滑动的手势。
 *
 * @param isActive 当前是否可以触发上滑
 * @param onSwipeUp 触发上滑的回调函数
 *
 * @example
 * useBottomSwipeUp(enabled, () => setIsInDesktopApp(false));
 */
export function useBottomSwipeUp(
  isActive: boolean,
  onSwipeUp: () => void
) {
  const onSwipeUpRef = useRef(onSwipeUp);
  onSwipeUpRef.current = onSwipeUp;
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const gestureStateRef = useRef<{
    startY: number;
    startTime: number;
    triggered: boolean;
  } | null>(null);

  const BOTTOM_EDGE_HEIGHT = 32; // 底部边缘触发区域高度
  const TRIGGER_DISTANCE = 80;   // 触发所需滑动距离
  const MAX_TIME = 500;          // 最大手势时间

  useEffect(() => {
    if (!isActive) {
      gestureStateRef.current = null;
      return;
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (!isActiveRef.current) return;

      const touch = e.touches[0];
      if (!touch) return;

      const y = touch.clientY;
      const screenHeight = window.innerHeight;

      // 检查是否在底部边缘区域内
      if (y < screenHeight - BOTTOM_EDGE_HEIGHT) {
        gestureStateRef.current = null;
        return;
      }

      gestureStateRef.current = {
        startY: touch.clientY,
        startTime: Date.now(),
        triggered: false
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      const state = gestureStateRef.current;
      if (!state || state.triggered) return;

      const touch = e.touches[0];
      if (!touch) return;

      const dy = state.startY - touch.clientY; // 向上滑动为正值

      // 触发上滑：滑动距离超过阈值
      if (dy > TRIGGER_DISTANCE) {
        const elapsed = Date.now() - state.startTime;
        if (elapsed < MAX_TIME) {
          state.triggered = true;
          onSwipeUpRef.current();
          gestureStateRef.current = null;
        }
      }
    };

    const handleTouchEnd = () => {
      gestureStateRef.current = null;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart, { passive: true } as AddEventListenerOptions);
      document.removeEventListener('touchmove', handleTouchMove, { passive: true } as AddEventListenerOptions);
      document.removeEventListener('touchend', handleTouchEnd, { passive: true } as AddEventListenerOptions);
    };
  }, [isActive, BOTTOM_EDGE_HEIGHT, TRIGGER_DISTANCE, MAX_TIME]);
}
