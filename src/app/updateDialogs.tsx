import React from 'react';
import type { ApkUpdateInfo, DownloadProgress, StartUpdateResult } from '../services/apkUpdateTypes';

const INSTALLER_RETRY_GUARD_MS = 3000;

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

type ApkUpdateDialogProps = {
  visible: boolean;
  info: ApkUpdateInfo | null;
  isDownloading: boolean;
  progress: DownloadProgress | null;
  onDismiss: (info: ApkUpdateInfo) => void;
  onClose: () => void;
  onDownloadingChange: (next: boolean) => void;
  onProgressChange: (progress: DownloadProgress | null) => void;
  onStartUpdate: (apkUrl: string, onProgress?: (progress: DownloadProgress) => void) => Promise<StartUpdateResult>;
};

type PwaUpdateDialogProps = {
  visible: boolean;
  onClose: () => void;
  onApply: () => Promise<void>;
};

export const ApkUpdateDialog: React.FC<ApkUpdateDialogProps> = ({
  visible,
  info,
  isDownloading,
  progress,
  onDismiss,
  onClose,
  onDownloadingChange,
  onProgressChange,
  onStartUpdate
}) => {
  const [updateError, setUpdateError] = React.useState('');
  const [installerStarted, setInstallerStarted] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setUpdateError('');
      setInstallerStarted(false);
    }
  }, [visible, info?.version, info?.versionCode]);

  React.useEffect(() => {
    if (!installerStarted) return;
    const restoreRetry = () => {
      setInstallerStarted(false);
    };
    const timerId = globalThis.setTimeout(() => setInstallerStarted(false), INSTALLER_RETRY_GUARD_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') restoreRetry();
    };
    globalThis.addEventListener('focus', restoreRetry);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      globalThis.clearTimeout(timerId);
      globalThis.removeEventListener('focus', restoreRetry);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [installerStarted]);

  if (!visible || !info) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
      <div className="app-surface-panel w-[85%] max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 app-update-dialog">
        <div className="bg-gradient-to-br from-pink-400 to-rose-500 px-6 py-6 text-center">
          <div className="w-16 h-16 mx-auto bg-white/20 rounded-2xl flex items-center justify-center mb-3">
            <i className={`fa-solid ${isDownloading ? 'fa-spinner fa-spin' : 'fa-download'} text-3xl text-white`}></i>
          </div>
          <div className="text-white text-xl font-semibold">{isDownloading ? '正在下载...' : '发现新版本'}</div>
          <div className="text-white/80 text-sm mt-1">v{info.version}</div>
        </div>
        <div className="app-surface-body !px-5 !pt-5 !pb-5">
          {isDownloading && progress && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                <span>{formatFileSize(progress.loaded)} / {formatFileSize(progress.total)}</span>
                <span>{progress.percentage}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%`, background: 'var(--app-accent-color)' }}
                />
              </div>
            </div>
          )}
          {!isDownloading && info.updateLog && (
            <div className="bg-gray-50 dark:bg-[#2A2A2A] rounded-xl p-4 mb-4 max-h-40 overflow-y-auto">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">更新内容</div>
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{info.updateLog}</div>
            </div>
          )}
          {!isDownloading && info.apkSize && (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4">
              安装包大小: {formatFileSize(info.apkSize)}
            </div>
          )}
          {!!updateError && (
            <div className="text-xs text-red-500 text-center mb-4">{updateError}</div>
          )}
          <div className="flex space-x-3">
            {!isDownloading && !info.forceUpdate && (
              <button
                className="app-button app-button-muted flex-1 active:scale-95 transition-transform"
                onClick={() => {
                  onDismiss(info);
                  onClose();
                }}
                disabled={isDownloading || installerStarted}
              >
                稍后再说
              </button>
            )}
            <button
              className={`app-button app-button-primary font-medium active:scale-95 transition-transform ${info.forceUpdate && !isDownloading ? 'w-full' : 'flex-1'} ${isDownloading || installerStarted ? 'opacity-70' : ''}`}
              disabled={isDownloading || installerStarted}
              onClick={async () => {
                if (isDownloading || installerStarted) return;
                setUpdateError('');
                onDownloadingChange(true);
                onProgressChange(null);
                try {
                  const result = await onStartUpdate(info.apkUrl, onProgressChange);
                  if (!result?.success) {
                    setUpdateError(result?.error || '更新拉起失败');
                    return;
                  }
                  if (!info.forceUpdate) {
                    onClose();
                    return;
                  }
                  setInstallerStarted(true);
                  setUpdateError('系统安装器已打开；如果你取消了安装，稍后可以再次重试。');
                } catch (error) {
                  const message = error instanceof Error ? error.message : String(error || '更新拉起失败');
                  setUpdateError(message);
                } finally {
                  onDownloadingChange(false);
                }
              }}
            >
              {isDownloading
                ? `下载中 ${progress?.percentage || 0}%`
                : installerStarted
                  ? '请先完成安装'
                  : '立即更新'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PwaUpdateDialog: React.FC<PwaUpdateDialogProps> = ({
  visible,
  onClose,
  onApply
}) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
      <div className="app-surface-panel w-[85%] max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 app-update-dialog">
        <div className="bg-gradient-to-br from-green-400 to-emerald-500 px-6 py-6 text-center">
          <div className="w-16 h-16 mx-auto bg-white/20 rounded-2xl flex items-center justify-center mb-3">
            <i className="fa-solid fa-arrows-rotate text-3xl text-white"></i>
          </div>
          <div className="text-white text-xl font-semibold">发现新版本</div>
          <div className="text-white/80 text-sm mt-1">应用有更新可用</div>
        </div>
        <div className="app-surface-body !px-5 !pt-5 !pb-5">
          <div className="text-center text-gray-600 dark:text-gray-300 mb-4">
            新版本已准备就绪，点击下方按钮刷新应用以完成更新。
          </div>
          <div className="flex space-x-3">
            <button
              className="app-button app-button-muted flex-1 active:scale-95 transition-transform"
              onClick={onClose}
            >
              稍后再说
            </button>
            <button
              className="app-button app-button-primary flex-1 font-medium active:scale-95 transition-transform"
              onClick={async () => {
                onClose();
                try {
                  await onApply();
                } catch (error) {
                  console.error('[PWA] 应用更新失败:', error);
                }
              }}
            >
              立即更新
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
