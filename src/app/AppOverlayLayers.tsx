import React from 'react';
import { MiniMusicButton } from '../music/MiniMusicButton';
import type { MusicState } from '../music/musicCommon';
import type { AppearanceSettings } from '../types';
import type { ApkUpdateInfo, DownloadProgress } from '../services/apkUpdateTypes';
import { createClosedApkUpdateDialogState } from '../services/apkUpdateFlowControl';
import { isReplyTaskDebugToolingAvailable } from '../utils/chat/replyTaskDebugTools.ts';

const ApkUpdateDialog = React.lazy(() => import('./updateDialogs').then((m) => ({ default: m.ApkUpdateDialog })));
const PwaUpdateDialog = React.lazy(() => import('./updateDialogs').then((m) => ({ default: m.PwaUpdateDialog })));
const ReplyTaskDebugPanel = React.lazy(() => import('./ReplyTaskDebugPanel'));

type RainDrop = {
  id: number;
  left: string;
  delay: string;
  duration: string;
  opacity: number;
};

type SnowFlake = {
  id: number;
  left: string;
  size: string;
  delay: string;
  duration: string;
  drift: string;
  opacity: number;
};

type ThunderFlash = {
  id: number;
  delay: string;
  duration: string;
  intensity: number;
  x: string;
};

type AppOverlayLayersProps = {
  settings: AppearanceSettings;
  rainDrops: RainDrop[];
  snowFlakes: SnowFlake[];
  thunderFlashes: ThunderFlash[];
  activeSubView: string;
  musicState: MusicState;
  onOpenMusic: () => void;
  showApkUpdateDialog: boolean;
  apkUpdateInfo: ApkUpdateInfo | null;
  isDownloading: boolean;
  apkDownloadProgress: DownloadProgress | null;
  dismissApkUpdate: (info: ApkUpdateInfo) => void;
  setApkUpdateInfo: (value: ApkUpdateInfo | null) => void;
  setShowApkUpdateDialog: (visible: boolean) => void;
  setIsDownloading: (value: boolean) => void;
  setApkDownloadProgress: (value: DownloadProgress | null) => void;
  showPwaUpdateDialog: boolean;
  setShowPwaUpdateDialog: (visible: boolean) => void;
};

export const AppOverlayLayers: React.FC<AppOverlayLayersProps> = ({
  settings,
  rainDrops,
  snowFlakes,
  thunderFlashes,
  activeSubView,
  musicState,
  onOpenMusic,
  showApkUpdateDialog,
  apkUpdateInfo,
  isDownloading,
  apkDownloadProgress,
  dismissApkUpdate,
  setApkUpdateInfo,
  setShowApkUpdateDialog,
  setIsDownloading,
  setApkDownloadProgress,
  showPwaUpdateDialog,
  setShowPwaUpdateDialog
}) => {
  const isDev = isReplyTaskDebugToolingAvailable();
  const handleStartUpdate = React.useCallback(async (apkUrl: string, onProgress?: (progress: DownloadProgress) => void) => {
    const { startUpdate } = await import('../services/apkUpdateInstallService');
    return startUpdate(apkUrl, onProgress);
  }, []);

  const handleApplyUpdate = React.useCallback(async () => {
    const { applyUpdate } = await import('../services/updateService');
    await applyUpdate();
  }, []);

  const handleCloseApkUpdateDialog = React.useCallback(() => {
    const nextState = createClosedApkUpdateDialogState();
    setShowApkUpdateDialog(nextState.showDialog);
    setApkUpdateInfo(nextState.info);
    setApkDownloadProgress(nextState.progress);
    setIsDownloading(nextState.isDownloading);
  }, [setApkDownloadProgress, setApkUpdateInfo, setIsDownloading, setShowApkUpdateDialog]);

  return (
    <>
    {settings.enableRainEffect && (
      <div className="app-rain-layer" aria-hidden="true">
        {rainDrops.map(drop => (
          <span
            key={drop.id}
            className="app-rain-drop"
            style={{
              left: drop.left,
              animationDelay: drop.delay,
              animationDuration: drop.duration,
              opacity: drop.opacity
            }}
          />
        ))}
      </div>
    )}
    {settings.enableSnowEffect && (
      <div className="app-snow-layer" aria-hidden="true">
        {snowFlakes.map(flake => (
          <span
            key={flake.id}
            className="app-snow-flake"
            style={{
              left: flake.left,
              width: flake.size,
              height: flake.size,
              animationDelay: flake.delay,
              animationDuration: flake.duration,
              opacity: flake.opacity,
              ['--snow-drift' as any]: flake.drift
            }}
          />
        ))}
      </div>
    )}
    {settings.enableThunderEffect && (
      <div className="app-thunder-layer" aria-hidden="true">
        {thunderFlashes.map((flash) => (
          <span
            key={flash.id}
            className="app-thunder-flash"
            style={{
              animationDelay: flash.delay,
              animationDuration: flash.duration,
              ['--thunder-intensity' as any]: flash.intensity,
              ['--thunder-x' as any]: flash.x
            }}
          />
        ))}
      </div>
    )}
    {activeSubView !== 'listenMusic' && (
      <MiniMusicButton musicState={musicState} onClick={onOpenMusic} />
    )}
    {showApkUpdateDialog ? (
      <React.Suspense fallback={<div className="fixed inset-0 z-[200] bg-black/50" />}>
        <ApkUpdateDialog
          visible={showApkUpdateDialog}
          info={apkUpdateInfo}
          isDownloading={isDownloading}
          progress={apkDownloadProgress}
          onDismiss={dismissApkUpdate}
          onClose={handleCloseApkUpdateDialog}
          onDownloadingChange={setIsDownloading}
          onProgressChange={setApkDownloadProgress}
          onStartUpdate={handleStartUpdate}
        />
      </React.Suspense>
    ) : null}
    {showPwaUpdateDialog ? (
      <React.Suspense fallback={<div className="fixed inset-0 z-[200] bg-black/50" />}>
        <PwaUpdateDialog
          visible={showPwaUpdateDialog}
          onClose={() => setShowPwaUpdateDialog(false)}
          onApply={handleApplyUpdate}
        />
      </React.Suspense>
    ) : null}
    {isDev ? (
      <React.Suspense fallback={null}>
        <ReplyTaskDebugPanel />
      </React.Suspense>
    ) : null}
  </>
  );
};
