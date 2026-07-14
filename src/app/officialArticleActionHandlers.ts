import { loadOfficialArticleRuntime } from './officialArticleRuntimeLoader';
import type { OfficialArticleRuntimeOptions } from './officialArticleRuntime';
import type { OfficialArticle, OfficialArticleComment, OfficialCommentContact, StickerImportItem } from './officialArticleTypes';
import { withLoadedRuntime } from './runtimeLoaderUtils';

let manualArticleGenerationPromise: Promise<void> | null = null;
const initialArticleCommentsPromises = new Map<string, Promise<OfficialArticleComment[]>>();
const articleCommentReplyPromises = new Map<string, Promise<{ user: string; text: string; avatar: string } | null>>();

const buildArticleKey = (article: OfficialArticle | null | undefined): string => String(article?.id || '').trim();

const buildArticleReplyKey = (payload: { article: OfficialArticle; commentText: string; contacts: OfficialCommentContact[] }): string => {
  const articleId = buildArticleKey(payload.article);
  const commentText = String(payload.commentText || '').trim();
  const contactIds = (payload.contacts || []).map((contact) => String(contact.id || contact.name || '').trim()).filter(Boolean).join(',');
  return [articleId, commentText, contactIds].join('|');
};

const createHandleOpenOfficialArticle = (options: OfficialArticleRuntimeOptions) => (article: OfficialArticle) => {
  withLoadedRuntime(loadOfficialArticleRuntime, (runtime) => {
    runtime.handleOpenOfficialArticleRuntime(options, article);
  });
};

const createHandleManualGenerateOfficialArticle = (options: OfficialArticleRuntimeOptions) => async () => {
  if (manualArticleGenerationPromise) return manualArticleGenerationPromise;
  manualArticleGenerationPromise = (async () => {
    try {
      const runtime = await loadOfficialArticleRuntime();
      await runtime.handleManualGenerateOfficialArticleRuntime(options);
    } catch (error) {
      console.error('[OfficialArticle] 生成文章失败:', error);
    } finally {
      manualArticleGenerationPromise = null;
    }
  })();
  return manualArticleGenerationPromise;
};

const createHandleGenerateInitialArticleComments = (options: OfficialArticleRuntimeOptions) => async (article: OfficialArticle) => {
  const key = buildArticleKey(article);
  if (!key) return [];
  const existing = initialArticleCommentsPromises.get(key);
  if (existing) return existing;
  const promise = (async () => {
    try {
      const runtime = await loadOfficialArticleRuntime();
      return await runtime.handleGenerateInitialArticleCommentsRuntime(options, article);
    } catch (error) {
      console.error('[OfficialArticle] 生成评论失败:', error);
      return [];
    } finally {
      initialArticleCommentsPromises.delete(key);
    }
  })();
  initialArticleCommentsPromises.set(key, promise);
  return promise;
};

const createHandleGenerateReplyToArticleComment = (options: OfficialArticleRuntimeOptions) => async (
  payload: { article: OfficialArticle; commentText: string; contacts: OfficialCommentContact[] }
) => {
  const key = buildArticleReplyKey(payload);
  if (!buildArticleKey(payload.article) || !String(payload.commentText || '').trim()) return null;
  const existing = articleCommentReplyPromises.get(key);
  if (existing) return existing;
  const promise = (async () => {
    try {
      const runtime = await loadOfficialArticleRuntime();
      return await runtime.handleGenerateReplyToArticleCommentRuntime(options, payload);
    } catch (error) {
      console.error('[OfficialArticle] 生成回复失败:', error);
      return null;
    } finally {
      articleCommentReplyPromises.delete(key);
    }
  })();
  articleCommentReplyPromises.set(key, promise);
  return promise;
};

const createHandleOfficialArticleCommentsChange = (options: OfficialArticleRuntimeOptions) => (nextComments: OfficialArticleComment[]) => {
  withLoadedRuntime(loadOfficialArticleRuntime, (runtime) => {
    runtime.handleOfficialArticleCommentsChangeRuntime(options, nextComments);
  });
};

const createHandleDeleteCurrentOfficialArticle = (options: OfficialArticleRuntimeOptions) => () => {
  withLoadedRuntime(loadOfficialArticleRuntime, (runtime) => {
    runtime.handleDeleteCurrentOfficialArticleRuntime(options);
  });
};

const createHandleContactPickerConfirm = (options: OfficialArticleRuntimeOptions) => (ids: string[]) => {
  withLoadedRuntime(loadOfficialArticleRuntime, (runtime) => {
    runtime.handleContactPickerConfirmRuntime(options, ids);
  });
};

const createHandleStickerImportConfirm = (options: OfficialArticleRuntimeOptions) => (stickers: StickerImportItem[]) => {
  withLoadedRuntime(loadOfficialArticleRuntime, (runtime) => {
    runtime.handleStickerImportConfirmRuntime(options, stickers);
  });
};

export const buildOfficialArticleActionHandlers = (options: OfficialArticleRuntimeOptions) => ({
  handleOpenOfficialArticle: createHandleOpenOfficialArticle(options),
  handleManualGenerateOfficialArticle: createHandleManualGenerateOfficialArticle(options),
  handleGenerateInitialArticleComments: createHandleGenerateInitialArticleComments(options),
  handleGenerateReplyToArticleComment: createHandleGenerateReplyToArticleComment(options),
  handleOfficialArticleCommentsChange: createHandleOfficialArticleCommentsChange(options),
  handleDeleteCurrentOfficialArticle: createHandleDeleteCurrentOfficialArticle(options),
  handleContactPickerConfirm: createHandleContactPickerConfirm(options),
  handleStickerImportConfirm: createHandleStickerImportConfirm(options)
});
