import React, { useMemo } from 'react';
import type { AppearanceSettings } from '../types';

type RgbaColor = { r: number; g: number; b: number; a: number };

type SettingsSliderRowProps = {
  label: string;
  valueText: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
};

const SettingsSliderRow: React.FC<SettingsSliderRowProps> = ({ label, valueText, min, max, step, value, onChange }) => (
  <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3">
    <div className="flex items-center justify-between mb-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <span className="text-xs text-gray-500">{valueText}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(parseFloat(event.target.value))}
      className="w-full accent-blue-500"
    />
  </div>
);

const normalizeHexColor = (value: string): string => {
  const trimmed = value.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed.split('').map((char) => char + char).join('').toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed.toLowerCase()}`;
  }
  return '';
};

const toHexColor = (color: RgbaColor): string => {
  return `#${[color.r, color.g, color.b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
};

type SettingsColorRowProps = {
  label: string;
  value?: string;
  displayValue: string;
  onChange: (value?: string) => void;
};

const SettingsColorRow: React.FC<SettingsColorRowProps> = ({ label, value, displayValue, onChange }) => {
  const resolvedValue = normalizeHexColor(value || '');
  return (
    <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <button
          type="button"
          className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100"
          onClick={() => onChange(undefined)}
        >
          恢复默认
        </button>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={displayValue}
          onChange={(event) => onChange(normalizeHexColor(event.target.value) || undefined)}
          className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
        />
        <input
          key={`${label}-${resolvedValue || 'theme'}-${displayValue}`}
          type="text"
          defaultValue={resolvedValue}
          placeholder={displayValue}
          className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          onBlur={(event) => onChange(normalizeHexColor(event.target.value) || undefined)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              (event.target as HTMLInputElement).blur();
            }
          }}
        />
      </div>
      <div className="mt-2 text-xs text-gray-500">
        {resolvedValue || `跟随主题：${displayValue}`}
      </div>
    </div>
  );
};

type DesktopBasicSettingsSectionProps = {
  settings: AppearanceSettings;
  showDock: boolean;
  safeDockOpacity: number;
  safeWidgetOpacity: number;
  showDesktopStatusBar: boolean;
  accentColor: string;
  dockSurfaceColor: RgbaColor;
  widgetSurfaceColor: RgbaColor;
  onSettingsChange?: (settings: Partial<AppearanceSettings>) => void;
};

export const DesktopBasicSettingsSection: React.FC<DesktopBasicSettingsSectionProps> = ({
  settings,
  showDock,
  safeDockOpacity,
  safeWidgetOpacity,
  showDesktopStatusBar,
  accentColor,
  dockSurfaceColor,
  widgetSurfaceColor,
  onSettingsChange
}) => {
  const dockColorInputValue = useMemo(
    () => normalizeHexColor(settings.desktopDockColor || '') || toHexColor(dockSurfaceColor),
    [settings.desktopDockColor, dockSurfaceColor]
  );
  const widgetColorInputValue = useMemo(
    () => normalizeHexColor(settings.desktopWidgetColor || '') || toHexColor(widgetSurfaceColor),
    [settings.desktopWidgetColor, widgetSurfaceColor]
  );
  const showIconLabels = settings.desktopShowIconLabels !== false;
  const showSignalIcon = settings.desktopShowSignal !== false;
  const showWifiIcon = settings.desktopShowWifi !== false;
  const showBatteryPercent = settings.desktopBatteryPercent !== false;

  return (
    <>
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-700 mb-3 block">Dock</label>
        <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50">
          <label className="text-sm font-medium text-gray-700">显示底部 Dock</label>
          <button
            type="button"
            className={`w-12 h-7 rounded-full transition-colors relative ${showDock ? '' : 'bg-gray-300'}`}
            style={showDock ? { backgroundColor: accentColor } : undefined}
            onClick={() => onSettingsChange?.({ desktopShowDock: !showDock })}
          >
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${showDock ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <SettingsSliderRow
          label="Dock 透明度"
          valueText={`${Math.round(safeDockOpacity * 100)}%`}
          min={0.1}
          max={1}
          step={0.1}
          value={safeDockOpacity}
          onChange={(value) => onSettingsChange?.({ desktopDockOpacity: value })}
        />
        <SettingsColorRow
          label="Dock 颜色"
          value={settings.desktopDockColor}
          displayValue={dockColorInputValue}
          onChange={(value) => onSettingsChange?.({ desktopDockColor: value })}
        />
      </div>

      <div className="mb-6">
        <label className="text-sm font-medium text-gray-700 mb-3 block">图标</label>
        <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 mb-3">
          <label className="text-sm font-medium text-gray-700">显示图标名称</label>
          <button
            type="button"
            className={`w-12 h-7 rounded-full transition-colors relative ${showIconLabels ? '' : 'bg-gray-300'}`}
            style={showIconLabels ? { backgroundColor: accentColor } : undefined}
            onClick={() => onSettingsChange?.({ desktopShowIconLabels: !showIconLabels })}
          >
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${showIconLabels ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <SettingsSliderRow
          label="图标大小"
          valueText={`${Math.round((settings.desktopIconScale ?? 1) * 100)}%`}
          min={0.6}
          max={1.4}
          step={0.1}
          value={settings.desktopIconScale ?? 1}
          onChange={(value) => onSettingsChange?.({ desktopIconScale: value })}
        />

        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1 block px-4">图标形状</label>
          <div className="flex gap-2 px-4">
            {([
              { key: 'default', label: '默认' },
              { key: 'rounded', label: '圆角' },
              { key: 'circle', label: '圆形' },
              { key: 'square', label: '方形' },
            ] as const).map(({ key, label }) => {
              const selected = settings.desktopIconShape === key || (key === 'default' && !settings.desktopIconShape);
              return (
                <button
                  key={key}
                  type="button"
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${selected ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  style={selected ? { backgroundColor: accentColor } : undefined}
                  onClick={() => onSettingsChange?.({ desktopIconShape: key === 'default' ? undefined : key })}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="text-sm font-medium text-gray-700 mb-3 block">状态栏</label>
        <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 mb-3">
          <label className="text-sm font-medium text-gray-700">显示状态栏</label>
          <button
            type="button"
            className={`w-12 h-7 rounded-full transition-colors relative ${showDesktopStatusBar ? '' : 'bg-gray-300'}`}
            style={showDesktopStatusBar ? { backgroundColor: accentColor } : undefined}
            onClick={() => onSettingsChange?.({ desktopShowStatusBar: !showDesktopStatusBar })}
          >
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${showDesktopStatusBar ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1 block px-4">布局模式</label>
          <div className="flex gap-2 px-4">
            {(['default', 'center', 'minimal'] as const).map((layout) => (
              <button
                key={layout}
                type="button"
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${settings.statusBarLayout === layout ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                style={settings.statusBarLayout === layout ? { backgroundColor: accentColor } : undefined}
                onClick={() => onSettingsChange?.({ statusBarLayout: layout })}
              >
                {layout === 'default' ? '默认' : layout === 'center' ? '居中' : '极简'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 mb-3">
          <label className="text-sm font-medium text-gray-700">显示信号图标</label>
          <button
            type="button"
            className={`w-12 h-7 rounded-full transition-colors relative ${showSignalIcon ? '' : 'bg-gray-300'}`}
            style={showSignalIcon ? { backgroundColor: accentColor } : undefined}
            onClick={() => onSettingsChange?.({ desktopShowSignal: !showSignalIcon })}
          >
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${showSignalIcon ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 mb-3">
          <label className="text-sm font-medium text-gray-700">显示WiFi图标</label>
          <button
            type="button"
            className={`w-12 h-7 rounded-full transition-colors relative ${showWifiIcon ? '' : 'bg-gray-300'}`}
            style={showWifiIcon ? { backgroundColor: accentColor } : undefined}
            onClick={() => onSettingsChange?.({ desktopShowWifi: !showWifiIcon })}
          >
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${showWifiIcon ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50">
          <label className="text-sm font-medium text-gray-700">显示日期</label>
          <button
            type="button"
            className={`w-12 h-7 rounded-full transition-colors relative ${settings.statusBarShowDate === true ? '' : 'bg-gray-300'}`}
            style={settings.statusBarShowDate === true ? { backgroundColor: accentColor } : undefined}
            onClick={() => onSettingsChange?.({ statusBarShowDate: !settings.statusBarShowDate })}
          >
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${settings.statusBarShowDate === true ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      <div className="mb-6">
        <label className="text-sm font-medium text-gray-700 mb-3 block">小组件</label>
        <SettingsSliderRow
          label="小组件不透明度"
          valueText={`${Math.round(safeWidgetOpacity * 100)}%`}
          min={0.2}
          max={1}
          step={0.1}
          value={safeWidgetOpacity}
          onChange={(value) => onSettingsChange?.({ desktopWidgetOpacity: value })}
        />
        <SettingsColorRow
          label="小组件颜色"
          value={settings.desktopWidgetColor}
          displayValue={widgetColorInputValue}
          onChange={(value) => onSettingsChange?.({ desktopWidgetColor: value })}
        />
      </div>

      <div className="mb-6">
        <label className="text-sm font-medium text-gray-700 mb-3 block">功能</label>
        <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 mb-3">
          <label className="text-sm font-medium text-gray-700">24小时制</label>
          <button
            type="button"
            className={`w-12 h-7 rounded-full transition-colors relative ${settings.desktop24Hour ? '' : 'bg-gray-300'}`}
            style={settings.desktop24Hour ? { backgroundColor: accentColor } : undefined}
            onClick={() => onSettingsChange?.({ desktop24Hour: !settings.desktop24Hour })}
          >
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${settings.desktop24Hour ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50">
          <label className="text-sm font-medium text-gray-700">显示电池百分比</label>
          <button
            type="button"
            className={`w-12 h-7 rounded-full transition-colors relative ${showBatteryPercent ? '' : 'bg-gray-300'}`}
            style={showBatteryPercent ? { backgroundColor: accentColor } : undefined}
            onClick={() => onSettingsChange?.({ desktopBatteryPercent: !showBatteryPercent })}
          >
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${showBatteryPercent ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>
    </>
  );
};

export default DesktopBasicSettingsSection;
