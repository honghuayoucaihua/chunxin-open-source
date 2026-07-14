import { Directory, Filesystem, type FileInfo } from '@capacitor/filesystem';
import type { PluginListenerHandle } from '@capacitor/core';
import { ApkInstaller } from './apkInstallerService';
import { isAndroidPlatform } from './apkUpdateCheckService';
import { APK_UPDATE_CACHE_DIR, buildApkCachePath, listApkCacheDeletionPaths } from './apkUpdateCachePolicy';
import { createApkUpdateSingleFlightRunner } from './apkUpdateSingleFlight';
import { getServerBaseUrl } from './serverConfig';
import type { DownloadProgress, ProgressCallback, StartUpdateResult } from './apkUpdateTypes';

const runSingleStartUpdate = createApkUpdateSingleFlightRunner();

function getServerUrl(): string {
  return getServerBaseUrl();
}

function resolveApkUrl(apkUrl: string): string {
  if (!apkUrl) throw new Error('未获取到安装包地址');
  if (apkUrl.startsWith('http://') || apkUrl.startsWith('https://')) return apkUrl;
  const serverUrl = getServerUrl();
  return apkUrl.startsWith('/') ? `${serverUrl}${apkUrl}` : `${serverUrl}/${apkUrl}`;
}

function buildApkFileName(url: string): string {
  const name = String(url.split('?')[0] || '').split('/').pop() || '';
  if (name.toLowerCase().endsWith('.apk')) return name;
  return `xushuo-update-${Date.now()}.apk`;
}

function mapProgress(bytes: number, contentLength: number): DownloadProgress {
  const total = Math.max(0, Number(contentLength || 0));
  const loaded = Math.max(0, Number(bytes || 0));
  const percentage = total > 0 ? Math.min(100, Math.floor((loaded / total) * 100)) : 0;
  return { loaded, total, percentage };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const readErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (isRecord(error) && typeof error.message === 'string') return error.message;
  return String(error || '');
};

async function createProgressListener(onProgress?: ProgressCallback): Promise<PluginListenerHandle | null> {
  if (!onProgress) return null;
  return Filesystem.addListener('progress', (status: unknown) => {
    const progress = isRecord(status) ? status : {};
    onProgress(mapProgress(Number(progress.bytes || 0), Number(progress.contentLength || 0)));
  });
}

async function ensureCacheDir(): Promise<void> {
  try {
    await Filesystem.mkdir({
      directory: Directory.Cache,
      path: APK_UPDATE_CACHE_DIR,
      recursive: true
    });
  } catch (error) {
    const message = readErrorMessage(error);
    const isAlreadyExistsError = message.includes('already exists');
    if (!isAlreadyExistsError) throw error;
  }
}

function isMissingFileError(error: unknown): boolean {
  const message = readErrorMessage(error).toLowerCase();
  return message.includes('not exist')
    || message.includes('does not exist')
    || message.includes('no such file');
}

async function cleanupApkCachePath(path: string): Promise<void> {
  try {
    await Filesystem.deleteFile({ directory: Directory.Cache, path });
  } catch (error) {
    if (isMissingFileError(error)) return;
    throw error;
  }
}

async function purgeCachedApkFiles(keepFileNames: string[] = []): Promise<void> {
  const entries = await Filesystem.readdir({
    directory: Directory.Cache,
    path: APK_UPDATE_CACHE_DIR
  });
  const deletionPaths = listApkCacheDeletionPaths(entries.files as FileInfo[], keepFileNames);
  for (const path of deletionPaths) {
    await cleanupApkCachePath(path);
  }
}

async function downloadApk(url: string): Promise<{ fileUri: string; path: string }> {
  await ensureCacheDir();
  await purgeCachedApkFiles();
  const path = buildApkCachePath(buildApkFileName(url));
  await Filesystem.downloadFile({ url, path, directory: Directory.Cache, recursive: true, progress: true });
  const uriResult = await Filesystem.getUri({ directory: Directory.Cache, path });
  if (!uriResult?.uri) throw new Error('下载完成但未获取到本地文件 URI');
  return { fileUri: uriResult.uri, path };
}

async function launchInstaller(fileUri: string): Promise<void> {
  const result = await ApkInstaller.install({ uri: fileUri });
  if (!result?.started) throw new Error('系统安装器拉起失败');
}

function formatInstallStage(stage: 'prepare' | 'download' | 'install'): string {
  if (stage === 'download') return '下载';
  if (stage === 'install') return '拉起安装器';
  return '准备';
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export async function startUpdate(apkUrl: string, onProgress?: ProgressCallback): Promise<StartUpdateResult> {
  return runSingleStartUpdate(async () => {
    let handle: PluginListenerHandle | null = null;
    let downloadedPath = '';
    let resolvedUrl = '';
    let stage: 'prepare' | 'download' | 'install' = 'prepare';
    try {
      if (!isAndroidPlatform()) throw new Error('当前设备不支持应用内 APK 更新');
      resolvedUrl = resolveApkUrl(apkUrl);
      onProgress?.({ loaded: 0, total: 0, percentage: 0 });
      handle = await createProgressListener(onProgress);
      stage = 'download';
      const downloaded = await downloadApk(resolvedUrl);
      downloadedPath = downloaded.path;
      onProgress?.({ loaded: 1, total: 1, percentage: 100 });
      stage = 'install';
      await launchInstaller(downloaded.fileUri);
      return { success: true, fileUri: downloaded.fileUri };
    } catch (error) {
      console.warn('[APK 更新] 安装流程失败:', {
        stage: formatInstallStage(stage),
        apkUrl: resolvedUrl || apkUrl,
        error: readErrorMessage(error)
      });
      if (downloadedPath) {
        await cleanupApkCachePath(downloadedPath).catch((cleanupError) => {
          console.warn('[APK 更新] 清理失败缓存包失败:', {
            path: downloadedPath,
            error: readErrorMessage(cleanupError)
          });
        });
      }
      return {
        success: false,
        error: readErrorMessage(error) || '应用内更新失败'
      };
    } finally {
      await handle?.remove().catch(() => undefined);
    }
  });
}
