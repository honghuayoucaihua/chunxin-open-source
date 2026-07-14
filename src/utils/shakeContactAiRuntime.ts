import { getGeminiChatReply } from '../services/geminiServiceLoader';
import { buildRuntimeUserPersonaPrompt } from '../services/personaSummary';
import type { AISettings, Contact, UserProfile } from '../types';
import { extractStrictJsonObject } from './chat/aiReplyParser.ts';
import { normalizeGeneratedStrictNonSystemEventText } from './generatedVisibleText.ts';
import { buildChatOpeningQualityLines } from './prompt/chatEntryQualityPrompt.ts';

type ShakePreference = {
  gender: '不限' | '男生' | '女生' | '非二元';
  age: '不限' | '18-22' | '23-27' | '28-32' | '33+';
  personality: '不限' | '温柔' | '理性' | '活泼' | '文艺' | '技术';
  identity: '不限' | '学生' | '职场新人' | '自由职业' | '创作者' | '互联网从业';
  trait: '不限' | '同城' | '高频聊天' | '有边界感' | '幽默感' | '自律';
};

const MIN_AGE = 18;
const MAX_AGE = 40;

const SHAKE_CONTACT_AI_ALLOWED_KEYS = new Set([
  'name',
  'gender',
  'age',
  'region',
  'occupation',
  'personalityTraits',
  'hobbies',
  'mbti',
  'signature',
  'description',
  'catchphrase',
  'openingLine'
]);

const SHAKE_CONTACT_AI_TEXT_KEYS = new Set([
  'name',
  'gender',
  'region',
  'occupation',
  'personalityTraits',
  'hobbies',
  'mbti',
  'signature',
  'description',
  'catchphrase',
  'openingLine'
]);

const validateShakeContactAiPayload = (parsed: Record<string, any>): Record<string, any> => {
  const unsupportedKey = Object.keys(parsed).find((key) => !SHAKE_CONTACT_AI_ALLOWED_KEYS.has(key));
  if (unsupportedKey) {
    throw new Error(`AI 摇一摇联系人 JSON 包含不支持字段 ${unsupportedKey}`);
  }
  const invalidTextKey = Object.keys(parsed).find((key) => (
    SHAKE_CONTACT_AI_TEXT_KEYS.has(key)
    && parsed[key] !== undefined
    && parsed[key] !== null
    && typeof parsed[key] !== 'string'
  ));
  if (invalidTextKey) {
    throw new Error(`AI 摇一摇联系人 JSON 字段 ${invalidTextKey} 必须是字符串`);
  }
  return parsed;
};

const createContactFromAI = (rawParsed: Record<string, any>, contacts: Contact[]): Contact => {
  const parsed = validateShakeContactAiPayload(rawParsed);
  const requireText = (key: string, limit: number) => {
    const normalized = normalizeGeneratedStrictNonSystemEventText(parsed[key], { collapseWhitespace: true });
    if (!normalized) throw new Error(`AI 返回缺少 ${key} 字段`);
    return normalized.slice(0, limit);
  };
  const baseName = normalizeGeneratedStrictNonSystemEventText(parsed.name, { collapseWhitespace: true });
  if (!baseName) throw new Error('AI 返回缺少 name 字段');
  const name = baseName.slice(0, 8);
  const duplicated = contacts.some((contact) => contact.name === name);
  const safeName = duplicated ? `${name}${Math.floor(10 + Math.random() * 90)}` : name;
  const pinyin = safeName.charAt(0).toUpperCase();
  const rawGender = String(parsed.gender || '').trim();
  if (rawGender !== 'male' && rawGender !== 'female' && rawGender !== 'other') {
    throw new Error('AI 返回的 gender 无效');
  }
  const gender: Contact['gender'] = rawGender;
  const ageNum = Number(parsed.age);
  if (!Number.isFinite(ageNum)) throw new Error('AI 返回的 age 无效');
  const age = String(Math.max(MIN_AGE, Math.min(MAX_AGE, Math.round(ageNum))));
  const region = requireText('region', 20);
  const occupation = requireText('occupation', 20);
  const personalityTraits = requireText('personalityTraits', 40);
  const hobbies = requireText('hobbies', 40);
  const mbti = requireText('mbti', 8);
  const signature = requireText('signature', 24);
  const description = requireText('description', 48);
  const catchphrase = requireText('catchphrase', 16);
  const openingLine = requireText('openingLine', 48);
  const wechatId = `${safeName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '').toLowerCase()}_${Math.floor(100 + Math.random() * 900)}`;

  return {
    id: `shake-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: safeName,
    pinyin,
    avatar: '',
    unreadCount: 0,
    isAi: true,
    remark: '',
    wechatId,
    region,
    signature,
    status: '',
    patDesc: '',
    age,
    gender,
    constellation: '',
    mbti,
    occupation,
    personalityTraits,
    hobbies,
    description,
    catchphrase,
    openingLine,
    chatMode: 'online',
    sentenceRange: { min: 0, max: 3 },
    replyLimit: 120,
    worldBookIds: [],
    allowRichActions: true,
    socialPostLimit: 1,
    personality: `姓名：${safeName}。职业：${occupation}。性格：${personalityTraits}。兴趣：${hobbies}。说话自然、口语化、贴近真实聊天。`
  };
};

export const buildShakeContactByAI = async (
  preference: ShakePreference,
  contacts: Contact[],
  aiSettings: AISettings,
  user?: UserProfile
): Promise<Contact> => {
  const providerReady = aiSettings.provider === 'gemini'
    ? Boolean((aiSettings.apiKey || '').trim() || (process as any)?.env?.API_KEY)
    : Boolean((aiSettings.apiKey || '').trim() && (aiSettings.baseUrl || '').trim());

  if (!providerReady) throw new Error('请先配置可用的 AI Provider 与密钥');

  const filterText = `性别:${preference.gender}；年龄:${preference.age}；性格:${preference.personality}；身份:${preference.identity}；特征:${preference.trait}`;
  const usedNames = contacts.map((contact) => contact.name).filter(Boolean).slice(-200);
  const openingQualityLines = buildChatOpeningQualityLines({ linePrefix: '- ' }).join('\n');
  const runtimeUserPrompt = user
    ? buildRuntimeUserPersonaPrompt(user)
    : '';

  const systemInstructionLines = [`你是“社交产品角色生成器”。
请根据给定筛选，生成一个中国社交软件里真实、有人味的新联系人。
输出必须是 JSON 对象，不要输出任何多余解释。字段：
name(2~6字中文名), gender(male/female/other), age(18~40整数), region(如“中国 上海”), occupation, personalityTraits(字符串，用“、”分隔), hobbies(字符串，用“、”分隔), mbti, signature(20字内), description(30字内), catchphrase(12字内), openingLine(48字内)。
要求：
1) 尽量匹配筛选条件；
2) 人设要有随机性和新鲜感，避免模板化；
3) 生成的人设、地区、职业、兴趣和 openingLine 应参考当前用户信息，贴合用户身份、状态、兴趣、地区、关系期待和表达风格；不要写成与用户无关的通用陌生人；
4) openingLine 必须像摇到后角色主动发出的第一句话，要自然引用用户资料中最适合承接的一处具体线索，遵守：
${openingQualityLines}`];
  if (usedNames.length > 0) {
    systemInstructionLines.push(`5) 不要使用下列已有名字：${usedNames.join('、')}。`);
  }
  const systemInstruction = systemInstructionLines.join('\n');

  const userPrompt = `筛选条件：${filterText}。请立即生成。`;

  try {
    const raw = await getGeminiChatReply([{ role: 'user', text: userPrompt }], systemInstruction, aiSettings, runtimeUserPrompt);
    const parsed = extractStrictJsonObject(raw);
    if (!parsed) throw new Error('AI 返回内容不是有效 JSON');
    return createContactFromAI(parsed, contacts);
  } catch (error: any) {
    throw new Error(error?.message || 'AI 生成联系人失败');
  }
};
