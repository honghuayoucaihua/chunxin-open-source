import type { AISettings, Contact, UserProfile } from '../types';
import { extractStrictJsonObjectLazy } from '../utils/chatParserLoader.ts';
import { normalizeGeneratedStrictNonSystemEventText } from '../utils/generatedVisibleText.ts';
import { buildMailboxReplyQualityLines } from '../utils/prompt/mailboxReplyQualityPrompt.ts';

type GetChatReply = (
  messages: Array<{ role: 'user' | 'model'; text: string }>,
  systemInstruction: string,
  settings: AISettings,
  runtimeUserPrompt?: string
) => Promise<string>;

type MailboxReplyGenerationInput = {
  to: Contact;
  user: UserProfile;
  subject: string;
  content: string;
  date: string;
  aiSettings: AISettings;
  runtimeUserPromptBase: string;
  getChatReply: GetChatReply;
  buildUserPersonaSummary: (user: UserProfile) => string;
  buildContactPersonaSummary: (contact: Contact) => string;
};

type MailboxUserPersonaProfile = UserProfile & Partial<{
  persona: string;
  background: string;
  expressionStyle: string;
  styleFeatures: string;
  speakingStyle: string;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const validateMailboxReplyPayload = (payload: unknown): Record<string, unknown> => {
  if (!isRecord(payload)) return {};
  const allowedKeys = new Set(['content', 'blessing']);
  if (Object.keys(payload).some((key) => !allowedKeys.has(key))) {
    throw new Error('AI 回信 JSON 包含不支持字段');
  }
  if (typeof payload.content !== 'string') {
    throw new Error('AI 回信 content 必须是字符串');
  }
  if (typeof payload.blessing !== 'string') {
    throw new Error('AI 回信 blessing 必须是字符串');
  }
  return payload;
};

const normalizeMailboxReplyField = (value: unknown): string => {
  return normalizeGeneratedStrictNonSystemEventText(value, { joinWith: '\n' });
};

const buildMailboxInputPrompt = (
  input: MailboxReplyGenerationInput,
  personaSummaryLines: string,
  userPersonaFull: Record<string, unknown>,
  contactPersonaFull: Record<string, unknown>
): string => {
  const letterLines = [
    input.subject.trim() ? `来信主题：${input.subject.trim()}` : '',
    `来信内容：${input.content}`,
    input.user.name?.trim() ? `写信人：${input.user.name.trim()}` : '',
    input.date.trim() ? `日期：${input.date.trim()}` : ''
  ].filter(Boolean);
  return [
    '收到来信，请回信。',
    letterLines.join('\n'),
    personaSummaryLines,
    `用户完整人设(JSON)：\n${JSON.stringify(userPersonaFull, null, 2)}`,
    `联系人完整人设(JSON)：\n${JSON.stringify(contactPersonaFull, null, 2)}`
  ].filter(Boolean).join('\n\n');
};

export const generateMailboxReplyText = async (input: MailboxReplyGenerationInput) => {
  const roleName = input.to.remark?.trim() || input.to.name;
  const userPersonaSummary = input.buildUserPersonaSummary(input.user);
  const contactPersonaSummary = input.buildContactPersonaSummary(input.to);
  const userProfile = input.user as MailboxUserPersonaProfile;
  const userPersonaFull = {
    name: userProfile.name,
    wechatId: userProfile.wechatId,
    gender: userProfile.gender,
    age: userProfile.age,
    mbti: userProfile.mbti,
    occupation: userProfile.occupation,
    region: userProfile.region,
    hobbies: userProfile.hobbies,
    signature: userProfile.signature,
    description: userProfile.description,
    status: userProfile.status,
    persona: userProfile.persona,
    background: userProfile.background,
    expressionStyle: userProfile.expressionStyle,
    styleFeatures: userProfile.styleFeatures,
    speakingStyle: userProfile.speakingStyle
  };
  const contactPersonaFull = {
    id: input.to.id,
    name: input.to.name,
    remark: input.to.remark,
    gender: input.to.gender,
    age: input.to.age,
    constellation: input.to.constellation,
    mbti: input.to.mbti,
    occupation: input.to.occupation,
    relationship: input.to.relationship,
    personalityTraits: input.to.personalityTraits,
    hobbies: input.to.hobbies,
    description: input.to.description,
    catchphrase: input.to.catchphrase,
    region: input.to.region,
    signature: input.to.signature,
    persona: input.to.persona,
    background: input.to.background,
    expressionStyle: input.to.expressionStyle,
    userPersona: input.to.userPersona,
    personality: input.to.personality,
    status: input.to.status
  };
  const qualityRules = buildMailboxReplyQualityLines({ linePrefix: '- ' }).join('\n');
  const systemInstruction = `你正在扮演联系人「${roleName}」，请基于“完整人设”回信，语气自然、有温度，避免模板化。

【回信质量规则】
${qualityRules}

只输出 JSON：{"content":"回信正文","blessing":"祝语"}。`;
  const personaSummaryLines = [
    userPersonaSummary ? `用户人设摘要：${userPersonaSummary}` : '',
    contactPersonaSummary ? `联系人人设摘要：${contactPersonaSummary}` : ''
  ].filter(Boolean).join('\n');
  const prompt = buildMailboxInputPrompt(input, personaSummaryLines, userPersonaFull, contactPersonaFull);
  const raw = await input.getChatReply(
    [{ role: 'user', text: prompt }],
    systemInstruction,
    input.aiSettings,
    input.runtimeUserPromptBase
  );
  const parsed = validateMailboxReplyPayload(await extractStrictJsonObjectLazy(raw));
  const nextContent = normalizeMailboxReplyField(parsed.content);
  const nextBlessing = normalizeMailboxReplyField(parsed.blessing);
  if (!nextContent) throw new Error('AI 回信正文为空');
  if (!nextBlessing) throw new Error('AI 回信祝语为空');
  return { content: nextContent, blessing: nextBlessing };
};
