import type { Contact, Mask, UserProfile } from '../types/index.ts';
import { buildUserStatusTemporalHint } from '../utils/prompt/userStatusTemporalHint.ts';

export const buildContactPersonaSummary = (contact: Contact) => {
  return contact.personality?.trim() || [
    contact.age ? `年龄：${contact.age}` : '',
    contact.gender ? `性别：${contact.gender === 'male' ? '男' : contact.gender === 'female' ? '女' : '其他'}` : '',
    contact.constellation ? `星座：${contact.constellation}` : '',
    contact.mbti ? `MBTI：${contact.mbti}` : '',
    contact.occupation ? `职业：${contact.occupation}` : '',
    contact.relationship ? `与用户关系：${contact.relationship}` : '',
    contact.personalityTraits ? `性格特质：${contact.personalityTraits}` : '',
    contact.hobbies ? `兴趣爱好：${contact.hobbies}` : '',
    contact.description ? `人物描述：${contact.description}` : ''
  ].filter(Boolean).join('；');
};

export const buildUserPersonaSummary = (user: UserProfile) => {
  return [
    user.name ? `昵称：${user.name}` : '',
    user.wechatId ? `微信号：${user.wechatId}` : '',
    user.gender ? `性别：${user.gender === 'male' ? '男' : user.gender === 'female' ? '女' : '其他'}` : '',
    user.age ? `年龄：${user.age}` : '',
    user.region ? `地区：${user.region}` : '',
    user.signature ? `签名：${user.signature}` : '',
    user.status ? `状态：${user.status}` : '',
    user.constellation ? `星座：${user.constellation}` : '',
    user.mbti ? `MBTI：${user.mbti}` : '',
    user.occupation ? `职业：${user.occupation}` : '',
    user.personalityTraits ? `性格特质：${user.personalityTraits}` : '',
    user.hobbies ? `兴趣爱好：${user.hobbies}` : '',
    user.description ? `个人描述：${user.description}` : '',
    user.persona ? `用户人设：${user.persona}` : '',
    user.background ? `背景：${user.background}` : '',
    user.expressionStyle ? `表达风格：${user.expressionStyle}` : '',
    user.styleFeatures ? `风格特点：${user.styleFeatures}` : '',
    user.speakingStyle ? `说话方式：${user.speakingStyle}` : '',
    user.personality ? `补充设定：${user.personality}` : '',
    user.goals ? `目标：${user.goals}` : '',
    user.catchphrase ? `口头禅：${user.catchphrase}` : '',
    user.patDesc ? `拍一拍：${user.patDesc}` : ''
  ].filter(Boolean).join('；');
};

export const buildMaskPersonaSummary = (mask: Mask | null | undefined) => {
  if (!mask) return '';
  return [
    mask.name ? `面具：${mask.name}` : '',
    mask.age ? `年龄：${mask.age}` : '',
    mask.gender ? `性别：${mask.gender === 'male' ? '男' : mask.gender === 'female' ? '女' : '其他'}` : '',
    mask.constellation ? `星座：${mask.constellation}` : '',
    mask.mbti ? `MBTI：${mask.mbti}` : '',
    mask.occupation ? `职业：${mask.occupation}` : '',
    mask.personalityTraits ? `性格：${mask.personalityTraits}` : '',
    mask.hobbies ? `兴趣爱好：${mask.hobbies}` : '',
    mask.description ? `关于用户：${mask.description}` : '',
    mask.catchphrase ? `口头禅：${mask.catchphrase}` : ''
  ].filter(Boolean).join('；');
};

export const buildRuntimeUserPersonaPrompt = (
  user: UserProfile,
  options: {
    selectedMask?: Mask | null;
    contactUserPersona?: string;
  } = {}
) => {
  const baseSummary = buildUserPersonaSummary(user);
  const maskSummary = buildMaskPersonaSummary(options.selectedMask);
  const contactUserPersona = String(options.contactUserPersona || '').trim();
  const lines = [
    baseSummary ? `- 用户基础资料：${baseSummary}` : '',
    maskSummary ? `- 当前聊天面具：${maskSummary}` : '',
    contactUserPersona ? `- 当前聊天补充：${contactUserPersona}` : '',
    buildUserStatusTemporalHint(user.status),
    '- 使用方式：这些资料是当前用户的结构化背景；回复需要承接关系、状态或连续性时，优先自然引用一处未冲突且不过期的用户信息或长期记忆，不要只泛泛称“你”。',
    '- 输出要求：被引用的信息必须出现在对用户可见的聊天正文里，可以是称呼、近况、兴趣、职业、地区、双方关系或近期事件；不要只藏在心声、动作、译文或幕后说明里。',
    '- 有面具时，面具是当前聊天身份，用户基础资料仍是背景信息；不要把资料逐条复述成档案。'
  ].filter(Boolean);
  if (lines.length === 0) return '';
  return `【当前用户信息】\n${lines.join('\n')}`;
};
