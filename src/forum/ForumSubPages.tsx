import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AISettings, Contact, ForumCategory, ForumPost, ForumPostComment, ForumSpace, Mask, SubView, UserProfile, WorldBook } from '../types';
import ForumArchiveView from './ForumArchiveView';
import ForumCreateSettingsView from './ForumCreateSettingsView';
import ForumDetailView from './ForumDetailView';
import ForumListView from './ForumListView';
import ForumIdentityMenu, { IdentityMode, resolveIdentity } from './ForumIdentityMenu';
import {
  DEFAULT_CATEGORIES,
  sanitize,
  buildForumAIRuntimeFingerprint,
  buildForumCommentRuntimeFingerprint
} from './forumUtils';
import useForumCreateForm from './hooks/useForumCreateForm';
import useForumAI from './hooks/useForumAI';

type CreateAction = 'post' | 'news';

const ForumView: React.FC<{
  subView: SubView;
  pushSubView: (sub: SubView) => void;
  replaceSubView: (sub: SubView) => void;
  goBackSubView: (source?: 'app' | 'history', steps?: number) => void;
  contacts: Contact[];
  masks: Mask[];
  worldBooks: WorldBook[];
  user: UserProfile;
  currentUserName: string;
  forums: ForumSpace[];
  onForumsChange: React.Dispatch<React.SetStateAction<ForumSpace[]>>;
  aiSettings: AISettings;
  runtimeUserPromptBase?: string;
  onToast?: (message: string) => void;
}> = ({ subView, pushSubView, replaceSubView, goBackSubView, contacts, masks, worldBooks, user, currentUserName, forums, onForumsChange, aiSettings, runtimeUserPromptBase = '', onToast }) => {
  const contactOptions = useMemo(() => contacts.filter((c) => !c.isGroup && c.isAi), [contacts]);

  const [activeForumId, setActiveForumId] = useState('');
  const [activePostId, setActivePostId] = useState('');

  const [activeCategory, setActiveCategory] = useState<string>('全部');

  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showPostTopMenu, setShowPostTopMenu] = useState(false);
  const [showIdentityMenu, setShowIdentityMenu] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPostEditModal, setShowPostEditModal] = useState(false);

  const [createAction, setCreateAction] = useState<CreateAction>('post');

  const [topicInput, setTopicInput] = useState('');
  const [manualPostTitle, setManualPostTitle] = useState('');
  const [manualPostContent, setManualPostContent] = useState('');
  const [manualPostCategory, setManualPostCategory] = useState<ForumCategory>('日常');
  const [manualPostPinned, setManualPostPinned] = useState(false);

  const [commentInput, setCommentInput] = useState('');
  const [replyInputMap, setReplyInputMap] = useState<Record<string, string>>({});
  const [replyTarget, setReplyTarget] = useState<{ parentId: string; replyToAuthor: string } | null>(null);
  const [expandedCommentIds, setExpandedCommentIds] = useState<Record<string, boolean>>({});
  const [commentMenuTarget, setCommentMenuTarget] = useState<{ parentId: string; replyId?: string } | null>(null);

  const [identityMode, setIdentityMode] = useState<IdentityMode>('self');
  const [identityMaskId, setIdentityMaskId] = useState('');

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const touchStartYRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const forumsRef = useRef(forums);

  const activeForum = forums.find((f) => f.id === activeForumId) || null;
  const activePost = activeForum?.posts.find((p) => p.id === activePostId) || null;

  useEffect(() => {
    forumsRef.current = forums;
  }, [forums]);

  const createForm = useForumCreateForm();

  const patchForum = (forumId: string, updater: (forum: ForumSpace) => ForumSpace) => {
    onForumsChange((prev) => prev.map((f) => (f.id === forumId ? updater(f) : f)));
  };

  const getForumRuntimeSnapshot = React.useCallback((forumId: string, postId?: string): { fingerprint: string } | null => {
    const forum = forumsRef.current.find((item) => item.id === forumId);
    if (!forum) return null;
    if (!postId) {
      return { fingerprint: buildForumAIRuntimeFingerprint(forum) };
    }
    const post = forum.posts.find((item) => item.id === postId);
    if (!post) return null;
    return { fingerprint: buildForumCommentRuntimeFingerprint(forum, post) };
  }, []);

  const ai = useForumAI({
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
  });

  const forumBoardList = useMemo(() => {
    const fromTags = (activeForum?.tags || []).map((t) => sanitize(t)).filter(Boolean);
    return fromTags.length > 0 ? fromTags : DEFAULT_CATEGORIES;
  }, [activeForum?.tags]);

  const categoryTabs = useMemo(() => ['全部', ...forumBoardList], [forumBoardList]);
  const postCategoryOptions = useMemo(() => forumBoardList as ForumCategory[], [forumBoardList]);

  const visiblePosts = useMemo(() => {
    if (!activeForum) return [];
    if (activeCategory === '全部') {
      return [...activeForum.posts].sort((a, b) => b.createdAt - a.createdAt);
    }
    return [...activeForum.posts].filter((p) => p.category === activeCategory).sort((a, b) => b.createdAt - a.createdAt);
  }, [activeForum, activeCategory]);

  const canCreateNews = topicInput.trim().length >= 2;
  const canManualPost = manualPostTitle.trim().length > 0 && manualPostContent.trim().length > 0;
  const canManualComment = commentInput.trim().length > 0;

  const doResolveIdentity = () => resolveIdentity(identityMode, identityMaskId, createForm.selectedMaskIds, masks, currentUserName);

  const closeFloatingMenus = () => {
    setShowActionMenu(false);
    setShowPostTopMenu(false);
    setShowIdentityMenu(false);
    setCommentMenuTarget(null);
  };

  useEffect(() => {
    closeFloatingMenus();
    setReplyTarget(null);
  }, [subView, activeForumId, activePostId]);

  const renderIdentityMenu = () => (
    <ForumIdentityMenu
      masks={masks}
      selectedMaskIds={createForm.selectedMaskIds}
      onSelectSelf={() => { setIdentityMode('self'); setShowIdentityMenu(false); }}
      onSelectAnonymous={() => { setIdentityMode('anonymous'); setIdentityMaskId(''); setShowIdentityMenu(false); }}
      onSelectMask={(maskId) => { setIdentityMode('mask'); setIdentityMaskId(maskId); setShowIdentityMenu(false); }}
    />
  );

  const handleCreateForum = async () => {
    if (!createForm.canCreateForum) return;
    const now = Date.now();
    const forum: ForumSpace = {
      id: `forum-${now}`,
      name: createForm.forumNameInput.trim(),
      roleIds: createForm.selectedContactIds,
      maskId: createForm.selectedMaskId,
      maskIds: createForm.selectedMaskIds,
      worldview: createForm.worldviewInput.trim(),
      worldBookIds: createForm.selectedWorldBookIds,
      tags: createForm.tags.length > 0 ? createForm.tags : [...DEFAULT_CATEGORIES],
      posts: [],
      createdAt: now,
      updatedAt: now
    };
    onForumsChange((prev) => [forum, ...prev]);
    setActiveForumId(forum.id);
    replaceSubView('forumSpace');
    createForm.resetCreateForm();
    await ai.generateAndInsertPost(forum, 'init');
  };

  const handleOpenForum = (forumId: string) => {
    setActiveForumId(forumId);
    setActiveCategory('全部');
    pushSubView('forumSpace');
  };

  const openForumSettings = () => {
    if (!activeForum) return;
    createForm.setForumNameInput(activeForum.name || '');
    createForm.setSelectedContactIds(activeForum.roleIds || []);
    createForm.setSelectedMaskId(activeForum.maskId || '');
    createForm.setSelectedMaskIds(activeForum.maskIds || (activeForum.maskId ? [activeForum.maskId] : []));
    createForm.setWorldviewInput(activeForum.worldview || '');
    createForm.setSelectedWorldBookIds(activeForum.worldBookIds || []);
    createForm.setTags(activeForum.tags || []);
    createForm.setTagInput('');
    pushSubView('forumSettings');
  };

  const handleSaveForumSettings = () => {
    if (!activeForum) return;
    patchForum(activeForum.id, (prev) => ({
      ...prev,
      name: createForm.forumNameInput.trim() || prev.name,
      roleIds: createForm.selectedContactIds,
      maskId: createForm.selectedMaskId,
      maskIds: createForm.selectedMaskIds,
      worldview: createForm.worldviewInput.trim(),
      worldBookIds: createForm.selectedWorldBookIds,
      tags: createForm.tags,
      updatedAt: Date.now()
    }));
    onToast?.('论坛设置已保存');
    goBackSubView();
  };

  const handleDeleteForum = () => {
    if (!activeForum) return;
    onForumsChange((prev) => prev.filter((f) => f.id !== activeForum.id));
    goBackSubView('app', 2);
    onToast?.('论坛已删除');
  };

  const beginCreateByAction = (action: CreateAction) => {
    setShowActionMenu(false);
    setCreateAction(action);
    setTopicInput('');
    setManualPostTitle('');
    setManualPostContent('');
    setManualPostCategory(postCategoryOptions[0] || '日常');
    setManualPostPinned(false);
    setShowCreateModal(true);
  };

  const handleCreateByAction = async () => {
    if (!activeForum) return;
    if (createAction === 'news') {
      if (!canCreateNews) return;
      setShowCreateModal(false);
      await ai.generateAndInsertPost(activeForum, 'news', topicInput.trim());
      return;
    }
    if (!canManualPost) return;

    const identity = doResolveIdentity();
    const post: ForumPost = {
      id: `forum-post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      forumId: activeForum.id,
      title: manualPostTitle.trim(),
      content: manualPostContent.trim(),
      author: identity.author,
      category: manualPostCategory,
      likes: 0,
      likedByMe: false,
      comments: [],
      createdAt: Date.now(),
      isAnonymous: identity.isAnonymous,
      maskId: identity.maskId,
      pinned: manualPostPinned
    };
    patchForum(activeForum.id, (prev) => ({ ...prev, posts: [post, ...prev.posts].sort((a, b) => b.createdAt - a.createdAt), updatedAt: Date.now() }));
    setShowCreateModal(false);
    onToast?.('帖子已发布');
    await ai.generateCommentsForPost(activeForum, post);
  };

  const handleTogglePostLike = (postId: string) => {
    if (!activeForum) return;
    patchForum(activeForum.id, (prev) => ({
      ...prev,
      posts: prev.posts.map((p) => {
        if (p.id !== postId) return p;
        const liked = !p.likedByMe;
        return { ...p, likedByMe: liked, likes: Math.max(0, (p.likes || 0) + (liked ? 1 : -1)) };
      })
    }));
  };

  const handleToggleCommentLike = (commentId: string) => {
    if (!activeForum || !activePost) return;
    patchForum(activeForum.id, (prev) => ({
      ...prev,
      posts: prev.posts.map((p) => {
        if (p.id !== activePost.id) return p;
        return {
          ...p,
          comments: (p.comments || []).map((c) => {
            if (c.id !== commentId) return c;
            const liked = !c.likedByMe;
            return { ...c, likedByMe: liked, likes: Math.max(0, (c.likes || 0) + (liked ? 1 : -1)) };
          })
        };
      })
    }));
  };

  const handleToggleReplyLike = (parentId: string, replyId: string) => {
    if (!activeForum || !activePost) return;
    patchForum(activeForum.id, (prev) => ({
      ...prev,
      posts: prev.posts.map((p) => {
        if (p.id !== activePost.id) return p;
        return {
          ...p,
          comments: (p.comments || []).map((c) => {
            if (c.id !== parentId) return c;
            return {
              ...c,
              replies: (c.replies || []).map((r) => {
                if (r.id !== replyId) return r;
                const liked = !r.likedByMe;
                return { ...r, likedByMe: liked, likes: Math.max(0, (r.likes || 0) + (liked ? 1 : -1)) };
              })
            };
          })
        };
      })
    }));
  };

  const handleManualComment = () => {
    if (!activeForum || !activePost || !canManualComment) return;
    const identity = doResolveIdentity();
    const nextComment: ForumPostComment = {
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author: identity.author,
      content: commentInput.trim(),
      createdAt: Date.now(),
      likes: 0,
      likedByMe: false,
      isAnonymous: identity.isAnonymous,
      maskId: identity.maskId,
      replies: []
    };
    patchForum(activeForum.id, (prev) => ({
      ...prev,
      posts: prev.posts.map((p) => p.id === activePost.id ? { ...p, comments: [...(p.comments || []), nextComment].sort((a, b) => a.createdAt - b.createdAt) } : p),
      updatedAt: Date.now()
    }));
    setCommentInput('');
  };

  const handleReplyComment = (parentId: string) => {
    if (!activeForum || !activePost) return;
    const text = sanitize(replyInputMap[parentId] || '');
    if (!text) return;
    const target = (activePost.comments || []).find((c) => c.id === parentId);
    if (!target) return;

    const identity = doResolveIdentity();
    const reply: ForumPostComment = {
      id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author: identity.author,
      content: text,
      createdAt: Date.now(),
      likes: 0,
      likedByMe: false,
      isAnonymous: identity.isAnonymous,
      maskId: identity.maskId,
      replyToId: replyTarget?.parentId || target.id,
      replyToAuthor: replyTarget?.replyToAuthor || target.author
    };

    patchForum(activeForum.id, (prev) => ({
      ...prev,
      posts: prev.posts.map((p) => {
        if (p.id !== activePost.id) return p;
        return {
          ...p,
          comments: (p.comments || []).map((c) => c.id === parentId ? { ...c, replies: [...(c.replies || []), reply].sort((a, b) => a.createdAt - b.createdAt) } : c)
        };
      }),
      updatedAt: Date.now()
    }));

    setReplyInputMap((prev) => ({ ...prev, [parentId]: '' }));
    setReplyTarget(null);
  };

  const handleCommentMenuAction = async (action: 'copy' | 'edit' | 'delete') => {
    if (!activeForum || !activePost || !commentMenuTarget) return;

    const targetComment = (activePost.comments || []).find((c) => c.id === commentMenuTarget.parentId);
    const targetReply = commentMenuTarget.replyId ? (targetComment?.replies || []).find((r) => r.id === commentMenuTarget.replyId) : null;
    const targetNode = targetReply || targetComment;
    if (!targetNode) {
      setCommentMenuTarget(null);
      return;
    }

    if (action === 'copy') {
      const text = targetNode.content || '';
      try {
        await navigator.clipboard.writeText(text);
        onToast?.('内容已复制');
      } catch {
        onToast?.('复制失败');
      }
      setCommentMenuTarget(null);
      return;
    }

    if (action === 'edit') {
      const next = window.prompt('编辑内容', targetNode.content || '');
      if (next == null) {
        setCommentMenuTarget(null);
        return;
      }
      const newContent = sanitize(next);
      if (!newContent) {
        onToast?.('内容不能为空');
        return;
      }
      patchForum(activeForum.id, (prev) => ({
        ...prev,
        posts: prev.posts.map((p) => {
          if (p.id !== activePost.id) return p;
          return {
            ...p,
            comments: (p.comments || []).map((c) => {
              if (c.id !== commentMenuTarget.parentId) return c;
              if (!commentMenuTarget.replyId) return { ...c, content: newContent };
              return {
                ...c,
                replies: (c.replies || []).map((r) => r.id === commentMenuTarget.replyId ? { ...r, content: newContent } : r)
              };
            })
          };
        }),
        updatedAt: Date.now()
      }));
      onToast?.('已更新');
      setCommentMenuTarget(null);
      return;
    }

    patchForum(activeForum.id, (prev) => ({
      ...prev,
      posts: prev.posts.map((p) => {
        if (p.id !== activePost.id) return p;
        return {
          ...p,
          comments: (p.comments || []).flatMap((c) => {
            if (c.id !== commentMenuTarget.parentId) return [c];
            if (!commentMenuTarget.replyId) return [];
            return [{ ...c, replies: (c.replies || []).filter((r) => r.id !== commentMenuTarget.replyId) }];
          })
        };
      }),
      updatedAt: Date.now()
    }));
    onToast?.('已删除');
    setCommentMenuTarget(null);
  };

  const handleDeletePost = () => {
    if (!activeForum || !activePost) return;
    patchForum(activeForum.id, (prev) => ({ ...prev, posts: prev.posts.filter((p) => p.id !== activePost.id), updatedAt: Date.now() }));
    setShowPostTopMenu(false);
    goBackSubView();
    onToast?.('帖子已删除');
  };

  const handleOpenEditPost = () => {
    if (!activePost) return;
    setManualPostTitle(activePost.title);
    setManualPostContent(activePost.content);
    setShowPostTopMenu(false);
    setShowPostEditModal(true);
  };

  const handleSaveEditPost = () => {
    if (!activeForum || !activePost || !manualPostTitle.trim() || !manualPostContent.trim()) return;
    patchForum(activeForum.id, (prev) => ({
      ...prev,
      posts: prev.posts.map((p) => p.id === activePost.id ? { ...p, title: manualPostTitle.trim(), content: manualPostContent.trim(), editedAt: Date.now() } : p),
      updatedAt: Date.now()
    }));
    setShowPostEditModal(false);
    onToast?.('帖子已更新');
  };

  const handlePullStart = (e: React.TouchEvent) => {
    if (!activeForum || isRefreshing || ai.isGenerating) return;
    if (listRef.current && listRef.current.scrollTop > 0) return;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handlePullMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null || isRefreshing || ai.isGenerating) return;
    const delta = e.touches[0].clientY - touchStartYRef.current;
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }
    if (e.cancelable) {
      e.preventDefault();
    }
    setPullDistance(Math.min(80, delta));
  };

  const handlePullEnd = async () => {
    if (!activeForum || touchStartYRef.current === null || isRefreshing || ai.isGenerating) {
      touchStartYRef.current = null;
      setPullDistance(0);
      return;
    }
    const shouldRefresh = pullDistance >= 60;
    touchStartYRef.current = null;
    setPullDistance(0);
    if (!shouldRefresh) return;
    setIsRefreshing(true);
    try {
      await ai.generateAndInsertPost(activeForum, 'refresh');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (subView === 'forum') {
    return <ForumArchiveView onBack={() => goBackSubView()} onCreate={() => { createForm.resetCreateForm(); pushSubView('forumCreate'); }} forums={forums} onOpenForum={handleOpenForum} />;
  }

  if (subView === 'forumCreate' || subView === 'forumSettings') {
    const isSettings = subView === 'forumSettings';
    return (
      <ForumCreateSettingsView
        isSettings={isSettings}
        onBack={() => goBackSubView()}
        contactOptions={contactOptions}
        masks={masks}
        worldBooks={worldBooks}
        forumNameInput={createForm.forumNameInput}
        onForumNameInputChange={createForm.setForumNameInput}
        selectedContactIds={createForm.selectedContactIds}
        onToggleContactId={createForm.toggleContactId}
        selectedMaskId={createForm.selectedMaskId}
        onSelectedMaskIdChange={createForm.setSelectedMaskId}
        selectedMaskIds={createForm.selectedMaskIds}
        onSelectedMaskIdsChange={createForm.setSelectedMaskIds}
        tagInput={createForm.tagInput}
        onTagInputChange={createForm.setTagInput}
        onAddTag={createForm.addTag}
        tags={createForm.tags}
        onRemoveTag={createForm.removeTag}
        worldviewInput={createForm.worldviewInput}
        onWorldviewInputChange={createForm.setWorldviewInput}
        selectedWorldBookIds={createForm.selectedWorldBookIds}
        onToggleWorldBook={createForm.toggleWorldBook}
        canCreateForum={createForm.canCreateForum}
        isGenerating={ai.isGenerating}
        onCreateForum={handleCreateForum}
        onSaveForumSettings={handleSaveForumSettings}
        onDeleteForum={handleDeleteForum}
      />
    );
  }

  if (subView === 'forumPostDetail' && activePost) {
    return (
      <ForumDetailView
        activeForum={activeForum}
        activePost={activePost}
        currentUserName={currentUserName}
        closeFloatingMenus={closeFloatingMenus}
        onBackToForum={() => goBackSubView()}
        showPostTopMenu={showPostTopMenu}
        onTogglePostTopMenu={() => setShowPostTopMenu((v) => !v)}
        onTogglePinPost={() => {
          if (!activeForum || !activePost) return;
          patchForum(activeForum.id, (prev) => ({
            ...prev,
            posts: prev.posts.map((p) => p.id === activePost.id ? { ...p, pinned: !p.pinned } : p),
            updatedAt: Date.now()
          }));
          setShowPostTopMenu(false);
          onToast?.(activePost.pinned ? '已取消置顶' : '已置顶帖子');
        }}
        onOpenEditPost={handleOpenEditPost}
        onDeletePost={handleDeletePost}
        handlePullStart={handlePullStart}
        handlePullMove={handlePullMove}
        onPullEnd={async () => {
          if (!activeForum || !activePost || ai.isCommentGenerating || touchStartYRef.current === null) {
            touchStartYRef.current = null;
            setPullDistance(0);
            return;
          }
          const shouldRefresh = pullDistance >= 60;
          touchStartYRef.current = null;
          setPullDistance(0);
          if (!shouldRefresh) return;
          ai.setIsCommentGenerating(true);
          try {
            const total = await ai.generateCommentsForPost(activeForum, activePost, { silent: true, skipLoading: true });
            if (total == null) return;
            onToast?.(total > 0 ? `讨论已更新，共 ${total} 条` : '暂时没有新的讨论');
          } finally {
            ai.setIsCommentGenerating(false);
          }
        }}
        pullDistance={pullDistance}
        isCommentGenerating={ai.isCommentGenerating}
        onTogglePostLike={handleTogglePostLike}
        onToggleCommentLike={handleToggleCommentLike}
        onToggleReplyLike={handleToggleReplyLike}
        expandedCommentIds={expandedCommentIds}
        setExpandedCommentIds={setExpandedCommentIds}
        replyTarget={replyTarget}
        setReplyTarget={setReplyTarget}
        replyInputMap={replyInputMap}
        setReplyInputMap={setReplyInputMap}
        onReplyComment={handleReplyComment}
        commentMenuTarget={commentMenuTarget}
        setCommentMenuTarget={setCommentMenuTarget}
        showIdentityMenu={showIdentityMenu}
        setShowIdentityMenu={setShowIdentityMenu}
        renderIdentityMenu={renderIdentityMenu}
        resolveIdentity={doResolveIdentity}
        commentInput={commentInput}
        onCommentInputChange={setCommentInput}
        canManualComment={canManualComment}
        onManualComment={handleManualComment}
        showPostEditModal={showPostEditModal}
        setShowPostEditModal={setShowPostEditModal}
        manualPostTitle={manualPostTitle}
        onManualPostTitleChange={setManualPostTitle}
        manualPostContent={manualPostContent}
        onManualPostContentChange={setManualPostContent}
        onSaveEditPost={handleSaveEditPost}
        onCommentMenuAction={handleCommentMenuAction}
      />
    );
  }

  return (
    <ForumListView
      activeForum={activeForum}
      closeFloatingMenus={closeFloatingMenus}
      onBackToArchive={() => goBackSubView()}
      openForumSettings={openForumSettings}
      categoryTabs={categoryTabs}
      activeCategory={activeCategory}
      setActiveCategory={setActiveCategory}
      listRef={listRef}
      handlePullStart={handlePullStart}
      handlePullMove={handlePullMove}
      handlePullEnd={handlePullEnd}
      pullDistance={pullDistance}
      isRefreshing={isRefreshing}
      visiblePosts={visiblePosts}
      onOpenPostDetail={(postId) => { setActivePostId(postId); pushSubView('forumPostDetail'); }}
      showActionMenu={showActionMenu}
      setShowActionMenu={setShowActionMenu}
      beginCreateByAction={beginCreateByAction}
      showCreateModal={showCreateModal}
      setShowCreateModal={setShowCreateModal}
      createAction={createAction}
      topicInput={topicInput}
      setTopicInput={setTopicInput}
      canCreateNews={canCreateNews}
      isGenerating={ai.isGenerating}
      handleCreateByAction={handleCreateByAction}
      manualPostTitle={manualPostTitle}
      setManualPostTitle={setManualPostTitle}
      manualPostCategory={manualPostCategory}
      setManualPostCategory={setManualPostCategory}
      postCategoryOptions={postCategoryOptions}
      manualPostPinned={manualPostPinned}
      setManualPostPinned={setManualPostPinned}
      manualPostContent={manualPostContent}
      setManualPostContent={setManualPostContent}
      showIdentityMenu={showIdentityMenu}
      setShowIdentityMenu={setShowIdentityMenu}
      renderIdentityMenu={renderIdentityMenu}
      resolveIdentity={doResolveIdentity}
      canManualPost={canManualPost}
    />
  );
};

export default ForumView;
