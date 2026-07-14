import { useState, useRef, useCallback, useMemo } from 'react';
import {
  EMOJI_OUTPUT_QUALITY,
  EMOJI_PANEL_PAGE_SIZE_CUSTOM,
  EMOJI_PANEL_PAGE_SIZE_GROUP,
  EMOJI_UNIFIED_SIZE,
  normalizeCustomEmojis as normalizeCustomEmojisBase
} from '../emojiState';
import {
  compactEmojiList as compactEmojiListBase,
  compactEmojiUrl as compactEmojiUrlBase
} from '../emojiImageUtils';
import { runBatchDeleteEmojis } from '../emojiManageFlow';
import { useEmojiPanelFlow } from '../emojiPanelFlow';
import { useEmojiDataFlow } from '../emojiDataFlow';
import { buildEmojiGroupViews } from '../emojiStore';

interface UseEmojiSystemParams {
  showPanel: 'emoji' | 'more' | 'none';
  onAction?: (action: string, msgId: string, data?: any) => void;
  setShowPanel: (p: 'emoji' | 'more' | 'none') => void;
}

export function useEmojiSystem({ showPanel, onAction, setShowPanel }: UseEmojiSystemParams) {
  const [emojiRenderCount, setEmojiRenderCount] = useState(EMOJI_PANEL_PAGE_SIZE_CUSTOM);

  const compactEmojiUrl = useCallback(
    (url: string) => compactEmojiUrlBase(url, { unifiedSize: EMOJI_UNIFIED_SIZE, outputQuality: EMOJI_OUTPUT_QUALITY }),
    []
  );

  const compactEmojiList = useCallback(async (list: { id: string, url: string, desc: string }[]) => {
    const compacted = await compactEmojiListBase(list, compactEmojiUrl);
    return normalizeCustomEmojisBase(compacted);
  }, [compactEmojiUrl]);

  const {
    emojiStoreState,
    normalizeCustomEmojis,
    customEmojis,
    setCustomEmojis,
    emojiGroups,
    setEmojiGroups,
    activeEmojiGroupId,
    setActiveEmojiGroupId,
    groupEmojis,
    setGroupEmojis,
    hiddenEmojiIds,
    setHiddenEmojiIds,
    isManagingEmojis,
    setIsManagingEmojis,
    selectedEmojiIds,
    setSelectedEmojiIds,
    setCustomEmojiOrder,
    orderedCustomEmojis
  } = useEmojiDataFlow({
    showPanel,
    compactEmojiList
  });

  // URL导入表情面板状态
  const [showUrlImportPanel, setShowUrlImportPanel] = useState(false);
  const [showAddEmojiMenu, setShowAddEmojiMenu] = useState(false);
  const emojiFileInputRef = useRef<HTMLInputElement>(null);

  // 拖拽排序相关状态
  const [draggedEmojiId, setDraggedEmojiId] = useState<string | null>(null);
  const [dragOverEmojiId, setDragOverEmojiId] = useState<string | null>(null);

  const {
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
  } = useEmojiPanelFlow({
    activeEmojiGroupId,
    orderedCustomEmojis,
    emojiGroups,
    groupEmojis,
    hiddenEmojiIds,
    emojiPanelPageSizeCustom: EMOJI_PANEL_PAGE_SIZE_CUSTOM,
    emojiPanelPageSizeGroup: EMOJI_PANEL_PAGE_SIZE_GROUP,
    showPanel,
    emojiRenderCount,
    setEmojiRenderCount,
    isManagingEmojis,
    draggedEmojiId,
    setDraggedEmojiId,
    setDragOverEmojiId,
    setCustomEmojiOrder,
    setCustomEmojis
  });

  const emojiGroupViews = buildEmojiGroupViews({
    emojiGroups
  });

  const handleBatchDeleteEmojis = useCallback(() => {
    runBatchDeleteEmojis({
      activeEmojiGroupId,
      selectedEmojiIds,
      customEmojis,
      hiddenEmojiIds,
      setCustomEmojis,
      setHiddenEmojiIds,
      setSelectedEmojiIds,
      setIsManagingEmojis
    });
  }, [
    activeEmojiGroupId,
    selectedEmojiIds,
    customEmojis,
    hiddenEmojiIds,
    setCustomEmojis,
    setHiddenEmojiIds,
    setSelectedEmojiIds,
    setIsManagingEmojis
  ]);

  const handleSendEmoji = useCallback((
    emoji: { url: string, desc: string, id: string, groupId?: string }
  ) => {
    if (isManagingEmojis) {
      setSelectedEmojiIds(prev => prev.includes(emoji.id) ? prev.filter(id => id !== emoji.id) : [...prev, emoji.id]);
      return;
    }
    onAction?.('sendEmoji', '', emoji);
    setShowPanel('none');
  }, [isManagingEmojis, onAction, setSelectedEmojiIds, setShowPanel]);

  const prependCustomEmojis = useCallback((list: Array<{ id: string; url: string; desc: string }>) => {
    setCustomEmojis((prev: Array<{ id: string; url: string; desc: string }>) => normalizeCustomEmojis([...list, ...prev]));
  }, [normalizeCustomEmojis, setCustomEmojis]);

  const toggleManage = useCallback(() => {
    setIsManagingEmojis(!isManagingEmojis);
    setSelectedEmojiIds([]);
  }, [isManagingEmojis, setIsManagingEmojis, setSelectedEmojiIds]);

  const toggleSelect = useCallback((emojiId: string) => {
    setSelectedEmojiIds((prev) => prev.includes(emojiId) ? prev.filter((id) => id !== emojiId) : [...prev, emojiId]);
  }, [setSelectedEmojiIds]);

  const loadMore = useCallback(() => {
    setEmojiRenderCount((prev) => Math.min(currentDisplayEmojis.length, prev + emojiPanelPageSize));
  }, [currentDisplayEmojis.length, emojiPanelPageSize]);

  const openAddMenu = useCallback(() => {
    setShowAddEmojiMenu(true);
  }, []);

  const closeAddMenu = useCallback(() => {
    setShowAddEmojiMenu(false);
  }, []);

  const openUrlImport = useCallback(() => {
    setShowAddEmojiMenu(false);
    setShowUrlImportPanel(true);
  }, []);

  const closeUrlImport = useCallback(() => {
    setShowUrlImportPanel(false);
  }, []);

  const openAlbumPicker = useCallback(() => {
    setShowAddEmojiMenu(false);
    emojiFileInputRef.current?.click();
  }, []);

  const emojiActions = useMemo(() => ({
    prependCustomEmojis,
    setCustomEmojis,
    toggleSelect,
    closeAddMenu,
    openUrlImport,
    closeUrlImport,
    openAlbumPicker
  }), [
    prependCustomEmojis,
    setCustomEmojis,
    toggleSelect,
    closeAddMenu,
    openUrlImport,
    closeUrlImport,
    openAlbumPicker
  ]);

  const emojiUi = useMemo(() => ({
    showUrlImportPanel,
    showAddEmojiMenu,
    emojiFileInputRef
  }), [showUrlImportPanel, showAddEmojiMenu]);

  const emojiData = useMemo(() => ({
    emojiStoreState,
    normalizeCustomEmojis,
    customEmojis,
    emojiGroups,
    emojiGroupViews,
    activeEmojiGroupId,
    groupEmojis,
    hiddenEmojiIds,
    isManagingEmojis,
    selectedEmojiIds,
    orderedCustomEmojis,
    compactEmojiList,
    compactEmojiUrl
  }), [
    emojiStoreState,
    normalizeCustomEmojis,
    customEmojis,
    emojiGroups,
    emojiGroupViews,
    activeEmojiGroupId,
    groupEmojis,
    hiddenEmojiIds,
    isManagingEmojis,
    selectedEmojiIds,
    orderedCustomEmojis,
    compactEmojiList,
    compactEmojiUrl
  ]);

  const emojiPanel = useMemo(() => ({
    activeEmojiGroupId,
    emojiGroups,
    isManagingEmojis,
    pagedDisplayEmojis,
    dragOverEmojiId,
    draggedEmojiId,
    selectedEmojiIds,
    currentDisplayEmojis,
    hasMoreDisplayEmojis,
    emojiPanelPageSize,
    handleEmojiPanelScroll,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    setActiveGroup: setActiveEmojiGroupId,
    openAddMenu,
    send: handleSendEmoji,
    loadMore,
    batchDelete: handleBatchDeleteEmojis,
    toggleManage
  }), [
    activeEmojiGroupId,
    emojiGroups,
    isManagingEmojis,
    pagedDisplayEmojis,
    dragOverEmojiId,
    draggedEmojiId,
    selectedEmojiIds,
    currentDisplayEmojis,
    hasMoreDisplayEmojis,
    emojiPanelPageSize,
    handleEmojiPanelScroll,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    setActiveEmojiGroupId,
    openAddMenu,
    handleSendEmoji,
    loadMore,
    handleBatchDeleteEmojis,
    toggleManage
  ]);

  return {
    emojiData,
    emojiPanel,
    emojiUi,
    emojiActions
  };
}
