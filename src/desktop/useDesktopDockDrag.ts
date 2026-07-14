import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { AppearanceSettings } from '../types';

type UseDesktopDockDragParams = {
  dockIconIds: string[];
  onSettingsChange?: (settings: Partial<AppearanceSettings>) => void;
};

type UseDesktopDockDragResult = {
  dockDragId: string | null;
  dockDragOverIndex: number | null;
  dockContainerRef: RefObject<HTMLDivElement | null>;
  handleDockDragMove: (clientX: number) => void;
  handleDockDragEnd: (clientX: number, clientY: number) => void;
  handleDockDragStart: (iconId: string) => void;
  handleRemoveFromDock: (iconId: string) => void;
};

export const useDesktopDockDrag = ({
  dockIconIds,
  onSettingsChange,
}: UseDesktopDockDragParams): UseDesktopDockDragResult => {
  const [dockDragId, setDockDragId] = useState<string | null>(null);
  const [dockDragOverIndex, setDockDragOverIndex] = useState<number | null>(null);
  const dockContainerRef = useRef<HTMLDivElement>(null);

  const computeDockInsertIndex = useCallback((clientX: number): number => {
    if (!dockContainerRef.current) return 0;
    const rect = dockContainerRef.current.getBoundingClientRect();
    const relX = clientX - rect.left;
    const iconCount = dockIconIds.length;
    if (iconCount <= 0) return 0;
    const gap = 16;
    const innerLeft = 24;
    const innerWidth = rect.width - 48;
    const slotWidth = innerWidth / iconCount;
    const rawIdx = Math.floor((relX - innerLeft + gap / 2) / slotWidth);
    return Math.min(Math.max(rawIdx, 0), iconCount);
  }, [dockIconIds.length]);

  const handleDockDragMove = useCallback((clientX: number) => {
    setDockDragOverIndex(computeDockInsertIndex(clientX));
  }, [computeDockInsertIndex]);

  const handleDockDragEnd = useCallback((clientX: number, clientY: number) => {
    if (!dockDragId) return;
    const dockRect = dockContainerRef.current?.getBoundingClientRect();
    if (dockRect && clientY < dockRect.top) {
      const ids = dockIconIds.filter((id) => id !== dockDragId);
      onSettingsChange?.({ desktopDockIconIds: ids.length ? ids : undefined });
      setDockDragId(null);
      setDockDragOverIndex(null);
      return;
    }
    const ids = [...dockIconIds];
    const fromIndex = ids.indexOf(dockDragId);
    if (fromIndex < 0) return;
    const toIndex = computeDockInsertIndex(clientX);
    if (fromIndex === toIndex || toIndex === fromIndex + 1) {
      setDockDragId(null);
      setDockDragOverIndex(null);
      return;
    }
    ids.splice(fromIndex, 1);
    const insertIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
    ids.splice(insertIndex, 0, dockDragId);
    onSettingsChange?.({ desktopDockIconIds: ids });
    setDockDragId(null);
    setDockDragOverIndex(null);
  }, [computeDockInsertIndex, dockDragId, dockIconIds, onSettingsChange]);

  const handleDockDragStart = useCallback((iconId: string) => {
    setDockDragId(iconId);
  }, []);

  const handleRemoveFromDock = useCallback((iconId: string) => {
    const ids = dockIconIds.filter((id) => id !== iconId);
    onSettingsChange?.({ desktopDockIconIds: ids.length ? ids : undefined });
  }, [dockIconIds, onSettingsChange]);

  return {
    dockDragId,
    dockDragOverIndex,
    dockContainerRef,
    handleDockDragMove,
    handleDockDragEnd,
    handleDockDragStart,
    handleRemoveFromDock,
  };
};

export default useDesktopDockDrag;
