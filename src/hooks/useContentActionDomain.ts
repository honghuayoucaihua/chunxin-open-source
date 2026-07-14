import { getGeminiChatReply } from '../services/geminiServiceLoader';
import { buildOfficialArticleActionHandlers } from '../app/officialArticleActionHandlers';
import {
  sanitizeGeneratedArticleText,
  sanitizeGeneratedArticleTitle
} from '../appBootstrapUtils';
import type { UseAppActionHandlersParams } from './appActionHandlersTypes';

export const useContentActionDomain = (params: UseAppActionHandlersParams) => {
  const {
    state: s,
    runtimeUserPromptBase,
    buildRuntimePromptWithMemory
  } = params;

  const {
    handleOpenOfficialArticle,
    handleManualGenerateOfficialArticle,
    handleGenerateInitialArticleComments,
    handleGenerateReplyToArticleComment,
    handleOfficialArticleCommentsChange,
    handleDeleteCurrentOfficialArticle,
    handleContactPickerConfirm,
    handleStickerImportConfirm
  } = buildOfficialArticleActionHandlers({
    contacts: s.contacts,
    lastAuthorIdRef: s.lastOfficialAuthorIdRef,
    aiSettings: s.aiSettings,
    getChatReply: getGeminiChatReply,
    sanitizeGeneratedArticleTitle,
    sanitizeGeneratedArticleText,
    buildRuntimePromptWithMemory,
    setOfficialArticles: s.setOfficialArticles,
    runtimeUserPromptBase,
    pushSubView: s.pushSubView,
    goBackSubView: s.goBackSubView
  });

  return {
    handleOpenOfficialArticle,
    handleManualGenerateOfficialArticle,
    handleGenerateInitialArticleComments,
    handleGenerateReplyToArticleComment,
    handleOfficialArticleCommentsChange,
    handleDeleteCurrentOfficialArticle,
    handleContactPickerConfirm,
    handleStickerImportConfirm
  };
};
