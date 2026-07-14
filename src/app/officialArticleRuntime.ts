import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { AISettings, Contact, SubView } from '../types';
import { buildContactPersonaSummary } from '../services/personaSummary';
import {
  applyContactPickerConfirm,
  applyOfficialArticleCommentsChange,
  applyStickerImportConfirm,
  deleteCurrentOfficialArticle,
  openOfficialArticle,
  runGenerateInitialArticleComments,
  runGenerateReplyToArticleComment,
  runManualGenerateOfficialArticle
} from './officialArticleFlow';
import {
  generateOfficialArticleCommentReply,
  generateOfficialArticleDraft,
  generateOfficialArticleInitialComments
} from './officialArticleAiUtilsLoader';
import type { OfficialArticle, OfficialArticleComment, OfficialCommentContact, StickerImportItem } from './officialArticleTypes';

export type OfficialArticleRuntimeOptions = {
  contacts: Contact[];
  lastAuthorIdRef: MutableRefObject<string | null>;
  aiSettings: AISettings;
  getChatReply: (
    messages: Array<{ role: 'user' | 'model'; text: string }>,
    systemInstruction: string,
    settings: AISettings,
    runtimeUserPrompt?: string
  ) => Promise<string>;
  sanitizeGeneratedArticleTitle: (title: string) => string;
  sanitizeGeneratedArticleText: (text: string) => string;
  buildRuntimePromptWithMemory: (contact: Contact, limit?: number) => string;
  setOfficialArticles: Dispatch<SetStateAction<OfficialArticle[]>>;
  runtimeUserPromptBase: string;
  pushSubView: (next: SubView) => void;
  goBackSubView: () => void;
};

const resolveRuntimeContactForPrompt = (
  options: OfficialArticleRuntimeOptions,
  contact: OfficialCommentContact
): Contact => {
  const matched = options.contacts.find((item) => item.id === contact.id);
  if (matched) return matched;
  return {
    id: contact.id,
    name: contact.name,
    remark: contact.remark,
    avatar: contact.avatar || '',
    pinyin: '',
    unreadCount: 0,
    isGroup: contact.isGroup
  };
};

export const handleOpenOfficialArticleRuntime = (options: OfficialArticleRuntimeOptions, article: OfficialArticle) => {
  openOfficialArticle(article, options.pushSubView);
};

export const handleManualGenerateOfficialArticleRuntime = async (options: OfficialArticleRuntimeOptions) => {
  await runManualGenerateOfficialArticle({
    contacts: options.contacts,
    lastAuthorIdRef: options.lastAuthorIdRef,
    aiSettings: options.aiSettings,
    getChatReply: options.getChatReply,
    sanitizeGeneratedArticleTitle: options.sanitizeGeneratedArticleTitle,
    sanitizeGeneratedArticleText: options.sanitizeGeneratedArticleText,
    buildContactPersonaSummary: (contact: Contact) => buildContactPersonaSummary(contact),
    buildRuntimePromptWithMemory: options.buildRuntimePromptWithMemory,
    setOfficialArticles: options.setOfficialArticles,
    generateOfficialArticleDraft
  } as unknown as Parameters<typeof runManualGenerateOfficialArticle>[0]);
};

export const handleGenerateInitialArticleCommentsRuntime = async (
  options: OfficialArticleRuntimeOptions,
  article: OfficialArticle
) => {
  return runGenerateInitialArticleComments({
    contacts: options.contacts,
    runtimeUserPromptBase: options.runtimeUserPromptBase,
    aiSettings: options.aiSettings,
    getChatReply: options.getChatReply,
    buildRuntimePromptWithMemory: (contact, limit) => options.buildRuntimePromptWithMemory(resolveRuntimeContactForPrompt(options, contact), limit),
    generateOfficialArticleInitialComments
  }, article);
};

export const handleGenerateReplyToArticleCommentRuntime = async (
  options: OfficialArticleRuntimeOptions,
  payload: { article: OfficialArticle; commentText: string; contacts: OfficialCommentContact[] }
) => {
  return runGenerateReplyToArticleComment({
    runtimeUserPromptBase: options.runtimeUserPromptBase,
    aiSettings: options.aiSettings,
    getChatReply: options.getChatReply,
    buildRuntimePromptWithMemory: (contact, limit) => options.buildRuntimePromptWithMemory(resolveRuntimeContactForPrompt(options, contact), limit),
    generateOfficialArticleCommentReply
  }, { article: payload.article, commentText: payload.commentText, contacts: payload.contacts || [] });
};

export const handleOfficialArticleCommentsChangeRuntime = (
  options: OfficialArticleRuntimeOptions,
  nextComments: OfficialArticleComment[]
) => {
  applyOfficialArticleCommentsChange(options.setOfficialArticles, nextComments);
};

export const handleDeleteCurrentOfficialArticleRuntime = (options: OfficialArticleRuntimeOptions) => {
  deleteCurrentOfficialArticle(options.setOfficialArticles, options.goBackSubView);
};

export const handleContactPickerConfirmRuntime = (options: OfficialArticleRuntimeOptions, ids: string[]) => {
  applyContactPickerConfirm(ids, options.goBackSubView);
};

export const handleStickerImportConfirmRuntime = (options: OfficialArticleRuntimeOptions, stickers: StickerImportItem[]) => {
  applyStickerImportConfirm(stickers, options.goBackSubView);
};
