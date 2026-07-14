import React from 'react';
import { MobileHeader } from '../Common';
import { ForumCategory, ForumPost, ForumSpace } from '../types';
import { formatRelativeTime } from './forumUtils';
import { InlineChoiceRow, InlineIdentityRow } from '../utils/UtilsContactFormPrimitives';
import { DropdownItem, DropdownMenu } from '../utils/DropdownPrimitives';
import { SharedEmptyState } from '../settings/SharedPanelPrimitives';

type ForumListViewProps = {
  activeForum: ForumSpace | null;
  closeFloatingMenus: () => void;
  onBackToArchive: () => void;
  openForumSettings: () => void;
  categoryTabs: string[];
  activeCategory: string;
  setActiveCategory: React.Dispatch<React.SetStateAction<string>>;
  listRef: React.RefObject<HTMLDivElement | null>;
  handlePullStart: (e: React.TouchEvent) => void;
  handlePullMove: (e: React.TouchEvent) => void;
  handlePullEnd: () => Promise<void>;
  pullDistance: number;
  isRefreshing: boolean;
  visiblePosts: ForumPost[];
  onOpenPostDetail: (postId: string) => void;
  showActionMenu: boolean;
  setShowActionMenu: React.Dispatch<React.SetStateAction<boolean>>;
  beginCreateByAction: (action: 'post' | 'news') => void;
  showCreateModal: boolean;
  setShowCreateModal: React.Dispatch<React.SetStateAction<boolean>>;
  createAction: 'post' | 'news';
  topicInput: string;
  setTopicInput: React.Dispatch<React.SetStateAction<string>>;
  canCreateNews: boolean;
  isGenerating: boolean;
  handleCreateByAction: () => void;
  manualPostTitle: string;
  setManualPostTitle: React.Dispatch<React.SetStateAction<string>>;
  manualPostCategory: ForumCategory;
  setManualPostCategory: React.Dispatch<React.SetStateAction<ForumCategory>>;
  postCategoryOptions: ForumCategory[];
  manualPostPinned: boolean;
  setManualPostPinned: React.Dispatch<React.SetStateAction<boolean>>;
  manualPostContent: string;
  setManualPostContent: React.Dispatch<React.SetStateAction<string>>;
  showIdentityMenu: boolean;
  setShowIdentityMenu: React.Dispatch<React.SetStateAction<boolean>>;
  renderIdentityMenu: () => React.ReactNode;
  resolveIdentity: () => { author: string; avatar: string };
  canManualPost: boolean;
};

const ForumListView: React.FC<ForumListViewProps> = ({
  activeForum,
  closeFloatingMenus,
  onBackToArchive,
  openForumSettings,
  categoryTabs,
  activeCategory,
  setActiveCategory,
  listRef,
  handlePullStart,
  handlePullMove,
  handlePullEnd,
  pullDistance,
  isRefreshing,
  visiblePosts,
  onOpenPostDetail,
  showActionMenu,
  setShowActionMenu,
  beginCreateByAction,
  showCreateModal,
  setShowCreateModal,
  createAction,
  topicInput,
  setTopicInput,
  canCreateNews,
  isGenerating,
  handleCreateByAction,
  manualPostTitle,
  setManualPostTitle,
  manualPostCategory,
  setManualPostCategory,
  postCategoryOptions,
  manualPostPinned,
  setManualPostPinned,
  manualPostContent,
  setManualPostContent,
  showIdentityMenu,
  setShowIdentityMenu,
  renderIdentityMenu,
  resolveIdentity,
  canManualPost
}) => (
  <div className="flex flex-col h-full render-bg-primary render-text-primary" onClick={closeFloatingMenus}>
    <MobileHeader title={activeForum?.name || '论坛'} onBack={onBackToArchive} actions={<button className="app-icon-button" onClick={openForumSettings}><i className="fa-solid fa-gear"></i></button>} />

    <div className="px-3 py-2 border-b render-border-subtle flex items-center gap-2 overflow-x-auto no-scrollbar">
      {categoryTabs.map((category) => {
        const active = category === activeCategory;
        return <button key={category} onClick={(e) => { e.stopPropagation(); setActiveCategory(category); }} className={`app-chip app-chip--forum ${active ? 'app-chip--active' : ''}`}>{category}</button>;
      })}
    </div>

    <div ref={listRef} className="flex-1 overflow-y-auto no-scrollbar" onClick={(e) => e.stopPropagation()} onTouchStart={handlePullStart} onTouchMove={handlePullMove} onTouchEnd={handlePullEnd}>
      {(pullDistance > 0 || isRefreshing) && <div className="text-center text-xs py-1 render-text-secondary">{isRefreshing ? '刷新中...' : pullDistance >= 60 ? '松开刷新' : '下拉刷新'}</div>}
      {visiblePosts.length === 0 ? (
        <SharedEmptyState className="py-14 text-sm render-text-secondary">暂无帖子，点击右下角发帖</SharedEmptyState>
      ) : (
        visiblePosts.map((post) => (
          <div key={post.id} className="app-list-item app-list-item--soft app-list-item--interactive cursor-pointer" onClick={() => onOpenPostDetail(post.id)}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[15px] font-semibold truncate">{post.title}</div>
                <div className="mt-1 text-xs render-text-secondary">{post.author} · {formatRelativeTime(post.createdAt)} · {post.category}</div>
              </div>
            </div>
            <div className="mt-1 text-[13px] render-text-secondary line-clamp-2">{post.content}</div>
            <div className="mt-1 text-xs render-text-secondary"><i className="fa-solid fa-thumbs-up mr-1"></i>{post.likes} <i className="fa-solid fa-comment ml-3 mr-1"></i>{post.comments.length}</div>
          </div>
        ))
      )}
    </div>

    <div className="fixed bottom-24 right-5 z-[130]">
      <button className="app-button app-button-primary w-12 h-12 rounded-full text-white shadow-lg" onClick={(e) => { e.stopPropagation(); setShowActionMenu((v) => !v); }} title="添加"><i className="fa-solid fa-plus"></i></button>
      {showActionMenu && (
        <div className="absolute bottom-14 right-0 w-36" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownItem className="px-3 py-2.5 text-sm" onClick={(e) => { e.stopPropagation(); beginCreateByAction('post'); }}><i className="fa-solid fa-pen mr-2"></i>发帖</DropdownItem>
            <DropdownItem className="px-3 py-2.5 text-sm" onClick={(e) => { e.stopPropagation(); beginCreateByAction('news'); }}><i className="fa-solid fa-newspaper mr-2"></i>新闻</DropdownItem>
          </DropdownMenu>
        </div>
      )}
    </div>

      {showCreateModal && (
      <div className="fixed inset-0 z-[220] bg-black/45 flex items-end" onClick={() => { setShowCreateModal(false); closeFloatingMenus(); }}>
        <div className="w-full app-surface-panel app-surface-panel--forum-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="app-surface-header">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{createAction === 'news' ? '发布快讯' : '发布帖子'}</span>
              <button className="app-icon-button" onClick={() => setShowCreateModal(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
          </div>
          <div className="app-surface-body">

            {createAction === 'news' ? (
              <div className="app-field app-field--forum">
                <textarea className="app-field-textarea text-sm" placeholder="输入快讯主题" rows={4} maxLength={300} value={topicInput} onChange={(e) => setTopicInput(e.target.value)} />
              </div>
            ) : (
              <>
                <div className="app-field app-field--forum">
                  <input className="app-field-input text-sm" placeholder="标题" value={manualPostTitle} onChange={(e) => setManualPostTitle(e.target.value)} />
                </div>
                <div className="app-field app-field--forum">
                  <select className="app-field-select text-sm" value={manualPostCategory} onChange={(e) => setManualPostCategory(e.target.value as ForumCategory)}>
                    {postCategoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="mt-2">
                  <InlineChoiceRow
                    label="置顶帖子"
                    checked={manualPostPinned}
                    variant="forum"
                    onChange={setManualPostPinned}
                  />
                </div>
                <div className="app-field app-field--forum">
                  <textarea className="app-field-textarea text-sm" placeholder="内容" rows={5} value={manualPostContent} onChange={(e) => setManualPostContent(e.target.value)} />
                </div>
                <div className="mt-2">
                  <InlineIdentityRow
                    label="发布身份"
                    avatar={resolveIdentity().avatar}
                    value={resolveIdentity().author}
                    expanded={showIdentityMenu}
                    variant="forum"
                    onToggle={() => setShowIdentityMenu((v) => !v)}
                    menu={renderIdentityMenu()}
                  />
                </div>
              </>
            )}
          </div>
          <div className="app-surface-footer">
            <button className="app-button app-button-muted app-footer-button whitespace-nowrap" onClick={() => setShowCreateModal(false)}>取消</button>
            <button
              className={`app-button app-footer-button whitespace-nowrap ${createAction === 'news'
                ? (canCreateNews && !isGenerating ? 'app-button-primary' : 'app-button-muted opacity-60 cursor-not-allowed')
                : (canManualPost ? 'app-button-primary' : 'app-button-muted opacity-60 cursor-not-allowed')}`}
              disabled={createAction === 'news' ? (!canCreateNews || isGenerating) : !canManualPost}
              onClick={handleCreateByAction}
            >
              {createAction === 'news' ? (isGenerating ? '处理中...' : '发布') : '发布'}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);

export default ForumListView;
