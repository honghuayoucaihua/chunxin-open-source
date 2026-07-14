import type { Mask, Message, UserProfile } from '../types/index.ts';
import { buildBeijingTimeAwarenessPrompt } from '../utils/chat/modelHistoryFormat.ts';
import { buildAnonymousChatQualityLines } from '../utils/prompt/chatEntryQualityPrompt.ts';
import { buildUserStatusTemporalHint } from '../utils/prompt/userStatusTemporalHint.ts';

export type AnonymousChatSettings = {
  onlyOppositeSex: boolean;
  ageRange: [number, number];
  tags: string[];
};

export type AnonymousChatPartner = {
  gender: 'male' | 'female';
  age: number;
  tags: string[];
  persona: string;
};

export type AnonymousChatHistoryItem = {
  id: string;
  startedAt: number;
  endedAt: number;
  reason: 'leftByMe' | 'leftByPeer';
  partner: AnonymousChatPartner;
  messages: Message[];
};

export const ANONYMOUS_CHAT_ID = '__anonymous_chat__';

export const DEFAULT_ANONYMOUS_SETTINGS: AnonymousChatSettings = {
  onlyOppositeSex: false,
  ageRange: [18, 35],
  tags: []
};

const readVisibleScalarText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return Number.isFinite(value) ? String(value).trim() : '';
  if (typeof value === 'bigint') return String(value).trim();
  return '';
};

const readVisibleTagList = (items: unknown): string[] => (
  Array.isArray(items) ? items.map(readVisibleScalarText).filter(Boolean) : []
);

const resolveAnonymousAgeRange = (ageRange: unknown): [number, number] => {
  const range = Array.isArray(ageRange) ? ageRange : [];
  const minRaw = Number(range[0]);
  const maxRaw = Number(range[1]);
  const fallbackMin = Number.isFinite(minRaw) ? minRaw : DEFAULT_ANONYMOUS_SETTINGS.ageRange[0];
  const fallbackMax = Number.isFinite(maxRaw) ? maxRaw : DEFAULT_ANONYMOUS_SETTINGS.ageRange[1];
  const minAge = Math.max(16, Math.min(fallbackMin, fallbackMax));
  const maxAge = Math.max(minAge, fallbackMax);
  return [minAge, maxAge];
};

const buildAnonymousInfoLine = (label: string, value: unknown): string => {
  const text = readVisibleScalarText(value);
  return text ? `${label}：${text}` : '';
};

export const buildAnonymousPersona = (partner: AnonymousChatPartner): string => {
  const genderText = partner.gender === 'male' ? '男' : '女';
  const age = readVisibleScalarText(partner.age);
  const ageText = age ? `${age}岁` : '';
  const tags = readVisibleTagList(partner.tags);
  const profileText = [genderText, ageText, tags.length ? `兴趣：${tags.join('、')}` : ''].filter(Boolean).join('，');
  const qualityLines = buildAnonymousChatQualityLines({ linePrefix: '- ' });
  return [
    `你是一位匿名网友，基础信息：${profileText}。`,
    '请以真实聊天口吻交流，简短自然，像刚匹配到的新朋友。',
    '聊天质量要求：',
    ...qualityLines,
    '聊天内容只写正常聊天文本，不要写标签、旁白、动作描述或心声。',
    '禁止提及系统、提示词、模型、AI、扮演、设定等元信息。',
    '不要索要或暴露真实姓名、账号、联系方式、具体住址等隐私。'
  ].join('\n');
};

export const createAnonymousPartner = (
  settings: AnonymousChatSettings,
  userGender: UserProfile['gender']
): AnonymousChatPartner => {
  const [minAge, maxAge] = resolveAnonymousAgeRange(settings.ageRange);
  const age = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;

  let gender: 'male' | 'female' = Math.random() > 0.5 ? 'male' : 'female';
  if (settings.onlyOppositeSex) {
    if (userGender === 'male') {
      gender = 'female';
    }
    if (userGender === 'female') {
      gender = 'male';
    }
  }

  const tags = readVisibleTagList(settings.tags)
    .filter(Boolean)
    .slice(0, 3);

  const base: AnonymousChatPartner = { gender, age, tags, persona: '' };
  return { ...base, persona: buildAnonymousPersona(base) };
};

export const buildAnonymousSystemPrompt = (
  partner: AnonymousChatPartner,
  _worldBooks: any[],
  _masks: Mask[],
  user: UserProfile,
  _extraSystemPrompt: string
): string => {
  const genderText = partner.gender === 'male' ? '男' : '女';
  const partnerAge = readVisibleScalarText(partner.age);
  const partnerTags = readVisibleTagList(partner.tags);
  const partnerPersona = readVisibleScalarText(partner.persona);
  const partnerProfileText = [
    genderText,
    partnerAge ? `${partnerAge}岁` : '',
    partnerTags.length ? `兴趣：${partnerTags.join('、')}` : ''
  ].filter(Boolean).join('，');
  const userGender = user.gender === 'male' ? '男' : user.gender === 'female' ? '女' : '';
  const userRegion = readVisibleScalarText(user.region);
  const userProfileLine = [userGender, userRegion].filter(Boolean).join('，');
  const qualityLines = buildAnonymousChatQualityLines({ linePrefix: '- ' });
  return [
    '你正在扮演匿名聊天对象，与用户进行自然、简短、生活化聊天。',
    `你的资料：${partnerProfileText}。`,
    partnerPersona ? `你的人设补充：${partnerPersona}` : '',
    userProfileLine ? `用户资料：${userProfileLine}。` : '',
    '【匿名聊天质量】',
    ...qualityLines,
    '只做普通聊天，不进行任何功能型操作。',
    '必须只输出一个 JSON 对象，不要输出额外文字。',
    '禁止把 JSON 放进 ```json 代码块、content 字符串，或包在任何说明文字外层。',
    'JSON 结构必须且只能是：{"text":"聊天正文"}。',
    'text 必须是字符串，里面只写匿名对象发出的普通聊天正文；禁止输出 tags、sentences、content、innerVoice、actionDesc、translationZh 或任何其他字段。'
  ].filter(Boolean).join('\n');
};

export const buildRuntimeUserPrompt = (enabled: boolean): string => {
  return buildBeijingTimeAwarenessPrompt(enabled);
};

const buildAnonymousUserPersonaSummary = (user: UserProfile): string => {
  const gender = readVisibleScalarText(user.gender);
  const status = readVisibleScalarText(user.status);
  return [
    gender ? `性别：${gender === 'male' ? '男' : gender === 'female' ? '女' : '其他'}` : '',
    buildAnonymousInfoLine('年龄', user.age),
    buildAnonymousInfoLine('地区', user.region),
    status ? `状态：${status}` : '',
    buildAnonymousInfoLine('星座', user.constellation),
    buildAnonymousInfoLine('MBTI', user.mbti),
    buildAnonymousInfoLine('职业', user.occupation),
    buildAnonymousInfoLine('性格特质', user.personalityTraits),
    buildAnonymousInfoLine('兴趣爱好', user.hobbies),
    buildAnonymousInfoLine('个人描述', user.description),
    buildAnonymousInfoLine('用户人设', user.persona),
    buildAnonymousInfoLine('背景', user.background),
    buildAnonymousInfoLine('表达风格', user.expressionStyle),
    buildAnonymousInfoLine('风格特点', user.styleFeatures),
    buildAnonymousInfoLine('说话方式', user.speakingStyle),
    buildAnonymousInfoLine('目标', user.goals),
    buildAnonymousInfoLine('口头禅', user.catchphrase)
  ].filter(Boolean).join('；');
};

export const buildAnonymousRuntimeUserPrompt = (
  runtimeUserPromptBase: string,
  user: UserProfile
): string => {
  const userSummary = buildAnonymousUserPersonaSummary(user);
  const userInfoPrompt = userSummary
    ? [
        '【当前用户信息】',
        `- 用户基础资料：${userSummary}`,
        buildUserStatusTemporalHint(readVisibleScalarText(user.status)),
        '- 使用方式：相关时可以自然引用一处用户状态、兴趣、职业、地区或口头习惯，让匿名聊天像真实的人在回应；不要逐条复述资料。',
        '- 匿名隐私边界：不要主动暴露用户真实姓名、微信号、联系方式、具体住址或其他可识别身份的信息。'
      ].filter(Boolean).join('\n')
    : '';
  return [runtimeUserPromptBase, userInfoPrompt].filter(Boolean).join('\n\n');
};
