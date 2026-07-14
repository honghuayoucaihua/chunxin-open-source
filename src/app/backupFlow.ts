import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { SnapshotPayload } from '../services/snapshot/snapshotBuilder';

type ProgressDialogState = null | {
  title?: string;
  message: string;
  progress?: number;
  cancellable?: boolean;
  onCancel?: () => void;
};

type BackupDownloadResult = {
  success: boolean;
  error?: string;
  size?: number;
  uri?: string;
};

type BackupFlowParams = {
  backupAbortControllerRef: MutableRefObject<AbortController | null>;
  buildSnapshot: () => Promise<SnapshotPayload>;
  setProgressDialog: Dispatch<SetStateAction<ProgressDialogState>>;
  showToast: (message: string, duration?: number) => void;
  triggerBackupDownload: (
    payload: SnapshotPayload,
    onProgress?: (status: string, progress?: number) => void
  ) => Promise<BackupDownloadResult>;
};

const formatBackupSize = (size?: number): string =>
  size ? `${(size / (1024 * 1024)).toFixed(1)}MB` : '';

const readErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || '');
  }
  return '';
};

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException
    ? error.name === 'AbortError'
    : !!error && typeof error === 'object' && 'name' in error && String((error as { name?: unknown }).name || '') === 'AbortError';

const buildBackupSuccessMessage = (result: BackupDownloadResult): string => {
  const fileSize = formatBackupSize(result.size);
  if (result.uri) {
    return `备份成功${fileSize ? ` (${fileSize})` : ''}，已保存：${result.uri}`;
  }
  return `备份成功${fileSize ? ` (${fileSize})` : ''}，已保存为 ZIP 压缩包`;
};

export const runBackupFlow = async (params: BackupFlowParams): Promise<void> => {
  const abortController = new AbortController();
  params.backupAbortControllerRef.current = abortController;
  let isCancelled = false;

  try {
    const payload = await params.buildSnapshot();
    params.setProgressDialog({
      title: '备份数据',
      message: '正在准备备份...',
      progress: undefined,
      cancellable: true,
      onCancel: () => {
        isCancelled = true;
        abortController.abort();
        params.setProgressDialog(null);
        params.showToast('备份已取消');
      }
    });

    const result = await params.triggerBackupDownload(payload, (status: string, progress?: number) => {
      if (isCancelled) return;
      params.setProgressDialog((prev) => (prev ? { ...prev, message: status, progress } : null));
    });

    if (isCancelled) return;
    params.setProgressDialog(null);
    if (!result.success) {
      params.showToast(result.error || '备份失败');
      return;
    }
    params.showToast(buildBackupSuccessMessage(result), result.uri ? 5000 : undefined);
  } catch (error) {
    params.setProgressDialog(null);
    if (isAbortError(error) || isCancelled) return;
    console.error('[Backup] 导出失败:', error);
    params.showToast(`备份失败: ${readErrorMessage(error) || '请重试'}`);
  } finally {
    params.backupAbortControllerRef.current = null;
  }
};
