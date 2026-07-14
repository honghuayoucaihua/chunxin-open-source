import React from 'react';

export const SelectionIndicator: React.FC<{
  checked: boolean;
  variant?: 'default' | 'compact';
}> = ({ checked, variant = 'default' }) => (
  <div
    className={`app-selection-indicator ${variant === 'compact' ? 'app-selection-indicator--compact' : ''} ${checked ? 'is-checked' : ''}`}
  >
    {checked ? <i className="fa-solid fa-check text-white text-[10px]"></i> : null}
  </div>
);

export const ContactSelectRow: React.FC<{
  avatar?: string;
  iconName?: string;
  name: string;
  desc?: string;
  checked: boolean;
  onClick: () => void;
  avatarShape?: 'rounded' | 'circle';
  indicatorVariant?: 'default' | 'compact';
  className?: string;
}> = ({
  avatar,
  iconName,
  name,
  desc,
  checked,
  onClick,
  avatarShape = 'rounded',
  indicatorVariant = 'default',
  className = ''
}) => (
  <button type="button" className={`app-list-item app-list-item--interactive w-full text-left ${className}`.trim()} onClick={onClick}>
    <SelectionIndicator checked={checked} variant={indicatorVariant} />
    {iconName ? (
      <div className={`w-10 h-10 mr-3 flex items-center justify-center icon-bg-blue text-white ${avatarShape === 'circle' ? 'rounded-full' : 'rounded-md'}`}>
        <i className={`fa-solid ${iconName}`}></i>
      </div>
    ) : (
      <img
        src={avatar}
        className={`w-10 h-10 object-cover mr-3 ${avatarShape === 'circle' ? 'rounded-full' : 'rounded-md'}`}
      />
    )}
    <div className="app-list-item-main min-w-0">
      <div className="app-list-item-title truncate">{name}</div>
      {desc ? <div className="app-list-item-desc truncate">{desc}</div> : null}
    </div>
  </button>
);

export const SegmentedControl: React.FC<{
  value: string;
  options: Array<{ key: string; label: string; icon?: string; activeStyle?: React.CSSProperties }>;
  onChange: (value: string) => void;
  variant?: 'default' | 'pill';
}> = ({ value, options, onChange, variant = 'default' }) => (
  <div className={`app-segmented-control ${variant === 'pill' ? 'app-segmented-control--pill' : ''}`}>
    {options.map((option) => {
      const active = value === option.key;
      return (
        <button
          key={option.key}
          type="button"
          className={`app-segmented-button ${active ? 'app-segmented-button--active' : ''}`}
          style={active ? option.activeStyle : undefined}
          onClick={() => onChange(option.key)}
        >
          {option.icon ? <i className={`fa-solid ${option.icon} mr-1.5`}></i> : null}
          {option.label}
        </button>
      );
    })}
  </div>
);
