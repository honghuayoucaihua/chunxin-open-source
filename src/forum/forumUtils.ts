import type { Contact, ForumCategory, ForumPost, ForumPostComment, ForumSpace } from '../types/index.ts';
import { extractStrictJsonObject } from '../utils/chat/aiReplyParser.ts';
import { normalizeGeneratedStrictNonSystemEventText } from '../utils/generatedVisibleText.ts';

export const FALLBACK_ANON_AVATAR = '/assets/image/user.png';
export const DEFAULT_CATEGORIES: ForumCategory[] = ['推荐', '日常', '提问' as ForumCategory];

export const formatRelativeTime = (time: number): string => {
  const diff = Date.now() - time;
  const min = Math.floor(diff / (1000 * 60));
  if (min < 1) {
    return '刚刚';
  }
  if (min < 60) {
    return `${min} 分钟前`;
  }
  const hour = Math.floor(min / 60);
  if (hour < 24) {
    return `${hour} 小时前`;
  }
  const day = Math.floor(hour / 24);
  return `${day} 天前`;
};

export const sanitize = (value: unknown): string => {
  return String(value || '').replace(/\r\n?/g, '\n').trim();
};

export const sanitizeGeneratedForumText = (value: unknown, joinWith = ' '): string => {
  return normalizeGeneratedStrictNonSystemEventText(value, { joinWith, collapseWhitespace: joinWith === ' ' });
};

export const extractForumAiJsonObject = (raw: string): Record<string, any> | null => {
  return extractStrictJsonObject(raw);
};

const normalizeCommentNode = (
  raw: any,
  currentUserName: string | undefined,
  allowedContacts: Contact[]
): ForumPostComment | null => {
  const content = sanitizeGeneratedForumText(raw?.content);
  if (!content) {
    return null;
  }
  const repliesRaw = Array.isArray(raw?.replies) ? raw.replies : [];
  const rawAuthor = normalizeGeneratedStrictNonSystemEventText(raw?.author, { collapseWhitespace: true });
  if (!rawAuthor || rawAuthor === (currentUserName || '我') || rawAuthor === '我') {
    return null;
  }

  if (typeof raw?.isAnonymous !== 'boolean') {
    return null;
  }
  const isAnonymous = raw.isAnonymous;
  const bindName = isAnonymous
    ? normalizeGeneratedStrictNonSystemEventText(raw?.bindAuthor, { collapseWhitespace: true })
    : rawAuthor;
  const matchedContact = allowedContacts.find((contact) => {
    const name = sanitize(contact.name);
    const remark = sanitize(contact.remark || '');
    return bindName === name || (!!remark && bindName === remark);
  });
  if (!matchedContact) {
    return null;
  }

  return {
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    author: isAnonymous ? '匿名' : rawAuthor,
    authorContactId: matchedContact.id,
    content,
    createdAt: Date.now(),
    likes: Number.isFinite(Number(raw?.likes)) ? Number(raw.likes) : 0,
    likedByMe: false,
    isAnonymous,
    maskId: '',
    replyToId: '',
    replyToAuthor: '',
    replies: repliesRaw
      .map((item: any) => normalizeCommentNode(item, currentUserName, allowedContacts))
      .filter(Boolean) as ForumPostComment[]
  };
};

export const normalizeCommentList = (
  raw: any,
  currentUserName: string | undefined,
  allowedContacts: Contact[],
  options: { requiredCount?: number; requireReply?: boolean } = {}
): ForumPostComment[] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  const comments = raw
    .map((item) => normalizeCommentNode(item, currentUserName, allowedContacts))
    .filter(Boolean) as ForumPostComment[];
  const requiredCount = Number(options.requiredCount);
  if (Number.isFinite(requiredCount) && comments.length !== requiredCount) return [];
  if (options.requireReply && !comments.some((comment) => (comment.replies || []).length > 0)) return [];
  return comments;
};

export const buildForumAIRuntimeFingerprint = (
  forum: Pick<ForumSpace, 'name' | 'worldview' | 'roleIds' | 'worldBookIds' | 'tags'>
): string => JSON.stringify({
  name: sanitize(forum.name),
  worldview: sanitize(forum.worldview),
  roleIds: [...(forum.roleIds || [])].map((id) => sanitize(id)).filter(Boolean).sort(),
  worldBookIds: [...(forum.worldBookIds || [])].map((id) => sanitize(id)).filter(Boolean).sort(),
  tags: [...(forum.tags || [])].map((tag) => sanitize(tag)).filter(Boolean).sort()
});

export const buildForumCommentRuntimeFingerprint = (
  forum: Pick<ForumSpace, 'name' | 'roleIds'>,
  post: Pick<ForumPost, 'id' | 'title' | 'content' | 'author' | 'createdAt' | 'editedAt'>
): string => JSON.stringify({
  forumName: sanitize(forum.name),
  roleIds: [...(forum.roleIds || [])].map((id) => sanitize(id)).filter(Boolean).sort(),
  postId: sanitize(post.id),
  postTitle: sanitize(post.title),
  postContent: sanitize(post.content),
  postAuthor: sanitize(post.author),
  postRevision: Number(post.editedAt || post.createdAt || 0)
});
