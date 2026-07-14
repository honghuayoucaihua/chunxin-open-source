/**
 * 叙说管理面板
 * 入口路径由 admin/adminRouteConfig.ts 控制（默认 /brhiza，可通过 VITE_ADMIN_ROUTE_PATH 覆盖）
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { httpDelete, httpGetJson, httpPost, httpPut, httpPutJson, getApiBaseUrl } from '../services/httpService';
import { AdminAiView, type AiConfigPayload, type AiRuntimePayload } from './AdminAiView';
import {
  AdminApkView,
  AdminNoticesView,
  type ApkCandidate,
  type ApkVersion
} from './AdminNoticeApkViews';
import { AdminCommunityView, type CommunityAdminItem } from './AdminCommunityView';

interface PassphraseItem {
  id: string;
  phrase: string;
  limit: number;
  isUnlimited: boolean;
  validDays: number;
  phraseExpiresDays: number | null;
  maxUses: number | null;
  maxUsesPerUser: number | null;
}

interface AdminPassphraseResponseItem {
  id?: string;
  phrase: string;
  limit: number;
  isUnlimited?: boolean;
  validDays?: number;
  phraseExpiresDays?: number | null;
  maxUses?: number | null;
  maxUsesPerUser?: number | null;
  isActive?: boolean;
}

interface TeamNotice {
  id: string;
  title: string;
  content: string;
  type: 'announcement' | 'update' | 'notice';
  createdAt: number;
}

type AdminTab = 'ai' | 'notices' | 'apk' | 'community';

const initialPassphrase = (): PassphraseItem => ({
  id: `pp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  phrase: '',
  limit: 2000,
  isUnlimited: false,
  validDays: 0,
  phraseExpiresDays: null,
  maxUses: null,
  maxUsesPerUser: null
});

const formatBytes = (bytes?: number) => {
  if (!bytes) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const getRequestErrorMessage = (error: unknown, fallback: string): string => {
  const message = error instanceof Error ? error.message : '';
  const trimmed = message.trim();
  if (!trimmed) return fallback;
  const httpMatch = trimmed.match(/^HTTP\s+\d+:\s*(.+)$/s);
  const rawBody = (httpMatch?.[1] || trimmed).trim();
  if (!rawBody) return fallback;
  try {
    const parsed = JSON.parse(rawBody) as { error?: unknown };
    if (typeof parsed?.error === 'string' && parsed.error.trim()) {
      return parsed.error.trim();
    }
  } catch {}
  return rawBody || fallback;
};

const matchesCommunityAdminSearch = (item: CommunityAdminItem, search: string): boolean => {
  const keyword = search.trim().toLowerCase();
  if (!keyword) return true;
  return [item.name, item.description, item.author_name].some((value) =>
    String(value || '').toLowerCase().includes(keyword)
  );
};

const AdminPanel: React.FC = () => {
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('ai');

  const [passphrases, setPassphrases] = useState<PassphraseItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [notices, setNotices] = useState<TeamNotice[]>([]);
  const [apkVersions, setApkVersions] = useState<ApkVersion[]>([]);
  const [apkCandidate, setApkCandidate] = useState<ApkCandidate | null>(null);
  const [communityItems, setCommunityItems] = useState<CommunityAdminItem[]>([]);
  const [communitySearch, setCommunitySearch] = useState('');
  const [communityLoading, setCommunityLoading] = useState(false);
  const adminActionPromisesRef = useRef<Map<string, Promise<unknown>>>(new Map());
  const communitySearchRequestIdRef = useRef(0);
  const communitySearchTimerRef = useRef<number | null>(null);

  const [aiConfig, setAiConfig] = useState<AiConfigPayload | null>(null);
  const [aiRuntime, setAiRuntime] = useState<AiRuntimePayload | null>(null);

  const runAdminAction = useCallback(<T,>(key: string, action: () => Promise<T>): Promise<T> => {
    const existing = adminActionPromisesRef.current.get(key) as Promise<T> | undefined;
    if (existing) return existing;
    const promise = (async () => action())();
    adminActionPromisesRef.current.set(key, promise);
    return promise.finally(() => {
      if (adminActionPromisesRef.current.get(key) === promise) {
        adminActionPromisesRef.current.delete(key);
      }
    });
  }, []);

  const loadCommunityData = useCallback(async (key: string, search = '', options: { silent?: boolean } = {}) => {
    return runAdminAction(`community-load:${search.trim()}`, async () => {
      setCommunityLoading(true);
      const requestId = ++communitySearchRequestIdRef.current;
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      try {
        const data = await httpGetJson<{ items?: CommunityAdminItem[] }>(`/admin/community${params}`, { 'x-admin-key': key });
        if (requestId !== communitySearchRequestIdRef.current) {
          return;
        }
        setCommunityItems(data.items || []);
      } catch (error) {
        if (!options.silent) {
          setError(getRequestErrorMessage(error, '加载社区失败'));
        }
        throw error;
      } finally {
        if (requestId === communitySearchRequestIdRef.current) {
          setCommunityLoading(false);
        }
      }
    });
  }, [runAdminAction]);

  const loadData = useCallback(async (key: string) => {
    try {
      const passData = await httpGetJson<{ passphrases?: AdminPassphraseResponseItem[] }>('/admin/passphrases', { 'x-admin-key': key });
      setPassphrases((passData.passphrases || []).map((item, index) => ({
        id: item.id || `loaded_${index}`,
        phrase: item.phrase,
        limit: item.limit,
        isUnlimited: item.limit === -1 || item.isUnlimited === true,
        validDays: item.validDays || 0,
        phraseExpiresDays: item.phraseExpiresDays !== undefined ? item.phraseExpiresDays : null,
        maxUses: item.maxUses !== undefined ? item.maxUses : null,
        maxUsesPerUser: item.maxUsesPerUser !== undefined ? item.maxUsesPerUser : null
      })));
    } catch (e) {
      console.error('加载口令失败:', e);
    }

    try {
      const aiData = await httpGetJson<{ config: AiConfigPayload; runtime: AiRuntimePayload }>('/admin/ai-config', { 'x-admin-key': key });
      setAiConfig(aiData.config || null);
      setAiRuntime(aiData.runtime || null);
    } catch (e) {
      console.error('加载 AI 配置失败:', e);
    }

    try {
      const noticesData = await httpGetJson<{ notices?: TeamNotice[] }>(`/team/notices?_=${Date.now()}`);
      setNotices(noticesData.notices || []);
    } catch (e) {
      console.error('加载公告失败:', e);
    }

    try {
      const apkData = await httpGetJson<{ versions?: ApkVersion[] }>('/admin/versions', { 'x-admin-key': key });
      setApkVersions(apkData.versions || []);
    } catch (e) {
      console.error('加载 APK 版本失败:', e);
    }

    try {
      const candidateData = await httpGetJson<{ candidate?: ApkCandidate | null }>('/admin/apk/candidate', { 'x-admin-key': key });
      setApkCandidate(candidateData.candidate || null);
    } catch (e) {
      console.error('加载 APK 候选包失败:', e);
      setApkCandidate(null);
    }

    try {
      await loadCommunityData(key, '', { silent: false });
    } catch (e) {
      console.error('加载社区失败:', e);
    }
  }, [loadCommunityData]);

  const refreshAiConfig = useCallback(async (key: string) => {
    const data = await httpGetJson<{ config: AiConfigPayload; runtime: AiRuntimePayload }>('/admin/ai-config', { 'x-admin-key': key });
    setAiConfig(data.config || null);
    setAiRuntime(data.runtime || null);
  }, []);

  const handleLogin = useCallback(async () => {
    const normalizedKey = adminKey.trim();
    if (!normalizedKey) {
      setError('请输入管理员密钥');
      return;
    }
    await runAdminAction('login', async () => {
      setLoading(true);
      setError('');
      try {
        const text = await httpPost('/admin/verify-key', { adminKey: normalizedKey });
        const res = JSON.parse(text);
        if (res.success) {
          setIsAuthenticated(true);
          localStorage.setItem('admin_panel_key', normalizedKey);
          setAdminKey(normalizedKey);
        } else {
          setError('管理员密钥错误');
        }
      } catch {
        setError('连接服务器失败');
      } finally {
        setLoading(false);
      }
    });
  }, [adminKey, runAdminAction]);

  const handleSavePassphrases = useCallback(async () => {
    await runAdminAction('save-passphrases', async () => {
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        const text = await httpPut('/admin/passphrases', {
          passphrases: passphrases
            .filter((item) => item.phrase.trim())
            .map((item) => ({
              id: item.id,
              phrase: item.phrase.trim(),
              limit: item.isUnlimited ? -1 : item.limit,
              validDays: item.validDays,
              phraseExpiresDays: item.phraseExpiresDays,
              maxUses: item.maxUses,
              maxUsesPerUser: item.maxUsesPerUser,
              isActive: true
            }))
        }, { 'x-admin-key': adminKey });
        const res = JSON.parse(text);
        if (res.success) {
          setSuccess('口令配置已保存');
          await loadData(adminKey);
        } else {
          setError(res.error || '保存失败');
        }
      } catch {
        setError('连接服务器失败');
      } finally {
        setLoading(false);
      }
    });
  }, [adminKey, loadData, passphrases, runAdminAction]);

  const handleSaveAiConfig = useCallback(async (patch: Partial<AiConfigPayload>) => {
    await runAdminAction('save-ai-config', async () => {
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        const text = await httpPut('/admin/ai-config', patch, { 'x-admin-key': adminKey });
        const res = JSON.parse(text);
        if (res.success) {
          setAiConfig(res.config || null);
          await refreshAiConfig(adminKey);
          setSuccess('AI 配置已保存');
        } else {
          setError(res.error || '保存失败');
        }
      } catch {
        setError('连接服务器失败');
      } finally {
        setLoading(false);
      }
    });
  }, [adminKey, refreshAiConfig, runAdminAction]);

  const handleFetchAiModels = useCallback(async (): Promise<string[]> => {
    return runAdminAction('fetch-ai-models', async () => {
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        const text = await httpPost('/admin/ai-config/fetch-models', {}, { 'x-admin-key': adminKey });
        const res = JSON.parse(text);
        if (res.success && Array.isArray(res.models)) {
          setSuccess(`已获取 ${res.models.length} 个模型，保存后生效`);
          return res.models;
        }
        setError(res.error || '获取模型失败');
        return [];
      } catch {
        setError('获取模型失败');
        return [];
      } finally {
        setLoading(false);
      }
    });
  }, [adminKey, runAdminAction]);

  const handleRefreshAi = useCallback(async () => {
    await runAdminAction('refresh-ai-config', async () => {
      setError('');
      try {
        await refreshAiConfig(adminKey);
      } catch {
        setError('刷新 AI 配置失败');
      }
    });
  }, [adminKey, refreshAiConfig, runAdminAction]);

  const handleAddPassphrase = () => {
    const item = initialPassphrase();
    setPassphrases((prev) => [...prev, item]);
    setEditingId(item.id);
  };

  const handleStartEditPassphrase = (item: PassphraseItem) => {
    setEditingId(item.id);
  };

  const handleDeletePassphrase = (id: string) => {
    setPassphrases((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSavePassphraseEditing = (data: { phrase: string; limit: number; isUnlimited: boolean; validDays: number; phraseExpiresDays: number | null; maxUses: number | null; maxUsesPerUser: number | null }) => {
    if (!editingId) return;
    setPassphrases((prev) => prev.map((item) => (item.id === editingId ? { ...item, ...data } : item)));
    setEditingId(null);
  };

  const handleCancelPassphraseEditing = () => {
    setPassphrases((prev) => {
      const editing = prev.find((item) => item.id === editingId);
      return editing && !editing.phrase.trim() ? prev.filter((item) => item.id !== editingId) : prev;
    });
    setEditingId(null);
  };

  const handleAddNotice = async (title: string, content: string, type: string) => {
    if (!title.trim() || !content.trim()) {
      setError('标题和内容不能为空');
      return;
    }
    await runAdminAction('add-notice', async () => {
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        const text = await httpPost('/admin/notices', {
          title: title.trim(),
          content: content.trim(),
          type
        }, { 'x-admin-key': adminKey });
        const res = JSON.parse(text);
        if (res.success) {
          setShowNoticeForm(false);
          await loadData(adminKey);
          setSuccess('公告已发布');
        } else {
          setError(res.error || '发布失败');
        }
      } catch {
        setError('连接服务器失败');
      } finally {
        setLoading(false);
      }
    });
  };

  const handleDeleteNotice = async (id: string) => {
    await runAdminAction(`delete-notice:${id}`, async () => {
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        await httpDelete(`/admin/notices/${id}`, { 'x-admin-key': adminKey });
        await loadData(adminKey);
        setSuccess('公告已删除');
      } catch {
        setError('删除失败');
      } finally {
        setLoading(false);
      }
    });
  };

  const handleAddApkVersion = async (payload: Omit<ApkVersion, 'id' | 'createdAt'>) => {
    await runAdminAction('add-apk-version', async () => {
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        const text = await httpPost('/admin/versions', payload, { 'x-admin-key': adminKey });
        const res = JSON.parse(text);
        if (res.success) {
          await loadData(adminKey);
          setSuccess('APK 版本已添加');
        } else {
          setError(res.error || '添加失败');
        }
      } catch {
        setError('连接服务器失败');
      } finally {
        setLoading(false);
      }
    });
  };

  const handleDeleteApkVersion = async (id: string) => {
    await runAdminAction(`delete-apk-version:${id}`, async () => {
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        await httpDelete(`/admin/versions/${id}`, { 'x-admin-key': adminKey });
        await loadData(adminKey);
        setSuccess('版本已删除');
      } catch {
        setError('删除失败');
      } finally {
        setLoading(false);
      }
    });
  };

  const handleEditApkVersion = async (version: ApkVersion) => {
    const nextVersion = window.prompt('编辑版本号', String(version.version || ''));
    if (nextVersion === null) return;
    const nextCodeRaw = window.prompt('编辑版本代码', String(version.versionCode || 0));
    if (nextCodeRaw === null) return;
    const nextUrl = window.prompt('编辑 APK 地址', String(version.apkUrl || ''));
    if (nextUrl === null) return;
    const nextLog = window.prompt('编辑更新日志', String(version.updateLog || ''));
    if (nextLog === null) return;
    const nextMinRaw = window.prompt('最低版本限制（可空）', version.minVersion ? String(version.minVersion) : '');
    if (nextMinRaw === null) return;
    const forceUpdate = window.confirm('是否强制更新？\n确定=强制，取消=非强制');

    const versionCode = Number(nextCodeRaw);
    if (!nextVersion.trim() || !nextUrl.trim() || !Number.isFinite(versionCode) || versionCode <= 0) {
      setError('版本号、版本代码、APK 地址格式不正确');
      return;
    }

    await runAdminAction(`edit-apk-version:${version.id}`, async () => {
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        const text = await httpPut(`/admin/versions/${version.id}`, {
          version: nextVersion.trim(),
          versionCode: Math.floor(versionCode),
          apkUrl: nextUrl.trim(),
          apkSize: version.apkSize || null,
          updateLog: nextLog.trim(),
          forceUpdate,
          minVersion: nextMinRaw.trim() ? Math.floor(Number(nextMinRaw)) : null
        }, { 'x-admin-key': adminKey });
        const res = JSON.parse(text);
        if (res.success) {
          await loadData(adminKey);
          setSuccess('版本已更新');
        } else {
          setError(res.error || '更新失败');
        }
      } catch {
        setError('连接服务器失败');
      } finally {
        setLoading(false);
      }
    });
  };

  const handlePublishCandidateApk = async () => {
    await runAdminAction('publish-candidate-apk', async () => {
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        const text = await httpPost('/admin/apk/publish-candidate', {}, { 'x-admin-key': adminKey });
        const res = JSON.parse(text);
        if (res.success) {
          await loadData(adminKey);
          setSuccess('候选 APK 已发布，用户端现在会收到这个版本');
        } else {
          setError(res.error || '发布失败');
        }
      } catch {
        setError('连接服务器失败');
      } finally {
        setLoading(false);
      }
    });
  };

  const handleAdminDeleteCommunity = useCallback(async (id: string) => {
    await runAdminAction(`delete-community:${id}`, async () => {
      try {
        await httpDelete(`/admin/community/${id}`, { 'x-admin-key': adminKey });
        setCommunityItems((prev) => prev.filter((item) => item.id !== id));
        setSuccess('已删除该分享');
        void loadCommunityData(adminKey, communitySearch, { silent: true }).catch(() => {});
      } catch (error) {
        setError(getRequestErrorMessage(error, '删除失败'));
      }
    });
  }, [adminKey, communitySearch, loadCommunityData, runAdminAction]);

  const handleAdminEditCommunity = useCallback(async (id: string, data: { name?: string; description?: string; like_count?: number; download_count?: number; report_count?: number; cover_image?: string }) => {
    return runAdminAction(`edit-community:${id}`, async () => {
      try {
        const res = await httpPutJson<{ success?: boolean; item?: CommunityAdminItem }>(`/admin/community/${id}`, data, { 'x-admin-key': adminKey });
        setCommunityItems((prev) => {
          if (!res.item) return prev;
          const nextItem = res.item;
          return prev.flatMap((item) => {
            if (item.id !== id) return [item];
            return matchesCommunityAdminSearch(nextItem, communitySearch) ? [nextItem] : [];
          });
        });
        setSuccess('已更新');
        void loadCommunityData(adminKey, communitySearch, { silent: true }).catch(() => {});
        return true;
      } catch (error) {
        setError(getRequestErrorMessage(error, '更新失败'));
        return false;
      }
    });
  }, [adminKey, communitySearch, loadCommunityData, runAdminAction]);

  useEffect(() => {
    let cancelled = false;
    const restoreLogin = async () => {
      const savedKey = String(localStorage.getItem('admin_panel_key') || '').trim();
      if (!savedKey) {
        if (!cancelled) setIsAuthChecking(false);
        return;
      }
      setAdminKey(savedKey);
      setLoading(true);
      try {
        const text = await httpPost('/admin/verify-key', { adminKey: savedKey });
        const res = JSON.parse(text);
        if (cancelled) return;
        if (res.success) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('admin_panel_key');
        }
      } catch {
        if (!cancelled) setError('自动登录失败，请手动登录');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setIsAuthChecking(false);
        }
      }
    };
    void restoreLogin();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && adminKey) {
      void loadData(adminKey);
    }
  }, [isAuthenticated, adminKey, loadData]);

  useEffect(() => () => {
    if (communitySearchTimerRef.current !== null) {
      window.clearTimeout(communitySearchTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!success && !error) return undefined;
    const timer = window.setTimeout(() => {
      setSuccess('');
      setError('');
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [success, error]);

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-cyan-400 animate-spin mx-auto mb-4"></div>
          <div className="text-white/80 text-sm">正在自动登录...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <i className="fa-solid fa-shield-halved text-white text-xl"></i>
            </div>
            <h1 className="text-xl font-bold text-white mb-1">叙说管理面板</h1>
          </div>

          {error ? (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4 text-red-300 text-sm text-center">
              {error}
            </div>
          ) : null}

          <div className="space-y-3">
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center placeholder-white/30 focus:outline-none focus:border-purple-500"
              placeholder="输入管理员密钥"
            />

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium py-3 rounded-xl disabled:opacity-50"
            >
              {loading ? '验证中...' : '进入'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <a href="/" className="text-white/40 hover:text-white/60 text-sm">
              <i className="fa-solid fa-arrow-left mr-1"></i> 返回首页
            </a>
          </div>
        </div>
      </div>
    );
  }

  const AiPage = () => (
    <AdminAiView
      aiConfig={aiConfig}
      aiRuntime={aiRuntime}
      loading={loading}
      onSaveAiConfig={handleSaveAiConfig}
      onFetchModels={handleFetchAiModels}
      onRefreshAi={handleRefreshAi}
      passphrases={passphrases}
      passphraseEditingId={editingId}
      onAddPassphrase={handleAddPassphrase}
      onStartEditPassphrase={handleStartEditPassphrase}
      onDeletePassphrase={handleDeletePassphrase}
      onSavePassphraseEditing={handleSavePassphraseEditing}
      onCancelPassphraseEditing={handleCancelPassphraseEditing}
      onSavePassphraseConfig={handleSavePassphrases}
    />
  );

  const NoticesPage = () => (
    <AdminNoticesView
      showNoticeForm={showNoticeForm}
      setShowNoticeForm={setShowNoticeForm}
      onAddNotice={handleAddNotice}
      loading={loading}
      notices={notices}
      onDeleteNotice={handleDeleteNotice}
    />
  );

  const ApkPage = () => (
    <AdminApkView
      apkVersions={apkVersions}
      candidate={apkCandidate}
      loading={loading}
      onAdd={handleAddApkVersion}
      onDeleteApkVersion={handleDeleteApkVersion}
      onEditApkVersion={handleEditApkVersion}
      onPublishCandidate={handlePublishCandidateApk}
      formatBytes={formatBytes}
    />
  );

  const CommunityPage = () => (
    <AdminCommunityView
      items={communityItems}
      loading={communityLoading}
      search={communitySearch}
      onSearchChange={(value) => {
        setCommunitySearch(value);
        if (communitySearchTimerRef.current !== null) {
          window.clearTimeout(communitySearchTimerRef.current);
        }
        communitySearchTimerRef.current = window.setTimeout(() => {
          void loadCommunityData(adminKey, value, { silent: true }).catch(() => {});
        }, 250);
      }}
      onDelete={handleAdminDeleteCommunity}
      onEdit={handleAdminEditCommunity}
      onRefresh={() => { void loadCommunityData(adminKey, communitySearch, { silent: false }); }}
      coverUrlPrefix={getApiBaseUrl().replace(/\/api$/, '')}
    />
  );

  return (
    <div className="h-screen bg-[#111] flex flex-col items-center overflow-hidden">
      <div className="h-full w-full max-w-2xl flex flex-col">
        <header className="sticky top-0 z-50 bg-[#111]/95 backdrop-blur border-b border-white/10 flex-shrink-0">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-shield-halved text-white text-sm"></i>
              </div>
              <span className="text-white font-medium">叙说</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsAuthenticated(false);
                  localStorage.removeItem('admin_panel_key');
                }}
                className="text-white/50 hover:text-white text-sm px-2 py-1"
              >
                退出
              </button>
              <a href="/" className="text-white/50 hover:text-white text-sm px-2 py-1">
                首页
              </a>
            </div>
          </div>
        </header>

        {success ? (
          <div className="mx-4 mt-4 bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-green-300 text-sm text-center">
            <i className="fa-solid fa-check-circle mr-1"></i>{success}
          </div>
        ) : null}
        {error ? (
          <div className="mx-4 mt-4 bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm text-center">
            <i className="fa-solid fa-circle-exclamation mr-1"></i>{error}
          </div>
        ) : null}

        <div className="flex border-b border-white/10 bg-[#111] sticky top-[52px] z-40 flex-shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
              activeTab === 'ai' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-white/50'
            }`}
            title="AI"
          >
            <i className="fa-solid fa-robot md:mr-1.5"></i>
            <span className="hidden md:inline">AI</span>
          </button>
          <button
            onClick={() => setActiveTab('notices')}
            className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
              activeTab === 'notices' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-white/50'
            }`}
            title="公告"
          >
            <i className="fa-solid fa-bullhorn md:mr-1.5"></i>
            <span className="hidden md:inline">公告</span>
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
              activeTab === 'apk' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-white/50'
            }`}
            title="APK"
          >
            <i className="fa-solid fa-mobile-screen md:mr-1.5"></i>
            <span className="hidden md:inline">APK</span>
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
              activeTab === 'community' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-white/50'
            }`}
            title="社区"
          >
            <i className="fa-solid fa-users md:mr-1.5"></i>
            <span className="hidden md:inline">社区</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-20 no-scrollbar">
          {activeTab === 'ai' && <AiPage />}
          {activeTab === 'notices' && <NoticesPage />}
          {activeTab === 'apk' && <ApkPage />}
          {activeTab === 'community' && <CommunityPage />}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
