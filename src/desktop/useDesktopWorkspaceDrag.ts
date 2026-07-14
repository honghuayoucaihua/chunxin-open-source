import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, RefObject, TouchEvent as ReactTouchEvent } from 'react';
import type { AppearanceSettings, DesktopIcon, DesktopWidget } from '../types';
import {
  canPlaceDesktopAreaOnPage,
  getDesktopDragSwitchPageTarget,
  moveDesktopPagedItem
} from '../utils/desktopPageUtils';

const DRAG_PAGE_EDGE_THRESHOLD = 56;
const DRAG_PAGE_SWITCH_DELAY = 420;

type DesktopGridItemType = 'icon' | 'widget';
export type DesktopDragItem = { type: DesktopGridItemType; id: string } | null;

type UseDesktopWorkspaceDragParams = {
  isEditMode: boolean;
  currentPage: number;
  totalPages: number;
  gridRef: RefObject<HTMLDivElement | null>;
  dockContainerRef: RefObject<HTMLDivElement | null>;
  gridCols: number;
  gridRows: number;
  cellHeight: number;
  gridGap: number;
  icons: DesktopIcon[];
  widgets: DesktopWidget[];
  dockIconIds: string[];
  onEnterEditMode: (itemId: string) => void;
  onSettingsChange?: (settings: Partial<AppearanceSettings>) => void;
};

type UseDesktopWorkspaceDragResult = {
  dragItem: DesktopDragItem;
  dragItemRef: RefObject<DesktopDragItem>;
  dragPageTarget: number | null;
  dragGhostRef: RefObject<HTMLDivElement | null>;
  dragPosition: { x: number; y: number };
  handleItemMouseDown: (type: DesktopGridItemType, id: string, event: ReactMouseEvent) => void;
  handleItemTouchStart: (type: DesktopGridItemType, id: string, event: ReactTouchEvent) => void;
  handleItemTouchMove: (event: ReactTouchEvent) => void;
  handleItemTouchEnd: (event: ReactTouchEvent) => void;
};

export const useDesktopWorkspaceDrag = ({
  isEditMode,
  currentPage,
  totalPages,
  gridRef,
  dockContainerRef,
  gridCols,
  gridRows,
  cellHeight,
  gridGap,
  icons,
  widgets,
  dockIconIds,
  onEnterEditMode,
  onSettingsChange,
}: UseDesktopWorkspaceDragParams): UseDesktopWorkspaceDragResult => {
  const [dragItem, setDragItem] = useState<DesktopDragItem>(null);
  const [mouseDownTarget, setMouseDownTarget] = useState<{ x: number; y: number; type: DesktopGridItemType; id: string } | null>(null);
  const [dragPageTarget, setDragPageTarget] = useState<number | null>(null);
  const dragPositionRef = useRef({ x: 0, y: 0 });
  const dragGhostRef = useRef<HTMLDivElement>(null);
  const dragItemRef = useRef<DesktopDragItem>(dragItem);
  const currentPageRef = useRef(currentPage);
  const isEditModeRef = useRef(isEditMode);
  const dragPageTargetRef = useRef<number | null>(null);
  const dragPageTurnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchDragTargetRef = useRef<{ type: DesktopGridItemType; id: string } | null>(null);

  useEffect(() => {
    dragItemRef.current = dragItem;
  }, [dragItem]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    isEditModeRef.current = isEditMode;
  }, [isEditMode]);

  const updateDragPosition = useCallback((clientX: number, clientY: number) => {
    dragPositionRef.current = { x: clientX, y: clientY };
    if (dragGhostRef.current) {
      dragGhostRef.current.style.left = `${clientX - 30}px`;
      dragGhostRef.current.style.top = `${clientY - 30}px`;
    }
  }, []);

  const clearDragPageSwitch = useCallback(() => {
    if (dragPageTurnTimerRef.current) {
      clearTimeout(dragPageTurnTimerRef.current);
      dragPageTurnTimerRef.current = null;
    }
    dragPageTargetRef.current = null;
    setDragPageTarget(null);
  }, []);

  const scheduleDragPageSwitch = useCallback((clientX: number) => {
    if (!dragItemRef.current || !isEditModeRef.current) {
      clearDragPageSwitch();
      return;
    }
    const targetPage = getDesktopDragSwitchPageTarget(
      clientX,
      typeof window !== 'undefined' ? window.innerWidth : 0,
      currentPageRef.current,
      totalPages,
      DRAG_PAGE_EDGE_THRESHOLD
    );
    if (targetPage === null) {
      clearDragPageSwitch();
      return;
    }
    if (dragPageTargetRef.current === targetPage && dragPageTurnTimerRef.current) {
      return;
    }
    if (dragPageTurnTimerRef.current) {
      clearTimeout(dragPageTurnTimerRef.current);
      dragPageTurnTimerRef.current = null;
    }
    dragPageTargetRef.current = targetPage;
    setDragPageTarget(targetPage);
    dragPageTurnTimerRef.current = setTimeout(() => {
      dragPageTurnTimerRef.current = null;
      dragPageTargetRef.current = null;
      setDragPageTarget(null);
      onSettingsChange?.({ desktopPageIndex: targetPage });
    }, DRAG_PAGE_SWITCH_DELAY);
  }, [clearDragPageSwitch, onSettingsChange, totalPages]);

  useEffect(() => {
    if (!dragItem) {
      clearDragPageSwitch();
    }
  }, [dragItem, clearDragPageSwitch]);

  useEffect(() => {
    return () => clearDragPageSwitch();
  }, [clearDragPageSwitch]);

  const handleItemTouchStart = useCallback((type: DesktopGridItemType, id: string, event: ReactTouchEvent) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchDragTargetRef.current = { type, id };

    longPressTimerRef.current = setTimeout(() => {
      onEnterEditMode(id);
    }, 500);
  }, [onEnterEditMode]);

  const handleDropAt = useCallback((clientX: number, clientY: number) => {
    if (!gridRef.current || !dragItem) return;
    const rect = gridRef.current.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    const newCol = Math.min(Math.max(Math.floor((relX / rect.width) * gridCols), 0), gridCols - 1);
    const totalGridH = gridRows * cellHeight + Math.max(0, gridRows - 1) * gridGap;
    const newRow = Math.min(Math.max(Math.floor((relY / totalGridH) * gridRows), 0), gridRows - 1);

    if (isEditMode && dragItem.type === 'icon') {
      const dockRect = dockContainerRef.current?.getBoundingClientRect();
      if (dockRect && clientY >= dockRect.top && clientY <= dockRect.bottom && clientX >= dockRect.left && clientX <= dockRect.right) {
        const ids = [...dockIconIds];
        if (!ids.includes(dragItem.id) && ids.length < 4) {
          ids.push(dragItem.id);
          onSettingsChange?.({ desktopDockIconIds: ids });
        }
        return;
      }
    }

    if (dragItem.type === 'icon') {
      const icon = icons.find((item) => item.id === dragItem.id);
      const canPlace = canPlaceDesktopAreaOnPage(icons, widgets, currentPage, newRow, newCol, 1, 1, dragItem.id);
      if (icon && canPlace && ((icon.pageIndex ?? 0) !== currentPage || icon.row !== newRow || icon.col !== newCol)) {
        onSettingsChange?.({
          desktopIcons: moveDesktopPagedItem(icons, dragItem.id, currentPage, newRow, newCol)
        });
      }
    } else {
      const widget = widgets.find((item) => item.id === dragItem.id);
      if (widget) {
        const canPlace = newCol + widget.width <= gridCols &&
          newRow + widget.height <= gridRows &&
          canPlaceDesktopAreaOnPage(icons, widgets, currentPage, newRow, newCol, widget.width, widget.height, dragItem.id);
        if (canPlace && ((widget.pageIndex ?? 0) !== currentPage || widget.row !== newRow || widget.col !== newCol)) {
          onSettingsChange?.({
            desktopWidgets: moveDesktopPagedItem(widgets, dragItem.id, currentPage, newRow, newCol)
          });
        }
      }
    }
  }, [cellHeight, currentPage, dockContainerRef, dockIconIds, dragItem, gridCols, gridGap, gridRef, gridRows, icons, isEditMode, onSettingsChange, widgets]);

  const handleItemTouchMove = useCallback((event: ReactTouchEvent) => {
    const touch = event.touches[0];

    if (dragItem) {
      updateDragPosition(touch.clientX, touch.clientY);
      scheduleDragPageSwitch(touch.clientX);
      return;
    }

    if (touchDragTargetRef.current && touchStartRef.current && isEditMode) {
      const dx = Math.abs(touch.clientX - touchStartRef.current.x);
      const dy = Math.abs(touch.clientY - touchStartRef.current.y);
      if (dx > 10 || dy > 10) {
        updateDragPosition(touch.clientX, touch.clientY);
        setDragItem({ type: touchDragTargetRef.current.type, id: touchDragTargetRef.current.id });
        scheduleDragPageSwitch(touch.clientX);
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        return;
      }
    }

    if (!isEditMode && touchStartRef.current) {
      const dx = Math.abs(touch.clientX - touchStartRef.current.x);
      const dy = Math.abs(touch.clientY - touchStartRef.current.y);
      if ((dx > 10 || dy > 10) && longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, [dragItem, isEditMode, scheduleDragPageSwitch, updateDragPosition]);

  const handleItemTouchEnd = useCallback((_event: ReactTouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (dragItem) {
      handleDropAt(dragPositionRef.current.x, dragPositionRef.current.y);
    }

    setDragItem(null);
    clearDragPageSwitch();
    touchDragTargetRef.current = null;
    touchStartRef.current = null;
  }, [clearDragPageSwitch, dragItem, handleDropAt]);

  const handleItemMouseDown = useCallback((type: DesktopGridItemType, id: string, event: ReactMouseEvent) => {
    if (event.button !== 0) return;
    if (!isEditMode) return;
    setMouseDownTarget({ x: event.clientX, y: event.clientY, type, id });
  }, [isEditMode]);

  useEffect(() => {
    if (!mouseDownTarget && !dragItem) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!dragItem && mouseDownTarget && isEditMode) {
        const dx = Math.abs(event.clientX - mouseDownTarget.x);
        const dy = Math.abs(event.clientY - mouseDownTarget.y);
        if (dx > 5 || dy > 5) {
          updateDragPosition(event.clientX, event.clientY);
          setDragItem({ type: mouseDownTarget.type, id: mouseDownTarget.id });
          scheduleDragPageSwitch(event.clientX);
          setMouseDownTarget(null);
        }
      } else if (dragItem) {
        updateDragPosition(event.clientX, event.clientY);
        scheduleDragPageSwitch(event.clientX);
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (dragItem) {
        handleDropAt(event.clientX, event.clientY);
      }
      setDragItem(null);
      clearDragPageSwitch();
      setMouseDownTarget(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [clearDragPageSwitch, dragItem, handleDropAt, isEditMode, mouseDownTarget, scheduleDragPageSwitch, updateDragPosition]);

  return {
    dragItem,
    dragItemRef,
    dragPageTarget,
    dragGhostRef,
    dragPosition: dragPositionRef.current,
    handleItemMouseDown,
    handleItemTouchStart,
    handleItemTouchMove,
    handleItemTouchEnd,
  };
};

export default useDesktopWorkspaceDrag;
