import React from 'react';

export const SharedSectionCard: React.FC<{
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, children, className = '' }) => (
  <div className={['app-surface-panel app-surface-panel--soft app-shared-section-card', className].filter(Boolean).join(' ')}>
    {title ? <div className="text-[12px] font-medium render-text-primary">{title}</div> : null}
    {children}
  </div>
);

export const SharedCodeBlock: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <pre className={['app-shared-code-block', className].filter(Boolean).join(' ')}>
    {children}
  </pre>
);

export const SharedPreviewCard: React.FC<{
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
}> = ({ title, children, className = '', headerClassName = '', bodyClassName = '' }) => (
  <div className={['app-surface-panel app-surface-panel--soft app-shared-preview-card', className].filter(Boolean).join(' ')}>
    <div className={['app-shared-preview-card-header', headerClassName].filter(Boolean).join(' ')}>
      {title}
    </div>
    <div className={['app-shared-preview-card-body', bodyClassName].filter(Boolean).join(' ')}>
      {children}
    </div>
  </div>
);

export const SharedEmptyState: React.FC<{
  children?: React.ReactNode;
  iconClassName?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}> = ({ children, iconClassName, title, description, className = '' }) => (
  <div className={['app-shared-empty-state text-center text-gray-400', className].filter(Boolean).join(' ')}>
    {iconClassName ? <i className={['app-shared-empty-state-icon', iconClassName].filter(Boolean).join(' ')} /> : null}
    {title ? <div className="app-shared-empty-state-title">{title}</div> : null}
    {description ? <div className="app-shared-empty-state-description">{description}</div> : null}
    {children}
  </div>
);

export const SharedLoadingState: React.FC<{
  text?: React.ReactNode;
  iconClassName?: string;
  className?: string;
}> = ({ text = '加载中...', iconClassName = 'fa-solid fa-spinner fa-spin', className = '' }) => (
  <div className={['app-shared-loading-state render-text-secondary', className].filter(Boolean).join(' ')}>
    <i className={['app-shared-loading-state-icon', iconClassName].filter(Boolean).join(' ')} />
    <span>{text}</span>
  </div>
);
