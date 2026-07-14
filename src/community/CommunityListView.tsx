import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MobileHeader, SectionDivider } from '../Common';
import { fetchCommunityList, getCoverImageUrl, isValidCommunityCoverImage } from './communityService';
import type { CommunityShareItem, CommunityShareType, CommunitySortMode } from './communityTypes';
import { ContentCard } from '../utils/ContentPrimitives';
import { SharedEmptyState } from '../settings/SharedPanelPrimitives';

interface Props {
  onBack: () => void;
  onDetail: (id: string) => void;
  onUpload: () => void;
  onMyShares: () => void;
}

const SORT_OPTIONS: { key: CommunitySortMode; label: string }[] = [
  { key: 'newest', label: '最新' },
  { key: 'popular', label: '最热' },
  { key: 'likes', label: '点赞' },
  { key: 'downloads', label: '下载' }
];

const CARD_COLORS = ['#10AD7A', '#7D5FFF', '#FF6B6B', '#4ECDC4', '#FFB347', '#87CEEB', '#DDA0DD', '#F0E68C'];

const SkeletonCard: React.FC = () => (
  <div className="mb-2 app-surface-panel app-content-card app-content-card--community">
    <div className="w-full aspect-[3/4] render-bg-tertiary animate-pulse" />
    <div className="p-2.5">
      <div className="h-4 render-bg-tertiary rounded animate-pulse mb-2 w-3/4" />
      <div className="h-3 render-bg-tertiary rounded animate-pulse w-1/2" />
    </div>
  </div>
);

const CommunityListView: React.FC<Props> = ({ onBack, onDetail, onUpload, onMyShares }) => {
  const [activeTab, setActiveTab] = useState<CommunityShareType | ''>('');
  const [items, setItems] = useState<CommunityShareItem[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<CommunitySortMode>('popular');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const communityListRequestIdRef = useRef(0);
  const communitySearchTimerRef = useRef<number | null>(null);
  const communityListMountedRef = useRef(true);
  const pageSize = 20;

  const loadList = useCallback(async (p: number, resetItems: boolean) => {
    setLoading(true);
    const requestId = ++communityListRequestIdRef.current;
    try {
      const res = await fetchCommunityList(activeTab, p, pageSize, search, sort);
      if (!communityListMountedRef.current || requestId !== communityListRequestIdRef.current) {
        return;
      }
      setItems(prev => {
        if (resetItems) return res.items;
        const seenIds = new Set(prev.map(item => item.id));
        const nextItems = res.items.filter(item => {
          if (seenIds.has(item.id)) return false;
          seenIds.add(item.id);
          return true;
        });
        return [...prev, ...nextItems];
      });
      setTotal(res.total);
      setPage(p);
    } catch (e) {
      if (!communityListMountedRef.current) {
        return;
      }
      if (requestId !== communityListRequestIdRef.current) {
        return;
      }
      console.error('加载社区列表失败:', e);
    } finally {
      if (communityListMountedRef.current && requestId === communityListRequestIdRef.current) {
        setLoading(false);
        setInitialLoaded(true);
      }
    }
  }, [activeTab, search, sort]);

  useEffect(() => {
    communityListMountedRef.current = true;
    if (communitySearchTimerRef.current !== null) {
      window.clearTimeout(communitySearchTimerRef.current);
    }
    communitySearchTimerRef.current = window.setTimeout(() => {
      void loadList(1, true);
    }, 250);
    return () => {
      communityListMountedRef.current = false;
      if (communitySearchTimerRef.current !== null) {
        window.clearTimeout(communitySearchTimerRef.current);
      }
    };
  }, [activeTab, search, sort, loadList]);

  const hasMore = items.length < total;

  const leftCol: CommunityShareItem[] = [];
  const rightCol: CommunityShareItem[] = [];
  items.forEach((item, i) => {
    if (i % 2 === 0) leftCol.push(item);
    else rightCol.push(item);
  });

  const getCardColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
    return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length];
  };

  const renderCard = (item: CommunityShareItem) => {
    const color = getCardColor(item.id);
    const authorDisplay = item.is_anonymous ? '匿名用户' : (item.author_name || '匿名用户');
    const coverUrl = getCoverImageUrl(item.cover_image);
    return (
      <ContentCard
        key={item.id}
        className="mb-2 shadow-sm"
        variant="community"
        onClick={() => onDetail(item.id)}
      >
        {isValidCommunityCoverImage(item.cover_image) && coverUrl ? (
          <div className="w-full aspect-[3/4] overflow-hidden render-bg-tertiary">
            <img
              src={coverUrl}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ) : (
          <div
            className="w-full aspect-[3/4] flex flex-col items-center justify-center px-3"
            style={{ background: `linear-gradient(135deg, ${color}22, ${color}44)` }}
          >
            <i className={`fa-solid ${item.type === 'contact' ? 'fa-user' : item.type === 'htmltemplate' ? 'fa-code' : item.type === 'bubbleworkshop' ? 'fa-paintbrush' : 'fa-book'} text-2xl mb-2`}
              style={{ color }} />
            {item.description && (
              <p className="text-[11px] text-center leading-snug line-clamp-4 break-all" style={{ color: `${color}cc` }}>
                {item.description}
              </p>
            )}
          </div>
        )}

        <div className="p-2.5">
          <div className="flex items-start gap-1">
            <h3 className="text-[13px] font-medium render-text-primary leading-snug line-clamp-2 flex-1">
              {item.name}
            </h3>
            {item.is_encrypted === 1 && (
              <i className="fa-solid fa-lock text-[10px] text-amber-500 mt-0.5 flex-shrink-0"></i>
            )}
          </div>
          {item.description && (
            <p className="text-[11px] render-text-secondary leading-snug line-clamp-2 mt-1">{item.description}</p>
          )}

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1 min-w-0">
              <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${color}33` }}>
                <i className="fa-solid fa-user text-[7px]" style={{ color }}></i>
              </div>
              <span className="text-[11px] render-text-secondary truncate">{authorDisplay}</span>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <i className="fa-solid fa-heart text-[10px] text-red-400"></i>
              <span className="text-[11px] render-text-secondary">{item.like_count || 0}</span>
            </div>
          </div>
        </div>
      </ContentCard>
    );
  };

  return (
    <div className="flex flex-col h-full render-bg-primary render-text-primary relative">
      <MobileHeader
        title="社区"
        onBack={onBack}
        actions={
          <button onClick={onMyShares} className="render-header-text text-base">
            <i className="fa-solid fa-user"></i>
          </button>
        }
      />

      {/* 搜索栏 */}
      <div className="px-3 py-2 render-bg-primary">
        <div className="flex items-center render-bg-tertiary rounded-lg px-3 py-1.5">
          <i className="fa-solid fa-magnifying-glass text-gray-400 text-sm mr-2"></i>
          <input
            type="text"
            placeholder="搜索社区内容..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm render-text-primary placeholder:text-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 ml-1">
              <i className="fa-solid fa-xmark text-xs"></i>
            </button>
          )}
        </div>
      </div>

      {/* Tab + 排序 */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {[
            { key: '' as const, label: '全部' },
            { key: 'contact' as const, label: '联系人' },
            { key: 'worldbook' as const, label: '世界书' },
            { key: 'htmltemplate' as const, label: 'HTML' },
            { key: 'bubbleworkshop' as const, label: '气泡' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                activeTab === tab.key
                  ? 'text-white'
                  : 'render-bg-tertiary render-text-secondary'
              }`}
              style={activeTab === tab.key ? { backgroundColor: 'var(--app-accent-color)' } : {}}
            >
              {tab.label}
            </button>
          ))}

          {/* 排序下拉 - 紧跟在世界书后面 */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1 px-2 py-1 text-xs render-text-secondary render-bg-tertiary rounded-full"
            >
              <i className="fa-solid fa-arrow-down-wide-short text-[10px]"></i>
              {SORT_OPTIONS.find(o => o.key === sort)?.label}
            </button>
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                <div className="absolute left-0 top-full mt-1 z-50 render-bg-secondary rounded-lg shadow-lg border render-border-subtle py-1 min-w-[80px]">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => { setSort(opt.key); setShowSortMenu(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        sort === opt.key ? 'font-medium' : 'render-text-secondary'
                      }`}
                      style={sort === opt.key ? { color: 'var(--app-accent-color)' } : {}}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <SectionDivider />

      {/* 瀑布流列表 */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-2" style={{ paddingBottom: 'calc(var(--tab-scroll-pb) + 64px)' }}>
        {!initialLoaded && loading && (
          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <div className="flex-1 min-w-0">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        )}

        {initialLoaded && items.length === 0 && !loading && (
          <SharedEmptyState
            className="flex flex-col items-center justify-center py-16 render-text-secondary"
            iconClassName="fa-solid fa-box-open text-4xl"
            title="暂无内容"
          />
        )}

        {items.length > 0 && (
          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              {leftCol.map(renderCard)}
            </div>
            <div className="flex-1 min-w-0">
              {rightCol.map(renderCard)}
            </div>
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center py-4">
            <button
              onClick={() => loadList(page + 1, false)}
              disabled={loading}
              className="px-4 py-1.5 text-sm rounded-full render-bg-tertiary render-text-secondary"
            >
              {loading ? '加载中...' : '加载更多'}
            </button>
          </div>
        )}
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

export default CommunityListView;
