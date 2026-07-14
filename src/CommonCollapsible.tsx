import React from 'react';
import SkinIcon from './shell/SkinIcon';

const readStoredExpanded = (key: string, fallback: boolean): boolean => {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    if (raw === '1') return true;
    if (raw === '0') return false;
    return fallback;
  } catch {
    return fallback;
  }
};

const writeStoredExpanded = (key: string, value: boolean) => {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // 忽略：部分环境可能禁用 localStorage
  }
};

export const CollapsibleSection: React.FC<{
  storageKey: string;
  title: string;
  summary?: React.ReactNode;
  defaultExpanded?: boolean;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}> = ({ storageKey, title, summary, defaultExpanded = true, rightSlot, children }) => {
  const persistedKey = `ui:collapsible:${storageKey}`;
  const [expanded, setExpanded] = React.useState(() => readStoredExpanded(persistedKey, defaultExpanded));

  React.useEffect(() => {
    writeStoredExpanded(persistedKey, expanded);
  }, [persistedKey, expanded]);

  return (
    <div className="render-bg-secondary rounded-lg border render-border overflow-hidden">
      <button
        type="button"
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="min-w-0">
          <div className="text-sm font-medium render-text-primary truncate">{title}</div>
          {summary ? <div className="text-[11px] render-text-tertiary mt-0.5 truncate">{summary}</div> : null}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {rightSlot ? <div onClick={(e) => e.stopPropagation()}>{rightSlot}</div> : null}
          <SkinIcon icon={expanded ? 'fa-chevron-up' : 'fa-chevron-down'} className="text-[12px] opacity-60" />
        </div>
      </button>
      {expanded ? (
        <div className="px-4 py-3 border-t render-border-subtle">
          {children}
        </div>
      ) : null}
    </div>
  );
};
