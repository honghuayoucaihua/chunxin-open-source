import { httpGetJson, httpPostJson, getApiBaseUrl } from '../services/httpService.ts';
import type {
  CommunityListResponse,
  CommunityShareItem,
  CommunityShareDetail,
  CommunityUploadRequest,
  CommunitySortMode
} from './communityTypes.ts';

let fallbackClientId = '';

const safeLocalStorageGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeLocalStorageSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 本地状态缓存失败不应影响社区接口请求。
  }
};

const getClientId = (): string => {
  let clientId = safeLocalStorageGetItem('clientId');
  if (!clientId) {
    clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    safeLocalStorageSetItem('clientId', clientId);
  }
  if (!clientId) {
    if (!fallbackClientId) {
      fallbackClientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return fallbackClientId;
  }
  return clientId;
};

const clientHeaders = (): Record<string, string> => ({
  'X-Client-ID': getClientId()
});

const inflightCommunityRequests = new Map<string, Promise<unknown>>();

const hashText = (value: string): string => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const buildCommunityRequestKey = (prefix: string, payload: unknown): string => {
  try {
    return `${prefix}:${hashText(JSON.stringify(payload))}`;
  } catch {
    return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  }
};

const runCommunitySingleFlight = <T>(key: string, task: () => Promise<T>): Promise<T> => {
  const existing = inflightCommunityRequests.get(key);
  if (existing) return existing as Promise<T>;

  const promise = task().finally(() => {
    inflightCommunityRequests.delete(key);
  });
  inflightCommunityRequests.set(key, promise);
  return promise;
};

const COMMUNITY_ASSET_PATH_PREFIX = '/api/community/assets/';

export const isValidCommunityCoverImage = (coverImage: string): boolean => {
  const normalized = String(coverImage || '').trim();
  return normalized.startsWith(COMMUNITY_ASSET_PATH_PREFIX);
};

/** 将服务端返回的封面路径拼接为完整 URL */
export const getCoverImageUrl = (coverImage: string): string => {
  const normalized = String(coverImage || '').trim();
  if (!isValidCommunityCoverImage(normalized)) return '';
  return `${getApiBaseUrl().replace(/\/api$/, '')}${normalized}`;
};

export const fetchCommunityList = (
  type: string,
  page: number,
  pageSize: number,
  search: string,
  sort: CommunitySortMode = 'newest'
): Promise<CommunityListResponse> => {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (search) params.set('search', search);
  params.set('sort', sort);
  const query = params.toString();
  return runCommunitySingleFlight(
    buildCommunityRequestKey('community-list', { query }),
    () => httpGetJson<CommunityListResponse>(`/community/list?${query}`)
  );
};

export const uploadCommunityShare = (
  data: CommunityUploadRequest
): Promise<{ id: string; created_at: number }> => {
  return runCommunitySingleFlight(
    buildCommunityRequestKey('community-upload', data),
    () => httpPostJson(`/community/upload`, data, clientHeaders())
  );
};

export const fetchCommunityDetail = (
  id: string
): Promise<CommunityShareItem> => {
  return runCommunitySingleFlight(
    buildCommunityRequestKey('community-detail', { id }),
    () => httpGetJson<CommunityShareItem>(`/community/detail/${id}`, clientHeaders())
  );
};

export const downloadCommunityShare = (
  id: string
): Promise<CommunityShareDetail> => {
  return runCommunitySingleFlight(
    buildCommunityRequestKey('community-download', { id }),
    () => httpGetJson<CommunityShareDetail>(`/community/download/${id}`, clientHeaders())
  );
};

export const deleteCommunityShare = (
  id: string,
  authorName: string,
  authorPassword: string
): Promise<{ ok: boolean }> => {
  const payload = { author_name: authorName, author_password: authorPassword };
  return runCommunitySingleFlight(
    buildCommunityRequestKey('community-delete', { id, payload }),
    () => httpPostJson(`/community/delete/${id}`, payload, clientHeaders())
  );
};

export const fetchMyShares = (
  authorName: string,
  authorPassword: string
): Promise<{ items: CommunityShareItem[] }> => {
  const payload = {
    author_name: authorName,
    author_password: authorPassword
  };
  return runCommunitySingleFlight(
    buildCommunityRequestKey('community-mine', payload),
    () => httpPostJson<{ items: CommunityShareItem[] }>(`/community/mine`, payload, clientHeaders())
  );
};

export const likeCommunityShare = (
  id: string,
  action: 'like' | 'unlike'
): Promise<{ like_count: number }> => {
  return runCommunitySingleFlight(
    buildCommunityRequestKey('community-like', { id, action }),
    () => httpPostJson(`/community/like/${id}`, { action }, clientHeaders())
  );
};

/** 获取本地已点赞的分享 ID 集合 */
export const getLocalLikedIds = (): Set<string> => {
  try {
    const arr = JSON.parse(safeLocalStorageGetItem('community_liked_ids') || '[]');
    return new Set(arr);
  } catch {
    return new Set();
  }
};

/** 保存本地点赞状态 */
export const saveLocalLikedIds = (ids: Set<string>) => {
  safeLocalStorageSetItem('community_liked_ids', JSON.stringify([...ids]));
};

/** 获取本地已举报的分享 ID 集合 */
export const getLocalReportedIds = (): Set<string> => {
  try {
    const arr = JSON.parse(safeLocalStorageGetItem('community_reported_ids') || '[]');
    return new Set(arr);
  } catch {
    return new Set();
  }
};

/** 保存本地举报状态 */
export const saveLocalReportedIds = (ids: Set<string>) => {
  safeLocalStorageSetItem('community_reported_ids', JSON.stringify([...ids]));
};

export const reportCommunityShare = (
  id: string
): Promise<{ reported: boolean; report_count: number }> => {
  return runCommunitySingleFlight(
    buildCommunityRequestKey('community-report', { id }),
    () => httpPostJson(`/community/report/${id}`, {}, clientHeaders())
  );
};
