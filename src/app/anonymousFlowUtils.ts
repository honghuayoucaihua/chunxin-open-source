import type { AnonymousChatHistoryItem, AnonymousChatPartner, AnonymousChatSettings } from './anonymousChatUtils.ts';
import { buildAnonymousPersona } from './anonymousChatUtils.ts';
import type { Message } from '../types/index.ts';
import { normalizeGeneratedStrictNonSystemEventText } from '../utils/generatedVisibleText.ts';
import { buildChatOpeningQualityLines } from '../utils/prompt/chatEntryQualityPrompt.ts';
import { buildSystemAbilityBoundaryLine } from '../utils/prompt/systemAbilityBoundaryPrompt.ts';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

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
  const fallbackMin = Number.isFinite(minRaw) ? minRaw : 18;
  const fallbackMax = Number.isFinite(maxRaw) ? maxRaw : 35;
  const minAge = Math.max(16, Math.min(fallbackMin, fallbackMax));
  const maxAge = Math.max(minAge, fallbackMax);
  return [minAge, maxAge];
};

export const buildAnonymousHistoryRestorePayload = (item: AnonymousChatHistoryItem, chatId: string) => {
  const chatMessages = Array.isArray(item.messages) ? (item.messages as Message[]) : [];
  return {
    viewingHistoryId: item.id,
    partner: item.partner,
    startedAt: item.startedAt,
    sessionActive: false,
    peerLeft: item.reason === 'leftByPeer',
    inputValue: '',
    messagesPatch: { [chatId]: chatMessages }
  };
};

export const buildAnonymousMatchSystemPrompt = (
  settings: AnonymousChatSettings,
  userGender: 'male' | 'female' | 'other'
) => {
  const [ageMin, ageMax] = resolveAnonymousAgeRange(settings.ageRange);
  const preferredTags = readVisibleTagList(settings.tags).slice(0, 6);
  const openingQualityLines = buildChatOpeningQualityLines({ linePrefix: '- ' });
  return [
    '你是匿名匹配生成器。请生成一个匿名聊天对象，并给出一句开场白。',
    '只输出 JSON，不要任何解释。',
    'JSON 结构：{"gender":"male|female","age":数字,"tags":["标签1","标签2","标签3"],"opening":"开场白"}',
    `年龄范围：${ageMin}-${ageMax}`,
    settings.onlyOppositeSex
      ? `性别要求：必须为${userGender === 'male' ? 'female' : userGender === 'female' ? 'male' : 'male或female'}`
      : '性别要求：male 或 female 均可',
    preferredTags.length > 0
      ? `偏好标签（优先参考）：${preferredTags.join('、')}`
      : '偏好标签：无',
    '标签必须是自然中文兴趣词，且互不重复。',
    '开场白要求：自然、口语化、20字以内。',
    buildSystemAbilityBoundaryLine({ subject: '开场白' }),
    ...openingQualityLines
  ].join('\n');
};

export const normalizeAnonymousMatchResult = (
  parsed: unknown,
  settings: AnonymousChatSettings,
  userGender: 'male' | 'female' | 'other'
): { partner: AnonymousChatPartner; opening: string } => {
  const payload = isRecord(parsed) ? parsed : {};
  const incomingGender = readVisibleScalarText(payload.gender).toLowerCase();
  if (incomingGender !== 'male' && incomingGender !== 'female') {
    throw new Error('AI 返回的 gender 无效');
  }
  const incomingAge = Number(payload.age);
  if (!Number.isFinite(incomingAge)) {
    throw new Error('AI 返回的 age 无效');
  }
  const rawTags = Array.isArray(payload.tags)
    ? payload.tags.map((item) => normalizeGeneratedStrictNonSystemEventText(item, { collapseWhitespace: true })).filter(Boolean)
    : [];
  if (rawTags.length < 3) {
    throw new Error('AI 返回的 tags 不足 3 个');
  }
  const openingCandidate = normalizeGeneratedStrictNonSystemEventText(payload.opening, { collapseWhitespace: true });
  const opening = openingCandidate;
  if (!opening) {
    throw new Error('AI 返回的 opening 为空');
  }

  const [ageMin, ageMax] = resolveAnonymousAgeRange(settings.ageRange);
  const normalizedGender: 'male' | 'female' = incomingGender;
  const normalizedAge = Math.max(ageMin, Math.min(ageMax, Math.round(incomingAge)));
  const normalizedTags: [string, string, string] = [rawTags[0], rawTags[1], rawTags[2]];
  const genderByRule = settings.onlyOppositeSex
    ? (userGender === 'male' ? 'female' : userGender === 'female' ? 'male' : normalizedGender)
    : normalizedGender;
  const basePartner: AnonymousChatPartner = {
    gender: genderByRule,
    age: normalizedAge,
    tags: normalizedTags,
    persona: ''
  };
  return {
    partner: { ...basePartner, persona: buildAnonymousPersona(basePartner) },
    opening
  };
};

export const buildAnonymousIntroMessages = (chatId: string, opening: string, startedAt: number): Message[] => {
  return [{
    id: `${startedAt}-anonymous-intro`,
    senderId: chatId,
    content: opening,
    timestamp: startedAt,
    type: 'text'
  }];
};

export const buildAnonymousHistoryItem = (
  partner: AnonymousChatPartner,
  startedAt: number,
  reason: 'leftByMe' | 'leftByPeer',
  sessionMessages: Message[]
): AnonymousChatHistoryItem => {
  const endedAt = Date.now();
  return {
    id: `${startedAt}-${endedAt}`,
    startedAt,
    endedAt,
    reason,
    partner,
    messages: sessionMessages
  };
};

export const buildAnonymousLeaveTip = (
  chatId: string,
  reason: 'leftByMe' | 'leftByPeer'
): Message => {
  return {
    id: `${Date.now()}-anonymous-leave-${reason}`,
    senderId: chatId,
    content: reason === 'leftByPeer' ? '对方离开了聊天' : '你已离开当前聊天',
    timestamp: Date.now(),
    type: 'system'
  };
};

export const buildAnonymousResumePayload = (session: {
  partner: AnonymousChatPartner;
  messages: Message[];
  startedAt: number;
}, chatId: string) => {
  return {
    viewingHistoryId: null,
    partner: session.partner,
    startedAt: session.startedAt,
    sessionActive: true,
    peerLeft: false,
    inputValue: '',
    messagesPatch: { [chatId]: session.messages }
  };
};
