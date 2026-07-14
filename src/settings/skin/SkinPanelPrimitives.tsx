import React from 'react';
import { SharedCodeBlock, SharedPreviewCard, SharedSectionCard } from '../SharedPanelPrimitives';

export const SkinPanelCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={['app-surface-panel app-skin-panel-card', className].filter(Boolean).join(' ')}>
    {children}
  </div>
);

export const SkinPanelGridCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={['app-surface-panel app-skin-panel-card app-skin-panel-card--grid', className].filter(Boolean).join(' ')}>
    {children}
  </div>
);

export const SkinInlineStat: React.FC<{
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
}> = ({ label, value, className = '' }) => (
  <div className={['app-skin-inline-stat', className].filter(Boolean).join(' ')}>
    <div className="app-skin-inline-stat-label">{label}</div>
    <div className="app-skin-inline-stat-value">{value}</div>
  </div>
);

export const SkinColorField: React.FC<{
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <label className="app-skin-color-field">
    <span className="app-skin-color-field-label">{label}</span>
    <input
      type="color"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="app-skin-color-field-input"
    />
  </label>
);

export const SkinAssetRow: React.FC<{
  iconClass: string;
  preview?: string;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  primaryLabel: React.ReactNode;
  secondaryLabel: React.ReactNode;
  onPrimaryClick: () => void;
  onSecondaryClick: () => void;
}> = ({ iconClass, preview, title, subtitle, primaryLabel, secondaryLabel, onPrimaryClick, onSecondaryClick }) => (
  <div className="app-skin-asset-row">
    <div className="app-skin-asset-row-icon">
      <i className={`fa-solid ${iconClass}`} />
    </div>
    <div className="app-skin-asset-row-preview">
      {preview ? <img src={preview} className="w-full h-full object-contain" /> : <span className="text-[10px] render-text-tertiary">无</span>}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-xs render-text-primary truncate">{title}</div>
      <div className="text-[11px] render-text-tertiary truncate">{subtitle}</div>
    </div>
    <button
      type="button"
      className="px-2 py-1 rounded text-xs text-white"
      style={{ backgroundColor: 'var(--app-accent-color)' }}
      onClick={onPrimaryClick}
    >
      {primaryLabel}
    </button>
    <button
      type="button"
      className="px-2 py-1 rounded text-xs border render-border"
      onClick={onSecondaryClick}
    >
      {secondaryLabel}
    </button>
  </div>
);

export const SkinPresetButton: React.FC<{
  title: React.ReactNode;
  accent: string;
  bubbleMe: string;
  bubbleOther: string;
  active?: boolean;
  onClick: () => void;
}> = ({ title, accent, bubbleMe, bubbleOther, active = false, onClick }) => (
  <button
    type="button"
    className={`app-skin-preset-button ${active ? 'app-skin-preset-button--active' : ''}`.trim()}
    onClick={onClick}
  >
    <div className="app-skin-preset-button-title">{title}</div>
    <div className="app-skin-preset-button-swatches">
      <span className="app-skin-preset-button-swatch" style={{ backgroundColor: accent }} />
      <span className="app-skin-preset-button-swatch app-skin-preset-button-swatch--bordered" style={{ backgroundColor: bubbleMe }} />
      <span className="app-skin-preset-button-swatch app-skin-preset-button-swatch--bordered" style={{ backgroundColor: bubbleOther }} />
    </div>
  </button>
);

export const SkinThemeRow: React.FC<{
  title: React.ReactNode;
  subtitle: React.ReactNode;
  activeLabel: React.ReactNode;
  inactiveLabel: React.ReactNode;
  active?: boolean;
  onApply: () => void;
  onDelete: () => void;
}> = ({ title, subtitle, activeLabel, inactiveLabel, active = false, onApply, onDelete }) => (
  <div className="app-skin-theme-row">
    <div className="app-skin-theme-row-main">
      <div className="app-skin-theme-row-title">{title}</div>
      <div className="app-skin-theme-row-subtitle">{subtitle}</div>
    </div>
    <button
      type="button"
      className={`app-skin-theme-row-action ${active ? 'app-skin-theme-row-action--active' : ''}`.trim()}
      onClick={onApply}
    >
      {active ? activeLabel : inactiveLabel}
    </button>
    <button
      type="button"
      className="app-skin-theme-row-delete"
      onClick={onDelete}
    >
      删除
    </button>
  </div>
);

export const SkinNumberRow: React.FC<{
  label: React.ReactNode;
  value: string | number;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <label className="app-skin-number-row">
    <span className="app-skin-number-row-label">{label}</span>
    <input
      inputMode="numeric"
      pattern="[0-9]*"
      className="app-skin-number-row-input"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
);

export const SkinColorPresetButton: React.FC<{
  title: React.ReactNode;
  accent: string;
  secondary: string;
  active?: boolean;
  onClick: () => void;
}> = ({ title, accent, secondary, active = false, onClick }) => (
  <button
    type="button"
    className={`app-skin-color-preset-button ${active ? 'app-skin-color-preset-button--active' : ''}`.trim()}
    onClick={onClick}
  >
    <div className="app-skin-color-preset-button-swatches">
      <span className="app-skin-color-preset-button-dot" style={{ backgroundColor: accent }} />
      <span className="app-skin-color-preset-button-dot app-skin-color-preset-button-dot--secondary" style={{ backgroundColor: secondary }} />
    </div>
    <div className="app-skin-color-preset-button-title">{title}</div>
  </button>
);

export const SkinActionToolbar: React.FC<{
  actions: Array<{
    key: string;
    label: React.ReactNode;
    variant?: 'primary' | 'default';
    onClick: () => void;
  }>;
}> = ({ actions }) => (
  <div className="app-skin-action-toolbar">
    {actions.map((action) => (
      <button
        key={action.key}
        type="button"
        className={`app-skin-action-toolbar-button ${action.variant === 'primary' ? 'app-skin-action-toolbar-button--primary' : ''}`.trim()}
        onClick={action.onClick}
      >
        {action.label}
      </button>
    ))}
  </div>
);

export const SkinSliderCard: React.FC<{
  label: React.ReactNode;
  valueText: React.ReactNode;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}> = ({ label, valueText, value, min = 0, max = 100, step = 1, onChange }) => (
  <SkinPanelCard className="px-3 py-2">
    <SkinInlineStat className="mb-2" label={label} value={valueText} />
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value) || 0)}
      className="app-skin-slider-card-range"
    />
  </SkinPanelCard>
);

export const SkinRowsPanel: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <SkinPanelCard className="p-0 overflow-hidden">
    {children}
  </SkinPanelCard>
);

export const SkinSectionSummary: React.FC<{
  title: React.ReactNode;
  summary?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}> = ({ title, summary, meta, className = '' }) => (
  <div className={['flex items-center justify-between gap-2', className].filter(Boolean).join(' ')}>
    <div className="min-w-0">
      <div className="text-sm font-medium render-text-primary truncate">{title}</div>
      {summary ? <div className="text-[11px] render-text-tertiary truncate mt-0.5">{summary}</div> : null}
    </div>
    {meta ? <div className="text-[11px] render-text-tertiary whitespace-nowrap">{meta}</div> : null}
  </div>
);

export const SkinSearchBar: React.FC<{
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onClear?: () => void;
}> = ({ value, placeholder, onChange, onClear }) => (
  <div className="flex items-center gap-2">
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="app-field-input flex-1"
    />
    {value.trim() && onClear ? (
      <button type="button" className="app-button app-button-muted" onClick={onClear}>
        清空
      </button>
    ) : null}
  </div>
);

export const SkinEmptyState: React.FC<{
  message: React.ReactNode;
}> = ({ message }) => (
  <SkinPanelCard className="text-sm render-text-tertiary text-center">
    {message}
  </SkinPanelCard>
);

export const SkinAssetList: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <div className="grid grid-cols-1 gap-2">
    {children}
  </div>
);

export const SkinSectionBody: React.FC<{
  children: React.ReactNode;
  dense?: boolean;
}> = ({ children, dense = false }) => (
  <div className={dense ? 'space-y-2' : 'space-y-3'}>
    {children}
  </div>
);

export const SkinRangeField: React.FC<{
  label: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, step = 1, disabled = false, onChange }) => (
  <div className={disabled ? 'opacity-40 pointer-events-none' : ''}>
    <label className="text-xs text-gray-500 mb-1 block">
      {label}（{value}）
    </label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full accent-[var(--app-accent-color)]"
      disabled={disabled}
    />
  </div>
);

export const SkinSelectField: React.FC<{
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: React.ReactNode }>;
}> = ({ label, value, onChange, options }) => (
  <div>
    <label className="text-xs text-gray-500">{label}</label>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="app-field-select mt-1"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

export const SkinNoticeCard: React.FC<{
  children: React.ReactNode;
  tone?: 'default' | 'warning' | 'info';
}> = ({ children, tone = 'default' }) => {
  const toneClass =
    tone === 'warning'
      ? 'text-amber-700 bg-amber-500/10'
      : tone === 'info'
        ? 'text-purple-600 bg-purple-500/10'
        : 'render-text-tertiary render-bg-tertiary';
  return (
    <div className={`rounded px-2 py-1.5 text-[12px] ${toneClass}`.trim()}>
      {children}
    </div>
  );
};

export const SkinColorOverrideCard: React.FC<{
  label: React.ReactNode;
  value: string;
  fallback: string;
  resetLabel?: React.ReactNode;
  hideReset?: boolean;
  onChange: (value: string) => void;
  onReset: () => void;
}> = ({ label, value, fallback, resetLabel = '跟随皮肤', hideReset = false, onChange, onReset }) => (
  <div className="app-surface-panel app-surface-panel--soft app-skin-override-card">
    <div className="text-[11px] text-gray-500 mb-1">{label}</div>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || fallback}
        onChange={(event) => onChange(event.target.value)}
        className="app-skin-override-card-color"
      />
      {!hideReset ? (
        <button
          type="button"
          className="app-skin-override-card-reset"
          onClick={onReset}
        >
          {resetLabel}
        </button>
      ) : null}
    </div>
  </div>
);

export const SkinTextOverrideCard: React.FC<{
  label: React.ReactNode;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}> = ({ label, value, placeholder, onChange }) => (
  <div className="app-surface-panel app-surface-panel--soft app-skin-override-card">
    <div className="text-[11px] text-gray-500 mb-1">{label}</div>
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="app-field-input app-skin-override-card-input"
    />
  </div>
);

export const SkinSectionCard: React.FC<{
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, children, className = '' }) => (
  <SharedSectionCard title={title} className={['app-skin-section-card', className].filter(Boolean).join(' ')}>
    {children}
  </SharedSectionCard>
);

export const SkinPreviewCard: React.FC<{
  title: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <SharedPreviewCard
    title={title}
    className="app-skin-preview-card"
    headerClassName="app-skin-preview-card-header"
    bodyClassName="app-skin-preview-card-body"
  >
    {children}
  </SharedPreviewCard>
);

export const SkinGuideList: React.FC<{
  title?: React.ReactNode;
  items: React.ReactNode[];
}> = ({ title, items }) => (
  <div className="text-xs render-text-tertiary space-y-1">
    {title ? <div className="font-medium render-text-primary">{title}</div> : null}
    {items.map((item, index) => (
      <div key={index}>{item}</div>
    ))}
  </div>
);

export const SkinCodeBlock: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <SharedCodeBlock className={['app-skin-code-block', className].filter(Boolean).join(' ')}>
    {children}
  </SharedCodeBlock>
);

export const SkinTabNav: React.FC<{
  items: Array<{ key: string; label: React.ReactNode }>;
  activeKey: string;
  onChange: (key: string) => void;
}> = ({ items, activeKey, onChange }) => (
  <div className="grid grid-cols-4 gap-1">
    {items.map((item) => {
      const active = activeKey === item.key;
      return (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={`h-8 rounded-md text-xs font-medium border ${active ? 'text-white border-transparent' : 'render-border render-text-secondary'}`}
          style={active ? { backgroundColor: 'var(--app-accent-color)' } : {}}
        >
          {item.label}
        </button>
      );
    })}
  </div>
);

export const SkinLivePreviewCard: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  bubbleRadius: number;
  colors: {
    bgPrimary: string;
    bgTertiary: string;
    textSecondary: string;
    border: string;
    bubbleOther: string;
    bubbleTextOther: string;
    bubbleMe: string;
    bubbleTextMe: string;
  };
  footerItems: React.ReactNode[];
}> = ({ title, subtitle, bubbleRadius, colors, footerItems }) => (
  <div className="app-surface-panel app-surface-panel--soft app-skin-live-preview-card" style={{ background: colors.bgPrimary }}>
    <div className="app-skin-live-preview-card-header" style={{ color: colors.textSecondary, borderBottom: `1px solid ${colors.border}` }}>
      {title}
      {subtitle ? <> · {subtitle}</> : null}
    </div>
    <div className="app-skin-live-preview-card-body" style={{ background: colors.bgTertiary }}>
      <div className="flex justify-start">
        <div className="max-w-[74%] text-xs px-3 py-2" style={{ background: colors.bubbleOther, color: colors.bubbleTextOther, borderRadius: `${bubbleRadius}px` }}>
          你好呀，这是预览消息
        </div>
      </div>
      <div className="flex justify-end">
        <div className="max-w-[74%] text-xs px-3 py-2" style={{ background: colors.bubbleMe, color: colors.bubbleTextMe, borderRadius: `${bubbleRadius}px` }}>
          当前皮肤效果一目了然
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px]" style={{ color: colors.textSecondary }}>
        {footerItems.map((item, index) => (
          <span key={index}>{item}</span>
        ))}
      </div>
    </div>
  </div>
);
