import React, { useRef } from 'react';
import type { AppearanceSettings, DesktopSystemNavigationAction } from '../types';

type DesktopSystemNavigationMode = NonNullable<AppearanceSettings['desktopSystemNavigationMode']>;
type AssistiveTouchShape = NonNullable<AppearanceSettings['desktopSystemNavigationAssistiveTouchShape']>;

const SYSTEM_NAVIGATION_MODE_OPTIONS: Array<{ key: DesktopSystemNavigationMode; label: string }> = [
  { key: 'gesture', label: '手势' },
  { key: 'buttons', label: '导航键' },
  { key: 'assistiveTouch', label: '小白点' },
];

const ASSISTIVE_TOUCH_ACTION_OPTIONS: Array<{ key: DesktopSystemNavigationAction; label: string }> = [
  { key: 'home', label: '返回桌面' },
  { key: 'back', label: '返回上一级' },
  { key: 'settings', label: '打开桌面设置' },
  { key: 'lock', label: '锁定桌面' },
  { key: 'none', label: '无动作' },
];

const ASSISTIVE_TOUCH_SHAPE_OPTIONS: Array<{ key: AssistiveTouchShape; label: string }> = [
  { key: 'circle', label: '圆形' },
  { key: 'rounded', label: '圆角矩形' },
  { key: 'square', label: '方形' },
];

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

type DesktopSystemNavigationSettingsSectionProps = {
  settings: AppearanceSettings;
  accentColor: string;
  onSettingsChange?: (settings: Partial<AppearanceSettings>) => void;
};

export const DesktopSystemNavigationSettingsSection: React.FC<DesktopSystemNavigationSettingsSectionProps> = ({
  settings,
  accentColor,
  onSettingsChange
}) => {
  const assistiveTouchImageInputRef = useRef<HTMLInputElement>(null);
  const desktopSystemNavigationMode = settings.desktopSystemNavigationMode ?? 'gesture';
  const assistiveTouchSingleTapAction = settings.desktopSystemNavigationAssistiveTouchSingleTapAction ?? 'home';
  const assistiveTouchDoubleTapAction = settings.desktopSystemNavigationAssistiveTouchDoubleTapAction ?? 'back';
  const assistiveTouchOpacity = settings.desktopSystemNavigationAssistiveTouchOpacity ?? 0.72;
  const assistiveTouchSize = settings.desktopSystemNavigationAssistiveTouchSize ?? 56;
  const assistiveTouchColor = settings.desktopSystemNavigationAssistiveTouchColor || 'rgba(24, 24, 28, 0.82)';
  const assistiveTouchBorderColor = settings.desktopSystemNavigationAssistiveTouchBorderColor || 'rgba(255, 255, 255, 0.28)';
  const assistiveTouchBorderWidth = settings.desktopSystemNavigationAssistiveTouchBorderWidth ?? 1;
  const assistiveTouchFreePosition = settings.desktopSystemNavigationAssistiveTouchFreePosition === true;
  const assistiveTouchShape = settings.desktopSystemNavigationAssistiveTouchShape ?? 'circle';
  const assistiveTouchPreviewSize = Math.max(Math.min(assistiveTouchSize, 56), 40);
  const assistiveTouchPreviewRadius = assistiveTouchShape === 'square'
    ? 0
    : assistiveTouchShape === 'rounded'
      ? Math.max(Math.round(assistiveTouchPreviewSize * 0.32), 14)
      : assistiveTouchPreviewSize / 2;

  const handleAssistiveTouchImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onSettingsChange?.({ desktopSystemNavigationAssistiveTouchImage: reader.result as string });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <div className="mb-6">
      <label className="text-sm font-medium text-gray-700 mb-3 block">系统导航</label>
      <div className="grid grid-cols-3 gap-2 px-0">
        {SYSTEM_NAVIGATION_MODE_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${desktopSystemNavigationMode === key ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            style={desktopSystemNavigationMode === key ? { backgroundColor: accentColor } : undefined}
            onClick={() => onSettingsChange?.({ desktopSystemNavigationMode: key })}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-2 px-1 text-xs text-gray-500">
        手势模式保留现在的边缘返回与底部上滑；导航键和小白点会替代这组手势。
      </p>

      {desktopSystemNavigationMode === 'assistiveTouch' && (
        <div className="mt-3 space-y-3 rounded-2xl bg-gray-50 px-4 py-4">
          <div>
            <label className="text-xs text-gray-500 mb-2 block">单击动作</label>
            <div className="flex flex-wrap gap-2">
              {ASSISTIVE_TOUCH_ACTION_OPTIONS.map(({ key, label }) => (
                <button
                  key={`assistive-single-${key}`}
                  type="button"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${assistiveTouchSingleTapAction === key ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                  style={assistiveTouchSingleTapAction === key ? { backgroundColor: accentColor } : undefined}
                  onClick={() => onSettingsChange?.({ desktopSystemNavigationAssistiveTouchSingleTapAction: key })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">双击动作</label>
            <div className="flex flex-wrap gap-2">
              {ASSISTIVE_TOUCH_ACTION_OPTIONS.map(({ key, label }) => (
                <button
                  key={`assistive-double-${key}`}
                  type="button"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${assistiveTouchDoubleTapAction === key ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                  style={assistiveTouchDoubleTapAction === key ? { backgroundColor: accentColor } : undefined}
                  onClick={() => onSettingsChange?.({ desktopSystemNavigationAssistiveTouchDoubleTapAction: key })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-gray-700">自由摆放</div>
                <p className="mt-1 text-xs text-gray-500">打开后可把小白点拖到屏幕任意位置；关闭后会自动贴边。</p>
              </div>
              <button
                type="button"
                aria-label="切换小白点自由摆放"
                className={`relative h-7 w-12 rounded-full transition-colors ${assistiveTouchFreePosition ? 'bg-blue-500' : 'bg-gray-200'}`}
                onClick={() => onSettingsChange?.({ desktopSystemNavigationAssistiveTouchFreePosition: !assistiveTouchFreePosition })}
              >
                <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${assistiveTouchFreePosition ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">形状</label>
            <div className="grid grid-cols-3 gap-2">
              {ASSISTIVE_TOUCH_SHAPE_OPTIONS.map(({ key, label }) => (
                <button
                  key={`assistive-shape-${key}`}
                  type="button"
                  className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors ${assistiveTouchShape === key ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                  style={assistiveTouchShape === key ? { backgroundColor: accentColor } : undefined}
                  onClick={() => onSettingsChange?.({ desktopSystemNavigationAssistiveTouchShape: key })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <SettingsSliderRow
            label="小白点透明度"
            valueText={`${Math.round(assistiveTouchOpacity * 100)}%`}
            min={0.2}
            max={1}
            step={0.05}
            value={assistiveTouchOpacity}
            onChange={(value) => onSettingsChange?.({ desktopSystemNavigationAssistiveTouchOpacity: value })}
          />

          <SettingsSliderRow
            label="小白点尺寸"
            valueText={`${Math.round(assistiveTouchSize)}px`}
            min={40}
            max={88}
            step={2}
            value={assistiveTouchSize}
            onChange={(value) => onSettingsChange?.({ desktopSystemNavigationAssistiveTouchSize: value })}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">小白点颜色</label>
              <input
                type="text"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-400"
                value={assistiveTouchColor}
                placeholder="rgba(24, 24, 28, 0.82)"
                onChange={(event) => onSettingsChange?.({ desktopSystemNavigationAssistiveTouchColor: event.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">边框颜色</label>
              <input
                type="text"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-400"
                value={assistiveTouchBorderColor}
                placeholder="rgba(255, 255, 255, 0.28)"
                onChange={(event) => onSettingsChange?.({ desktopSystemNavigationAssistiveTouchBorderColor: event.target.value })}
              />
            </div>
          </div>

          <SettingsSliderRow
            label="边框宽度"
            valueText={`${Math.round(assistiveTouchBorderWidth)}px`}
            min={0}
            max={6}
            step={1}
            value={assistiveTouchBorderWidth}
            onChange={(value) => onSettingsChange?.({ desktopSystemNavigationAssistiveTouchBorderWidth: value })}
          />

          <div className="rounded-2xl bg-white px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-gray-700">自定义图片</div>
                <p className="mt-1 text-xs text-gray-500">上传后会直接替换默认 iOS 小白点样式。</p>
              </div>
              {settings.desktopSystemNavigationAssistiveTouchImage && (
                <button
                  type="button"
                  className="px-2.5 py-1 rounded-lg bg-gray-100 text-xs text-gray-500 hover:bg-gray-200 transition-colors"
                  onClick={() => onSettingsChange?.({ desktopSystemNavigationAssistiveTouchImage: '' })}
                >
                  清除
                </button>
              )}
            </div>
            <input
              ref={assistiveTouchImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAssistiveTouchImageUpload}
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-xs text-gray-600 hover:bg-gray-200 transition-colors"
                onClick={() => assistiveTouchImageInputRef.current?.click()}
              >
                <i className="fa-solid fa-upload mr-1" /> 上传图片
              </button>
              <div
                className="flex items-center justify-center overflow-hidden border border-gray-200 bg-gray-100"
                style={{
                  width: assistiveTouchPreviewSize,
                  height: assistiveTouchPreviewSize,
                  borderRadius: assistiveTouchPreviewRadius,
                }}
              >
                {settings.desktopSystemNavigationAssistiveTouchImage ? (
                  <img
                    src={settings.desktopSystemNavigationAssistiveTouchImage}
                    alt="小白点预览"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    style={{
                      width: Math.max(assistiveTouchPreviewSize * 0.32, 14),
                      height: Math.max(assistiveTouchPreviewSize * 0.32, 14),
                      borderRadius: assistiveTouchShape === 'square'
                        ? 0
                        : assistiveTouchShape === 'rounded'
                          ? Math.max(Math.round(assistiveTouchPreviewSize * 0.12), 6)
                          : Math.max(assistiveTouchPreviewSize * 0.16, 8),
                      background: 'rgba(255, 255, 255, 0.94)',
                      boxShadow: '0 0 12px rgba(255,255,255,0.2)',
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesktopSystemNavigationSettingsSection;
