import { useEffect, useMemo } from 'react';
import type { EmojiGroup, EmojiItem } from '../types';
import { DEFAULT_EMOJI_GROUP_ID } from './emojiStore';

type EmojiPanelFlowParams = {
  activeEmojiGroupId: string;
  orderedCustomEmojis: EmojiItem[];
  emojiGroups: EmojiGroup[];
  groupEmojis: Record<string, EmojiItem[]>;
  hiddenEmojiIds: string[];
  emojiPanelPageSizeCustom: number;
  emojiPanelPageSizeGroup: number;
  showPanel: 'emoji' | 'more' | 'none';
  emojiRenderCount: number;
  setEmojiRenderCount: React.Dispatch<React.SetStateAction<number>>;
  isManagingEmojis: boolean;
  draggedEmojiId: string | null;
  setDraggedEmojiId: React.Dispatch<React.SetStateAction<string | null>>;
  setDragOverEmojiId: React.Dispatch<React.SetStateAction<string | null>>;
  setCustomEmojiOrder: React.Dispatch<React.SetStateAction<string[]>>;
  setCustomEmojis: React.Dispatch<React.SetStateAction<{ id: string; url: string; desc: string }[]>>;
};

type IdleCallbackHandle = number | ReturnType<typeof setTimeout> | null;

type IdleCallbackWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const getIdleCallbackWindow = (): IdleCallbackWindow => window as IdleCallbackWindow;

export const useEmojiPanelFlow = (params: EmojiPanelFlowParams) => {
  const currentDisplayEmojis = useMemo(() => {
    if (params.activeEmojiGroupId === DEFAULT_EMOJI_GROUP_ID) {
      return params.orderedCustomEmojis;
    }
    const group = params.emojiGroups.find((item) => item.id === params.activeEmojiGroupId);
    if (!group || !group.enabled) return [];
    return (params.groupEmojis[params.activeEmojiGroupId] || []).filter((item) => !params.hiddenEmojiIds.includes(item.id));
  }, [
    params.activeEmojiGroupId,
    params.orderedCustomEmojis,
    params.emojiGroups,
    params.groupEmojis,
    params.hiddenEmojiIds
  ]);

  const emojiPanelPageSize = params.activeEmojiGroupId === DEFAULT_EMOJI_GROUP_ID
    ? params.emojiPanelPageSizeCustom
    : params.emojiPanelPageSizeGroup;

  const pagedDisplayEmojis = useMemo(() => (
    currentDisplayEmojis.slice(0, Math.max(params.emojiRenderCount, emojiPanelPageSize))
  ), [currentDisplayEmojis, params.emojiRenderCount, emojiPanelPageSize]);

  const hasMoreDisplayEmojis = pagedDisplayEmojis.length < currentDisplayEmojis.length;

  useEffect(() => {
    if (params.showPanel !== 'emoji') return;
    params.setEmojiRenderCount(emojiPanelPageSize);
  }, [params.showPanel, params.activeEmojiGroupId, emojiPanelPageSize]);

  useEffect(() => {
    if (params.showPanel !== 'emoji') return;
    if (!hasMoreDisplayEmojis) return;

    let cancelled = false;
    let timeoutId: number | null = null;
    let idleId: IdleCallbackHandle = null;
    const preloadMore = () => {
      if (cancelled) return;
      params.setEmojiRenderCount((prev: number) => {
        if (prev >= currentDisplayEmojis.length) return prev;
        return Math.min(currentDisplayEmojis.length, prev + Math.ceil(emojiPanelPageSize / 2));
      });
    };
    const idleWindow = getIdleCallbackWindow();
    const ric = idleWindow.requestIdleCallback;
    const cic = idleWindow.cancelIdleCallback;
    if (typeof ric === 'function') {
      idleId = ric(preloadMore, { timeout: 400 });
    } else {
      timeoutId = window.setTimeout(preloadMore, 220);
    }
    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      if (typeof idleId === 'number' && typeof cic === 'function') cic(idleId);
    };
  }, [params.showPanel, hasMoreDisplayEmojis, currentDisplayEmojis.length, emojiPanelPageSize]);

  const handleEmojiPanelScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMoreDisplayEmojis) return;
    const el = e.currentTarget;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
    if (!nearBottom) return;
    params.setEmojiRenderCount((prev: number) => Math.min(currentDisplayEmojis.length, prev + emojiPanelPageSize));
  };

  const handleDragStart = (e: React.DragEvent, emojiId: string) => {
    if (!params.isManagingEmojis) return;
    e.dataTransfer.effectAllowed = 'move';
    params.setDraggedEmojiId(emojiId);
  };

  const handleDragOver = (e: React.DragEvent, emojiId: string) => {
    if (!params.isManagingEmojis || !params.draggedEmojiId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (emojiId !== params.draggedEmojiId) {
      params.setDragOverEmojiId(emojiId);
    }
  };

  const handleDragLeave = () => {
    params.setDragOverEmojiId(null);
  };

  const handleDrop = (e: React.DragEvent, targetEmojiId: string) => {
    if (!params.isManagingEmojis || !params.draggedEmojiId || params.draggedEmojiId === targetEmojiId) return;
    e.preventDefault();
    const currentList = params.activeEmojiGroupId === DEFAULT_EMOJI_GROUP_ID ? params.orderedCustomEmojis : currentDisplayEmojis;
    const draggedIndex = currentList.findIndex((item) => item.id === params.draggedEmojiId);
    const targetIndex = currentList.findIndex((item) => item.id === targetEmojiId);
    if (draggedIndex === -1 || targetIndex === -1) return;
    const newList = [...currentList];
    const [draggedItem] = newList.splice(draggedIndex, 1);
    newList.splice(targetIndex, 0, draggedItem);
    if (params.activeEmojiGroupId === DEFAULT_EMOJI_GROUP_ID) {
      const newOrder = newList.map((item) => item.id);
      params.setCustomEmojiOrder(newOrder);
      params.setCustomEmojis(newList);
    }
    params.setDraggedEmojiId(null);
    params.setDragOverEmojiId(null);
  };

  const handleDragEnd = () => {
    params.setDraggedEmojiId(null);
    params.setDragOverEmojiId(null);
  };

  return {
    currentDisplayEmojis,
    emojiPanelPageSize,
    pagedDisplayEmojis,
    hasMoreDisplayEmojis,
    handleEmojiPanelScroll,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  };
};
