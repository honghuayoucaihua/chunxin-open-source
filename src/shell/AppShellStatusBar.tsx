import React from 'react';
import { useBatteryLevel } from '../hooks/useBatteryLevel';

interface AppShellStatusBarProps {
  isMobile: boolean;
  showBatteryPercent: boolean;
  showStatusBarDate: boolean;
  onReturnToDesktop?: () => void;
}

const AppShellStatusBar: React.FC<AppShellStatusBarProps> = ({
  isMobile,
  showBatteryPercent,
  showStatusBarDate,
  onReturnToDesktop
}) => {
  const [statusBarTime, setStatusBarTime] = React.useState(new Date());
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const batteryLevel = useBatteryLevel();

  React.useEffect(() => {
    const timer = window.setInterval(() => setStatusBarTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const handleWindowMinimize = () => {
    onReturnToDesktop?.();
  };

  const handleWindowMaximize = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      return;
    }
    document.exitFullscreen?.().catch(() => {});
  };

  const handleWindowClose = () => {
    onReturnToDesktop?.();
  };

  return (
    <div
      className="absolute top-0 left-0 right-0 z-[80] flex items-center justify-between text-sm font-medium select-none render-bg-primary render-text-primary"
      style={{ height: '32px', ['WebkitAppRegion' as any]: 'drag' }}
    >
      <div className="flex items-center gap-2 px-4" style={{ ['WebkitAppRegion' as any]: 'no-drag' }}>
        <span>{statusBarTime.getHours().toString().padStart(2, '0')}:{statusBarTime.getMinutes().toString().padStart(2, '0')}</span>
        {showStatusBarDate === true && (
          <span className="text-xs opacity-80">
            {statusBarTime.getMonth() + 1}月{statusBarTime.getDate()}日 {'日一二三四五六'[statusBarTime.getDay()]}
          </span>
        )}
      </div>
      {isMobile ? (
        <div className="flex items-center gap-2 px-4" style={{ ['WebkitAppRegion' as any]: 'no-drag' }}>
          <i className="fa-solid fa-signal text-[10px]" />
          <i className="fa-solid fa-wifi text-[10px]" />
          <div className="flex items-center gap-1">
            <i className={`fa-solid text-[10px] ${batteryLevel !== null && batteryLevel <= 20 ? 'fa-battery-empty' : batteryLevel !== null && batteryLevel <= 50 ? 'fa-battery-half' : 'fa-battery-full'}`} />
            {showBatteryPercent !== false && batteryLevel !== null && (
              <span className="text-[10px]">{batteryLevel}%</span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center h-full" style={{ ['WebkitAppRegion' as any]: 'no-drag' }}>
          <button
            className="w-10 h-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            onClick={handleWindowMinimize}
            title="最小化"
            type="button"
          >
            <i className="fa-solid fa-minus text-[10px]" />
          </button>
          <button
            className="w-10 h-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            onClick={handleWindowMaximize}
            title={isFullscreen ? '还原' : '全屏'}
            type="button"
          >
            <i className={`fa-solid ${isFullscreen ? 'fa-clone' : 'fa-square'} text-[10px]`} />
          </button>
          <button
            className="w-10 h-full flex items-center justify-center hover:bg-[#e81123] hover:text-white transition-colors"
            onClick={handleWindowClose}
            title="关闭"
            type="button"
          >
            <i className="fa-solid fa-xmark text-[12px]" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AppShellStatusBar;
