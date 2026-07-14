export interface ApkUpdateInfo {
  hasUpdate: boolean;
  version: string;
  versionCode: number;
  apkUrl: string;
  apkSize?: number;
  updateLog?: string;
  forceUpdate: boolean;
  minVersion?: number;
  error?: string;
}

export interface DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface StartUpdateResult {
  success: boolean;
  fileUri?: string;
  error?: string;
}

export type ProgressCallback = (progress: DownloadProgress) => void;
export type UpdateTrace = (message: string, data?: unknown) => void;

