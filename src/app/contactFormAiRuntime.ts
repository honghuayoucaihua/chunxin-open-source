import type { AISettings, UserProfile } from '../types/index.ts';
import type { ContactFormData } from '../utils/UtilsSubPages';
import { extractStrictJsonObject } from '../utils/chat/aiReplyParser.ts';
import { normalizeGeneratedStrictNonSystemEventText } from '../utils/generatedVisibleText.ts';
import { buildRuntimeUserPersonaPrompt } from '../services/personaSummary.ts';
import { buildChatOpeningQualityLines } from '../utils/prompt/chatEntryQualityPrompt.ts';
import { toContactFormPatch } from './contactFormPatchUtils.ts';

const CONTACT_OPENING_QUALITY_LINES = buildChatOpeningQualityLines({ linePrefix: '- ' }).join('\n');

const cleanGeneratedPatchText = (value: unknown): string => normalizeGeneratedStrictNonSystemEventText(value, { collapseWhitespace: true });
const cleanGeneratedOpeningText = (value: unknown): string => cleanGeneratedPatchText(value);

const cleanGeneratedContactFormPatch = (patch: Partial<ContactFormData>): Partial<ContactFormData> => ({
  ...patch,
  name: cleanGeneratedPatchText(patch.name),
  remark: cleanGeneratedPatchText(patch.remark),
  occupation: cleanGeneratedPatchText(patch.occupation),
  relationship: cleanGeneratedPatchText(patch.relationship),
  personalityTraits: cleanGeneratedPatchText(patch.personalityTraits),
  hobbies: cleanGeneratedPatchText(patch.hobbies),
  description: cleanGeneratedPatchText(patch.description),
  catchphrase: cleanGeneratedPatchText(patch.catchphrase),
  patDesc: cleanGeneratedPatchText(patch.patDesc),
  openingLine: cleanGeneratedOpeningText(patch.openingLine),
  persona: normalizeGeneratedStrictNonSystemEventText(patch.persona, { joinWith: '\n' }),
  background: normalizeGeneratedStrictNonSystemEventText(patch.background, { joinWith: '\n' }),
  expressionStyle: cleanGeneratedPatchText(patch.expressionStyle),
  region: cleanGeneratedPatchText(patch.region),
  signature: cleanGeneratedPatchText(patch.signature)
});

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const CONTACT_FORM_AI_ALLOWED_KEYS = new Set([
  'name',
  'remark',
  'wechatId',
  'age',
  'gender',
  'constellation',
  'mbti',
  'occupation',
  'relationship',
  'personalityTraits',
  'hobbies',
  'description',
  'catchphrase',
  'patDesc',
  'openingLine',
  'persona',
  'background',
  'expressionStyle',
  'region',
  'signature',
  'avatar',
  'balance',
  'sentenceRangeMin',
  'sentenceRangeMax',
  'replyLimit',
  'allowRichActions',
  'socialPostLimit',
  'minimaxTTSEnabled',
  'minimaxVoiceId',
  'minimaxSpeed',
  'minimaxLanguage',
  'language',
  'translateToChinese'
]);

const CONTACT_FORM_AI_TEXT_KEYS = new Set([
  'name',
  'remark',
  'wechatId',
  'gender',
  'constellation',
  'mbti',
  'occupation',
  'relationship',
  'personalityTraits',
  'hobbies',
  'description',
  'catchphrase',
  'patDesc',
  'openingLine',
  'persona',
  'background',
  'expressionStyle',
  'region',
  'signature',
  'avatar',
  'minimaxVoiceId',
  'minimaxLanguage',
  'language'
]);

const validateContactFormAiPayload = (parsed: unknown): Record<string, unknown> => {
  if (!isRecord(parsed)) {
    throw new Error('AI 未返回有效联系人 JSON');
  }
  if ('firstMessage' in parsed) {
    throw new Error('AI 联系人 JSON 不应使用 firstMessage 旧字段');
  }
  if ('personality' in parsed) {
    throw new Error('AI 联系人 JSON 不应使用 personality 旧字段');
  }
  const unsupportedKey = Object.keys(parsed).find((key) => !CONTACT_FORM_AI_ALLOWED_KEYS.has(key));
  if (unsupportedKey) {
    throw new Error(`AI 联系人 JSON 包含不支持字段 ${unsupportedKey}`);
  }
  const invalidTextKey = Object.keys(parsed).find((key) => (
    CONTACT_FORM_AI_TEXT_KEYS.has(key)
    && parsed[key] !== undefined
    && parsed[key] !== null
    && typeof parsed[key] !== 'string'
  ));
  if (invalidTextKey) {
    throw new Error(`AI 联系人 JSON 字段 ${invalidTextKey} 必须是字符串`);
  }
  if (!cleanGeneratedPatchText(parsed.name).trim()) {
    throw new Error('AI 联系人 JSON 缺少 name 字段');
  }
  const gender = String(parsed.gender || '').trim();
  if (gender !== 'male' && gender !== 'female' && gender !== 'other') {
    throw new Error('AI 联系人 JSON 的 gender 无效');
  }
  if (!String(parsed.openingLine || '').trim()) {
    throw new Error('AI 联系人 JSON 缺少 openingLine 字段');
  }
  return parsed;
};

export const CONTACT_FORM_SYSTEM_INSTRUCTION = `你是“微信联系人结构化生成器”。请根据用户描述，严格输出 JSON 对象，不要输出其他文字。
字段：name,remark,wechatId,age,gender,constellation,mbti,occupation,relationship,personalityTraits,hobbies,description,catchphrase,patDesc,openingLine,persona,background,expressionStyle,region,signature,avatar,balance,sentenceRangeMin,sentenceRangeMax,replyLimit,allowRichActions,socialPostLimit,minimaxTTSEnabled,minimaxVoiceId,minimaxSpeed,minimaxLanguage。
要求：
1) 可从描述和用户资料自然推断缺失信息；不能确定的可留空，不要套用固定默认星座、MBTI、地区或头像；
2) gender 只允许 male/female/other；
3) avatar 可留空；
4) 数值字段必须是数字；
5) persona/background/expressionStyle 要能支撑后续自然聊天，不要只堆标签；
6) 生成的人设和 openingLine 应参考当前用户信息，贴合用户身份、状态、兴趣、关系期待和表达风格；不要写成与用户无关的通用陌生人。
7) openingLine 必须是一句可直接发出的角色开场白，且遵守：
${CONTACT_OPENING_QUALITY_LINES}`;

export const generateContactFormPatch = async (
  description: string,
  aiSettings: AISettings,
  runtimeUserPromptBase: string,
  user: UserProfile,
  getChatReply: (
    messages: Array<{ role: 'user' | 'model'; text: string }>,
    systemInstruction: string,
    settings: AISettings,
    runtimeUserPrompt?: string
  ) => Promise<string>
): Promise<Partial<ContactFormData>> => {
  const runtimeUserPrompt = [
    runtimeUserPromptBase,
    buildRuntimeUserPersonaPrompt(user)
  ].filter(Boolean).join('\n\n');
  const text = await getChatReply(
    [{ role: 'user', text: `请根据描述生成联系人字段：${description}` }],
    CONTACT_FORM_SYSTEM_INSTRUCTION,
    aiSettings,
    runtimeUserPrompt
  );
  const parsed = extractStrictJsonObject(text);
  const payload = validateContactFormAiPayload(parsed);
  return cleanGeneratedContactFormPatch(toContactFormPatch(payload));
};
