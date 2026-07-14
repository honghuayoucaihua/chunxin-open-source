import { useState, useMemo } from 'react';

export function useMultiSelect() {
  const [multiSelectIds, setMultiSelectIds] = useState<string[]>([]);
  const [isMultiSelecting, setIsMultiSelecting] = useState(false);

  const selectedMessageIdSet = useMemo(() => new Set(multiSelectIds), [multiSelectIds]);

  return {
    multiSelectIds,
    setMultiSelectIds,
    isMultiSelecting,
    setIsMultiSelecting,
    selectedMessageIdSet
  };
}
