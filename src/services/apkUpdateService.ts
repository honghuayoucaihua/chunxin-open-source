export type {
  ApkUpdateInfo,
  DownloadProgress,
  StartUpdateResult
} from './apkUpdateTypes';

export {
  checkApkUpdate,
  isAndroidPlatform,
  isNativeEnvironment
} from './apkUpdateCheckService';

export {
  formatFileSize,
  startUpdate
} from './apkUpdateInstallService';

