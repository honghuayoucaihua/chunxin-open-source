interface ApkUpdateResponseLike {
  hasUpdate?: boolean;
  version?: string;
  versionCode?: number;
  apkUrl?: string;
  apkSize?: number;
  updateLog?: string;
  forceUpdate?: boolean;
  minVersion?: number;
}

export function toSafeInt(input: unknown): number {
  const raw = Number(input);
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.floor(raw));
}

export function parseBooleanFlag(input: unknown): boolean {
  if (input === true || input === 1) return true;
  if (input === false || input === 0 || input === null || input === undefined) return false;
  const normalized = String(input || '').trim().toLowerCase();
  if (!normalized) return false;
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  return Boolean(input);
}

export function toAbsoluteApkUrl(serverUrl: string, rawUrl: unknown): string {
  const url = String(rawUrl || '').trim();
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return url.startsWith('/') ? `${serverUrl}${url}` : `${serverUrl}/${url}`;
}

export function normalizeUpdateInfo(serverUrl: string, data: ApkUpdateResponseLike, currentVersionCode: number) {
  const latestVersionCode = toSafeInt(data.versionCode);
  const latestVersionName = String(data.version || '');
  const hasUpdate = currentVersionCode > 0 && latestVersionCode > currentVersionCode;
  const apkUrl = toAbsoluteApkUrl(serverUrl, data.apkUrl);
  const minVersion = toSafeInt(data.minVersion) || undefined;
  const isBelowMinVersion = hasUpdate && typeof minVersion === 'number' && minVersion > 0 && currentVersionCode < minVersion;
  if (hasUpdate && !apkUrl) {
    throw new Error('服务端返回了新版本，但缺少 apkUrl');
  }
  return {
    hasUpdate,
    version: latestVersionName,
    versionCode: latestVersionCode,
    apkUrl,
    apkSize: toSafeInt(data.apkSize) || undefined,
    updateLog: String(data.updateLog || ''),
    forceUpdate: hasUpdate && (parseBooleanFlag(data.forceUpdate) || isBelowMinVersion),
    minVersion
  };
}
