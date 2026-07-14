import React, { useState, useRef } from 'react';

interface UsePullRefreshOptions {
  onRefresh?: () => Promise<void> | void;
  threshold?: number;
  maxDistance?: number;
  startThreshold?: number;
}

interface UsePullRefreshReturn {
  pullDistance: number;
  isRefreshing: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => Promise<void>;
}

export const usePullRefresh = ({
  onRefresh,
  threshold = 70,
  maxDistance = 80,
  startThreshold = 30
}: UsePullRefreshOptions = {}): UsePullRefreshReturn => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartYRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtTopRef = useRef(false);
  const pullThresholdPassedRef = useRef(false);
  // 使用 ref 跟踪最新下拉距离，避免 handleTouchEnd 闭包过期
  const pullDistanceRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop > 0) {
      isAtTopRef.current = false;
      pullThresholdPassedRef.current = false;
      return;
    }
    isAtTopRef.current = true;
    touchStartYRef.current = e.touches[0].clientY;
    pullThresholdPassedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isAtTopRef.current || touchStartYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const delta = currentY - touchStartYRef.current;

    // 如果不是向下拉，直接忽略
    if (delta <= 0) {
      pullThresholdPassedRef.current = false;
      return;
    }

    // 命中下拉手势时，阻止浏览器默认下拉刷新
    if (e.cancelable) {
      e.preventDefault();
    }

    // 检查是否已经通过了阈值（需要下拉超过startThreshold才开始显示下拉效果）
    if (!pullThresholdPassedRef.current && delta < startThreshold) {
      setPullDistance(0);
      return;
    }

    // 只有下拉超过startThreshold后才标记通过阈值
    if (delta >= startThreshold) {
      pullThresholdPassedRef.current = true;
    }

    const clamped = Math.min(delta, maxDistance);
    pullDistanceRef.current = clamped;
    setPullDistance(clamped);
  };

  const handleTouchEnd = async () => {
    if (!isAtTopRef.current || touchStartYRef.current === null || isRefreshing) return;
    touchStartYRef.current = null;
    isAtTopRef.current = false;

    // 使用 ref 中的最新下拉距离，避免状态闭包过期
    const currentPullDistance = pullDistanceRef.current;

    // 必须通过阈值且下拉距离达到threshold才触发刷新
    if (pullThresholdPassedRef.current && currentPullDistance >= threshold && onRefresh) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      try {
        await Promise.resolve(onRefresh());
      } catch (error) {
        console.error('[Moments] 下拉刷新失败:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        pullDistanceRef.current = 0;
      }
      pullThresholdPassedRef.current = false;
      return;
    }
    setPullDistance(0);
    pullDistanceRef.current = 0;
    pullThresholdPassedRef.current = false;
  };

  return {
    pullDistance,
    isRefreshing,
    scrollRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
};
