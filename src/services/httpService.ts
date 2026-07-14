/**
 * HTTP 请求服务
 * Capacitor 8 内置 CapacitorHttp 插件，自动拦截 fetch 和 XMLHttpRequest
 * 不需要手动调用插件，直接使用 fetch 即可
 */

import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import { getApiBaseUrl as getRuntimeApiBaseUrl } from './serverConfig.ts';
import { isDevelopmentEnvironment } from '../utils/runtimeEnvironment.ts';

// 后端 API 基础地址
const DEFAULT_REQUEST_TIMEOUT_MS = 12000;
const MAX_ERROR_BODY_CHARS = 500;
const SENSITIVE_QUERY_KEYS = new Set([
  'key',
  'api_key',
  'apikey',
  'api-key',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'password',
  'passphrase',
  'secret'
]);

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

type HttpRequestOptions = {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  useApiBase?: boolean;
  timeoutMs?: number;
};

/**
 * 检测是否为原生 App 环境
 */
const isNativeApp = (): boolean => {
  return Capacitor.isNativePlatform();
};

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

export const isAbsoluteHttpUrl = (url: string): boolean => /^https?:\/\//i.test(String(url || '').trim());

export const resolveHttpRequestUrl = (url: string, baseUrl = getRuntimeApiBaseUrl()): string => {
  const normalizedUrl = String(url || '').trim();
  if (isAbsoluteHttpUrl(normalizedUrl)) return normalizedUrl;

  const normalizedBase = trimTrailingSlash(String(baseUrl || '').trim());
  const normalizedPath = normalizedUrl.replace(/^\/+/, '');
  if (!normalizedBase) return normalizedPath ? `/${normalizedPath}` : '/';
  return normalizedPath ? `${normalizedBase}/${normalizedPath}` : normalizedBase;
};

const resolveRequestUrl = (url: string, useApiBase = true): string => {
  const normalizedUrl = String(url || '').trim();
  if (!normalizedUrl) {
    throw new Error('HTTP request URL is empty');
  }
  return useApiBase ? resolveHttpRequestUrl(normalizedUrl) : normalizedUrl;
};

const stringifyResponseBody = (value: unknown): string => {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return String(value);
  }
};

const isSensitiveKey = (key: string): boolean => SENSITIVE_QUERY_KEYS.has(String(key || '').trim().toLowerCase());

export const redactSensitiveText = (value: string): string => {
  const text = String(value || '');
  if (!text) return text;
  return text
    .replace(
      /(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi,
      '$1***'
    )
    .replace(
      /(["'])(api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|token|authorization|password|passphrase|secret)\1\s*:\s*(["'])[^"']*?\3/gi,
      '$1$2$1:$3***$3'
    )
    .replace(
      /((?:api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|token|authorization|password|passphrase|secret)\s*[:=]\s*)(["']?)[^"',\s&}]+(\2)/gi,
      '$1$2***$3'
    );
};

export const sanitizeHttpLogUrl = (value: string): string => {
  const raw = String(value || '').trim();
  if (!raw) return raw;
  try {
    const isAbsolute = isAbsoluteHttpUrl(raw);
    const parsed = new URL(raw, isAbsolute ? undefined : 'http://local.invalid');
    parsed.searchParams.forEach((_paramValue, key) => {
      if (isSensitiveKey(key)) parsed.searchParams.set(key, '***');
    });
    return isAbsolute
      ? parsed.toString()
      : `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return redactSensitiveText(raw);
  }
};

export const formatHttpErrorBody = (value: unknown, limit = MAX_ERROR_BODY_CHARS): string => {
  const text = redactSensitiveText(stringifyResponseBody(value));
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}...`;
};

const createHttpStatusError = (status: number, body: unknown): Error => (
  new Error(`HTTP ${status}: ${formatHttpErrorBody(body)}`)
);

const buildHeaders = (
  headers: Record<string, string> | undefined,
  hasBody: boolean
): Record<string, string> => ({
  ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
  'Accept': 'application/json',
  ...headers
});

const toRequestBody = (body: unknown): BodyInit | undefined => {
  if (body === undefined) return undefined;
  return typeof body === 'string' ? body : JSON.stringify(body);
};

const runFetchText = async (
  fullUrl: string,
  method: HttpMethod,
  headers: Record<string, string>,
  body?: unknown,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS
): Promise<string> => {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      controller.abort(new Error(`HTTP ${method} timeout after ${timeoutMs}ms`));
      reject(new Error(`HTTP ${method} timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  const requestPromise = (async () => {
    const response = await fetch(fullUrl, {
      method,
      headers,
      body: toRequestBody(body),
      signal: controller.signal
    });

    if (!response.ok) {
      throw createHttpStatusError(response.status, await response.text());
    }

    return await response.text();
  })();

  try {
    return await Promise.race([requestPromise, timeoutPromise]);
  } finally {
    if (timeoutId !== null) {
      globalThis.clearTimeout(timeoutId);
    }
  }
};

const runNativeText = async (
  fullUrl: string,
  method: HttpMethod,
  headers: Record<string, string>,
  body?: unknown,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS
): Promise<string> => {
  const response = await CapacitorHttp.request({
    url: fullUrl,
    method,
    headers,
    data: body,
    connectTimeout: Math.min(timeoutMs, DEFAULT_REQUEST_TIMEOUT_MS),
    readTimeout: timeoutMs
  });

  if (response.status < 200 || response.status >= 300) {
    throw createHttpStatusError(response.status, response.data);
  }

  return stringifyResponseBody(response.data);
};

const requestText = async ({
  method,
  url,
  headers,
  body,
  useApiBase = true,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS
}: HttpRequestOptions): Promise<string> => {
  const fullUrl = resolveRequestUrl(url, useApiBase);
  const logUrl = sanitizeHttpLogUrl(fullUrl);
  const startedAt = Date.now();
  const native = isNativeApp();
  const requestHeaders = buildHeaders(headers, body !== undefined);

  if (isDevelopmentEnvironment()) {
    console.log('[HTTP]', method, logUrl, 'native:', native);
  }

  try {
    const text = native && useApiBase
      ? await runNativeText(fullUrl, method, requestHeaders, body, timeoutMs)
      : await runFetchText(fullUrl, method, requestHeaders, body, timeoutMs);

    if (isDevelopmentEnvironment()) {
      console.log('[HTTP]', method, 'done:', logUrl, 'ms:', Date.now() - startedAt);
    }
    return text;
  } catch (error) {
    console.error('[HTTP]', method, 'failed:', logUrl, 'ms:', Date.now() - startedAt, 'error:', error);
    throw error;
  }
};

/**
 * 获取 API 基础地址
 */
export const getApiBaseUrl = (): string => {
  return getRuntimeApiBaseUrl();
};

/**
 * 通用 HTTP GET 请求
 * CapacitorHttp 会自动拦截 fetch 请求
 */
export const httpGet = async (url: string, headers?: Record<string, string>): Promise<string> => {
  return requestText({ method: 'GET', url, headers });
};

/**
 * 通用 HTTP POST 请求
 */
export const httpPost = async (url: string, body: any, headers?: Record<string, string>): Promise<string> => {
  return requestText({ method: 'POST', url, body, headers });
};

/**
 * 通用 HTTP DELETE 请求
 */
export const httpDelete = async (url: string, headers?: Record<string, string>): Promise<string> => {
  return requestText({ method: 'DELETE', url, headers });
};

/**
 * 通用 HTTP PUT 请求
 */
export const httpPut = async (url: string, body: any, headers?: Record<string, string>): Promise<string> => {
  return requestText({ method: 'PUT', url, body, headers });
};

export const parseHttpJson = <T = any>(text: string, label = 'JSON'): T => {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error(`[HTTP] ${label} parse error: invalid JSON response (${text.length} chars)`);
    throw error;
  }
};

/**
 * JSON 格式的 GET 请求
 */
export const httpGetJson = async <T = any>(url: string, headers?: Record<string, string>): Promise<T> => {
  const text = await httpGet(url, headers);
  return parseHttpJson<T>(text, 'GET JSON');
};

/**
 * JSON 格式的 POST 请求
 */
export const httpPostJson = async <T = any>(url: string, body: any, headers?: Record<string, string>): Promise<T> => {
  const text = await httpPost(url, body, headers);
  return parseHttpJson<T>(text, 'POST JSON');
};

/**
 * JSON 格式的 DELETE 请求
 */
export const httpDeleteJson = async <T = any>(url: string, headers?: Record<string, string>): Promise<T> => {
  const text = await httpDelete(url, headers);
  return parseHttpJson<T>(text, 'DELETE JSON');
};

/**
 * JSON 格式的 PUT 请求
 */
export const httpPutJson = async <T = any>(url: string, body: any, headers?: Record<string, string>): Promise<T> => {
  const text = await httpPut(url, body, headers);
  return parseHttpJson<T>(text, 'PUT JSON');
};

/**
 * 直接请求外部 URL（用于 AI 代理等）
 */
export const httpPostExternal = async (
  url: string,
  body: any,
  headers?: Record<string, string>,
  options: { timeoutMs?: number } = {}
): Promise<string> => {
  return requestText({ method: 'POST', url, body, headers, useApiBase: false, timeoutMs: options.timeoutMs });
};
