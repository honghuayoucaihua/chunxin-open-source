
import React, { useMemo } from 'react';
import { Contact } from '../types';
import { MobileHeader, WeChatBadge } from '../Common';
import { loadTeamNoticeRuntime } from './teamNoticeRuntimeLoader';
import { APP_LOGO_COMPACT_SRC } from '../services/staticAssetPaths';

const TEAM_NOTICE_PREVIEW_STORAGE_KEY = 'xushuo_team_notice_preview_v1';
const TEAM_NOTICE_LAST_READ_AT_STORAGE_KEY = 'xushuo_team_notice_last_read_at_v1';
const ChatsTabQQSearch = React.lazy(() => import('./ChatsTabQQSearch'));
const ChatsTabIMessagePinnedStrip = React.lazy(() => import('./ChatsTabIMessagePinnedStrip'));
const loadChatsTabSwipeActions = () => import('./ChatsTabSwipeActions');
const ChatsTabSwipeActions = React.lazy(loadChatsTabSwipeActions);

type TeamNoticePreview = {
  title: string;
  createdAt: number;
};

type AvatarImageProps = {
  src: string;
  className: string;
  alt: string;
  size: number;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'auto' | 'high' | 'low';
};

const AvatarImage = React.memo(function AvatarImage({
  src,
  className,
  alt,
  size,
  loading = 'lazy',
  fetchPriority = 'auto'
}: AvatarImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      width={size}
      height={size}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
    />
  );
});

const GroupAvatarGrid = React.memo(function GroupAvatarGrid({ avatars }: { avatars: string[] }) {
  const list = avatars.slice(0, 9);
  return (
    <div className="w-12 h-12 mr-3 render-bg-tertiary p-0.5 grid grid-cols-3 grid-rows-3 gap-0.5 overflow-hidden shadow-sm border render-border-subtle app-avatar-radius">
      {Array.from({ length: 9 }).map((_, idx) => {
        const avatar = list[idx];
        return (
          <div key={idx} className="w-full h-full bg-white/70 dark:bg-black/20 rounded-[2px] overflow-hidden flex items-center justify-center">
            {avatar ? (
                (typeof avatar === 'string' && avatar.startsWith('icon:')) ? (
                  <div className="w-full h-full flex items-center justify-center icon-bg-blue text-white">
                    <i className={`fa-solid ${avatar.replace('icon:', '')} text-[10px]`}></i>
                  </div>
                ) : (
                  <AvatarImage
                    src={avatar}
                    alt=""
                    size={16}
                    className="w-full h-full object-cover"
                  />
                )
              ) : null}
            </div>
        );
      })}
    </div>
  );
});

type ChatsTabContactRowProps = {
  contact: Contact;
  rowKey: string;
  userAvatar: string;
  avatarById: Record<string, string>;
  displayName: string;
  formattedTime: string;
  isTyping: boolean;
  isOpen: boolean;
  isCurrentSwiping: boolean;
  offset: number;
  onTouchStart: (rowKey: string, e: React.TouchEvent | React.MouseEvent) => void;
  onTouchMove: (rowKey: string, e: React.TouchEvent) => void;
  onTouchEnd: (rowKey: string, e: React.TouchEvent | React.MouseEvent) => void;
  onRowClick: (contact: Contact, rowKey: string) => void;
  onAction?: (action: 'pin' | 'clear' | 'delete', id: string) => void;
  onCloseSwipe: () => void;
};

const ChatsTabContactRow = React.memo(function ChatsTabContactRow({
  contact,
  rowKey,
  userAvatar,
  avatarById,
  displayName,
  formattedTime,
  isTyping,
  isOpen,
  isCurrentSwiping,
  offset,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onRowClick,
  onAction,
  onCloseSwipe
}: ChatsTabContactRowProps) {
  const disableSwipe = contact.id === '__xushuo_team__' || contact.id === 'officialAccounts';
  const groupAvatars = React.useMemo(
    () => [userAvatar, ...(contact.memberIds || []).map((id) => avatarById[id]).filter(Boolean) as string[]],
    [avatarById, contact.memberIds, userAvatar]
  );
  const title = isTyping ? '对方正在输入中…' : (contact.isGroup ? `${contact.name}（${(contact.memberIds?.length || 0) + 1}）` : displayName);
  const transform = disableSwipe
    ? 'translateX(0)'
    : (isOpen
      ? `translateX(${-180 + offset}px)`
      : (isCurrentSwiping && offset > 0 ? `translateX(${-offset}px)` : 'translateX(0)'));

  return (
    <div
      className="relative overflow-hidden group"
      onTouchStart={disableSwipe ? undefined : ((e) => onTouchStart(rowKey, e))}
      onTouchMove={disableSwipe ? undefined : ((e) => onTouchMove(rowKey, e))}
      onTouchEnd={disableSwipe ? undefined : ((e) => onTouchEnd(rowKey, e))}
    >
      <div
        className={`flex items-center border-b render-border active:bg-[var(--bg-hover)] cursor-pointer render-chat-list-row ${contact.isPinned ? 'render-bg-tertiary' : 'render-bg-secondary'}`}
        style={{
          transform,
          transition: (!isCurrentSwiping || offset === 0) ? 'transform 200ms ease-out' : 'none',
          paddingTop: 'var(--app-cell-padding-y)',
          paddingBottom: 'var(--app-cell-padding-y)',
          paddingLeft: 'var(--app-content-padding)',
          paddingRight: 'var(--app-content-padding)'
        }}
        onClick={(e) => {
          e.stopPropagation();
          onRowClick(contact, rowKey);
        }}
      >
        <div className="relative flex-shrink-0">
          {contact.isGroup ? (
            <GroupAvatarGrid avatars={groupAvatars} />
          ) : (typeof contact.avatar === 'string' && contact.avatar.startsWith('icon:')) ? (
            <div className="w-12 h-12 flex items-center justify-center mr-3 shadow-sm icon-bg-blue app-avatar-radius">
              <i className={`fa-solid ${contact.avatar.replace('icon:', '')} text-white text-[24px]`}></i>
            </div>
          ) : (
            <AvatarImage
              src={typeof contact.avatar === 'string' ? contact.avatar : ''}
              alt={displayName}
              size={48}
              className="w-12 h-12 mr-3 object-cover shadow-sm app-avatar-radius"
            />
          )}
          <div className="absolute -top-1.5 -right-0.5">
            <WeChatBadge count={contact.unreadCount} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <h4 className="font-medium truncate text-base">{title}</h4>
            <span className="text-[11px] render-text-secondary">{formattedTime}</span>
          </div>
          <p className="text-[13px] render-text-secondary truncate mt-1 leading-tight">{contact.lastMessage || '最近没有消息'}</p>
        </div>
      </div>

      {!disableSwipe && (isOpen || isCurrentSwiping) && (
        <React.Suspense fallback={null}>
          <ChatsTabSwipeActions
            contact={contact}
            isOpen={isOpen}
            isCurrentSwiping={isCurrentSwiping}
            offset={offset}
            onAction={onAction}
            onClose={onCloseSwipe}
          />
        </React.Suspense>
      )}
    </div>
  );
});

export const ChatsTab: React.FC<{
  contacts: Contact[],
  userAvatar: string,
  userName?: string,
  userStatus?: string,
  onHeaderAvatarClick?: () => void,
  onSelect: (id: string) => void,
  onSearchTrigger: () => void,
  onPlusClick: () => void,
  onAction?: (action: 'pin' | 'clear' | 'delete', id: string) => void,
  onManualGenerate?: () => Promise<void> | void,
  typingIds?: string[],
  formatTime?: (timestamp?: number) => string,
  onOpenTeam?: () => void,
  teamUnreadCount?: number,
  isTelegramLayout?: boolean,
  hideHeader?: boolean
}> = ({ contacts, userAvatar, userName, userStatus, onHeaderAvatarClick, onSelect, onSearchTrigger, onPlusClick, onAction, onManualGenerate, typingIds = [], formatTime, onOpenTeam, teamUnreadCount, isTelegramLayout = false, hideHeader = false }) => {
  const [, startSwitchChatTransition] = React.useTransition();
  const [swipingRowKey, setSwipingRowKey] = React.useState<string | null>(null);
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const touchStartYRef = React.useRef<number | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const isAtTopRef = React.useRef(false);
  const pullThresholdPassedRef = React.useRef(false);
  const startXRef = React.useRef(0);
  const swipingRowKeyRef = React.useRef<string | null>(null);

  // 每个项目的滑动偏移量用 ref 存储
  const swipeOffsetRef = React.useRef(0);
  const currentSwipingRowKeyRef = React.useRef<string | null>(null);
  const [, forceUpdate] = React.useState(0);

  // 滑动方向检测
  const touchStartXRef = React.useRef<number | null>(null);
  const touchStartYForSwipeRef = React.useRef<number | null>(null);
  const isHorizontalSwipeRef = React.useRef<boolean | null>(null); // null=未确定, true=横向, false=纵向

  const updateSwipingRowKey = React.useCallback((nextRowKey: string | null) => {
    swipingRowKeyRef.current = nextRowKey;
    setSwipingRowKey(nextRowKey);
  }, []);

  const handleTouchStart = React.useCallback((rowKey: string, e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    void loadChatsTabSwipeActions();
    // 如果点击的不是当前滑动的项目，先关闭之前的
    if (swipingRowKeyRef.current && swipingRowKeyRef.current !== rowKey) {
      updateSwipingRowKey(null);
    }
    currentSwipingRowKeyRef.current = rowKey;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    startXRef.current = clientX;
    touchStartXRef.current = clientX;
    touchStartYForSwipeRef.current = clientY;
    isHorizontalSwipeRef.current = null;
    swipeOffsetRef.current = 0;
  }, [updateSwipingRowKey]);

  const handleTouchMove = React.useCallback((rowKey: string, e: React.TouchEvent) => {
    e.stopPropagation();
    if (currentSwipingRowKeyRef.current !== rowKey) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    // 确定滑动方向（只判断一次）
    if (isHorizontalSwipeRef.current === null && touchStartXRef.current !== null && touchStartYForSwipeRef.current !== null) {
      const deltaX = Math.abs(currentX - touchStartXRef.current);
      const deltaY = Math.abs(currentY - touchStartYForSwipeRef.current);
      // 如果横向移动距离大于纵向，则认为是横向滑动
      if (deltaX > 10 || deltaY > 10) {
        isHorizontalSwipeRef.current = deltaX > deltaY;
        if (!isHorizontalSwipeRef.current) {
          // 纵向滑动，放弃左滑处理
          return;
        }
      }
    }

    // 如果不是横向滑动，不处理
    if (isHorizontalSwipeRef.current === false) return;

    const diff = startXRef.current - currentX;

    if (swipingRowKeyRef.current === rowKey) {
      // 已经展开状态，允许右滑收起
      swipeOffsetRef.current = Math.max(-180, Math.min(0, -diff));
    } else {
      // 未展开状态，只允许左滑
      swipeOffsetRef.current = Math.max(0, Math.min(180, diff));
    }
    forceUpdate(n => n + 1);
  }, []);

  const handleTouchEnd = React.useCallback((rowKey: string, e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    if (currentSwipingRowKeyRef.current !== rowKey) return;
    currentSwipingRowKeyRef.current = null;

    // 如果不是横向滑动，直接返回
    if (isHorizontalSwipeRef.current === false) {
      isHorizontalSwipeRef.current = null;
      return;
    }
    isHorizontalSwipeRef.current = null;

    const endX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as React.MouseEvent).clientX;
    const diff = startXRef.current - endX;

    if (swipingRowKeyRef.current === rowKey) {
      // 已展开状态
      if (diff < -50) {
        // 右滑收起
        updateSwipingRowKey(null);
      }
    } else {
      // 未展开状态
      if (diff > 50) {
        // 左滑展开
        updateSwipingRowKey(rowKey);
      }
    }
    swipeOffsetRef.current = 0;
    forceUpdate(n => n + 1);
  }, [updateSwipingRowKey]);

  const handlePullStart = (e: React.TouchEvent) => {
    // 如果正在处理横向滑动，不触发下拉
    if (isHorizontalSwipeRef.current === true) return;
    if (scrollRef.current && scrollRef.current.scrollTop > 0) {
      isAtTopRef.current = false;
      pullThresholdPassedRef.current = false;
      return;
    }
    isAtTopRef.current = true;
    touchStartYRef.current = e.touches[0].clientY;
    pullThresholdPassedRef.current = false;
  };

  const handlePullMove = (e: React.TouchEvent) => {
    // 如果正在处理横向滑动，不触发下拉
    if (isHorizontalSwipeRef.current === true) return;
    if (!isAtTopRef.current || touchStartYRef.current === null || isRefreshing) return;
    const delta = e.touches[0].clientY - touchStartYRef.current;
    if (delta <= 0) {
      pullThresholdPassedRef.current = false;
      return;
    }
    if (e.cancelable) {
      e.preventDefault();
    }
    if (!pullThresholdPassedRef.current && delta < 30) {
      setPullDistance(0);
      return;
    }
    if (delta >= 30) {
      pullThresholdPassedRef.current = true;
    }
    setPullDistance(Math.min(delta, 80));
  };

  const handlePullEnd = async () => {
    // 如果正在处理横向滑动，不触发下拉
    if (isHorizontalSwipeRef.current === true) return;
    if (!isAtTopRef.current || touchStartYRef.current === null || isRefreshing) return;
    touchStartYRef.current = null;
    isAtTopRef.current = false;

    if (pullThresholdPassedRef.current && pullDistance >= 70 && onManualGenerate) {
      setIsRefreshing(true);
      setPullDistance(70);
      try {
        await Promise.resolve(onManualGenerate());
      } catch (error) {
        console.error('[PullRefresh] 主动联系失败:', error);
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

  const [rootSkinId, setRootSkinId] = React.useState<string>(() =>
    (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-render-skin') : null) || 'wechat'
  );

  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const sync = () => setRootSkinId(root.getAttribute('data-render-skin') || 'wechat');
    sync();
    const observer = new MutationObserver((mutations) => {
      if (mutations.some(m => m.type === 'attributes' && m.attributeName === 'data-render-skin')) {
        sync();
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ['data-render-skin'] });
    return () => observer.disconnect();
  }, []);

  const isIMessageSkin = rootSkinId === 'imessage';
  const isQQSkin = rootSkinId === 'qq';
  const isY2KSkin = rootSkinId === 'y2k';
  const canOpenTeam = typeof onOpenTeam === 'function';

  const [teamNoticePreview, setTeamNoticePreview] = React.useState<TeamNoticePreview | null>(() => {
    try {
      const raw = localStorage.getItem(TEAM_NOTICE_PREVIEW_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const title = String(parsed?.title || '').trim();
      const createdAt = Number(parsed?.createdAt);
      if (!title || !Number.isFinite(createdAt) || createdAt <= 0) return null;
      const normalizedCreatedAt = createdAt < 1_000_000_000_000 ? createdAt * 1000 : createdAt;
      return { title, createdAt: normalizedCreatedAt };
    } catch {
      return null;
    }
  });

  const [teamUnreadCountLocal, setTeamUnreadCountLocal] = React.useState(0);

  const markTeamNoticesAsRead = React.useCallback(() => {
    const ts = Number(teamNoticePreview?.createdAt) > 0 ? Number(teamNoticePreview?.createdAt) : Date.now();
    try {
      localStorage.setItem(TEAM_NOTICE_LAST_READ_AT_STORAGE_KEY, String(ts));
    } catch {
      // ignore
    }
    setTeamUnreadCountLocal(0);
  }, [teamNoticePreview?.createdAt]);

  React.useEffect(() => {
    if (!canOpenTeam) return;
    let mounted = true;

    const loadTeamNoticePreview = async () => {
      try {
        const runtime = await loadTeamNoticeRuntime();
        const legacyFallbackLastReadAt = runtime.readStoredTeamNoticeLastReadAt(TEAM_NOTICE_LAST_READ_AT_STORAGE_KEY) ?? (teamNoticePreview?.createdAt || 0);
        const { preview, unreadCount } = await runtime.fetchTeamNoticePreviewRuntime({
          previewStorageKey: TEAM_NOTICE_PREVIEW_STORAGE_KEY,
          lastReadStorageKey: TEAM_NOTICE_LAST_READ_AT_STORAGE_KEY,
          fallbackLastReadAt: legacyFallbackLastReadAt
        });
        if (!mounted) return;
        setTeamNoticePreview((prev) => {
          if (!preview) return prev ? null : prev;
          return prev?.title === preview.title && prev?.createdAt === preview.createdAt ? prev : preview;
        });
        setTeamUnreadCountLocal(unreadCount);
      } catch {
        // ignore
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mounted) {
        void loadTeamNoticePreview();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    void loadTeamNoticePreview();
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [canOpenTeam]);

  const avatarById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of contacts) {
      if (typeof item.avatar === 'string') map[item.id] = item.avatar;
    }
    return map;
  }, [contacts]);

  const sortedContacts = useMemo(() => {
    const mergedContacts = [...contacts];
    const effectiveTeamUnreadCount = typeof teamUnreadCount === 'number' ? teamUnreadCount : teamUnreadCountLocal;
    if (canOpenTeam) {
        mergedContacts.push({
          id: '__xushuo_team__',
          name: '关于叙说',
          pinyin: 'G',
          avatar: APP_LOGO_COMPACT_SRC,
          unreadCount: effectiveTeamUnreadCount,
          lastMessage: teamNoticePreview?.title || '欢迎使用叙说·春信',
          lastTime: teamNoticePreview?.createdAt || (Date.now() - 1000),
        isPinned: true
      } as Contact);
    }
    return mergedContacts.sort((a, b) => {
      const pinDiff = (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
      if (pinDiff !== 0) return pinDiff;
      return (b.lastTime || 0) - (a.lastTime || 0);
    });
  }, [contacts, canOpenTeam, teamNoticePreview, teamUnreadCount, teamUnreadCountLocal]);

  const pinnedContacts = useMemo(() => sortedContacts.filter(c => c.isPinned), [sortedContacts]);
  const normalContacts = useMemo(() => sortedContacts.filter(c => !c.isPinned), [sortedContacts]);
  const listContacts = useMemo(() => (isIMessageSkin ? normalContacts : sortedContacts), [isIMessageSkin, normalContacts, sortedContacts]);
  const rowKeys = useMemo(() => {
    const seen = new Map<string, number>();
    return listContacts.map((contact) => {
      const base = `${String(contact.id || '').trim()}|${String(contact.wechatId || '').trim()}|${String(contact.name || '').trim()}`;
      const count = (seen.get(base) || 0) + 1;
      seen.set(base, count);
      return `${base}#${count}`;
    });
  }, [listContacts]);

  const typingIdSet = useMemo(() => new Set(typingIds), [typingIds]);

  const getDisplayContactName = React.useCallback((contact: Contact): string => {
    const baseName = contact.remark?.trim() || contact.name;
    if (!contact.isIfLine) return baseName;
    const suffix = String(contact.ifLineLabel || '').trim() || 'if线';
    return `${baseName} · ${suffix}`;
  }, []);

  const handleCloseSwipe = React.useCallback(() => {
    updateSwipingRowKey(null);
  }, [updateSwipingRowKey]);

  const handleRowClick = React.useCallback((contact: Contact, rowKey: string) => {
    if (contact.id === '__xushuo_team__') {
      markTeamNoticesAsRead();
      onOpenTeam?.();
      return;
    }
    if (swipingRowKeyRef.current === rowKey) {
      updateSwipingRowKey(null);
      return;
    }
    startSwitchChatTransition(() => {
      onSelect(contact.id);
    });
  }, [markTeamNoticesAsRead, onOpenTeam, onSelect, startSwitchChatTransition, updateSwipingRowKey]);

  return (
    <div className="flex flex-col render-bg-secondary overflow-hidden render-text-primary h-full render-chats-tab-root">
      {!isY2KSkin && !hideHeader && (
        <MobileHeader
          title={isQQSkin ? ((userName || '').trim() || '叙说用户') : '叙说'}
          subtitle={isQQSkin ? ((userStatus || '').trim() || '在线') : undefined}
          avatarSrc={isQQSkin ? userAvatar : undefined}
          onAvatarClick={isQQSkin ? onHeaderAvatarClick : undefined}
          className="render-chats-header"
          actions={
            isTelegramLayout
              ? null
              : (
                <div className="flex items-center space-x-3">
                  {!isQQSkin && (
                    <button className="app-icon-button" onClick={onSearchTrigger}>
                      <i className="fa-solid fa-magnifying-glass text-lg"></i>
                    </button>
                  )}
                  <button className="app-icon-button" onClick={onPlusClick}>
                    <i className="fa-solid fa-circle-plus text-xl"></i>
                  </button>
                </div>
              )
          }
        />
      )}
      {isQQSkin && !isY2KSkin && !hideHeader && (
        <React.Suspense fallback={<div className="px-3 pt-2 pb-2 render-bg-tertiary"><div className="app-surface-panel w-full h-9" /></div>}>
          <ChatsTabQQSearch onSearchTrigger={onSearchTrigger} />
        </React.Suspense>
      )}
      {isIMessageSkin && pinnedContacts.length > 0 && (
        <React.Suspense fallback={<div className="px-3 pt-2 pb-1" style={{ minHeight: 94 }} />}>
          <ChatsTabIMessagePinnedStrip
            pinnedContacts={pinnedContacts}
            onSelect={onSelect}
            onOpenTeam={onOpenTeam}
            onAction={onAction}
            getDisplayContactName={getDisplayContactName}
          />
        </React.Suspense>
      )}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar"
        style={{ paddingBottom: 'var(--tab-scroll-pb)' }}
        onTouchStart={handlePullStart}
        onTouchMove={handlePullMove}
        onTouchEnd={handlePullEnd}
      >
        <div className="flex justify-center" style={{ height: isRefreshing ? 70 : pullDistance, transition: isRefreshing ? 'height 0.2s ease' : undefined }}>
          {(pullDistance > 0 || isRefreshing) && (
            <div className="text-xs text-gray-400 flex items-center">
              {isRefreshing ? '正在主动联系...' : (pullDistance >= 70 ? '松开触发主动联系' : '下拉触发主动联系')}
            </div>
          )}
        </div>

        {listContacts.map((c, idx) => {
          const rowKey = rowKeys[idx];
          const isCurrentSwiping = currentSwipingRowKeyRef.current === rowKey;
          const offset = isCurrentSwiping ? swipeOffsetRef.current : 0;
          const isOpen = swipingRowKey === rowKey;
          const displayName = getDisplayContactName(c);
          const formattedTime = formatTime
            ? formatTime(c.lastTime)
            : (c.lastTime ? new Date(c.lastTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '');

          return (
            <ChatsTabContactRow
              key={rowKey}
              contact={c}
              rowKey={rowKey}
              userAvatar={userAvatar}
              avatarById={avatarById}
              displayName={displayName}
              formattedTime={formattedTime}
              isTyping={!c.isGroup && typingIdSet.has(c.id)}
              isOpen={isOpen}
              isCurrentSwiping={isCurrentSwiping}
              offset={offset}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onRowClick={handleRowClick}
              onAction={onAction}
              onCloseSwipe={handleCloseSwipe}
            />
          );
        })}
      </div>
    </div>
  );
};
