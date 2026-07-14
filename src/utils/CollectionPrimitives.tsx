import React from 'react';

export const CollectionSummaryBar: React.FC<{
  summary: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ summary, actions }) => (
  <div className="app-surface-panel app-collection-toolbar">
    <div className="app-collection-toolbar-summary">{summary}</div>
    {actions ? <div className="app-collection-toolbar-actions">{actions}</div> : null}
  </div>
);

export const CollectionBottomSheet: React.FC<{
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
}> = ({ title, children, footer, onClose }) => (
  <div className="fixed inset-0 z-[400] bg-black/50 flex items-end animate-in fade-in duration-200" onClick={onClose}>
    <div className="w-full app-surface-panel app-sheet app-collection-bottom-sheet animate-in slide-in-from-bottom duration-300" onClick={(event) => event.stopPropagation()}>
      {title ? <div className="app-collection-bottom-sheet-title">{title}</div> : null}
      <div className="app-collection-bottom-sheet-body">{children}</div>
      {footer ? <div className="app-collection-bottom-sheet-footer">{footer}</div> : null}
    </div>
  </div>
);
