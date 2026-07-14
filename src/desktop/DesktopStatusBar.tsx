import React from 'react';
import type { AppearanceSettings } from '../types';
import { formatDate, formatTime } from './DesktopWidgetContent';

type DesktopStatusBarProps = {
  settings: AppearanceSettings;
  currentTime: Date;
  batteryLevel: number | null;
  isDark: boolean;
  statusBarTextClassName: string;
  showEditModeActions: boolean;
  editModeActions: React.ReactNode;
};

export const DesktopStatusBar: React.FC<DesktopStatusBarProps> = ({
  settings,
  currentTime,
  batteryLevel,
  isDark,
  statusBarTextClassName,
  showEditModeActions,
  editModeActions,
}) => (
  <div
    className={`relative z-[80] shrink-0 flex items-center px-6 py-2 text-sm font-medium ${statusBarTextClassName}`}
    style={{
      background: isDark ? 'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent)' : 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)',
      paddingTop: 'calc(12px + var(--safe-top, 0px))',
      justifyContent: settings.statusBarLayout === 'center' ? 'center' : settings.statusBarLayout === 'minimal' ? 'center' : 'space-between',
    }}
  >
    <div className={`flex items-center gap-2 ${settings.statusBarLayout === 'center' || settings.statusBarLayout === 'minimal' ? 'absolute left-1/2 -translate-x-1/2' : ''}`}>
      <span>{formatTime(currentTime, settings.desktop24Hour)}</span>
      {settings.statusBarShowDate === true && (
        <span className="text-xs opacity-80">{formatDate(currentTime)}</span>
      )}
    </div>
    {settings.statusBarLayout !== 'minimal' && (
      <div className="flex items-center gap-3 ml-auto">
        {showEditModeActions && editModeActions}
        {settings.desktopShowSignal !== false && <i className="fa-solid fa-signal text-xs" />}
        {settings.desktopShowWifi !== false && <i className="fa-solid fa-wifi text-xs" />}
        <div className="flex items-center gap-1">
          <i className={`fa-solid text-xs ${batteryLevel !== null && batteryLevel <= 20 ? 'fa-battery-empty' : batteryLevel !== null && batteryLevel <= 50 ? 'fa-battery-half' : 'fa-battery-full'}`} />
          {settings.desktopBatteryPercent !== false && batteryLevel !== null && (
            <span className="text-xs">{batteryLevel}%</span>
          )}
        </div>
      </div>
    )}
  </div>
);

export default DesktopStatusBar;
