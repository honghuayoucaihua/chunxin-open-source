import { registerPlugin } from '@capacitor/core';

interface ApkInstallerPlugin {
  install(options: { uri: string }): Promise<{ started: boolean }>;
}

export const ApkInstaller = registerPlugin<ApkInstallerPlugin>('ApkInstaller');
