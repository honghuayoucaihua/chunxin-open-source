import type { Contact } from '../types/index.ts';

export type ContactFormData = {
  name: string;
  remark: string;
  wechatId: string;
  age: string;
  gender: Contact['gender'] | '';
  constellation: string;
  mbti: string;
  occupation: string;
  relationship: string;
  personalityTraits: string;
  hobbies: string;
  description: string;
  catchphrase: string;
  patDesc: string;
  openingLine: string;
  region: string;
  signature: string;
  avatar: string;
  balance: number;
  sentenceRangeMin: number;
  sentenceRangeMax: number;
  replyLimit: number;
  allowRichActions: boolean;
  socialPostLimit: number;
  minimaxTTSEnabled: boolean;
  minimaxVoiceId: string;
  minimaxSpeed: number;
  minimaxLanguage: string;
  language: string;
  translateToChinese: boolean;
  persona: string;
  background: string;
  expressionStyle: string;
};

export const buildContactFormData = (contact?: Contact): ContactFormData => ({
  name: contact?.name || '',
  remark: contact?.remark || '',
  wechatId: contact?.wechatId || '',
  age: contact?.age || '',
  gender: contact?.gender || '',
  constellation: contact?.constellation || '',
  mbti: contact?.mbti || '',
  occupation: contact?.occupation || '',
  relationship: contact?.relationship || '',
  personalityTraits: contact?.personalityTraits || '',
  hobbies: contact?.hobbies || '',
  description: contact?.description || '',
  catchphrase: contact?.catchphrase || '',
  patDesc: contact?.patDesc || '',
  openingLine: contact?.openingLine || '',
  region: contact?.region || '',
  signature: contact?.signature || '',
  avatar: contact?.avatar || '',
  balance: Number.isFinite(contact?.balance) ? Number(contact?.balance) : 0,
  sentenceRangeMin: contact?.sentenceRange?.min ?? 0,
  sentenceRangeMax: contact?.sentenceRange?.max ?? 3,
  replyLimit: contact?.replyLimit ?? 120,
  allowRichActions: contact?.allowRichActions ?? false,
  socialPostLimit: contact?.socialPostLimit ?? 1,
  minimaxTTSEnabled: contact?.minimaxTTS?.enabled ?? false,
  minimaxVoiceId: contact?.minimaxTTS?.voiceId || '',
  minimaxSpeed: Number.isFinite(contact?.minimaxTTS?.speed) ? Number(contact?.minimaxTTS?.speed) : 1,
  minimaxLanguage: contact?.minimaxTTS?.language || 'Chinese',
  language: contact?.language || '普通话',
  translateToChinese: contact?.translateToChinese ?? ((contact?.language || '普通话') !== '普通话'),
  persona: contact?.persona || '',
  background: contact?.background || '',
  expressionStyle: contact?.expressionStyle || ''
});

export const buildContactPersonality = (form: ContactFormData) => {
  const parts: string[] = [];
  parts.push(form.relationship ? `姓名：${form.name}。与用户关系：${form.relationship}。` : `姓名：${form.name}。`);
  if (form.persona?.trim()) parts.push(`【核心人设】${form.persona.trim()}`);
  if (form.background?.trim()) parts.push(`【背景故事】${form.background.trim()}`);
  if (form.expressionStyle?.trim()) parts.push(`【表达风格】${form.expressionStyle.trim()}`);

  const attrs: string[] = [];
  if (form.age) attrs.push(`年龄${form.age}`);
  if (form.gender) attrs.push(`性别${form.gender === 'male' ? '男' : form.gender === 'female' ? '女' : '其他'}`);
  if (form.constellation) attrs.push(`星座${form.constellation}`);
  if (form.mbti) attrs.push(`MBTI: ${form.mbti}`);
  if (form.occupation) attrs.push(`职业${form.occupation}`);
  if (form.personalityTraits) attrs.push(`性格${form.personalityTraits}`);
  if (form.hobbies) attrs.push(`兴趣爱好${form.hobbies}`);
  if (attrs.length > 0) parts.push(`【人物属性】${attrs.join('，')}。`);

  if (form.description?.trim()) parts.push(`【补充描述】${form.description.trim()}`);
  if (form.catchphrase?.trim()) parts.push(`【口头禅】${form.catchphrase.trim()}`);
  if (form.patDesc?.trim()) parts.push(`【拍一拍】${form.patDesc.trim()}`);
  parts.push(`钱包余额：¥${Number(form.balance || 0).toFixed(2)}。`);

  const selectedLanguage = form.language || '普通话';
  if (selectedLanguage !== '普通话' && form.translateToChinese) {
    parts.push(`请使用${selectedLanguage}进行回复，并同时提供简体中文翻译。输出格式必须严格为两段：第一段是${selectedLanguage}原文，第二段是简体中文译文；中间用单独一行“---”分隔。`);
  } else if (selectedLanguage !== '普通话') {
    parts.push(`请使用${selectedLanguage}进行回复，不要附带简体中文翻译。`);
  }
  return parts.join('\n');
};

export const buildContactFromForm = (form: ContactFormData, id: string): Contact => {
  const pinyin = form.name.trim().charAt(0).toUpperCase();
  const personality = buildContactPersonality(form);
  return {
    id,
    name: form.name.trim(),
    pinyin,
    avatar: form.avatar,
    unreadCount: 0,
    balance: form.balance,
    isAi: true,
    personality,
    remark: form.remark,
    wechatId: form.wechatId || id,
    region: form.region,
    signature: form.signature,
    age: form.age,
    gender: form.gender || undefined,
    constellation: form.constellation,
    mbti: form.mbti,
    occupation: form.occupation,
    relationship: form.relationship,
    personalityTraits: form.personalityTraits,
    hobbies: form.hobbies,
    description: form.description,
    catchphrase: form.catchphrase,
    patDesc: form.patDesc,
    openingLine: form.openingLine,
    persona: form.persona,
    background: form.background,
    expressionStyle: form.expressionStyle,
    language: form.language,
    translateToChinese: form.translateToChinese,
    chatMode: 'online',
    sentenceRange: { min: form.sentenceRangeMin, max: form.sentenceRangeMax },
    replyLimit: form.replyLimit,
    allowRichActions: form.allowRichActions,
    socialPostLimit: form.socialPostLimit,
    minimaxTTS: {
      enabled: form.minimaxTTSEnabled,
      voiceId: form.minimaxVoiceId,
      speed: form.minimaxSpeed,
      language: form.minimaxLanguage
    },
    worldBookIds: []
  };
};
