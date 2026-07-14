import type { Contact, FriendRequest, Message } from '../types';
import type { ContactFormData } from '../utils/UtilsSubPages';

type BuildIncomingRequestInput = {
  form: ContactFormData;
  greeting: string;
  openingLine: string;
  existingContacts: Contact[];
};

export const buildIncomingFriendRequest = (input: BuildIncomingRequestInput): FriendRequest | null => {
  const contact = { ...input.form, name: input.form.name.trim() };
  if (!contact.name) return null;
  const existing = input.existingContacts.find(item => item.wechatId === input.form.wechatId && input.form.wechatId);
  const generatedId = `req-contact-${Date.now()}`;
  const contactId = existing?.id || generatedId;
  const personality = input.form.relationship
    ? `姓名：${contact.name}。与用户关系：${input.form.relationship}。请自然、真实地用中文聊天。`
    : `姓名：${contact.name}。请自然、真实地用中文聊天。`;
  return {
    id: `req-${Date.now()}`,
    contact: {
      id: contactId,
      name: contact.name,
      pinyin: contact.name.charAt(0).toUpperCase(),
      avatar: input.form.avatar,
      unreadCount: 0,
      isAi: true,
      remark: input.form.remark,
      wechatId: input.form.wechatId || contactId,
      region: input.form.region,
      signature: input.form.signature,
      age: input.form.age,
      gender: input.form.gender || undefined,
      constellation: input.form.constellation,
      mbti: input.form.mbti,
      occupation: input.form.occupation,
      relationship: input.form.relationship,
      personalityTraits: input.form.personalityTraits,
      hobbies: input.form.hobbies,
      description: input.form.description,
      catchphrase: input.form.catchphrase,
      patDesc: input.form.patDesc,
      openingLine: input.form.openingLine,
      persona: input.form.persona,
      background: input.form.background,
      expressionStyle: input.form.expressionStyle,
      chatMode: 'online',
      sentenceRange: { min: input.form.sentenceRangeMin, max: input.form.sentenceRangeMax },
      replyLimit: input.form.replyLimit,
      allowRichActions: input.form.allowRichActions,
      socialPostLimit: input.form.socialPostLimit,
      minimaxTTS: {
        enabled: input.form.minimaxTTSEnabled,
        voiceId: input.form.minimaxVoiceId,
        speed: input.form.minimaxSpeed,
        language: input.form.minimaxLanguage
      },
      balance: input.form.balance,
      personality,
      worldBookIds: []
    },
    greeting: input.greeting.trim(),
    openingLine: (input.openingLine || input.form.openingLine || '').trim(),
    timestamp: Date.now(),
    status: 'pending',
    source: 'manual'
  };
};

export const shouldInsertAcceptedContact = (contacts: Contact[], request: FriendRequest) => {
  return !contacts.some(item => item.id === request.contact.id || (!!request.contact.wechatId && item.wechatId === request.contact.wechatId));
};

export const buildAcceptedFriendMessages = (request: FriendRequest): { system: Message; greeting?: Message } => {
  const acceptedId = request.contact.id;
  const now = Date.now();
  const greetingContent = (request.openingLine || request.greeting).trim();
  return {
    system: {
      id: `sys-add-${now}`,
      senderId: acceptedId,
      content: `你已添加了${request.contact.name}，以上是打招呼的信息。`,
      timestamp: now,
      type: 'system'
    },
    greeting: greetingContent ? {
      id: `sys-greet-${now + 1}`,
      senderId: acceptedId,
      content: greetingContent,
      timestamp: now + 1,
      type: 'text'
    } : undefined
  };
};
