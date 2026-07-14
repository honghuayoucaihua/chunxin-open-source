import { Capacitor } from '@capacitor/core';

const DEFAULT_SERVER_URL = '';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const runtimeEnv: Record<string, unknown> = ((import.meta as ImportMeta & { env?: Record<string, unknown> }).env || {}) as Record<string, unknown>;

type LocationLike = {
  origin?: string;
  protocol?: string;
  hostname?: string;
} | null | undefined;

type ResolveContext = {
  isNativeApp?: boolean;
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function normalizeBaseUrl(value: string | undefined, fallback: string): string {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (raw === '/api' || raw.startsWith('/api/')) {
    return trimTrailingSlash(raw);
  }
  return trimTrailingSlash(raw);
}

function getCurrentLocationLike(): LocationLike {
  if (typeof window === 'undefined' || !window.location) return null;
  return window.location;
}

function isNativeApp(context: ResolveContext = {}): boolean {
  if (typeof context.isNativeApp === 'boolean') return context.isNativeApp;
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function getLocationHostname(locationLike: LocationLike): string {
  const directHostname = String(locationLike?.hostname || '').trim().toLowerCase();
  if (directHostname) return directHostname;
  const origin = String(locationLike?.origin || '').trim();
  if (!origin || origin === 'null') return '';
  try {
    return new URL(origin).hostname.trim().toLowerCase();
  } catch {
    return '';
  }
}

function isNativeLoopbackOrigin(locationLike: LocationLike, context: ResolveContext = {}): boolean {
  if (!isNativeApp(context)) return false;
  return LOOPBACK_HOSTS.has(getLocationHostname(locationLike));
}

export function getSameOriginServerBaseUrl(
  locationLike: LocationLike = getCurrentLocationLike(),
  context: ResolveContext = {}
): string | null {
  const origin = String(locationLike?.origin || '').trim();
  const protocol = String(locationLike?.protocol || '').trim();
  if (!origin || origin === 'null') return null;
  if (isNativeLoopbackOrigin(locationLike, context)) return null;
  if (protocol !== 'http:' && protocol !== 'https:') return null;
  return trimTrailingSlash(origin);
}

export function resolveServerBaseUrl(
  serverUrl: string | undefined,
  locationLike: LocationLike = getCurrentLocationLike(),
  context: ResolveContext = {}
): string {
  return normalizeBaseUrl(serverUrl, getSameOriginServerBaseUrl(locationLike, context) || DEFAULT_SERVER_URL);
}

export function resolveApiBaseUrl(
  serverUrl: string | undefined,
  apiBaseUrl: string | undefined,
  locationLike: LocationLike = getCurrentLocationLike(),
  context: ResolveContext = {}
): string {
  const resolvedServerBase = resolveServerBaseUrl(serverUrl, locationLike, context);
  return normalizeBaseUrl(apiBaseUrl, `${resolvedServerBase}/api`);
}

export function getServerBaseUrl(): string {
  return resolveServerBaseUrl(
    runtimeEnv.VITE_SERVER_URL as string | undefined,
    getCurrentLocationLike(),
    { isNativeApp: isNativeApp() }
  );
}

export function getApiBaseUrl(): string {
  return resolveApiBaseUrl(
    runtimeEnv.VITE_SERVER_URL as string | undefined,
    runtimeEnv.VITE_API_BASE_URL as string | undefined,
    getCurrentLocationLike(),
    { isNativeApp: isNativeApp() }
  );
}

export function joinApiPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}
