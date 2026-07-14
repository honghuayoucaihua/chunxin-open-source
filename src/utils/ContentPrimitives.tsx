import React from 'react';

export const ContentCard: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'community' | 'official';
  className?: string;
}> = ({ children, onClick, variant = 'community', className = '' }) => {
  const classes = [
    'app-surface-panel',
    'app-content-card',
    variant === 'official' ? 'app-content-card--official' : 'app-content-card--community',
    onClick ? 'app-content-card--interactive cursor-pointer text-left' : '',
    className
  ].filter(Boolean).join(' ');
  if (onClick) {
    return <button type="button" className={classes} onClick={onClick}>{children}</button>;
  }
  return <div className={classes}>{children}</div>;
};

export const ContentBottomBar: React.FC<{
  children: React.ReactNode;
  variant?: 'community' | 'official';
  className?: string;
}> = ({ children, variant = 'community', className = '' }) => (
  <div className={[
    'app-content-bottom-bar',
    variant === 'official' ? 'app-content-bottom-bar--official' : 'app-content-bottom-bar--community',
    className
  ].filter(Boolean).join(' ')}>
    {children}
  </div>
);
