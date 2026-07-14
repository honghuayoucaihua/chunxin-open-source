type ApkCacheEntryLike = {
  name: string;
  type: 'directory' | 'file';
};

export const APK_UPDATE_CACHE_DIR = 'updates';

export function buildApkCachePath(fileName: string): string {
  return `${APK_UPDATE_CACHE_DIR}/${fileName}`;
}

export function isApkCacheEntry(entry: ApkCacheEntryLike): boolean {
  return entry.type === 'file' && entry.name.toLowerCase().endsWith('.apk');
}

export function listApkCacheDeletionPaths(
  entries: ApkCacheEntryLike[],
  keepFileNames: string[] = []
): string[] {
  const keepSet = new Set(keepFileNames.filter(Boolean));
  return entries
    .filter((entry) => isApkCacheEntry(entry) && !keepSet.has(entry.name))
    .map((entry) => buildApkCachePath(entry.name));
}
