import React from 'react';

export const AppSwitch: React.FC<{
  active: boolean;
  onChange: () => void;
}> = ({ active, onChange }) => (
  <button
    type="button"
    aria-pressed={active}
    className={`app-switch ${active ? 'is-active' : ''}`}
    onClick={onChange}
  />
);
