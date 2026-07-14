import type { ContactFormData } from '../utils/UtilsSubPages';

export type UnknownRecord = Record<string, unknown>;

const toNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return Number.isFinite(value) ? String(value).trim() : '';
  if (typeof value === 'bigint') return String(value).trim();
  return '';
};

const resolveGender = (raw: unknown): ContactFormData['gender'] => {
  const genderRaw = readText(raw).toLowerCase();
  if (genderRaw === 'male' || genderRaw === 'female' || genderRaw === 'other') return genderRaw;
  return '';
};

const readRecord = (raw: UnknownRecord, key: string): UnknownRecord | undefined => {
  const value = raw[key];
  return !!value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : undefined;
};

export const toContactFormPatch = (raw: UnknownRecord): Partial<ContactFormData> => {
  const sentenceRange = readRecord(raw, 'sentenceRange');
  const minimaxTTS = readRecord(raw, 'minimaxTTS');

  return {
    name: readText(raw.name),
    remark: readText(raw.remark),
    wechatId: readText(raw.wechatId),
    age: readText(raw.age),
    gender: resolveGender(raw.gender),
    constellation: readText(raw.constellation),
    mbti: readText(raw.mbti),
    occupation: readText(raw.occupation),
    relationship: readText(raw.relationship),
    personalityTraits: readText(raw.personalityTraits),
    hobbies: readText(raw.hobbies),
    description: readText(raw.description),
    catchphrase: readText(raw.catchphrase),
    patDesc: readText(raw.patDesc),
    openingLine: readText(raw.openingLine),
    persona: readText(raw.persona),
    background: readText(raw.background),
    expressionStyle: readText(raw.expressionStyle),
    region: readText(raw.region),
    signature: readText(raw.signature),
    avatar: readText(raw.avatar),
    balance: toNumber(raw.balance, 0),
    sentenceRangeMin: Math.max(0, toNumber(raw.sentenceRangeMin ?? sentenceRange?.min, 0)),
    sentenceRangeMax: Math.max(0, toNumber(raw.sentenceRangeMax ?? sentenceRange?.max, 3)),
    replyLimit: Math.max(1, toNumber(raw.replyLimit, 120)),
    allowRichActions: Boolean(raw.allowRichActions),
    socialPostLimit: Math.max(0, toNumber(raw.socialPostLimit, 1)),
    minimaxTTSEnabled: Boolean(raw.minimaxTTSEnabled ?? minimaxTTS?.enabled),
    minimaxVoiceId: readText(raw.minimaxVoiceId ?? minimaxTTS?.voiceId),
    minimaxSpeed: toNumber(raw.minimaxSpeed ?? minimaxTTS?.speed, 1),
    minimaxLanguage: readText(raw.minimaxLanguage ?? minimaxTTS?.language) || 'Chinese',
    language: readText(raw.language) || '普通话',
    translateToChinese: typeof raw.translateToChinese === 'boolean'
      ? raw.translateToChinese
      : ((readText(raw.language) || '普通话') !== '普通话')
  };
};
