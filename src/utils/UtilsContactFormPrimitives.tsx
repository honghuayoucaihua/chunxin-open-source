import React from 'react';
import { AppSwitch } from './AppSwitch';

export { AppSwitch } from './AppSwitch';

export const InlineFieldRow: React.FC<{
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}> = ({ label, value, placeholder, onChange }) => (
  <div className="app-list-item">
    <div className="app-list-item-main max-w-[7rem]">
      <div className="app-list-item-title">{label}</div>
    </div>
    <div className="app-list-item-side flex-1">
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="app-field-input app-list-item-input text-right text-[14px] render-text-primary"
      />
    </div>
  </div>
);

export const InlineToggleRow: React.FC<{
  label: string;
  desc?: string;
  active: boolean;
  onToggle: () => void;
}> = ({ label, desc, active, onToggle }) => (
  <button type="button" className="app-list-item app-list-item--interactive app-list-item-toggle" onClick={onToggle}>
    <div className="app-list-item-main">
      <div className="app-list-item-title">{label}</div>
      {desc ? <div className="app-list-item-desc">{desc}</div> : null}
    </div>
    <div className="app-list-item-side">
      <i className={`fa-${active ? 'solid' : 'regular'} fa-circle-check text-[16px] ${active ? 'text-[#07c160]' : 'text-gray-400'}`} />
    </div>
  </button>
);

export const InlineSelectRow: React.FC<{
  label: string;
  value: string;
  options: readonly string[];
  emptyLabel?: string;
  onChange: (value: string) => void;
}> = ({ label, value, options, emptyLabel, onChange }) => (
  <div className="app-list-item">
    <div className="app-list-item-main max-w-[7rem]">
      <div className="app-list-item-title">{label}</div>
    </div>
    <div className="app-list-item-side flex-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="app-field-select app-list-item-input app-list-item-select text-[14px] render-text-primary"
      >
        {emptyLabel ? <option value="">{emptyLabel}</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  </div>
);

export const TextareaFieldBlock: React.FC<{
  label: string;
  desc?: string;
  value: string;
  placeholder: string;
  rowsClassName: string;
  onChange: (value: string) => void;
}> = ({ label, desc, value, placeholder, rowsClassName, onChange }) => (
  <div className="render-bg-secondary app-textarea-block">
    <div className="app-textarea-block-title">{label}</div>
    {desc ? <div className="app-textarea-block-desc">{desc}</div> : null}
    <textarea
      className={`app-field-textarea ${rowsClassName} text-[14px] render-text-primary`}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

export const InlineSegmentedRow: React.FC<{
  label: string;
  value: string;
  options: Array<{ key: string; label: string }>;
  onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => (
  <div className="app-list-item">
    <div className="app-list-item-main max-w-[7rem]">
      <div className="app-list-item-title">{label}</div>
    </div>
    <div className="app-list-item-side app-list-item-segmented">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className={`app-button app-button-muted app-segmented-button ${value === option.key ? 'app-segmented-button--active' : ''}`}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);

export const InlineRangeRow: React.FC<{
  label: string;
  min: number;
  max: number;
  onChangeMin: (value: number) => void;
  onChangeMax: (value: number) => void;
}> = ({ label, min, max, onChangeMin, onChangeMax }) => (
  <div className="app-list-item">
    <div className="app-list-item-main max-w-[7rem]">
      <div className="app-list-item-title">{label}</div>
    </div>
    <div className="app-list-item-side app-range-row">
      <input
        value={min}
        onChange={(e) => onChangeMin(Number(e.target.value) || 0)}
        className="app-field-input app-list-item-input app-range-input text-center text-[14px] render-text-primary"
      />
      <span className="app-range-separator">~</span>
      <input
        value={max}
        onChange={(e) => onChangeMax(Number(e.target.value) || 0)}
        className="app-field-input app-list-item-input app-range-input text-center text-[14px] render-text-primary"
      />
    </div>
  </div>
);

export const InlineSwitchRow: React.FC<{
  label: string;
  desc?: string;
  active: boolean;
  onChange: () => void;
}> = ({ label, desc, active, onChange }) => (
  <div className="app-list-item">
    <div className="app-list-item-main">
      <div className="app-list-item-title">{label}</div>
      {desc ? <div className="app-list-item-desc">{desc}</div> : null}
    </div>
    <div className="app-list-item-side">
      <AppSwitch active={active} onChange={onChange} />
    </div>
  </div>
);

export const InlineActionRow: React.FC<{
  label: string;
  rightText?: string;
  danger?: boolean;
  onClick: () => void;
}> = ({ label, rightText, danger = false, onClick }) => (
  <button type="button" className={`app-list-item app-list-item--interactive ${danger ? 'app-list-item--danger' : ''}`} onClick={onClick}>
    <div className="app-list-item-main">
      <div className="app-list-item-title">{label}</div>
    </div>
    {rightText ? (
      <div className="app-list-item-side">
        <span className="app-list-item-desc !mt-0">{rightText}</span>
      </div>
    ) : null}
  </button>
);

export const InlineChoiceRow: React.FC<{
  label: string;
  desc?: string;
  checked: boolean;
  type?: 'checkbox' | 'radio';
  name?: string;
  variant?: 'default' | 'forum';
  onChange: (checked: boolean) => void;
}> = ({ label, desc, checked, type = 'checkbox', name, variant = 'default', onChange }) => (
  <label className={`app-list-item app-list-item--interactive ${variant === 'forum' ? 'app-list-item--forum-choice' : ''}`}>
    <div className="app-list-item-main">
      <div className="app-list-item-title truncate">{label}</div>
      {desc ? <div className="app-list-item-desc truncate">{desc}</div> : null}
    </div>
    <div className="app-list-item-side">
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  </label>
);

export const InlineIdentityRow: React.FC<{
  label: string;
  avatar: string;
  value: string;
  expanded: boolean;
  onToggle: () => void;
  menu: React.ReactNode;
  variant?: 'default' | 'forum';
}> = ({ label, avatar, value, expanded, onToggle, menu, variant = 'default' }) => (
  <div className={`app-field-row ${variant === 'forum' ? 'app-field-row--forum' : ''}`}>
    <div className="relative">
      <button className="app-icon-button w-9 h-9 rounded-full overflow-hidden" onClick={onToggle}>
        <img src={avatar} className="w-full h-full object-cover" />
      </button>
      {expanded ? menu : null}
    </div>
    <span className="text-xs render-text-secondary">{label}：{value}</span>
  </div>
);

export const InlineOptionsList: React.FC<{
  options: string[];
  value: string;
  onSelect: (value: string) => void;
  variant?: 'default' | 'moment';
}> = ({ options, value, onSelect, variant = 'default' }) => (
  <div className={`app-options-list ${variant === 'moment' ? 'app-options-list--moment' : ''}`}>
    {options.map((option) => (
      <button
        key={option}
        type="button"
        className={`app-list-item app-list-item--soft ${variant === 'moment' ? 'app-list-item--moment-setting' : ''} text-sm cursor-pointer`}
        style={value === option ? { color: 'var(--app-accent-color)' } : undefined}
        onClick={() => onSelect(option)}
      >
        <div className="app-list-item-main">
          <div className="app-list-item-title">{option}</div>
        </div>
        <div className="app-list-item-side">
          {value === option ? <i className="fa-solid fa-check"></i> : null}
        </div>
      </button>
    ))}
  </div>
);
