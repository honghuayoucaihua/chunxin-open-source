import React, { useState, useEffect, useRef } from 'react';
import { MobileHeader, SectionDivider } from '../Common';
import { fetchMyShares, deleteCommunityShare, getCoverImageUrl, isValidCommunityCoverImage } from './communityService';
import { COMMUNITY_TYPE_META, type CommunityShareItem } from './communityTypes';
import { InlineFieldRow } from '../utils/UtilsContactFormPrimitives';
import { SharedEmptyState, SharedLoadingState } from '../settings/SharedPanelPrimitives';
import { clearCommunityAuthorCredentials, readCommunityAuthorCredentials, saveCommunityAuthorCredentials } from './communityAuthorStorage';

interface Props {
  onBack: () => void;
  onUpload: () => void;
  onToast: (msg: string) => void;
}

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const CommunityMySharesView: React.FC<Props> = ({ onBack, onUpload, onToast }) => {
  const storedAuthorCredentials = readCommunityAuthorCredentials();
  const [authorName, setAuthorName] = useState(storedAuthorCredentials.authorName);
  const [authorPassword, setAuthorPassword] = useState(storedAuthorCredentials.authorPassword);
  const [loggedIn, setLoggedIn] = useState(false);
  const [items, setItems] = useState<CommunityShareItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const mySharesLoginRequestIdRef = useRef(0);
  const mySharesMountedRef = useRef(true);
  const mySharesSessionIdRef = useRef(0);

  const handleLogin = async (inputAuthorName: string, inputAuthorPassword: string) => {
    const normalizedAuthorName = inputAuthorName.trim();
    const normalizedAuthorPassword = inputAuthorPassword.trim();
    if (!normalizedAuthorName || !normalizedAuthorPassword) {
      onToast('请输入作者名和密码');
      return;
    }
    setLoading(true);
    const requestId = ++mySharesLoginRequestIdRef.current;
    try {
      const res = await fetchMyShares(normalizedAuthorName, normalizedAuthorPassword);
      if (!mySharesMountedRef.current || requestId !== mySharesLoginRequestIdRef.current) {
        return;
      }
      setItems(res.items);
      setLoggedIn(true);
      mySharesSessionIdRef.current = requestId;
      setAuthorName(normalizedAuthorName);
      setAuthorPassword(normalizedAuthorPassword);
      saveCommunityAuthorCredentials(normalizedAuthorName, normalizedAuthorPassword);
    } catch (e: any) {
      if (!mySharesMountedRef.current || requestId !== mySharesLoginRequestIdRef.current) {
        return;
      }
      console.error('查询失败:', e);
      onToast('查询失败: ' + (e.message || '未知错误'));
    } finally {
      if (mySharesMountedRef.current && requestId === mySharesLoginRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // 如果 localStorage 里有保存的信息，自动登录
  useEffect(() => {
    mySharesMountedRef.current = true;
    if (authorName && authorPassword) {
      void handleLogin(authorName, authorPassword);
    }
    return () => {
      mySharesMountedRef.current = false;
    };
  }, []);

  const handleLoginClick = () => {
    void handleLogin(authorName, authorPassword);
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    if (!confirm('确定要删除这个分享吗？')) return;
    const deleteSessionId = mySharesSessionIdRef.current;
    setDeletingId(id);
    try {
      await deleteCommunityShare(id, authorName.trim(), authorPassword.trim());
      if (!mySharesMountedRef.current || deleteSessionId !== mySharesSessionIdRef.current) {
        return;
      }
      setItems(prev => prev.filter(i => i.id !== id));
      onToast('已删除');
    } catch (e: any) {
      if (!mySharesMountedRef.current || deleteSessionId !== mySharesSessionIdRef.current) {
        return;
      }
      console.error('删除失败:', e);
      onToast('删除失败: ' + (e.message || '未知错误'));
    } finally {
      if (mySharesMountedRef.current && deleteSessionId === mySharesSessionIdRef.current) {
        setDeletingId(null);
      }
    }
  };

  const handleLogout = () => {
    ++mySharesLoginRequestIdRef.current;
    ++mySharesSessionIdRef.current;
    setLoading(false);
    setLoggedIn(false);
    setItems([]);
    setDeletingId(null);
    setAuthorName('');
    setAuthorPassword('');
    clearCommunityAuthorCredentials();
  };

  // 未登录：显示登录表单
  if (!loggedIn) {
    return (
      <div className="flex flex-col h-full render-bg-primary render-text-primary">
        <MobileHeader title="我的分享" onBack={onBack} />

        <div className="flex-1 overflow-y-auto no-scrollbar" style={{ paddingBottom: 'var(--tab-scroll-pb)' }}>
          <div className="px-4 py-8 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full render-bg-tertiary flex items-center justify-center mb-4">
              <i className="fa-solid fa-user-lock text-2xl render-text-secondary"></i>
            </div>
            <p className="text-sm render-text-secondary mb-6 text-center">
              输入你上传时使用的作者名和密码<br />即可查看和管理你的分享内容
            </p>
          </div>

          <div className="render-bg-secondary mx-4 rounded-xl overflow-hidden">
            <InlineFieldRow label="昵称" value={authorName} placeholder="支持中文、英文、数字" onChange={setAuthorName} />
            <div className="app-list-item">
              <div className="app-list-item-main max-w-[7rem]">
                <div className="app-list-item-title">密码</div>
              </div>
              <div className="app-list-item-side flex-1">
                <input
                  type="password"
                  value={authorPassword}
                  onChange={e => setAuthorPassword(e.target.value)}
                  placeholder="输入密码"
                  className="app-field-input app-list-item-input text-right text-[14px] render-text-primary placeholder:text-gray-400"
                  onKeyDown={e => e.key === 'Enter' && handleLoginClick()}
                />
              </div>
            </div>
          </div>

          <div className="px-4 mt-4">
            <button
              onClick={handleLoginClick}
              disabled={loading}
              className="app-button app-button-primary w-full text-sm font-medium disabled:opacity-50"
            >
              {loading ? '查询中...' : '查看我的分享'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 已登录：显示分享列表
  return (
    <div className="flex flex-col h-full render-bg-primary render-text-primary relative">
      <MobileHeader
        title="我的分享"
        onBack={onBack}
      />

      <div className="render-bg-secondary border-b render-border-subtle">
        <div className="app-list-item">
          <div className="app-list-item-main">
            <div className="app-list-item-title flex items-center">
              <i className="fa-solid fa-user text-xs mr-1.5" style={{ color: 'var(--app-accent-color)' }}></i>
              <span>{authorName}</span>
            </div>
            <div className="app-list-item-desc">共 {items.length} 个分享</div>
          </div>
          <div className="app-list-item-side">
            <button onClick={handleLogout} className="app-button app-button-muted text-xs">
              切换账号
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ paddingBottom: 'calc(var(--tab-scroll-pb) + 64px)' }}>
        {loading && (
          <SharedLoadingState className="py-16" />
        )}

        {!loading && items.length === 0 && (
          <SharedEmptyState
            className="py-16 render-text-secondary"
            iconClassName="fa-solid fa-box-open text-4xl opacity-30"
            title="该账号还没有分享过内容"
          />
        )}

        {items.map(item => {
          const typeMeta = COMMUNITY_TYPE_META[item.type];
          const coverUrl = getCoverImageUrl(item.cover_image);
          return (
          <div key={item.id} className="render-bg-secondary border-b render-border-subtle">
            <div className="app-list-item !items-start">
              {/* 封面或图标 */}
              {isValidCommunityCoverImage(item.cover_image) && coverUrl ? (
                <img src={coverUrl} className="w-12 h-12 rounded-lg object-cover mr-3 flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mr-3 flex-shrink-0"
                  style={{ backgroundColor: typeMeta.color }}>
                  {item.avatar ? (
                    <img src={item.avatar} className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <i className={`fa-solid ${typeMeta.icon} text-white text-base`}></i>
                  )}
                </div>
              )}

              <div className="app-list-item-main min-w-0">
                <div className="app-list-item-title flex items-center gap-1.5">
                  <span className="truncate">{item.name}</span>
                  {item.is_encrypted === 1 && (
                    <i className="fa-solid fa-lock text-xs text-amber-500"></i>
                  )}
                </div>
                <div className="app-list-item-desc flex items-center gap-3">
                  <span>{typeMeta.label}</span>
                  <span><i className="fa-solid fa-heart mr-0.5"></i>{item.like_count || 0}</span>
                  <span><i className="fa-solid fa-download mr-0.5"></i>{item.download_count}</span>
                  <span>{formatTime(item.created_at)}</span>
                </div>
                {item.description && (
                  <div className="app-list-item-desc truncate mt-1">{item.description}</div>
                )}
              </div>

              <div className="app-list-item-side">
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="app-button app-button-danger text-xs"
                >
                  {deletingId === item.id ? '删除中...' : '删除'}
                </button>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* 底部悬浮上传按钮 */}
      <button
        onClick={onUpload}
        className="absolute left-1/2 -translate-x-1/2 bottom-4 px-6 h-11 rounded-full text-white shadow-lg flex items-center justify-center gap-2 text-sm font-medium active:scale-95 transition-transform"
        style={{ backgroundColor: 'var(--app-accent-color)', marginBottom: 'var(--tab-scroll-pb)' }}
      >
        <i className="fa-solid fa-plus"></i>
        上传分享
      </button>
    </div>
  );
};

export default CommunityMySharesView;
