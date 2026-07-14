import type { AISettings } from '../types/index.ts';
import { extractStrictJsonObject } from '../utils/chat/aiReplyParser.ts';
import { normalizeGeneratedStrictNonSystemEventText } from '../utils/generatedVisibleText.ts';
import {
  buildOfficialArticleQualityLines,
  buildSocialInteractionQualityLines
} from '../utils/prompt/socialInteractionQualityPrompt.ts';

type ContactPoolItem = { id: string; name: string; avatar: string };
type ArticleLike = { title?: string; desc?: string };
type ContactCandidate = { id: string; name: string; remark?: string; avatar?: string; isGroup?: boolean };
type RichContactCandidate = ContactCandidate & { allowRichActions?: boolean };

type GetChatReply = (
  messages: Array<{ role: 'user' | 'model'; text: string }>,
  systemInstruction: string,
  settings: AISettings,
  runtimeUserPrompt?: string
) => Promise<string>;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const hasOnlyAllowedKeys = (value: unknown, allowedKeys: readonly string[]): value is Record<string, unknown> => (
  isRecord(value) && Object.keys(value).every((key) => allowedKeys.includes(key))
);

const normalizeOfficialGeneratedText = (
  value: unknown,
  options: { joinWith?: string; collapseWhitespace?: boolean } = {}
): string => {
  return normalizeGeneratedStrictNonSystemEventText(value, options);
};

const toCommentPool = (contacts: ContactCandidate[], maxCount: number): ContactPoolItem[] =>
  contacts
    .filter((c) => c.id !== 'officialAccounts' && !c.isGroup)
    .slice(0, maxCount)
    .map((c) => ({ id: c.id, name: (c.remark?.trim() || c.name || '').trim(), avatar: c.avatar || '' }))
    .filter((c) => c.name);

const buildRuntimePrompt = (
  pool: ContactPoolItem[],
  runtimeUserPromptBase: string,
  buildRuntimePromptWithMemory: (contact: ContactCandidate, limit?: number) => string
): string => {
  const sampledPool = pool.slice(0, 3);
  const poolMemoryBlocks = sampledPool
    .map((member) => {
      return buildRuntimePromptWithMemory(member, 4);
    })
    .filter(Boolean);
  return [runtimeUserPromptBase, ...poolMemoryBlocks].filter(Boolean).join('\n\n');
};

export const generateOfficialArticleInitialComments = async (params: {
  article: ArticleLike | null | undefined;
  contacts: ContactCandidate[];
  runtimeUserPromptBase: string;
  aiSettings: AISettings;
  getChatReply: GetChatReply;
  buildRuntimePromptWithMemory: (contact: ContactCandidate, limit?: number) => string;
}): Promise<any[]> => {
  const { article, contacts, runtimeUserPromptBase, aiSettings, getChatReply, buildRuntimePromptWithMemory } = params;
  const current = article;
  if (!current?.title || !current?.desc) return [];
  const pool = toCommentPool(contacts, 8);
  if (pool.length === 0) return [];
  const requiredCommentCount = Math.min(5, pool.length);

  const runtimeUserPrompt = buildRuntimePrompt(
    pool,
    runtimeUserPromptBase,
    buildRuntimePromptWithMemory
  );

  const interactionQualityLines = buildSocialInteractionQualityLines({ linePrefix: '- ' }).join('\n');
  const systemInstruction = `你是评论生成助手。请基于订阅号文章内容，生成真实、简短、自然的评论。
【评论互动质量】
${interactionQualityLines}
规则：
1) 只返回 JSON，不要任何解释。
2) 仅从给定联系人池中选择评论用户，user 必须与联系人名称一致。
3) 生成 ${requiredCommentCount} 条一级评论，每条 12-45 字。
4) 风格口语化，避免模板化与营销腔。
5) 输出结构：{"comments":[{"user":"联系人名","text":"评论内容"}]}`;
  const prompt = `文章标题：${current.title}\n文章正文：${current.desc}\n联系人池：${JSON.stringify(pool.map((p) => p.name))}`;

  const text = await getChatReply([{ role: 'user', text: prompt }], systemInstruction, aiSettings, runtimeUserPrompt);
  const parsed = extractStrictJsonObject(text);
  if (!hasOnlyAllowedKeys(parsed, ['comments'])) return [];
  const generated = Array.isArray(parsed?.comments) ? parsed.comments : [];

  const normalized = generated
    .map((item, idx: number) => {
      if (!hasOnlyAllowedKeys(item, ['user', 'text'])) return null;
      const name = normalizeOfficialGeneratedText(item.user, { collapseWhitespace: true });
      const hit = pool.find((p) => p.name === name);
      if (!hit) return null;
      const body = normalizeOfficialGeneratedText(item.text, { collapseWhitespace: true });
      if (!body) return null;
      return {
        id: `${Date.now()}-ai-cmt-${idx}`,
        user: hit.name,
        avatar: hit.avatar,
        text: body,
        time: Date.now(),
        likes: Math.floor(Math.random() * 6),
        replies: []
      };
    })
    .filter(Boolean);
  return normalized.length === requiredCommentCount ? normalized : [];
};

export const generateOfficialArticleCommentReply = async (params: {
  article: ArticleLike | null | undefined;
  commentText: string;
  contacts: ContactCandidate[];
  runtimeUserPromptBase: string;
  aiSettings: AISettings;
  getChatReply: GetChatReply;
  buildRuntimePromptWithMemory: (contact: ContactCandidate, limit?: number) => string;
}): Promise<{ user: string; text: string; avatar: string } | null> => {
  const { article, commentText, contacts, runtimeUserPromptBase, aiSettings, getChatReply, buildRuntimePromptWithMemory } = params;
  const current = article;
  if (!current?.title || !current?.desc || !commentText) return null;

  const pool = toCommentPool(contacts, 10);
  if (pool.length === 0) return null;

  const runtimeUserPrompt = buildRuntimePrompt(
    pool,
    runtimeUserPromptBase,
    buildRuntimePromptWithMemory
  );

  const interactionQualityLines = buildSocialInteractionQualityLines({ linePrefix: '- ' }).join('\n');
  const systemInstruction = `你是订阅号评论区互动助手。请基于文章内容与用户评论，生成一条“联系人对用户评论的楼中楼回复”。
【评论互动质量】
${interactionQualityLines}
规则：
1) 只返回 JSON，不要解释。
2) user 必须从给定联系人池中选择，且不要使用“我/作者/系统/群聊”。
3) text 为 10-40 字，自然口语化，不要模板腔。
4) 必须是针对用户评论的回应，不要复读原文。
5) 输出结构：{"user":"联系人名","text":"回复内容"}`;
  const prompt = `文章标题：${current.title}\n文章正文：${current.desc}\n用户评论：${commentText}\n联系人池：${JSON.stringify(pool.map((p) => p.name))}`;

  const text = await getChatReply([{ role: 'user', text: prompt }], systemInstruction, aiSettings, runtimeUserPrompt);
  const parsed = extractStrictJsonObject(text);
  if (!hasOnlyAllowedKeys(parsed, ['user', 'text'])) return null;
  const name = normalizeOfficialGeneratedText(parsed.user, { collapseWhitespace: true });
  const body = normalizeOfficialGeneratedText(parsed?.text, { collapseWhitespace: true });
  const hit = pool.find((p) => p.name === name);
  if (!hit || !body) return null;
  return { user: hit.name, text: body, avatar: hit.avatar };
};

export const generateOfficialArticleDraft = async (params: {
  contacts: RichContactCandidate[];
  lastAuthorId?: string | null;
  aiSettings: AISettings;
  getChatReply: GetChatReply;
  sanitizeTitle: (raw: string) => string;
  sanitizeText: (raw: string) => string;
  buildContactPersonaSummary: (contact: RichContactCandidate) => string;
  buildRuntimePromptWithMemory: (contact: RichContactCandidate, limit?: number) => string;
}): Promise<{ authorId: string; article: { id: string; title: string; desc: string; thumb: string; author: string; avatar?: string; time: number } } | null> => {
  const {
    contacts,
    lastAuthorId,
    aiSettings,
    getChatReply,
    sanitizeTitle,
    sanitizeText,
    buildContactPersonaSummary,
    buildRuntimePromptWithMemory
  } = params;

  const sourceContacts = contacts.filter((c) => c.allowRichActions && !c.isGroup);
  if (sourceContacts.length === 0) return null;

  const candidates = sourceContacts.length > 1 ? sourceContacts.filter((c) => c.id !== lastAuthorId) : sourceContacts;
  const author = candidates[Math.floor(Math.random() * candidates.length)];
  if (!author) return null;

  const authorName = author.remark?.trim() || author.name;
  const persona = buildContactPersonaSummary(author);
  const runtimeUserPrompt = buildRuntimePromptWithMemory(author, 10);
  const articleQualityLines = buildOfficialArticleQualityLines({ linePrefix: '- ' }).join('\n');
  const systemInstruction = `你扮演「${authorName}」。${persona ? `角色设定：${persona}。` : ''}
请基于该角色人设生成一篇高质量订阅号文章：
【订阅号文章质量】
${articleQualityLines}
1) 标题要具体、有信息密度、有吸引力，不做标题党；
2) 正文必须是可直接发布的完整成稿，建议 500-900 字，包含明确观点、关键细节与可执行结论；
3) 正文结构建议：开头引入问题/场景 → 中间分点展开（2-4 点）→ 结尾总结与行动建议；
4) 语言自然、有人味，避免空话套话、营销腔、AI 味；
5) 正文必须使用纯文本，不要使用 Markdown（禁止标题符号、加粗斜体、代码标记、引用和列表符号等）；
6) 正文使用自然分段，段落之间用换行分隔；
7) 严禁输出解释性文字。
你必须只输出一个 JSON 对象，不要输出任何额外文本：{"title":"标题","content":"正文"}`;

  const text = await getChatReply(
    [{ role: 'user', text: '请生成订阅号标题与正文成稿' }],
    systemInstruction,
    aiSettings,
    runtimeUserPrompt
  );
  const parsedJson = extractStrictJsonObject(text);
  if (!hasOnlyAllowedKeys(parsedJson, ['title', 'content'])) return null;
  const title = sanitizeTitle(normalizeOfficialGeneratedText(parsedJson?.title, { collapseWhitespace: true }));
  const desc = sanitizeText(normalizeOfficialGeneratedText(parsedJson?.content, { joinWith: '\n' }));
  if (!title || !desc) return null;

  return {
    authorId: author.id,
    article: {
      id: `${Date.now()}-manual-oa`,
      title,
      desc,
      thumb: '',
      author: authorName,
      avatar: author.avatar,
      time: Date.now()
    }
  };
};
