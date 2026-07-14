import React, { useRef } from 'react';
import type { AppearanceSettings } from '../types';

type WallpaperPreset = {
  name: string;
  value: string;
};

type DesktopLockSettingsSectionProps = {
  settings: AppearanceSettings;
  normalizedLockPasscode: string;
  accentColor: string;
  wallpaperPresets: WallpaperPreset[];
  onSettingsChange?: (settings: Partial<AppearanceSettings>) => void;
};

export const DesktopLockSettingsSection: React.FC<DesktopLockSettingsSectionProps> = ({
  settings,
  normalizedLockPasscode,
  accentColor,
  wallpaperPresets,
  onSettingsChange
}) => {
  const lockWallpaperInputRef = useRef<HTMLInputElement>(null);

  const handleLockWallpaperUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onSettingsChange?.({ desktopLockWallpaper: reader.result as string });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <div className="mb-6">
      <label className="text-sm font-medium text-gray-700 mb-3 block">锁屏</label>
      <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 mb-3">
        <div>
          <div className="text-sm font-medium text-gray-700">启用开屏锁屏</div>
          <p className="text-xs text-gray-500 mt-1">开启后，每次重新打开应用都会先进入锁屏页；桌面的“一键锁屏”图标可随时临时锁定。</p>
        </div>
        <button
          type="button"
          className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ml-3 ${settings.desktopLockEnabled ? '' : 'bg-gray-300'}`}
          style={settings.desktopLockEnabled ? { backgroundColor: accentColor } : undefined}
          onClick={() => onSettingsChange?.({ desktopLockEnabled: !settings.desktopLockEnabled })}
        >
          <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${settings.desktopLockEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      <div className="rounded-2xl bg-gray-50 px-4 py-4 mb-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <label className="text-sm font-medium text-gray-700">锁屏密码</label>
          {!!normalizedLockPasscode && (
            <button
              type="button"
              className="px-2.5 py-1 rounded-lg bg-white text-xs text-gray-500 hover:bg-gray-100 transition-colors"
              onClick={() => onSettingsChange?.({ desktopLockPasscode: '' })}
            >
              清空密码
            </button>
          )}
        </div>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="留空则滑动解锁，支持 4-6 位数字"
          value={normalizedLockPasscode}
          onChange={(event) => onSettingsChange?.({ desktopLockPasscode: event.target.value.replace(/\D/g, '').slice(0, 6) })}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-400"
        />
        <p className="text-xs text-gray-500 mt-2">未满 4 位时会按“未设置密码”处理，打开后直接滑动解锁。</p>
      </div>

      <div className="rounded-2xl bg-gray-50 px-4 py-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <label className="text-sm font-medium text-gray-700">锁屏壁纸</label>
          <button
            type="button"
            className="px-2.5 py-1 rounded-lg bg-white text-xs text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
            onClick={() => onSettingsChange?.({ desktopLockWallpaper: '' })}
          >
            跟随桌面壁纸
          </button>
        </div>
        <input
          type="text"
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="输入图片 URL 或渐变；留空则跟随桌面壁纸"
          value={settings.desktopLockWallpaper || ''}
          onChange={(event) => onSettingsChange?.({ desktopLockWallpaper: event.target.value })}
        />
        <input
          ref={lockWallpaperInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLockWallpaperUpload}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-white text-xs text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={() => lockWallpaperInputRef.current?.click()}
          >
            <i className="fa-solid fa-upload mr-1" /> 上传壁纸
          </button>
          {wallpaperPresets.map((preset) => (
            <button
              key={`lock-wallpaper-${preset.name}`}
              type="button"
              className="px-3 py-1.5 rounded-lg bg-white text-xs text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={() => onSettingsChange?.({ desktopLockWallpaper: preset.value })}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DesktopLockSettingsSection;
