import React, { useRef } from 'react';
import type { AppearanceSettings, DesktopIcon } from '../types';
import { DEFAULT_APPEARANCE_SETTINGS } from '../constants';

type DesktopThemeId = NonNullable<AppearanceSettings['desktopThemeId']>;

export type DesktopThemeOption = {
  id: DesktopThemeId;
  name: string;
};

type WallpaperPreset = {
  name: string;
  value: string;
};

type DesktopThemeDiyPanelProps = {
  settings: AppearanceSettings;
  wallpaper: string;
  wallpaperPresets: WallpaperPreset[];
  wallpaperOpacity: number;
  wallpaperBlur: number;
  themeId: DesktopThemeId;
  themeOptions: DesktopThemeOption[];
  accentColor: string;
  iconShape: string;
  gridCols: number;
  gridRows: number;
  maxGridCols: number;
  maxGridRows: number;
  desktopIcons: DesktopIcon[];
  contentPaddingBottom: string;
  onClose: () => void;
  onSettingsChange?: (settings: Partial<AppearanceSettings>) => void;
  onSaveIcons: (icons: DesktopIcon[]) => void;
  getIconStyle: (icon: DesktopIcon) => React.CSSProperties;
  renderIconContent: (icon: DesktopIcon) => React.ReactNode;
};

const columnOptions = [3, 4, 5, 6, 7, 8, 9, 10];
const rowOptions = [4, 5, 6, 7, 8, 9, 10, 11, 12];

export const DesktopThemeDiyPanel: React.FC<DesktopThemeDiyPanelProps> = ({
  settings,
  wallpaper,
  wallpaperPresets,
  wallpaperOpacity,
  wallpaperBlur,
  themeId,
  themeOptions,
  accentColor,
  iconShape,
  gridCols,
  gridRows,
  maxGridCols,
  maxGridRows,
  desktopIcons,
  contentPaddingBottom,
  onClose,
  onSettingsChange,
  onSaveIcons,
  getIconStyle,
  renderIconContent
}) => {
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  const handleWallpaperUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onSettingsChange?.({ desktopWallpaper: reader.result as string });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleIconUpload = (icon: DesktopIcon, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onSaveIcons(desktopIcons.map((item) => item.id === icon.id ? { ...item, customIconUrl: reader.result as string } : item));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleIconNameBlur = (icon: DesktopIcon, value: string) => {
    const newName = value.trim();
    if (newName && newName !== icon.name) {
      onSaveIcons(desktopIcons.map((item) => item.id === icon.id ? { ...item, name: newName } : item));
    }
  };

  const handleResetLayout = () => {
    if (!confirm('确定要重置桌面布局吗？所有自定义图标和小组件将被恢复为默认。')) return;
    onSettingsChange?.({
      desktopIcons: DEFAULT_APPEARANCE_SETTINGS.desktopIcons,
      desktopWidgets: DEFAULT_APPEARANCE_SETTINGS.desktopWidgets,
      desktopWallpaper: '',
      desktopGridCols: undefined,
      desktopGridRows: undefined,
      desktopShowDock: undefined,
      desktopDockOpacity: undefined,
      desktopDockColor: undefined,
      desktopWidgetColor: undefined,
      desktopPageIndex: undefined,
      desktopPageCount: undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white/95 backdrop-blur-xl">
      <div
        className="flex items-center justify-between px-4 pb-3 border-b border-gray-200 shrink-0"
        style={{ paddingTop: 'calc(52px + var(--safe-top, 0px))' }}
      >
        <button
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          onClick={onClose}
        >
          <i className="fa-solid fa-arrow-left text-gray-600 text-lg" />
        </button>
        <h3 className="text-lg font-semibold text-gray-800">主题DIY</h3>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-6" style={{ paddingBottom: contentPaddingBottom }}>
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-3 block">外观</label>
          <div className="grid grid-cols-4 gap-3 mb-3">
            {wallpaperPresets.map((preset) => (
              <button
                key={preset.value}
                className={`h-16 rounded-xl border-2 transition-all ${wallpaper === preset.value ? 'scale-105' : 'border-transparent'}`}
                style={wallpaper === preset.value ? { background: preset.value, borderColor: accentColor } : { background: preset.value }}
                onClick={() => onSettingsChange?.({ desktopWallpaper: preset.value })}
                title={preset.name}
              />
            ))}
          </div>

          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-1 block">自定义壁纸（CSS / URL / 渐变）</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="输入壁纸样式或留空使用预设..."
                className="flex-1 px-3 py-2 rounded-lg bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                value={settings.desktopWallpaper || ''}
                onChange={(event) => onSettingsChange?.({ desktopWallpaper: event.target.value })}
              />
              {settings.desktopWallpaper && (
                <button
                  className="px-3 py-2 rounded-lg bg-gray-100 text-gray-500 text-sm hover:bg-gray-200 transition-colors"
                  onClick={() => onSettingsChange?.({ desktopWallpaper: '' })}
                >
                  清除
                </button>
              )}
            </div>
            <input
              ref={wallpaperInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleWallpaperUpload}
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs hover:bg-gray-200 transition-colors"
                onClick={() => wallpaperInputRef.current?.click()}
              >
                <i className="fa-solid fa-upload mr-1" /> 上传壁纸
              </button>
              {settings.desktopWallpaper?.startsWith('data:') && (
                <span className="text-xs text-gray-500">已使用本地图片</span>
              )}
            </div>
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-500">透明度</label>
              <span className="text-xs text-gray-500">{Math.round(wallpaperOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.1}
              value={wallpaperOpacity}
              onChange={(event) => onSettingsChange?.({ desktopWallpaperOpacity: parseFloat(event.target.value) })}
              className="w-full accent-blue-500"
            />
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-500">模糊度</label>
              <span className="text-xs text-gray-500">{wallpaperBlur}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={wallpaperBlur}
              onChange={(event) => onSettingsChange?.({ desktopWallpaperBlur: parseInt(event.target.value) })}
              className="w-full accent-blue-500"
            />
          </div>

          <div className="flex gap-3">
            {themeOptions.map((themeOption) => (
              <button
                key={themeOption.id}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${themeId === themeOption.id ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                style={themeId === themeOption.id ? { backgroundColor: accentColor } : undefined}
                onClick={() => onSettingsChange?.({ desktopThemeId: themeOption.id })}
              >
                {themeOption.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-3 block">布局</label>
          <div className="grid grid-cols-4 gap-3 mb-3">
            {columnOptions.filter((cols) => cols <= maxGridCols).map((cols) => (
              <button
                key={cols}
                className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${gridCols === cols ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                style={gridCols === cols ? { backgroundColor: accentColor } : undefined}
                onClick={() => onSettingsChange?.({ desktopGridCols: cols })}
              >
                {cols} 列
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-3 mb-3">
            {rowOptions.filter((rows) => rows <= maxGridRows).map((rows) => (
              <button
                key={rows}
                className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${gridRows === rows ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                style={gridRows === rows ? { backgroundColor: accentColor } : undefined}
                onClick={() => onSettingsChange?.({ desktopGridRows: rows })}
              >
                {rows} 行
              </button>
            ))}
          </div>
          {(gridCols > maxGridCols || gridRows > maxGridRows) && (
            <div className="mb-3 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              当前网格（{gridCols}×{gridRows}）超出当前屏幕推荐范围，建议在更大屏幕上使用或重置布局。
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-3 block">图标DIY</label>
          <div className="space-y-2">
            {desktopIcons.map((icon) => (
              <div key={icon.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <label className={`w-10 h-10 ${iconShape} flex items-center justify-center shrink-0 overflow-hidden cursor-pointer relative`} style={getIconStyle(icon)}>
                  {renderIconContent(icon)}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleIconUpload(icon, event)}
                  />
                </label>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    defaultValue={icon.name}
                    className="w-full px-3 py-2 rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    onBlur={(event) => handleIconNameBlur(icon, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        (event.target as HTMLInputElement).blur();
                      }
                    }}
                  />
                </div>
                {icon.customIconUrl && (
                  <button
                    className="px-2 py-1 rounded-lg text-xs text-gray-500 hover:bg-gray-200 transition-colors shrink-0"
                    onClick={() => onSaveIcons(desktopIcons.map((item) => item.id === icon.id ? { ...item, customIconUrl: undefined } : item))}
                  >
                    恢复默认
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <button
            className="w-full py-4 rounded-xl bg-red-50 text-red-500 text-sm font-medium hover:bg-red-100 transition-colors"
            onClick={handleResetLayout}
          >
            <i className="fa-solid fa-rotate-right mr-1" /> 重置桌面布局
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesktopThemeDiyPanel;
