import { Capacitor } from '@capacitor/core';
import { httpGetJson } from './httpService';
import { getNativeVersionCode } from './appVersionService';
import { getServerBaseUrl } from './serverConfig';
import { normalizeUpdateInfo, toSafeInt } from './apkUpdateNormalization';
import { shouldRetryApkUpdateCheckError } from './apkUpdateRetryPolicy';
import type { ApkUpdateInfo, UpdateTrace } from './apkUpdateTypes';

interface ApkUpdateResponse {
  hasUpdate?: boolean;
  version?: string;
  versionCode?: number;
  apkUrl?: string;
  apkSize?: number;
  updateLog?: string;
  forceUpdate?: boolean;
  minVersion?: number;
}

const UPDATE_CHECK_TIMEOUT_MS = 15000;
const RETRY_DELAYS_MS: number[] = [];

function getServerUrl(): string {
  return getServerBaseUrl();
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error || '未知错误');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getCurrentVersionCode(trace?: UpdateTrace): Promise<number> {
  const versionCode = await getNativeVersionCode();
  if (versionCode > 0) return versionCode;
  trace?.('读取版本失败，按未知版本处理', 'native versionCode unavailable');
  return 0;
}

async function withRequestTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof globalThis.setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = globalThis.setTimeout(() => reject(new Error(`请求更新接口超时（>${UPDATE_CHECK_TIMEOUT_MS}ms）`)), UPDATE_CHECK_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer !== null) globalThis.clearTimeout(timer);
  }
}

function buildCheckUpdateUrl(serverUrl: string, currentVersionCode: number): string {
  const safeCode = toSafeInt(currentVersionCode);
  return `${serverUrl}/api/app/check-update?versionCode=${safeCode}`;
}

async function requestCheckWithRetry(serverUrl: string, currentVersionCode: number): Promise<ApkUpdateResponse> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const url = buildCheckUpdateUrl(serverUrl, currentVersionCode);
      return await withRequestTimeout(httpGetJson<ApkUpdateResponse>(url));
    } catch (error) {
      lastError = error;
      if (attempt >= RETRY_DELAYS_MS.length || !shouldRetryApkUpdateCheckError(error)) break;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(normalizeErrorMessage(lastError));
}

export function isAndroidPlatform(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
}

export function isNativeEnvironment(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function checkApkUpdate(trace?: UpdateTrace): Promise<ApkUpdateInfo> {
  const serverUrl = getServerUrl();
  try {
    const currentVersionCode = await getCurrentVersionCode(trace);
    if (currentVersionCode <= 0) {
      return {
        hasUpdate: false,
        version: '',
        versionCode: 0,
        apkUrl: '',
        forceUpdate: false,
        error: '无法读取当前版本号，已跳过更新检查'
      };
    }
    const response = await requestCheckWithRetry(serverUrl, currentVersionCode);
    return normalizeUpdateInfo(serverUrl, response, currentVersionCode);
  } catch (error) {
    const message = normalizeErrorMessage(error);
    trace?.('检查更新失败', message);
    return {
      hasUpdate: false,
      version: '',
      versionCode: 0,
      apkUrl: '',
      forceUpdate: false,
      error: message
    };
  }
}
