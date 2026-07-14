import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { encryptExportPayload, type ExportEncryptScope } from '../services/snapshot/exportEncryption';
import { exportAsZip } from '../services/snapshotService';

const isNativeAndroid = (): boolean => {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
};

const encodeBase64Unicode = (value: string): string => {
  try {
    return btoa(unescape(encodeURIComponent(value)));
  } catch {
    return btoa(value);
  }
};

const blobToBase64 = async (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const value = String(reader.result || '');
      const base64 = value.includes(',') ? value.split(',')[1] : value;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
};

const writeAndroidDownloadFile = async (
  filename: string,
  data: string
): Promise<{ success: boolean; uri?: string; error?: string }> => {
  const writeOnce = () => Filesystem.writeFile({
    path: `Download/${filename}`,
    data,
    directory: Directory.ExternalStorage,
    recursive: true
  });

  try {
    const result = await writeOnce();
    return { success: true, uri: result.uri };
  } catch (firstError: any) {
    try {
      await Filesystem.requestPermissions();
      const result = await writeOnce();
      return { success: true, uri: result.uri };
    } catch (finalError: any) {
      return { success: false, error: finalError?.message || firstError?.message || '写入 Download 目录失败' };
    }
  }
};

const downloadJsonFile = async (
  filename: string,
  payload: unknown
): Promise<{ success: boolean; uri?: string; error?: string }> => {
  const jsonText = JSON.stringify(payload, null, 2);

  if (isNativeAndroid()) {
    const base64Data = encodeBase64Unicode(jsonText);
    return writeAndroidDownloadFile(filename, base64Data);
  }

  const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    URL.revokeObjectURL(url);
  }
  return { success: true };
};

const downloadZipFile = async (
  filename: string,
  blob: Blob
): Promise<{ success: boolean; uri?: string; error?: string }> => {
  if (isNativeAndroid()) {
    try {
      const base64Data = await blobToBase64(blob);
      return writeAndroidDownloadFile(filename, base64Data);
    } catch (error: any) {
      return { success: false, error: error?.message || '写入文件失败' };
    }
  }

  const downloadBlob = blob.type === 'application/zip' ? blob : new Blob([blob], { type: 'application/zip' });
  const url = URL.createObjectURL(downloadBlob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    URL.revokeObjectURL(url);
  }
  return { success: true };
};

export const exportJsonBundle = async (filename: string, payload: unknown): Promise<boolean> => {
  const result = await downloadJsonFile(filename, payload);
  return result.success;
};

export const exportJsonBundleWithOptions = async (
  filename: string,
  payload: unknown,
  options?: { encryptScope?: ExportEncryptScope }
): Promise<boolean> => {
  const exportPayload = options?.encryptScope
    ? encryptExportPayload(payload, options.encryptScope)
    : payload;
  const result = await downloadJsonFile(filename, exportPayload);
  return result.success;
};

export const exportZipBundle = async (
  filename: string,
  payload: unknown
): Promise<boolean> => {
  const zipResult = await exportAsZip(payload as any);
  if (!zipResult.success || !zipResult.blob) return false;
  const result = await downloadZipFile(filename, zipResult.blob);
  return result.success;
};
