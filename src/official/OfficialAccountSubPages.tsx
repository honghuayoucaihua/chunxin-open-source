
import React, { useState, useEffect, useMemo } from 'react';
import { MobileHeader } from '../Common';
import { ContentBottomBar, ContentCard } from '../utils/ContentPrimitives';
import { DropdownItem, DropdownMenu } from '../utils/DropdownPrimitives';
import type { OfficialArticle, OfficialArticleComment, OfficialArticleCommentReply, OfficialCommentContact } from '../app/officialArticleTypes';
import { captureRuntimeResetEpoch, isRuntimeResetEpochStale } from '../services/runtimeResetGuard.ts';

// 格式化时间为相对显示
const formatTime = (time: string | number): string => {
  const now = new Date();
  
  // 如果是"刚刚"或"置顶"，直接返回
  if (time === '刚刚' || time === '置顶') return time;
  
  // 尝试解析时间字符串
  const timestamp = typeof time === 'number' ? time : (time ? new Date(time).getTime() : Date.now());
  const diff = now.getTime() - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  // 1分钟内：刚刚
  if (seconds < 60) return '刚刚';
  
  // 1小时内：X分钟前
  if (minutes < 60) return `${minutes}分钟前`;
  
  // 24小时内：X小时前
  if (hours < 24) return `${hours}小时前`;
  
  // 7天内：昨天、前天等
  if (days < 7) {
    if (days === 1) return '昨天';
    if (days === 2) return '前天';
    return `${days}天前`;
  }
  
  // 超过7天：显示具体日期
  const thenDate = new Date(timestamp);
  const year = thenDate.getFullYear();
  const month = thenDate.getMonth() + 1;
  const day = thenDate.getDate();
  
  // 如果是今年，显示月日
  if (year === now.getFullYear()) {
    return `${month}月${day}日`;
  }
  
  // 如果是往年，显示年月日
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// 公众号入口列表
export const OfficialAccountsView: React.FC<{ onBack: () => void, onSelect: () => void, articles?: OfficialArticle[] }> = ({ onBack, onSelect, articles = [] }) => (
  <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
    <MobileHeader title="订阅号" onBack={onBack} actions={<button className="app-icon-button"><i className="fa-solid fa-magnifying-glass"></i></button>} />
    <div className="flex-1 overflow-y-auto no-scrollbar">
       {articles.length === 0 && (
         <div className="text-center text-gray-400 py-20">暂时还没有内容</div>
       )}
       {articles.slice(0, 6).map(acc => (
         <button key={acc.id} type="button" className="app-list-item app-list-item--interactive w-full text-left render-bg-secondary border-b render-border-subtle" onClick={onSelect}>
            <img src={acc.avatar} className="w-12 h-12 rounded-md mr-3" />
            <div className="app-list-item-main overflow-hidden">
               <div className="flex justify-between items-center mb-1 gap-3">
                  <span className="text-[16px] font-medium dark:text-white truncate">{acc.author}</span>
                  <span className="text-[11px] text-gray-400 shrink-0">{formatTime(acc.time)}</span>
               </div>
               <p className="app-list-item-desc truncate">{acc.title}</p>
            </div>
         </button>
       ))}
    </div>
  </div>
);

// 公众号文章瀑布流
export const OfficialAccountArticlesView: React.FC<{
  onBack: () => void;
  onArticle: (article: OfficialArticle) => void;
  articles: OfficialArticle[];
  onManualGenerate?: () => Promise<void> | void;
}> = ({ onBack, onArticle, articles, onManualGenerate }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartYRef = React.useRef<number | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const isAtTopRef = React.useRef(false); // 标记是否在顶部区域
  const pullThresholdPassedRef = React.useRef(false); // 标记是否已通过下拉阈值

  const list = articles?.length ? articles : [];

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop > 0) {
      isAtTopRef.current = false;
      pullThresholdPassedRef.current = false;
      return;
    }
    isAtTopRef.current = true;
    touchStartYRef.current = e.touches[0].clientY;
    pullThresholdPassedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isAtTopRef.current || touchStartYRef.current === null) return;
    const delta = e.touches[0].clientY - touchStartYRef.current;
    
    // 如果不是向下拉，直接忽略
    if (delta <= 0) {
      pullThresholdPassedRef.current = false;
      return;
    }

    // 命中下拉手势时，阻止浏览器默认下拉刷新
    if (e.cancelable) {
      e.preventDefault();
    }
    
    // 检查是否已经通过了阈值（需要下拉超过30px才开始显示下拉效果）
    if (!pullThresholdPassedRef.current && delta < 30) {
      setPullDistance(0);
      return;
    }
    
    // 只有下拉超过30px后才标记通过阈值
    if (delta >= 30) {
      pullThresholdPassedRef.current = true;
    }
    
    setPullDistance(Math.min(delta, 80));
  };

  const handleTouchEnd = async () => {
    if (!isAtTopRef.current || touchStartYRef.current === null || isRefreshing) return;
    touchStartYRef.current = null;
    isAtTopRef.current = false;
    
    // 必须通过阈值且下拉距离达到70px才触发刷新
    if (pullThresholdPassedRef.current && pullDistance >= 70 && onManualGenerate) {
      setIsRefreshing(true);
      setPullDistance(70);
      try {
        await Promise.resolve(onManualGenerate());
      } catch (error) {
        console.error('[OfficialArticles] 下拉刷新失败:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
      pullThresholdPassedRef.current = false;
      return;
    }
    setPullDistance(0);
    pullThresholdPassedRef.current = false;
  };

  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader title="订阅号消息" onBack={onBack} actions={<button className="app-icon-button"><i className="fa-solid fa-user"></i></button>} />
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
         <div className="flex justify-center" style={{ height: isRefreshing ? 70 : pullDistance, transition: isRefreshing ? 'height 0.2s ease' : undefined }}>
           {(pullDistance > 0 || isRefreshing) && (
             <div className="text-xs text-gray-400 flex items-center">{isRefreshing ? '正在生成...' : (pullDistance >= 70 ? '松开刷新生成' : '下拉刷新生成')}</div>
           )}
         </div>
         {list.length === 0 && (
           <div className="text-center text-gray-400 py-20">暂时还没有内容</div>
         )}
         {list.map(art => (
           <ContentCard key={art.id} variant="official" className="w-full" onClick={() => onArticle(art)}>
              <div className="p-4 flex items-center space-x-2">
                 <img src={art.avatar} className="w-5 h-5 rounded-full" />
                 <span className="text-[13px] text-gray-500 font-medium">{art.author}</span>
                 <span className="text-[13px] text-gray-300">·</span>
                 <span className="text-[13px] text-gray-400">{formatTime(art.time)}</span>
              </div>
              <div className="px-4 pb-4">
                 <div className="flex space-x-4">
                    <h2 className="flex-1 text-[17px] font-bold dark:text-white leading-tight line-clamp-2">{art.title}</h2>
                    {art.thumb && <img src={art.thumb} className="w-24 h-16 object-cover rounded-md flex-shrink-0" />}
                 </div>
                 {art.desc && <p className="text-[12px] text-gray-400 mt-2 line-clamp-2">{art.desc}</p>}
              </div>
           </ContentCard>
         ))}
      </div>
    </div>
  );
};

// 文章详情页
export const ArticleDetailView: React.FC<{
  article: OfficialArticle,
  onBack: () => void,
  onDelete?: () => void,
  contacts?: OfficialCommentContact[],
  currentUserName?: string,
  currentUserAvatar?: string,
  onCommentsChange?: (next: OfficialArticleComment[]) => void,
  onGenerateInitialComments?: (article: OfficialArticle) => Promise<OfficialArticleComment[]>,
  onGenerateReplyToComment?: (args: { article: OfficialArticle; commentText: string; contacts: OfficialCommentContact[] }) => Promise<{ user: string; text: string; avatar?: string } | null>
}> = ({ article, onBack, onDelete, contacts = [], currentUserName = '我', currentUserAvatar = '/assets/image/user.png', onCommentsChange, onGenerateInitialComments, onGenerateReplyToComment }) => {
  const [comments, setComments] = useState<OfficialArticleComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const initialCommentsRequestedRef = React.useRef<string | null>(null);
  const isMountedRef = React.useRef(true);
  const articleIdRef = React.useRef(String(article?.id || ''));

  const persistComments = (next: OfficialArticleComment[]) => {
    setComments(next);
    onCommentsChange?.(next);
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    articleIdRef.current = String(article?.id || '');
  }, [article?.id]);

  useEffect(() => {
    let active = true;
    const articleId = String(article?.id || '');
    const runtimeResetEpoch = captureRuntimeResetEpoch();
    const articleComments = Array.isArray(article?.comments) ? article.comments : [];
    if (articleComments.length > 0) {
      setComments(articleComments);
      initialCommentsRequestedRef.current = articleId || null;
      return () => {
        active = false;
      };
    }

    if (!articleId) {
      setComments([]);
      return () => {
        active = false;
      };
    }

    if (initialCommentsRequestedRef.current === articleId) {
      return () => {
        active = false;
      };
    }
    initialCommentsRequestedRef.current = articleId;

    (async () => {
      if (!onGenerateInitialComments) {
        if (active) setComments([]);
        return;
      }
      const generated = await onGenerateInitialComments(article);
      if (!active || articleIdRef.current !== articleId || isRuntimeResetEpochStale(runtimeResetEpoch)) return;
      const normalized = (generated || [])
        .filter((item) => item && item.user && item.text)
        .slice(0, 5)
        .map((item, idx: number) => ({
          id: item.id || `${Date.now()}-seed-${idx}`,
          user: String(item.user).trim(),
          avatar: String(item.avatar || '').trim(),
          text: String(item.text || '').trim(),
          time: Number.isFinite(Number(item.time)) ? Number(item.time) : Date.now(),
          likes: Number.isFinite(Number(item.likes)) ? Number(item.likes) : Math.floor(Math.random() * 6),
          replies: Array.isArray(item.replies) ? item.replies : []
        }));
      persistComments(normalized);
    })();

    return () => {
      active = false;
    };
  }, [article?.id]);

  const handleSendComment = async () => {
    const content = newComment.trim();
    if (!content) return;
    const runtimeResetEpoch = captureRuntimeResetEpoch();
    const requestArticleId = String(article?.id || '');
    const mine = {
      id: `${Date.now()}-mine`,
      user: currentUserName,
      avatar: currentUserAvatar,
      text: content,
      time: Date.now(),
      likes: 0,
      replies: []
    };
    const afterMine = [mine, ...comments];
    persistComments(afterMine);
    setNewComment('');

    if (!onGenerateReplyToComment) return;
    const generated = await onGenerateReplyToComment({ article, commentText: content, contacts });
    if (!isMountedRef.current || articleIdRef.current !== requestArticleId || isRuntimeResetEpochStale(runtimeResetEpoch)) return;
    if (!generated?.user || !generated?.text) return;

    const matchedContact = contacts.find(c => (c.remark || c.name) === generated.user);
    const autoReply: OfficialArticleCommentReply = {
      id: `${Date.now()}-reply`,
      user: generated.user,
      avatar: generated.avatar || matchedContact?.avatar || '',
      text: generated.text,
      time: Date.now(),
      likes: Math.floor(Math.random() * 3)
    };

    setComments(prev => {
      const idx = prev.findIndex(c => c.id === mine.id);
      if (idx < 0) return prev;
      const target = prev[idx];
      const updated = { ...target, replies: [...(target.replies || []), autoReply] };
      const next = [...prev];
      next[idx] = updated;
      onCommentsChange?.(next);
      return next;
    });
  };

  return (
    <div className="absolute inset-0 z-[600] render-bg-primary flex flex-col animate-in slide-in-from-right duration-300" onClick={() => setShowMenu(false)}>
      <MobileHeader
        title={article.author || ''}
        onBack={onBack}
        actions={
          <div className="relative">
            <button className="app-icon-button render-text-primary text-xl" onClick={() => setShowMenu(!showMenu)}><i className="fa-solid fa-ellipsis-h"></i></button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-36" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownItem className="px-4 py-2 text-sm" danger onClick={() => { setShowMenu(false); onDelete?.(); }}>
                    删除文章
                  </DropdownItem>
                </DropdownMenu>
              </div>
            )}
          </div>
        }
        backIcon={<i className="wechat-header-btn fa-solid fa-xmark"></i>}
      />

      <div className="flex-1 overflow-y-auto no-scrollbar">
         <div className="p-6">
            <h1 className="text-2xl font-bold dark:text-white leading-tight mb-4">{article.title}</h1>
            <div className="flex items-center text-sm text-link mb-8">
               <span className="font-bold">{article.author}</span>
               <span className="text-gray-400 ml-4">{formatTime(article.time)}</span>
            </div>
            <div className="prose dark:prose-invert max-w-none text-[17px] leading-relaxed dark:text-gray-300 mb-12">
               <p className="mb-6 whitespace-pre-line break-words">{article.desc || '暂无正文内容。'}</p>
               {article.thumb && <img src={article.thumb} className="w-full rounded-lg my-6 shadow-sm" />}
            </div>

            <div className="border-t render-border-subtle pt-8 mb-20">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-base font-bold dark:text-white">精选留言</h3>
                  <span className="text-sm text-link">写留言</span>
               </div>
               
               <div className="space-y-8">
                  {comments.map(c => (
                    <div key={c.id} className="flex space-x-3">
                       {c.avatar
                         ? <img src={c.avatar} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                         : <div className="w-9 h-9 rounded bg-gray-200 flex-shrink-0"></div>}
                       <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                             <span className="text-sm text-gray-500">{c.user}</span>
                             <div className="flex items-center text-gray-400 space-x-1">
                                <i className="fa-regular fa-thumbs-up text-xs"></i>
                                <span className="text-xs">{c.likes}</span>
                             </div>
                          </div>
                          <p className="text-[15px] dark:text-gray-300 leading-snug whitespace-pre-line break-words">{c.text}</p>
                          <span className="text-xs text-gray-400 mt-2 block">{formatTime(c.time)}</span>
                          {Array.isArray(c.replies) && c.replies.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {c.replies.map((r) => (
                                <div key={r.id} className="flex space-x-2 pl-2 border-l render-border-subtle">
                                  {r.avatar
                                    ? <img src={r.avatar} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                                    : <div className="w-6 h-6 rounded bg-gray-200 flex-shrink-0"></div>}
                                  <div className="min-w-0">
                                    <div className="text-[12px] text-gray-500">{r.user}</div>
                                    <div className="text-[13px] dark:text-gray-300 whitespace-pre-line break-words">{r.text}</div>
                                    <div className="text-[11px] text-gray-400 mt-1">{formatTime(r.time || Date.now())}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      <ContentBottomBar variant="official" className="space-x-4">
         <div className="app-field flex-1 h-9 flex items-center px-3">
            <input 
              className="app-field-input bg-transparent border-none shadow-none px-0 py-0 text-sm w-full dark:text-white" 
              placeholder="写下你的想法..." 
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendComment()}
            />
         </div>
         <button
           className={`app-button px-3 py-1 whitespace-nowrap ${newComment.trim() ? 'app-button-primary' : 'app-button-muted opacity-60 cursor-not-allowed'}`}
           onClick={handleSendComment}
           disabled={!newComment.trim()}
         >发送</button>
         <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
            <button type="button" className="app-icon-button w-8 h-8 rounded-full flex flex-col items-center" onClick={() => setIsLiked(!isLiked)}>
               <i className={`fa-${isLiked ? 'solid' : 'regular'} fa-star ${isLiked ? 'text-yellow-400' : ''}`}></i>
            </button>
            <button type="button" className="app-icon-button w-8 h-8 rounded-full">
              <i className="fa-regular fa-heart"></i>
            </button>
            <button type="button" className="app-icon-button w-8 h-8 rounded-full">
              <i className="fa-regular fa-share-from-square"></i>
            </button>
         </div>
      </ContentBottomBar>
    </div>
  );
};
