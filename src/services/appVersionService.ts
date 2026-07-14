import { registerPlugin } from '@capacitor/core';

interface AppVersionPlugin {
  getVersion(): Promise<{ versionCode: number; versionName: string }>;
}

const AppVersion = registerPlugin<AppVersionPlugin>('AppVersion');

export async function getNativeVersionCode(): Promise<number> {
  try {
    const result = await AppVersion.getVersion();
    const versionCode = Number(result?.versionCode || 0);
    if (!Number.isFinite(versionCode) || versionCode <= 0) return 0;
    return Math.floor(versionCode);
  } catch {
    return 0;
  }
}

