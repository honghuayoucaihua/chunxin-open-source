import React from 'react';
import { MobileHeader } from '../Common';
import { ForumPost, ForumSpace } from '../types';
import { formatRelativeTime } from './forumUtils';
import { DropdownItem, DropdownMenu } from '../utils/DropdownPrimitives';

type ReplyTarget = { parentId: string; replyToAuthor: string } | null;
type CommentMenuTarget = { parentId: string; replyId?: string } | null;

type ForumDetailViewProps = {
  activeForum: ForumSpace | null;
  activePost: ForumPost;
  currentUserName: string;
  closeFloatingMenus: () => void;
  onBackToForum: () => void;
  showPostTopMenu: boolean;
  onTogglePostTopMenu: () => void;
  onTogglePinPost: () => void;
  onOpenEditPost: () => void;
  onDeletePost: () => void;
  handlePullStart: (e: React.TouchEvent) => void;
  handlePullMove: (e: React.TouchEvent) => void;
  onPullEnd: () => Promise<void>;
  pullDistance: number;
  isCommentGenerating: boolean;
  onTogglePostLike: (postId: string) => void;
  onToggleCommentLike: (commentId: string) => void;
  onToggleReplyLike: (parentId: string, replyId: string) => void;
  expandedCommentIds: Record<string, boolean>;
  setExpandedCommentIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  replyTarget: ReplyTarget;
  setReplyTarget: React.Dispatch<React.SetStateAction<ReplyTarget>>;
  replyInputMap: Record<string, string>;
  setReplyInputMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onReplyComment: (parentId: string) => void;
  commentMenuTarget: CommentMenuTarget;
  setCommentMenuTarget: React.Dispatch<React.SetStateAction<CommentMenuTarget>>;
  showIdentityMenu: boolean;
  setShowIdentityMenu: React.Dispatch<React.SetStateAction<boolean>>;
  renderIdentityMenu: () => React.ReactNode;
  resolveIdentity: () => { author: string; avatar: string };
  commentInput: string;
  onCommentInputChange: (value: string) => void;
  canManualComment: boolean;
  onManualComment: () => void;
  showPostEditModal: boolean;
  setShowPostEditModal: React.Dispatch<React.SetStateAction<boolean>>;
  manualPostTitle: string;
  onManualPostTitleChange: (value: string) => void;
  manualPostContent: string;
  onManualPostContentChange: (value: string) => void;
  onSaveEditPost: () => void;
  onCommentMenuAction: (action: 'copy' | 'edit' | 'delete') => void;
};

const ForumDetailView: React.FC<ForumDetailViewProps> = ({
  activeForum,
  activePost,
  currentUserName,
  closeFloatingMenus,
  onBackToForum,
  showPostTopMenu,
  onTogglePostTopMenu,
  onTogglePinPost,
  onOpenEditPost,
  onDeletePost,
  handlePullStart,
  handlePullMove,
  onPullEnd,
  pullDistance,
  isCommentGenerating,
  onTogglePostLike,
  onToggleCommentLike,
  onToggleReplyLike,
  expandedCommentIds,
  setExpandedCommentIds,
  replyTarget,
  setReplyTarget,
  replyInputMap,
  setReplyInputMap,
  onReplyComment,
  commentMenuTarget,
  setCommentMenuTarget,
  showIdentityMenu,
  setShowIdentityMenu,
  renderIdentityMenu,
  resolveIdentity,
  commentInput,
  onCommentInputChange,
  canManualComment,
  onManualComment,
  showPostEditModal,
  setShowPostEditModal,
  manualPostTitle,
  onManualPostTitleChange,
  manualPostContent,
  onManualPostContentChange,
  onSaveEditPost,
  onCommentMenuAction
}) => (
  <div className="flex flex-col h-full render-bg-primary render-text-primary" onClick={closeFloatingMenus}>
    <MobileHeader
      title="帖子详情"
      onBack={onBackToForum}
      actions={
        <button className="app-icon-button" onClick={(e) => { e.stopPropagation(); onTogglePostTopMenu(); }}>
          <i className="fa-solid fa-ellipsis"></i>
        </button>
      }
    />

    {showPostTopMenu && (
      <div className="absolute right-3 top-[calc(var(--safe-top)+44px)] z-[260] w-44" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
        <DropdownItem className="px-3 py-2 text-sm" onClick={onTogglePinPost}>
          <i className="fa-solid fa-thumbtack mr-2"></i>{activePost.pinned ? '取消置顶' : '置顶帖子'}
        </DropdownItem>
        <DropdownItem className="px-3 py-2 text-sm" onClick={onOpenEditPost}>
          <i className="fa-solid fa-pen mr-2"></i>编辑帖子
        </DropdownItem>
        <DropdownItem className="px-3 py-2 text-sm" danger onClick={onDeletePost}>
          <i className="fa-solid fa-trash mr-2"></i>删除帖子
        </DropdownItem>
        </DropdownMenu>
      </div>
    )}

    <div
      className="flex-1 overflow-y-auto no-scrollbar px-4 py-3"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={handlePullStart}
      onTouchMove={handlePullMove}
      onTouchEnd={onPullEnd}
    >
      {(pullDistance > 0 || isCommentGenerating) && <div className="text-center text-xs py-1 render-text-secondary">{isCommentGenerating ? '更新讨论中...' : pullDistance >= 60 ? '松开更新讨论' : '下拉更新讨论'}</div>}
      <div className="border-b render-border-subtle pb-3">
        <h2 className="text-[18px] font-semibold leading-snug">{activePost.title}</h2>
        <div className="mt-1 text-xs render-text-secondary">
          {activePost.author}
          {activePost.author === (currentUserName || '我') ? <span className="ml-1 px-1 rounded border render-border-subtle">楼主</span> : null}
          {' · '}
          {formatRelativeTime(activePost.createdAt)}
          {activePost.editedAt ? '· 已编辑' : ''}
        </div>
        <p className="mt-3 text-[14px] leading-7 whitespace-pre-wrap">{activePost.content}</p>
        <div className="mt-3 flex items-center gap-4 text-sm">
          <button className={`${activePost.likedByMe ? 'text-[#1677ff]' : 'render-text-secondary'}`} onClick={() => onTogglePostLike(activePost.id)}>
            <i className="fa-solid fa-thumbs-up mr-1"></i>{activePost.likes}
          </button>
          <span className="render-text-secondary"><i className="fa-solid fa-comment mr-1"></i>{activePost.comments.length}</span>
        </div>
      </div>

      <div className="pt-3 space-y-3">
        {[...(activePost.comments || [])].sort((a, b) => a.createdAt - b.createdAt).map((comment) => {
          const replyInput = replyInputMap[comment.id] || '';
          return (
            <div key={comment.id} className="border-b render-border-subtle pb-2">
              <div className="flex items-center justify-between text-xs render-text-secondary">
                <span className="font-semibold render-text-primary">{comment.author}{comment.author === (currentUserName || '我') ? <span className="ml-1 px-1 rounded border render-border-subtle text-[10px]">楼主</span> : null}</span>
                <span>{formatRelativeTime(comment.createdAt)}</span>
              </div>
              <p className="mt-1 text-[13px] leading-6">{comment.content}</p>
              <div className="mt-1 flex items-center gap-4 text-xs">
                <button className={`${comment.likedByMe ? 'text-[#1677ff]' : 'render-text-secondary'}`} onClick={() => onToggleCommentLike(comment.id)}><i className="fa-solid fa-thumbs-up mr-1"></i>{comment.likes || 0}</button>
                <button className="render-text-secondary" onClick={() => setExpandedCommentIds((prev) => ({ ...prev, [comment.id]: !(prev[comment.id] ?? true) }))}><i className="fa-solid fa-comment mr-1"></i>{(comment.replies || []).length}</button>
                <button className="render-text-secondary" onClick={() => setReplyTarget((prev) => prev?.parentId === comment.id && prev.replyToAuthor === comment.author ? null : { parentId: comment.id, replyToAuthor: comment.author })}><i className="fa-solid fa-reply mr-1"></i>回复</button>
                <button className="render-text-secondary" onClick={() => setCommentMenuTarget({ parentId: comment.id })}><i className="fa-solid fa-ellipsis"></i></button>
              </div>

              {(expandedCommentIds[comment.id] ?? true) && (comment.replies || []).length > 0 && (
                <div className="mt-2 ml-3 pl-2 border-l render-border-subtle space-y-1">
                  {[...(comment.replies || [])].sort((a, b) => a.createdAt - b.createdAt).map((reply) => (
                    <div key={reply.id} className="text-[12px] leading-5">
                      <div>
                        <span className="font-semibold">{reply.author}{reply.author === (currentUserName || '我') ? <span className="ml-1 px-1 rounded border render-border-subtle text-[10px]">楼主</span> : null}</span>
                        <span className="render-text-secondary"> 回复 {reply.replyToAuthor || comment.author}</span>
                        <span className="render-text-secondary">：{reply.content}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-xs">
                        <button className={`${reply.likedByMe ? 'text-[#1677ff]' : 'render-text-secondary'}`} onClick={() => onToggleReplyLike(comment.id, reply.id)}><i className="fa-solid fa-thumbs-up mr-1"></i>{reply.likes || 0}</button>
                        <button className="render-text-secondary" onClick={() => setReplyTarget({ parentId: comment.id, replyToAuthor: reply.author })}><i className="fa-solid fa-comment mr-1"></i>{(reply.replies || []).length || 0}</button>
                        <button className="render-text-secondary" onClick={() => setCommentMenuTarget({ parentId: comment.id, replyId: reply.id })}><i className="fa-solid fa-ellipsis"></i></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {replyTarget?.parentId === comment.id && (
                <div className="mt-2 flex items-center gap-2">
                  <input className="app-field-input flex-1 text-xs" placeholder={`回复 ${replyTarget?.replyToAuthor || comment.author}...`} value={replyInput} onChange={(e) => setReplyInputMap((prev) => ({ ...prev, [comment.id]: e.target.value }))} />
                  <button className="app-button app-button-primary px-2 py-1.5 text-xs min-h-0" onClick={() => onReplyComment(comment.id)}><i className="fa-solid fa-paper-plane"></i></button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>

    <div className="border-t render-border-subtle p-3 render-bg-tertiary">
      <div className="app-field-row">
        <div className="relative">
          <button className="w-9 h-9 rounded-full border render-border-subtle flex items-center justify-center overflow-hidden" onClick={(e) => { e.stopPropagation(); setShowIdentityMenu((v) => !v); }}>
            <img src={resolveIdentity().avatar} className="w-full h-full object-cover" />
          </button>
          {showIdentityMenu && renderIdentityMenu()}
        </div>
        <input className="app-field-input flex-1 text-sm" placeholder="写评论..." value={commentInput} onChange={(e) => onCommentInputChange(e.target.value)} />
        <button className="app-button app-button-primary" disabled={!canManualComment} onClick={onManualComment}><i className="fa-solid fa-paper-plane"></i></button>
      </div>
    </div>

    {showPostEditModal && (
      <div className="fixed inset-0 z-[220] bg-black/45 flex items-end" onClick={() => setShowPostEditModal(false)}>
        <div className="w-full app-surface-panel rounded-t-2xl" style={{ borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }} onClick={(e) => e.stopPropagation()}>
          <div className="app-surface-header">
            <div className="text-sm font-semibold">编辑帖子</div>
          </div>
          <div className="app-surface-body">
            <div className="app-field">
              <input className="app-field-input text-sm" value={manualPostTitle} onChange={(e) => onManualPostTitleChange(e.target.value)} />
            </div>
            <div className="app-field">
              <textarea className="app-field-textarea text-sm" rows={5} value={manualPostContent} onChange={(e) => onManualPostContentChange(e.target.value)} />
            </div>
          </div>
          <div className="app-surface-footer">
            <button className="app-button app-button-muted app-footer-button whitespace-nowrap" onClick={() => setShowPostEditModal(false)}>取消</button>
            <button className="app-button app-button-primary app-footer-button whitespace-nowrap" onClick={onSaveEditPost}>保存</button>
          </div>
        </div>
      </div>
    )}

    {commentMenuTarget && (
      <div className="fixed inset-0 z-[300] bg-black/30 flex items-end" onClick={() => setCommentMenuTarget(null)}>
        <div
          className="w-full p-2"
          onClick={(e) => e.stopPropagation()}
          style={{ borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
        >
          <DropdownMenu className="rounded-t-2xl" style={{ borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } as React.CSSProperties}>
            <DropdownItem className="px-3 py-3 text-sm" onClick={() => onCommentMenuAction('copy')}><i className="fa-solid fa-copy mr-2"></i>复制</DropdownItem>
            <DropdownItem className="px-3 py-3 text-sm" onClick={() => onCommentMenuAction('edit')}><i className="fa-solid fa-pen mr-2"></i>编辑</DropdownItem>
            <DropdownItem className="px-3 py-3 text-sm" danger onClick={() => onCommentMenuAction('delete')}><i className="fa-solid fa-trash mr-2"></i>删除</DropdownItem>
          </DropdownMenu>
        </div>
      </div>
    )}
  </div>
);

export default ForumDetailView;
