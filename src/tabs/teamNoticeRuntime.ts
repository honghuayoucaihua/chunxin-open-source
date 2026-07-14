import { httpGetJson } from '../services/httpService.ts';
import { countUnreadTeamNotices, pickTeamNoticePreview, type TeamNoticePreview } from '../utils/teamNoticePreview.ts';

const TEAM_NOTICES_CACHE_KEY = 'xushuo_team_notices_cache_v1';
const TEAM_NOTICES_CACHE_TTL_MS = 30 * 60 * 1000;
let cachedTeamNotices: any[] | null = null;
let cachedTeamNoticesAt = 0;
let teamNoticesPromise: Promise<any[]> | null = null;

const readStoredTimestamp = (storageKey: string): number | null => {
  try {
    const raw = localStorage.getItem(storageKey);
    const ts = Number(raw);
    if (!Number.isFinite(ts) || ts <= 0) return null;
    return ts;
  } catch {
    return null;
  }
};

export const readStoredTeamNoticeLastReadAt = (storageKey: string): number | null => (
  readStoredTimestamp(storageKey)
);

const isFreshCache = (cachedAt: number, now = Date.now()): boolean => (
  Number.isFinite(cachedAt) && cachedAt > 0 && now - cachedAt <= TEAM_NOTICES_CACHE_TTL_MS
);

const readStoredTeamNotices = (): { notices: any[]; cachedAt: number } | null => {
  try {
    const raw = localStorage.getItem(TEAM_NOTICES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const cachedAt = Number(parsed?.cachedAt);
    const notices = Array.isArray(parsed?.notices) ? parsed.notices : null;
    if (!notices || !isFreshCache(cachedAt)) return null;
    return { notices, cachedAt };
  } catch {
    return null;
  }
};

const saveStoredTeamNotices = (notices: any[]): void => {
  try {
    localStorage.setItem(TEAM_NOTICES_CACHE_KEY, JSON.stringify({
      cachedAt: Date.now(),
      notices
    }));
  } catch {
    // ignore
  }
};

export const fetchTeamNoticesRuntime = async (forceRefresh = false): Promise<any[]> => {
  if (!forceRefresh && cachedTeamNotices && isFreshCache(cachedTeamNoticesAt)) {
    return cachedTeamNotices;
  }
  if (!forceRefresh) {
    const stored = readStoredTeamNotices();
    if (stored) {
      cachedTeamNotices = stored.notices;
      cachedTeamNoticesAt = stored.cachedAt;
      return stored.notices;
    }
    if (teamNoticesPromise) return teamNoticesPromise;
  }

  teamNoticesPromise = (async () => {
    try {
      const data = await httpGetJson<{ notices: any[] }>('/team/notices');
      const notices = Array.isArray(data?.notices) ? data.notices : [];
      cachedTeamNotices = notices;
      cachedTeamNoticesAt = Date.now();
      saveStoredTeamNotices(notices);
      return notices;
    } finally {
      teamNoticesPromise = null;
    }
  })();
  return teamNoticesPromise;
};

export const fetchTeamNoticePreviewRuntime = async (params: {
  previewStorageKey: string;
  lastReadStorageKey: string;
  fallbackLastReadAt: number;
}): Promise<{ preview: TeamNoticePreview | null; unreadCount: number }> => {
  const notices = await fetchTeamNoticesRuntime();
  const preview = pickTeamNoticePreview(notices);
  try {
    if (preview) {
      localStorage.setItem(params.previewStorageKey, JSON.stringify(preview));
    } else {
      localStorage.removeItem(params.previewStorageKey);
    }
  } catch {
    // ignore
  }

  const lastReadAt = readStoredTeamNoticeLastReadAt(params.lastReadStorageKey) ?? params.fallbackLastReadAt;
  return {
    preview,
    unreadCount: countUnreadTeamNotices(notices, lastReadAt)
  };
};
