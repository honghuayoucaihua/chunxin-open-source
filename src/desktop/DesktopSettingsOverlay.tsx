import React from 'react';
import type { AppearanceSettings } from '../types';
import DesktopBasicSettingsSection from './DesktopBasicSettingsSection';
import DesktopLockSettingsSection from './DesktopLockSettingsSection';
import DesktopSystemNavigationSettingsSection from './DesktopSystemNavigationSettingsSection';

type RgbaColor = { r: number; g: number; b: number; a: number };

type WallpaperPreset = {
  name: string;
  value: string;
};

type DesktopSettingsOverlayProps = {
  settings: AppearanceSettings;
  showDock: boolean;
  safeDockOpacity: number;
  safeWidgetOpacity: number;
  showDesktopStatusBar: boolean;
  normalizedLockPasscode: string;
  accentColor: string;
  dockSurfaceColor: RgbaColor;
  widgetSurfaceColor: RgbaColor;
  wallpaperPresets: WallpaperPreset[];
  contentPaddingBottom: string;
  onClose: () => void;
  onResetLayout: () => void;
  onSettingsChange?: (settings: Partial<AppearanceSettings>) => void;
};

export const DesktopSettingsOverlay: React.FC<DesktopSettingsOverlayProps> = ({
  settings,
  showDock,
  safeDockOpacity,
  safeWidgetOpacity,
  showDesktopStatusBar,
  normalizedLockPasscode,
  accentColor,
  dockSurfaceColor,
  widgetSurfaceColor,
  wallpaperPresets,
  contentPaddingBottom,
  onClose,
  onResetLayout,
  onSettingsChange,
}) => (
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
      <h3 className="text-lg font-semibold text-gray-800">桌面设置</h3>
      <div className="w-10" />
    </div>

    <div className="flex-1 overflow-y-auto p-6" style={{ paddingBottom: contentPaddingBottom }}>
      <DesktopBasicSettingsSection
        settings={settings}
        showDock={showDock}
        safeDockOpacity={safeDockOpacity}
        safeWidgetOpacity={safeWidgetOpacity}
        showDesktopStatusBar={showDesktopStatusBar}
        accentColor={accentColor}
        dockSurfaceColor={dockSurfaceColor}
        widgetSurfaceColor={widgetSurfaceColor}
        onSettingsChange={onSettingsChange}
      />

      <DesktopSystemNavigationSettingsSection
        settings={settings}
        accentColor={accentColor}
        onSettingsChange={onSettingsChange}
      />

      <DesktopLockSettingsSection
        settings={settings}
        normalizedLockPasscode={normalizedLockPasscode}
        accentColor={accentColor}
        wallpaperPresets={wallpaperPresets}
        onSettingsChange={onSettingsChange}
      />

      <div className="mb-4">
        <button
          className="w-full py-4 rounded-xl bg-red-50 text-red-500 text-sm font-medium hover:bg-red-100 transition-colors"
          onClick={onResetLayout}
        >
          <i className="fa-solid fa-rotate-right mr-1" /> 重置桌面布局
        </button>
      </div>
    </div>
  </div>
);

export default DesktopSettingsOverlay;
