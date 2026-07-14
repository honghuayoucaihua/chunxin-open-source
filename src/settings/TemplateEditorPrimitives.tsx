import React from 'react';

export const TemplateEditorSummaryCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="app-surface-panel app-template-editor-card app-template-editor-card--summary">
    {children}
  </div>
);

export const TemplateEditorFieldCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={['app-surface-panel app-template-editor-card app-template-editor-card--field', className].filter(Boolean).join(' ')}>
    {children}
  </div>
);

export const TemplateEditorEntryCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={['app-surface-panel app-template-editor-card app-template-editor-card--entry', className].filter(Boolean).join(' ')}>
    {children}
  </div>
);

export const TemplateListCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={['app-surface-panel app-template-editor-card app-template-editor-card--list', className].filter(Boolean).join(' ')}>
    {children}
  </div>
);
