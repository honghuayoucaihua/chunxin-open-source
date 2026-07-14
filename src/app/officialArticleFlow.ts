import type { Contact, SubView, AISettings } from '../types';
import type { OfficialArticle, OfficialArticleComment, OfficialCommentContact, StickerImportItem } from './officialArticleTypes';
import { captureRuntimeResetEpoch, isRuntimeResetEpochStale } from '../services/runtimeResetGuard.ts';

type OfficialArticleWindow = Window & {
  currentArticle?: OfficialArticle;
  selectedContacts?: string[];
  newStickers?: StickerImportItem[];
};

type GetChatReply = (
  messages: Array<{ role: 'user' | 'model'; text: string }>,
  systemInstruction: string,
  settings: AISettings,
  runtimeUserPrompt?: string
) => Promise<string>;

type ManualGenerateOfficialArticleParams = {
  contacts: Contact[];
  lastAuthorIdRef: { current: string | null };
  aiSettings: AISettings;
  getChatReply: GetChatReply;
  sanitizeGeneratedArticleTitle: (title: string) => string;
  sanitizeGeneratedArticleText: (text: string) => string;
  buildContactPersonaSummary: (contact: Contact) => string;
  buildRuntimePromptWithMemory: (contact: Contact, limit?: number) => string;
  setOfficialArticles: React.Dispatch<React.SetStateAction<OfficialArticle[]>>;
  generateOfficialArticleDraft: (params: {
    contacts: Contact[];
    lastAuthorId?: string | null;
    aiSettings: AISettings;
    getChatReply: GetChatReply;
    sanitizeTitle: (raw: string) => string;
    sanitizeText: (raw: string) => string;
    buildContactPersonaSummary: (contact: Contact) => string;
    buildRuntimePromptWithMemory: (contact: Contact, limit?: number) => string;
  }) => Promise<{ authorId: string; article: OfficialArticle } | null>;
};

type GenerateInitialArticleCommentsParams = {
  contacts: Contact[];
  runtimeUserPromptBase: string;
  aiSettings: AISettings;
  getChatReply: GetChatReply;
  generateOfficialArticleInitialComments: (params: {
    article: OfficialArticle | null | undefined;
    contacts: Contact[];
    runtimeUserPromptBase: string;
    aiSettings: AISettings;
    getChatReply: GetChatReply;
    buildRuntimePromptWithMemory: (contact: OfficialCommentContact, limit?: number) => string;
  }) => Promise<OfficialArticleComment[]>;
  buildRuntimePromptWithMemory: (contact: OfficialCommentContact, limit?: number) => string;
};

type GenerateReplyToArticleCommentParams = Omit<GenerateInitialArticleCommentsParams, 'contacts' | 'generateOfficialArticleInitialComments'> & {
  generateOfficialArticleCommentReply: (params: {
    article: OfficialArticle | null | undefined;
    commentText: string;
    contacts: OfficialCommentContact[];
    runtimeUserPromptBase: string;
    aiSettings: AISettings;
    getChatReply: GetChatReply;
    buildRuntimePromptWithMemory: (contact: OfficialCommentContact, limit?: number) => string;
  }) => Promise<{ user: string; text: string; avatar: string } | null>;
  buildRuntimePromptWithMemory: (contact: OfficialCommentContact, limit?: number) => string;
};

const officialArticleWindow = (): OfficialArticleWindow => window as OfficialArticleWindow;

export const openOfficialArticle = (article: OfficialArticle, pushSubView: (subView: SubView) => void): void => {
  officialArticleWindow().currentArticle = article;
  pushSubView('articleDetail');
};

export const runManualGenerateOfficialArticle = async (params: ManualGenerateOfficialArticleParams): Promise<void> => {
  const runtimeResetEpoch = captureRuntimeResetEpoch();
  const generated = await params.generateOfficialArticleDraft({
    contacts: params.contacts,
    lastAuthorId: params.lastAuthorIdRef.current,
    aiSettings: params.aiSettings,
    getChatReply: params.getChatReply,
    sanitizeTitle: params.sanitizeGeneratedArticleTitle,
    sanitizeText: params.sanitizeGeneratedArticleText,
    buildContactPersonaSummary: params.buildContactPersonaSummary,
    buildRuntimePromptWithMemory: params.buildRuntimePromptWithMemory
  });
  if (isRuntimeResetEpochStale(runtimeResetEpoch)) return;
  if (!generated) return;
  params.lastAuthorIdRef.current = generated.authorId;
  params.setOfficialArticles((prev) => [generated.article, ...prev]);
};

export const runGenerateInitialArticleComments = async (
  params: GenerateInitialArticleCommentsParams,
  article: OfficialArticle | null | undefined
): Promise<OfficialArticleComment[]> => {
  const runtimeResetEpoch = captureRuntimeResetEpoch();
  const current = article || officialArticleWindow().currentArticle;
  const generated = await params.generateOfficialArticleInitialComments({
    article: current,
    contacts: params.contacts,
    runtimeUserPromptBase: params.runtimeUserPromptBase,
    aiSettings: params.aiSettings,
    getChatReply: params.getChatReply,
    buildRuntimePromptWithMemory: params.buildRuntimePromptWithMemory
  });
  if (isRuntimeResetEpochStale(runtimeResetEpoch)) return [];
  return generated;
};

export const runGenerateReplyToArticleComment = async (
  params: GenerateReplyToArticleCommentParams,
  payload: { article: OfficialArticle | null | undefined; commentText: string; contacts: OfficialCommentContact[] }
): Promise<{ user: string; text: string; avatar: string } | null> => {
  const runtimeResetEpoch = captureRuntimeResetEpoch();
  const current = payload.article || officialArticleWindow().currentArticle;
  const generated = await params.generateOfficialArticleCommentReply({
    article: current,
    commentText: payload.commentText,
    contacts: payload.contacts || [],
    runtimeUserPromptBase: params.runtimeUserPromptBase,
    aiSettings: params.aiSettings,
    getChatReply: params.getChatReply,
    buildRuntimePromptWithMemory: params.buildRuntimePromptWithMemory
  });
  if (isRuntimeResetEpochStale(runtimeResetEpoch)) return null;
  return generated;
};

export const applyOfficialArticleCommentsChange = (
  setOfficialArticles: React.Dispatch<React.SetStateAction<OfficialArticle[]>>,
  nextComments: OfficialArticleComment[]
): void => {
  const current = officialArticleWindow().currentArticle;
  if (!current?.id) return;
  let matchedArticle: OfficialArticle | null = null;
  setOfficialArticles((prev) => prev.map((article) => {
    if (article.id !== current.id) return article;
    matchedArticle = { ...article, comments: nextComments };
    return matchedArticle;
  }));
  if (matchedArticle) {
    officialArticleWindow().currentArticle = matchedArticle;
    return;
  }
  delete officialArticleWindow().currentArticle;
};

export const deleteCurrentOfficialArticle = (
  setOfficialArticles: React.Dispatch<React.SetStateAction<OfficialArticle[]>>,
  goBackSubView: () => void
): void => {
  const current = officialArticleWindow().currentArticle;
  if (!current) return;
  setOfficialArticles((prev) => prev.filter(article => article.id !== current.id));
  delete officialArticleWindow().currentArticle;
  goBackSubView();
};

export const applyContactPickerConfirm = (ids: string[], goBackSubView: () => void): void => {
  officialArticleWindow().selectedContacts = ids;
  goBackSubView();
};

export const applyStickerImportConfirm = (stickers: StickerImportItem[], goBackSubView: () => void): void => {
  officialArticleWindow().newStickers = stickers;
  goBackSubView();
};
