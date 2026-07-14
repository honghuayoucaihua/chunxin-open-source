import { useRef, useState } from 'react';
import { getGeminiChatReply } from '../../services/geminiServiceLoader';
import { addPendingMessage } from '../../services/contactMemoryService';
import { buildRuntimeUserPersonaPrompt } from '../../services/personaSummary';
import { AISettings, Contact, ForumCategory, ForumPost, ForumSpace, Mask, UserProfile, WorldBook } from '../../types';
import {
  DEFAULT_CATEGORIES,
  buildForumAIRuntimeFingerprint,
  buildForumCommentRuntimeFingerprint,
  extractForumAiJsonObject,
  normalizeCommentList,
  sanitize,
  sanitizeGeneratedForumText
} from '../forumUtils';
import { captureRuntimeResetEpoch, isRuntimeResetEpochStale } from '../../services/runtimeResetGuard.ts';

export type UseForumAIParams = {
  contactOptions: Contact[];
  worldBooks: WorldBook[];
  masks: Mask[];
  user: UserProfile;
  currentUserName: string;
  aiSettings: AISettings;
  runtimeUserPromptBase: string;
  onToast?: (message: string) => void;
  patchForum: (forumId: string, updater: (forum: ForumSpace) => ForumSpace) => void;
  getForumRuntimeSnapshot: (forumId: string, postId?: string) => { fingerprint: string } | null;
};

export type UseForumAIReturn = {
  isGenerating: boolean;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  isCommentGenerating: boolean;
  setIsCommentGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  generateAndInsertPost: (forum: ForumSpace, mode: 'init' | 'refresh' | 'news', topic?: string) => Promise<void>;
  generateCommentsForPost: (forum: ForumSpace, post: ForumPost, options?: { silent?: boolean; skipLoading?: boolean }) => Promise<number | null>;
};

const useForumAI = ({
  contactOptions,
  worldBooks,
  masks,
  user,
  currentUserName,
  aiSettings,
  runtimeUserPromptBase,
  onToast,
  patchForum,
  getForumRuntimeSnapshot
}: UseForumAIParams): UseForumAIReturn => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCommentGenerating, setIsCommentGenerating] = useState(false);
  const forumPostRequestSeqRef = useRef<Record<string, number>>({});
  const forumCommentRequestSeqRef = useRef<Record<string, number>>({});
  const forumPostInflightRef = useRef<Map<string, Promise<void>>>(new Map());
  const forumCommentInflightRef = useRef<Map<string, Promise<number | null>>>(new Map());

  const randomBatchCount = () => Math.floor(Math.random() * 6) + 3;

  const buildForumRuntimeUserPrompt = (forum: ForumSpace): string => {
    const selectedMask = forum.maskId
      ? masks.find((mask) => mask.id === forum.maskId) || null
      : null;
    const userInfoPrompt = buildRuntimeUserPersonaPrompt(user, { selectedMask });
    return [runtimeUserPromptBase, userInfoPrompt].filter(Boolean).join('\n\n');
  };

  const buildForumPostInflightKey = (forum: ForumSpace, mode: 'init' | 'refresh' | 'news', topic?: string): string => [
    forum.id,
    mode,
    sanitize(topic || '')
  ].join('|');

  const buildForumCommentInflightKey = (forum: ForumSpace, post: ForumPost): string => [
    forum.id,
    post.id,
    buildForumCommentRuntimeFingerprint(forum, post)
  ].join('|');

  const getForumRoleContacts = (forum: ForumSpace): Contact[] => (
    contactOptions.filter((c) => forum.roleIds.includes(c.id))
  );

  const getForumContactNames = (roleContacts: Contact[]): string[] => (
    roleContacts.map((c) => c.remark?.trim() || c.name).filter(Boolean)
  );

  const buildForumWorldBookLines = (forum: ForumSpace): string[] => (
    worldBooks
      .filter((b) => forum.worldBookIds.includes(b.id))
      .map((b) => {
        const entries = (b.entries || []).map((e) => sanitize(e.text)).filter(Boolean).slice(0, 4);
        if (entries.length === 0) return '';
        return `- ${b.name}: ${entries.join('；')}`;
      })
      .filter(Boolean)
  );

  const buildForumPostPrompt = (params: {
    forum: ForumSpace;
    mode: 'init' | 'refresh' | 'news';
    topic?: string;
    count: number;
    contactNames: string[];
  }): string => {
    const forum = params.forum;
    const tags = (forum.tags || []).map((t) => sanitize(t)).filter(Boolean);
    const worldBookLines = buildForumWorldBookLines(forum);
    const topic = sanitize(params.topic || '');
    const taskText = params.mode === 'news'
      ? topic
        ? `围绕话题「${topic}」一次生成 10 条随机风格的普通讨论帖，其中至少 5-8 条在讨论该话题，可按需设置 pinned；不要写成"新闻播报/快讯公告"口吻`
        : '一次生成 10 条随机风格的普通讨论帖，可按需设置 pinned；不要写成"新闻播报/快讯公告"口吻'
      : params.mode === 'refresh'
        ? `一次生成 ${params.count} 条新的普通帖子，可按需设置 pinned`
        : `一次生成 ${params.count} 条论坛开场帖，可按需设置 pinned`;
    const lines = [
      '你是论坛内容写手，只输出 JSON。',
      `论坛名称：${forum.name}`,
      `论坛联系人：${params.contactNames.join('、')}`,
      sanitize(forum.worldview) ? `论坛世界观：${sanitize(forum.worldview)}` : '',
      tags.length > 0 ? `论坛标签：${tags.join('、')}` : '',
      worldBookLines.length > 0 ? `论坛世界书：\n${worldBookLines.join('\n')}` : '',
      `任务：${taskText}`,
      `可用板块（只能从中选择）：${(tags.length > 0 ? tags : DEFAULT_CATEGORIES).join('、')}`,
      sanitize(currentUserName) ? `楼主名称：${sanitize(currentUserName)}（可出现在帖子或评论里）` : '',
      '输出必须是一个 JSON 对象，且只能使用 posts 数组承载帖子：{"posts":[{"title":"","content":"","author":"","bindAuthor":"","isAnonymous":false,"category":"","pinned":false,"comments":[{"author":"","bindAuthor":"","isAnonymous":false,"content":"","likes":0,"replies":[{"author":"","bindAuthor":"","isAnonymous":false,"content":"","likes":0}]}]}]}。',
      '不要使用 post 单条字段，也不要把帖子对象直接放在根对象。',
      `作者必须来自论坛联系人：${params.contactNames.join('、')}。禁止使用"我"。`,
      '若匿名：author="匿名"，同时 bindAuthor 必须填写真实联系人名（且来自论坛联系人）。',
      '禁止任何额外文本。'
    ];
    return lines.filter(Boolean).join('\n');
  };

  const buildForumCommentPrompt = (params: {
    forum: ForumSpace;
    post: ForumPost;
    randomCount: number;
    contactNames: string[];
  }): string => {
    const forum = params.forum;
    const tags = (forum.tags || []).map((t) => sanitize(t)).filter(Boolean);
    const worldBookLines = buildForumWorldBookLines(forum);
    const lines = [
      '你是论坛评论写手，只输出 JSON。',
      `帖子标题：${params.post.title}`,
      `帖子内容：${params.post.content}`,
      `论坛联系人：${params.contactNames.join('、')}`,
      sanitize(forum.worldview) ? `论坛世界观：${sanitize(forum.worldview)}` : '',
      tags.length > 0 ? `论坛标签：${tags.join('、')}` : '',
      worldBookLines.length > 0 ? `论坛世界书：\n${worldBookLines.join('\n')}` : '',
      '输出必须是一个 JSON 对象，且只能使用 comments 数组承载评论：{"comments":[{"author":"","bindAuthor":"","isAnonymous":false,"content":"","likes":0,"replies":[{"author":"","bindAuthor":"","isAnonymous":false,"content":"","likes":0}]}]}。',
      '不要使用 comment 单条字段，也不要把评论对象直接放在根对象。',
      `要求：一次性生成 ${params.randomCount} 条评论，至少 1 条含楼中楼${sanitize(currentUserName) ? `；允许楼主（${sanitize(currentUserName)}）回复评论或补充说明` : ''}。`,
      '评论作者必须来自论坛联系人；若匿名，author="匿名"且 bindAuthor 填真实联系人名。'
    ];
    return lines.filter(Boolean).join('\n');
  };

  const beginForumPostRequest = (forum: ForumSpace) => {
    const requestId = (forumPostRequestSeqRef.current[forum.id] || 0) + 1;
    forumPostRequestSeqRef.current[forum.id] = requestId;
    return {
      forumId: forum.id,
      requestId,
      runtimeEpoch: captureRuntimeResetEpoch(),
      fingerprint: buildForumAIRuntimeFingerprint(forum)
    };
  };

  const isForumPostRequestStale = (request: {
    forumId: string;
    requestId: number;
    runtimeEpoch: number;
    fingerprint: string;
  }): boolean => {
    if (isRuntimeResetEpochStale(request.runtimeEpoch)) return true;
    if ((forumPostRequestSeqRef.current[request.forumId] || 0) !== request.requestId) return true;
    const latestSnapshot = getForumRuntimeSnapshot(request.forumId);
    return !latestSnapshot || latestSnapshot.fingerprint !== request.fingerprint;
  };

  const beginForumCommentRequest = (forum: ForumSpace, post: ForumPost) => {
    const requestId = (forumCommentRequestSeqRef.current[post.id] || 0) + 1;
    forumCommentRequestSeqRef.current[post.id] = requestId;
    return {
      forumId: forum.id,
      postId: post.id,
      requestId,
      runtimeEpoch: captureRuntimeResetEpoch(),
      fingerprint: buildForumCommentRuntimeFingerprint(forum, post)
    };
  };

  const isForumCommentRequestStale = (request: {
    forumId: string;
    postId: string;
    requestId: number;
    runtimeEpoch: number;
    fingerprint: string;
  }): boolean => {
    if (isRuntimeResetEpochStale(request.runtimeEpoch)) return true;
    if ((forumCommentRequestSeqRef.current[request.postId] || 0) !== request.requestId) return true;
    const latestSnapshot = getForumRuntimeSnapshot(request.forumId, request.postId);
    return !latestSnapshot || latestSnapshot.fingerprint !== request.fingerprint;
  };

  const callAIForPost = async (params: { forum: ForumSpace; mode: 'init' | 'refresh' | 'news'; topic?: string; count?: number }): Promise<ForumPost[] | null> => {
    const forum = params.forum;
    const request = beginForumPostRequest(forum);
    const roleContacts = getForumRoleContacts(forum);
    const contactNames = getForumContactNames(roleContacts);
    if (contactNames.length === 0) return [];
    const count = params.count ?? 1;
    const runtimeUserPrompt = buildForumRuntimeUserPrompt(forum);
    const prompt = buildForumPostPrompt({ forum, mode: params.mode, topic: params.topic, count, contactNames });

    const raw = await getGeminiChatReply([{ role: 'user', text: '生成帖子 JSON' }], prompt, aiSettings, runtimeUserPrompt);
    if (isForumPostRequestStale(request)) return null;
    const parsedRoot = extractForumAiJsonObject(raw);
    if (!parsedRoot) return [];
    const postItems = Array.isArray(parsedRoot?.posts) ? parsedRoot.posts : [];
    if (postItems.length !== count) return [];

    const result = postItems
      .map((parsed: any, idx: number) => {
        const title = sanitizeGeneratedForumText(parsed?.title);
        const content = sanitizeGeneratedForumText(parsed?.content, '\n');
        if (!title || !content) return null;
        if (typeof parsed?.isAnonymous !== 'boolean') return null;
        const boardCandidates = (forum.tags || []).map((t) => sanitize(t)).filter(Boolean);
        const normalizedBoards = boardCandidates.length > 0 ? boardCandidates : [...DEFAULT_CATEGORIES];
        const categoryRaw = sanitize(parsed?.category);
        if (!normalizedBoards.includes(categoryRaw)) return null;
        const category: ForumCategory = categoryRaw as ForumCategory;
        const rawAuthor = sanitize(parsed?.author);
        const isAnonymous = parsed.isAnonymous;
        const bindAuthor = sanitize(parsed?.bindAuthor);
        const resolvedName = isAnonymous ? bindAuthor : rawAuthor;
        const matchedAuthor = roleContacts.find((c) => {
          const n = sanitize(c.name);
          const r = sanitize(c.remark || '');
          return resolvedName === n || (!!r && resolvedName === r);
        });
        return {
          id: `forum-post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          forumId: forum.id,
          title,
          content,
          author: isAnonymous ? '匿名' : rawAuthor,
          category,
          likes: 0,
          likedByMe: false,
          comments: normalizeCommentList(parsed?.comments, currentUserName, roleContacts),
          createdAt: Date.now() - idx,
          isNews: params.mode === 'news',
          authorContactId: matchedAuthor?.id || '',
          isAnonymous,
          pinned: parsed?.pinned === true
        } as ForumPost;
      })
      .filter((p): p is ForumPost => !!p && !!sanitize(p.title) && !!sanitize(p.content) && !!sanitize(p.author) && p.author !== (currentUserName || '我') && p.author !== '我' && !!sanitize(p.authorContactId || ''));

    if (isForumPostRequestStale(request)) return null;
    return result.length === count ? result : [];
  };

  const runGenerateCommentsForPost = async (forum: ForumSpace, post: ForumPost, options?: { silent?: boolean; skipLoading?: boolean }): Promise<number | null> => {
    const request = beginForumCommentRequest(forum, post);
    if (!options?.skipLoading) setIsCommentGenerating(true);
    try {
      const roleContacts = getForumRoleContacts(forum);
      const contactNames = getForumContactNames(roleContacts);
      if (contactNames.length === 0) {
        if (!options?.silent) onToast?.('暂时没有新的讨论');
        return 0;
      }
      const randomCount = randomBatchCount();
      const runtimeUserPrompt = buildForumRuntimeUserPrompt(forum);
      const prompt = buildForumCommentPrompt({ forum, post, randomCount, contactNames });
      const raw = await getGeminiChatReply([{ role: 'user', text: '生成评论 JSON' }], prompt, aiSettings, runtimeUserPrompt);
      if (isForumCommentRequestStale(request)) return null;
      const parsed = extractForumAiJsonObject(raw);
      if (!parsed) {
        if (isForumCommentRequestStale(request)) return null;
        if (!options?.silent) onToast?.('暂时没有新的讨论');
        return 0;
      }
      const comments = normalizeCommentList(parsed?.comments, currentUserName, roleContacts, {
        requiredCount: randomCount,
        requireReply: true
      });
      if (isForumCommentRequestStale(request)) return null;
      if (comments.length === 0) {
        if (isForumCommentRequestStale(request)) return null;
        if (!options?.silent) onToast?.('暂时没有新的讨论');
        return 0;
      }
      if (isForumCommentRequestStale(request)) return null;
      patchForum(forum.id, (prev) => ({
        ...prev,
        posts: prev.posts.map((p) => p.id === post.id ? { ...p, comments: [...comments, ...(p.comments || [])].sort((a, b) => a.createdAt - b.createdAt) } : p),
        updatedAt: Date.now()
      }));
      if (isForumCommentRequestStale(request)) return null;
      const flatReplies = comments.flatMap((c) => [c, ...(c.replies || [])]);
      flatReplies.forEach((c) => {
        if (!c.authorContactId) return;
        addPendingMessage(c.authorContactId, `[论坛评论] ${c.content}`, 'model');
      });
      if (isForumCommentRequestStale(request)) return null;
      if (!options?.silent) onToast?.('讨论已更新');
      return comments.length;
    } finally {
      if (!options?.skipLoading) setIsCommentGenerating(false);
    }
  };

  const generateCommentsForPost = async (forum: ForumSpace, post: ForumPost, options?: { silent?: boolean; skipLoading?: boolean }): Promise<number | null> => {
    const key = buildForumCommentInflightKey(forum, post);
    const existing = forumCommentInflightRef.current.get(key);
    if (existing) return existing;
    const request = runGenerateCommentsForPost(forum, post, options).finally(() => {
      forumCommentInflightRef.current.delete(key);
    });
    forumCommentInflightRef.current.set(key, request);
    return request;
  };

  const runGenerateAndInsertPost = async (forum: ForumSpace, mode: 'init' | 'refresh' | 'news', topic?: string) => {
    setIsGenerating(true);
    try {
      const forumFingerprint = buildForumAIRuntimeFingerprint(forum);
      const count = mode === 'news' ? 10 : randomBatchCount();
      let generatedList = await callAIForPost({ forum, mode, topic, count });
      if (generatedList === null) return;
      if (mode === 'news') {
        generatedList = generatedList
          .map((p) => ({ ...p, isNews: false }))
          .filter((p) => !!sanitize(p.author) && p.author !== (currentUserName || '我') && p.author !== '我' && !!sanitize(p.authorContactId || ''));
      }
      const latestSnapshot = getForumRuntimeSnapshot(forum.id);
      if (!latestSnapshot || latestSnapshot.fingerprint !== forumFingerprint) {
        return;
      }
      if (generatedList.length === 0) {
        onToast?.('暂时未获取到新内容');
        return;
      }
      if (!latestSnapshot || latestSnapshot.fingerprint !== forumFingerprint) return;
      generatedList.forEach((post) => {
        if (!post.authorContactId) return;
        addPendingMessage(post.authorContactId, `[论坛发帖] ${post.title} ${post.content}`, 'model');
      });
      const currentSnapshot = getForumRuntimeSnapshot(forum.id);
      if (!currentSnapshot || currentSnapshot.fingerprint !== forumFingerprint) {
        return;
      }
      patchForum(forum.id, (prev) => ({ ...prev, posts: [...generatedList, ...(prev.posts || [])].sort((a, b) => b.createdAt - a.createdAt), updatedAt: Date.now() }));
      const appliedSnapshot = getForumRuntimeSnapshot(forum.id);
      if (!appliedSnapshot) return;
      if (mode === 'init') onToast?.(`论坛已开启，共 ${generatedList.length} 条新帖`);
      if (mode === 'refresh') onToast?.(`已更新 ${generatedList.length} 条动态`);
      if (mode === 'news') onToast?.(`快讯讨论已发布，共 ${generatedList.length} 帖`);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAndInsertPost = async (forum: ForumSpace, mode: 'init' | 'refresh' | 'news', topic?: string) => {
    const key = buildForumPostInflightKey(forum, mode, topic);
    const existing = forumPostInflightRef.current.get(key);
    if (existing) return existing;
    const request = runGenerateAndInsertPost(forum, mode, topic).finally(() => {
      forumPostInflightRef.current.delete(key);
    });
    forumPostInflightRef.current.set(key, request);
    return request;
  };

  return {
    isGenerating,
    setIsGenerating,
    isCommentGenerating,
    setIsCommentGenerating,
    generateAndInsertPost,
    generateCommentsForPost
  };
};

export default useForumAI;
