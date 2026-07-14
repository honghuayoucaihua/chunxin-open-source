const DEFAULT_ADMIN_ROUTE_PATH = '/brhiza';
const runtimeEnv: Record<string, unknown> = ((import.meta as ImportMeta & { env?: Record<string, unknown> }).env || {}) as Record<string, unknown>;

function normalizeAdminRoutePath(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return DEFAULT_ADMIN_ROUTE_PATH;
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  const trimmed = withSlash.replace(/\/+$/, '');
  return trimmed || DEFAULT_ADMIN_ROUTE_PATH;
}

export function getAdminRoutePath(): string {
  return normalizeAdminRoutePath(runtimeEnv.VITE_ADMIN_ROUTE_PATH);
}

export function isAdminRoutePath(pathname: string): boolean {
  const adminPath = getAdminRoutePath();
  return pathname === adminPath || pathname.startsWith(`${adminPath}/`);
}
