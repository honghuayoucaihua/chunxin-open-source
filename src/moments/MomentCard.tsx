import React from 'react';
import { Moment, UserProfile } from '../types';
import { DropdownItem, DropdownMenu } from '../utils/DropdownPrimitives';

const normalizeImageSrc = (value?: string) => {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed : undefined;
};

const fallbackAvatar = '/assets/image/user.png';

interface MomentCardProps {
  moment: Moment;
  user: UserProfile;
  isQQSkin?: boolean;
  actionMenuId: string | null;
  commentingId: string | null;
  commentReplyTo: { user: string } | null;
  commentText: string;
  editingMomentId: string | null;
  editingContent: string;
  editingLocation: string;
  formatMomentTime: (timestamp: number) => string;
  onAvatarClick: (id: string) => void;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  onStartEdit: (moment: Moment) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onComment: (id: string, replyTo?: { user: string }) => void;
  setActionMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  setCommentingId: React.Dispatch<React.SetStateAction<string | null>>;
  setCommentReplyTo: React.Dispatch<React.SetStateAction<{ user: string } | null>>;
  setCommentText: React.Dispatch<React.SetStateAction<string>>;
  setEditingContent: React.Dispatch<React.SetStateAction<string>>;
  setEditingLocation: React.Dispatch<React.SetStateAction<string>>;
}

export const MomentCard: React.FC<MomentCardProps> = ({
  moment: m,
  user,
  isQQSkin = false,
  actionMenuId,
  commentingId,
  commentReplyTo,
  commentText,
  editingMomentId,
  editingContent,
  editingLocation,
  formatMomentTime,
  onAvatarClick,
  onLike,
  onDelete,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onComment,
  setActionMenuId,
  setCommentingId,
  setCommentReplyTo,
  setCommentText,
  setEditingContent,
  setEditingLocation
}) => {
  const [previewImageUrl, setPreviewImageUrl] = React.useState<string | null>(null);

  return (
    <div className={`render-moments-card flex ${isQQSkin ? 'space-x-3 pb-5 border-b render-border' : 'space-x-3'}`}>
      <img
        src={normalizeImageSrc(m.avatar) || fallbackAvatar}
        loading="lazy"
        decoding="async"
        className={`${isQQSkin ? 'w-11 h-11 rounded-full' : 'w-10 h-10 app-avatar-radius'} object-cover cursor-pointer active:opacity-70`}
        onClick={() => onAvatarClick(m.authorId)}
      />
      <div className={`flex-1 ${isQQSkin ? '' : 'border-b render-border pb-4'}`}>
        <div className="flex items-start justify-between">
          <h4 className="text-link font-bold text-[15px] active:opacity-70 cursor-pointer" onClick={() => onAvatarClick(m.authorId)}>{m.author}</h4>
          {isQQSkin && (
            <button
              className="app-icon-button w-6 h-6 -mt-0.5 text-[14px] render-qzone-item-more"
              onClick={(e) => { e.stopPropagation(); setActionMenuId(actionMenuId === m.id ? null : m.id); }}
            >
              <i className="fa-solid fa-ellipsis"></i>
            </button>
          )}
        </div>
        <p className={`mt-1.5 ${isQQSkin ? 'text-[16px]' : 'text-[15px]'} render-text-primary leading-relaxed whitespace-pre-wrap`}>{m.content}</p>
        {Array.isArray(m.images) && m.images.filter((img) => !!normalizeImageSrc(img)).length > 0 && (
          <div className={`mt-3 grid ${m.images.filter((img) => !!normalizeImageSrc(img)).length === 1 ? 'grid-cols-1' : m.images.filter((img) => !!normalizeImageSrc(img)).length === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-1.5 w-full`}>
            {m.images.map((img, i) => {
              if (!normalizeImageSrc(img)) return null;
              return (
                <div key={i}>
                  <img
                    src={img}
                    loading="lazy"
                    decoding="async"
                    className={`w-full aspect-square object-cover ${isQQSkin ? '' : 'rounded-sm'} bg-gray-100 cursor-zoom-in moments-media-image`}
                    onClick={() => setPreviewImageUrl(img)}
                  />
                </div>
              );
            })}
          </div>
        )}
        {isQQSkin && Array.isArray(m.images) && m.images.filter((img) => !!normalizeImageSrc(img)).length > 0 && (
          <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded-md text-[12px] render-qzone-media-meta">
            <i className="fa-regular fa-image mr-1.5"></i>行·共{m.images.filter((img) => !!normalizeImageSrc(img)).length}个照片/视频
            <i className="fa-solid fa-chevron-right ml-1.5 text-[10px]"></i>
          </div>
        )}


        <div className={`flex justify-between items-center ${isQQSkin ? 'mt-3' : 'mt-4'}`}>
          <span className="text-[12px] render-text-secondary">
            {formatMomentTime(m.timestamp)}
            {m.location && (
              <span className="ml-2 text-link whitespace-nowrap">{m.location}</span>
            )}
          </span>
          <div className="relative flex items-center">
            {isQQSkin ? (
              <div className="flex items-center gap-5 text-[30px] leading-none render-qzone-item-actions">
                <button className="app-icon-button w-7 h-7 rounded-full" onClick={() => onLike(m.id)}>
                  <i className={`fa-${m.likes.includes(user.name) ? 'solid render-qzone-like-active' : 'regular'} fa-thumbs-up text-[18px]`}></i>
                </button>
                <button className="app-icon-button w-7 h-7 rounded-full" onClick={() => { setCommentingId(commentingId === m.id ? null : m.id); setCommentReplyTo(null); }}>
                  <i className="fa-regular fa-comment text-[18px]"></i>
                </button>
                <button className="app-icon-button w-7 h-7 rounded-full" onClick={(e) => { e.stopPropagation(); setActionMenuId(actionMenuId === m.id ? null : m.id); }}>
                  <i className="fa-solid fa-share-nodes text-[18px]"></i>
                </button>
              </div>
            ) : (
              <button
                className="app-icon-button w-8 h-6 rounded-sm text-link text-xs font-bold"
                onClick={(e) => { e.stopPropagation(); setActionMenuId(actionMenuId === m.id ? null : m.id); }}
              >
                <i className="fa-solid fa-ellipsis"></i>
              </button>
            )}
            {actionMenuId === m.id && (
              <DropdownMenu className="absolute right-9 top-1/2 -translate-y-1/2 overflow-hidden flex flex-nowrap" onClick={(e) => e.stopPropagation()}>
                {!isQQSkin && (
                  <>
                    <DropdownItem className="px-3 py-2 text-[12px] flex items-center whitespace-nowrap" onClick={() => { onLike(m.id); setActionMenuId(null); }}>
                      <i className={`fa-${m.likes.includes(user.name) ? 'solid' : 'regular'} fa-heart mr-1.5`}></i>
                      点赞
                    </DropdownItem>
                    <DropdownItem className="px-3 py-2 text-[12px] flex items-center whitespace-nowrap" onClick={() => { setCommentingId(commentingId === m.id ? null : m.id); setActionMenuId(null); }}>
                      <i className="fa-regular fa-comment mr-1.5"></i>
                      评论
                    </DropdownItem>
                  </>
                )}
                <DropdownItem className="px-3 py-2 text-[12px] flex items-center whitespace-nowrap" onClick={() => onStartEdit(m)}>
                  <i className="fa-regular fa-pen-to-square mr-1.5"></i>
                  编辑
                </DropdownItem>
                <DropdownItem className="px-3 py-2 text-[12px] flex items-center whitespace-nowrap" danger onClick={() => onDelete(m.id)}>
                  <i className="fa-regular fa-trash-can mr-1.5"></i>
                  删除
                </DropdownItem>
              </DropdownMenu>
            )}
          </div>
        </div>

        {(m.likes.length > 0 || m.comments.length > 0) && (
          <div className={`mt-3 ${isQQSkin ? 'render-qzone-interact' : 'bg-gray-50 dark:bg-[#111]'} rounded-sm p-2 text-[14px]`}>
            {m.likes.length > 0 && (
              <div className={`flex items-start ${m.comments.length > 0 ? 'border-b render-border pb-1 mb-1' : ''}`}>
                <i className={`fa-regular ${isQQSkin ? 'fa-thumbs-up' : 'fa-heart'} text-link mt-1.5 mr-2 text-[11px]`}></i>
                <span className={`${isQQSkin ? 'font-semibold' : 'font-bold'} text-link`}>{m.likes.join(", ")} 赞了</span>
              </div>
            )}
            {m.comments.map(c => (
              <div key={c.id} className="py-0.5 leading-snug cursor-pointer" onClick={() => { setCommentingId(m.id); setCommentReplyTo({ user: c.user }); setActionMenuId(null); }}>
                <span className="text-link font-bold">{c.user}{c.replyTo ? ` 回复 ${c.replyTo}:` : ': '}</span>
                <span className="render-text-primary opacity-80">{c.text}</span>
              </div>
            ))}
          </div>
        )}

        {commentingId === m.id && (
          <div className="mt-3 flex flex-col space-y-2">
            {commentReplyTo && (
              <div className="flex items-center text-xs text-gray-500">
                <span>回复 <span className="text-link">{commentReplyTo.user}</span></span>
                <button className="app-button app-button-muted ml-2 !px-2 !py-1 text-gray-400 hover:text-gray-600" onClick={() => { setCommentReplyTo(null); setCommentText(''); }}>取消</button>
              </div>
            )}
            {isQQSkin ? (
              <div className="flex items-center gap-2">
                <img src={normalizeImageSrc(user.avatar) || fallbackAvatar} className="w-8 h-8 rounded-full object-cover" />
                <input
                  autoFocus
                  className="flex-1 px-4 py-2 rounded-2xl text-[14px] outline-none render-qzone-comment-input"
                  placeholder={commentReplyTo ? '' : '说点什么吧...'}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && onComment(m.id, commentReplyTo || undefined)}
                />
              </div>
            ) : (
              <div className="flex space-x-2">
                <input
                  autoFocus
                  className="app-field-input app-field-input--soft flex-1 text-sm"
                  placeholder={commentReplyTo ? '' : '评论'}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && onComment(m.id, commentReplyTo || undefined)}
                />
                <button className="app-button app-button-primary px-3 py-1 text-sm font-bold whitespace-nowrap" onClick={() => onComment(m.id, commentReplyTo || undefined)}>发送</button>
              </div>
            )}
          </div>
        )}

        {editingMomentId === m.id && (
          <div className="app-surface-panel app-surface-panel--soft mt-3 flex flex-col gap-2 p-3">
            <textarea
              className="app-field-textarea app-field-input--soft w-full min-h-[84px] resize-y text-[14px]"
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              placeholder="编辑朋友圈内容"
            />
            <input
              className="app-field-input app-field-input--soft w-full text-[13px]"
              value={editingLocation}
              onChange={(e) => setEditingLocation(e.target.value)}
              placeholder="编辑位置（可留空）"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                className="app-button app-button-muted px-3 py-1.5 text-[12px]"
                onClick={onCancelEdit}
              >
                取消
              </button>
              <button
                className="app-button app-button-primary px-3 py-1.5 text-[12px] disabled:opacity-50"
                disabled={!editingContent.trim()}
                onClick={() => onSaveEdit(m.id)}
              >
                保存
              </button>
            </div>
          </div>
        )}
      </div>
      {previewImageUrl && (
        <div className="fixed inset-0 z-[560] bg-black/90 flex items-center justify-center" onClick={() => setPreviewImageUrl(null)}>
          <img
            src={previewImageUrl}
            className="max-w-[96vw] max-h-[96vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="app-icon-button absolute top-4 right-4 text-white text-xl w-9 h-9 rounded-full bg-black/40"
            onClick={() => setPreviewImageUrl(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};
