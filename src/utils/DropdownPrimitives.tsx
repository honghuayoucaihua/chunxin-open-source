import React from 'react';

export const DropdownMenu: React.FC<{
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div {...props} className={['app-dropdown-menu', className].filter(Boolean).join(' ')}>
    {children}
  </div>
);

export const DropdownItem: React.FC<{
  children: React.ReactNode;
  className?: string;
  danger?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = '', danger = false, ...props }) => (
  <button
    type="button"
    className={['app-dropdown-item', danger ? 'app-dropdown-item--danger' : '', className].filter(Boolean).join(' ')}
    {...props}
  >
    {children}
  </button>
);

export const DropdownLabel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={['app-dropdown-label', className].filter(Boolean).join(' ')}>
    {children}
  </div>
);
