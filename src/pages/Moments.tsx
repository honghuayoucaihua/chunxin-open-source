
import React, { useEffect, useState } from 'react';
import { UserProfile, Moment } from '../types';
import { MobileHeader } from '../Common';
import { compressImage } from '../services/imageService';
import { MomentCard } from '../moments/MomentCard';
import { usePullRefresh } from '../moments/hooks/usePullRefresh';
import { SharedEmptyState } from '../settings/SharedPanelPrimitives';

export { PostMomentView } from '../moments/PostMomentView';

const normalizeMomentList = (raw: any, user: UserProfile): Moment[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(Boolean)
    .map((item: any, idx: number) => {
      const likes = Array.isArray(item?.likes)
        ? item.likes.map((v: any) => String(v || '').trim()).filter(Boolean)
        : [];
      const comments = Array.isArray(item?.comments)
        ? item.comments
            .filter(Boolean)
            .map((c: any, cIdx: number) => ({
              id: String(c?.id || `c-${Date.now()}-${idx}-${cIdx}`),
              user: String(c?.user || '匿名').trim() || '匿名',
              text: String(c?.text || '').trim(),
              replyTo: c?.replyTo ? String(c.replyTo).trim() : undefined
            }))
            .filter((c: any) => !!c.text)
        : [];
      const images = Array.isArray(item?.images)
        ? item.images.map((v: any) => String(v || '').trim()).filter(Boolean)
        : [];
      const imageDescriptions = Array.isArray(item?.imageDescriptions)
        ? item.imageDescriptions.map((v: any) => String(v || '').trim())
        : [];
      const timestampRaw = Number(item?.timestamp);
      return {
        id: String(item?.id || `m-${Date.now()}-${idx}`),
        author: String(item?.author || user.name || '我').trim() || '我',
        avatar: String(item?.avatar || user.avatar || '/assets/image/user.png').trim() || '/assets/image/user.png',
        authorId: String(item?.authorId || 'me').trim() || 'me',
        content: String(item?.content || '').trim(),
        images,
        imageDescriptions,
        timestamp: Number.isFinite(timestampRaw) && timestampRaw > 0 ? timestampRaw : Date.now(),
        likes,
        comments,
        location: item?.location ? String(item.location).trim() : undefined
      } as Moment;
    });
};

export const MomentsView: React.FC<{
  user: UserProfile,
  moments: Moment[],
  onBack: () => void,
  onAvatarClick: (id: string) => void,
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>,
  onPost?: () => void,
  owner?: { id: string; name: string; avatar: string; momentsCover?: string },
  isOwnerMe?: boolean,
  onManualGenerate?: () => Promise<void> | void,
  onUpdateMoments?: (next: Moment[]) => void,
  onCommentCreate?: (momentId: string, commentText: string, replyTo?: { user: string }) => void
}> = ({ user, moments, onBack, onAvatarClick, setUser, onPost, owner, isOwnerMe = true, onManualGenerate, onUpdateMoments, onCommentCreate }) => {
  const [list, setList] = useState<Moment[]>(() => normalizeMomentList(moments, user));
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentReplyTo, setCommentReplyTo] = useState<{ user: string } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [editingMomentId, setEditingMomentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingLocation, setEditingLocation] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const ownerId = owner?.id || 'me';
  const ownerName = owner?.name || user.name;
  const normalizeImageSrc = (value?: string) => {
    const trimmed = String(value || '').trim();
    return trimmed ? trimmed : undefined;
  };
  const fallbackAvatar = '/assets/image/user.png';
  const ownerAvatar = normalizeImageSrc(owner?.avatar) || normalizeImageSrc(user.avatar) || fallbackAvatar;
  const ownerCover = normalizeImageSrc(owner?.momentsCover)
    || normalizeImageSrc(isOwnerMe ? user.momentsCover : owner?.avatar)
    || normalizeImageSrc(user.momentsCover);
  const rootSkinId = (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-render-skin') : null) || 'wechat';
  const isQQSkin = rootSkinId === 'qq';
  const visibleList = ownerId === 'me' ? list : list.filter(m => m.authorId === ownerId);
  const qqVisitorCount = isOwnerMe
    ? Math.max(0, Math.floor(user.qqVisitors || 0))
    : Math.max(42, visibleList.length * 7 + 42);

  const { pullDistance, isRefreshing, scrollRef, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullRefresh({
    onRefresh: onManualGenerate
  });

  useEffect(() => {
    setList(normalizeMomentList(moments, user));
  }, [moments, user]);

  const syncMoments = (updater: (prev: Moment[]) => Moment[]) => {
    setList(prev => {
      const next = normalizeMomentList(updater(prev), user);
      onUpdateMoments?.(next);
      return next;
    });
  };

  const formatMomentTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    // 1个小时内显示xx分钟前
    if (diffMins < 60) {
      return `${diffMins}分钟前`;
    }
    // 24小时内显示xx小时前
    if (diffHours < 24) {
      return `${diffHours}小时前`;
    }
    // 一周内显示昨天/x天前
    if (diffDays < 7) {
      return `${diffDays}天前`;
    }
    // 一周以上显示日期
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const handleLike = (id: string) => {
    syncMoments(prev => prev.map(m => {
      if (m.id === id) {
        const liked = m.likes.includes(user.name);
        return { ...m, likes: liked ? m.likes.filter(n => n !== user.name) : [...m.likes, user.name] };
      }
      return m;
    }));
  };

  const handleComment = (id: string, replyTo?: { user: string }) => {
    if (!commentText.trim()) return;
    const trimmed = commentText.trim();
    syncMoments(prev => prev.map(m => {
      if (m.id === id) {
        return { ...m, comments: [...m.comments, { id: Date.now().toString(), user: user.name, text: trimmed, replyTo: replyTo?.user }] };
      }
      return m;
    }));
    onCommentCreate?.(id, trimmed, replyTo);
    setCommentText('');
    setCommentingId(null);
    setCommentReplyTo(null);
  };

  const handleDelete = (id: string) => {
    syncMoments(prev => prev.filter(m => m.id !== id));
    if (commentingId === id) setCommentingId(null);
    if (actionMenuId === id) setActionMenuId(null);
    if (editingMomentId === id) setEditingMomentId(null);
  };

  const handleStartEdit = (moment: Moment) => {
    setEditingMomentId(moment.id);
    setEditingContent(String(moment.content || ''));
    setEditingLocation(String(moment.location || ''));
    setCommentingId(null);
    setActionMenuId(null);
  };

  const handleSaveEdit = (id: string) => {
    const nextContent = editingContent.trim();
    if (!nextContent) return;
    const nextLocation = editingLocation.trim();
    syncMoments(prev => prev.map(item => {
      if (item.id !== id) return item;
      return { ...item, content: nextContent, location: nextLocation };
    }));
    setEditingMomentId(null);
    setEditingContent('');
    setEditingLocation('');
  };

  const handleCancelEdit = () => {
    setEditingMomentId(null);
    setEditingContent('');
    setEditingLocation('');
  };

  const changeCover = () => {
    if (!isOwnerMe) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // 压缩图片并转为 base64
        const dataUrl = await compressImage(file);
        setUser(prev => ({ ...prev, momentsCover: dataUrl }));
      } catch (err) {
        console.error('图片压缩失败:', err);
      }
    }
  };

  return (
    <div className="flex flex-col h-full render-bg-secondary animate-in slide-in-from-right duration-300">
      {isOwnerMe && <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />}
      <MobileHeader
        title={isQQSkin ? '空间动态' : '朋友圈'}
        onBack={onBack}
        actions={onPost ? <button className="app-icon-button w-9 h-9 rounded-full" onClick={onPost}><i className="fa-solid fa-camera"></i></button> : undefined}
      />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar pb-20"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => setActionMenuId(null)}
      >
        <div className="flex justify-center" style={{ height: isRefreshing ? 70 : pullDistance, transition: isRefreshing ? 'height 0.2s ease' : undefined }}>
          {(pullDistance > 0 || isRefreshing) && (
            <div className="text-xs text-gray-400 flex items-center">{isRefreshing ? '正在生成...' : (pullDistance >= 70 ? '松开刷新生成' : '下拉刷新生成')}</div>
          )}
        </div>
        <div className={`relative ${isQQSkin ? 'h-[208px] render-qzone-cover' : 'h-64'} bg-gray-300 ${isOwnerMe ? 'cursor-pointer' : ''}`} onClick={changeCover}>
          {ownerCover ? (
            <img src={ownerCover} loading="lazy" decoding="async" className="w-full h-full object-cover shadow-inner" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-200 dark:from-[#2a2a2a] dark:to-[#1a1a1a]" />
          )}
          {isOwnerMe && !isQQSkin && (
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-white text-xs">
              <span className="bg-black/40 px-3 py-1 rounded-full">点击更换封面</span>
            </div>
          )}
          {isQQSkin ? (
            <div className="absolute left-0 right-0 bottom-0 px-4 pb-3 pt-10 render-qzone-cover-info">
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0">
                  <img
                    src={ownerAvatar}
                    loading="lazy"
                    decoding="async"
                    className="w-16 h-16 rounded-full border-2 border-white/80 shadow-md object-cover cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); onAvatarClick(ownerId); }}
                  />
                  <div className="ml-3 min-w-0">
                    <div className="text-[24px] leading-none font-semibold truncate render-qzone-owner-name">{ownerName}</div>
                    <div className="text-[14px] mt-1 render-qzone-owner-meta">访客总量 <span className="font-semibold">{qqVisitorCount}</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-2 render-qzone-owner-actions">
                  <button className="w-8 h-8 rounded-full border render-qzone-owner-action-btn"><i className="fa-regular fa-bell text-[12px]"></i></button>
                  <button className="w-8 h-8 rounded-full border render-qzone-owner-action-btn"><i className="fa-solid fa-gear text-[12px]"></i></button>
                </div>
              </div>
            </div>
          ) : (
            <div className="absolute -bottom-4 right-4 flex items-end">
              <span className="text-white font-bold mr-3 mb-6 drop-shadow-lg text-base">{ownerName}</span>
              <img
                src={ownerAvatar}
                loading="lazy"
                decoding="async"
                className="w-16 h-16 app-avatar-radius border-[3px] border-white dark:border-white/20 shadow-md render-bg-secondary cursor-pointer active:scale-95 transition-transform"
                onClick={(e) => { e.stopPropagation(); onAvatarClick(ownerId); }}
              />
            </div>
          )}
        </div>

        {isQQSkin && (
          <div className="px-4 pt-2 pb-3 render-qzone-top-nav-wrap">
            <div className="grid grid-cols-5 text-center text-[12px] render-qzone-top-nav">
              <button className="py-2"><i className="fa-regular fa-comment-dots text-[18px] block mb-1"></i>说说</button>
              <button className="py-2"><i className="fa-regular fa-calendar text-[18px] block mb-1"></i>日志</button>
              <button className="py-2"><i className="fa-regular fa-image text-[18px] block mb-1"></i>相册</button>
              <button className="py-2"><i className="fa-regular fa-clipboard text-[18px] block mb-1"></i>留言</button>
              <button className="py-2"><i className="fa-solid fa-bars text-[18px] block mb-1"></i>更多</button>
            </div>
            <div className="mt-2 h-10 rounded-xl border px-3 flex items-center text-[13px] render-qzone-search">
              <i className="fa-solid fa-magnifying-glass mr-2 text-[12px]"></i>分享新鲜事...
              <div className="ml-auto flex items-center gap-2 render-qzone-search-icons">
                <i className="fa-solid fa-camera"></i>
                <i className="fa-solid fa-wand-magic-sparkles"></i>
              </div>
            </div>
          </div>
        )}

        <div className={`${isQQSkin ? 'mt-2 px-4 space-y-6' : 'mt-10 px-4 space-y-8'}`}>
          {visibleList.length === 0 && (
            <SharedEmptyState className="py-20">暂时还没有内容</SharedEmptyState>
          )}
          {visibleList.map(m => (
            <MomentCard
              key={m.id}
              moment={m}
              user={user}
              actionMenuId={actionMenuId}
              commentingId={commentingId}
              commentReplyTo={commentReplyTo}
              commentText={commentText}
              editingMomentId={editingMomentId}
              editingContent={editingContent}
              editingLocation={editingLocation}
              isQQSkin={isQQSkin}
              formatMomentTime={formatMomentTime}
              onAvatarClick={onAvatarClick}
              onLike={handleLike}
              onDelete={handleDelete}
              onStartEdit={handleStartEdit}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              onComment={handleComment}
              setActionMenuId={setActionMenuId}
              setCommentingId={setCommentingId}
              setCommentReplyTo={setCommentReplyTo}
              setCommentText={setCommentText}
              setEditingContent={setEditingContent}
              setEditingLocation={setEditingLocation}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
