import { formatMessageForPolicyHistory, getChatModePolicy } from '../utils/chat/chatModePolicy.ts';
import { normalizeGeneratedStrictNonSystemEventText } from '../utils/generatedVisibleText.ts';
import { buildReplySuggestionQualityLines } from '../utils/prompt/replySuggestionQualityPrompt.ts';
import { buildSystemAbilityBoundaryLine } from '../utils/prompt/systemAbilityBoundaryPrompt.ts';
import { buildRuntimeUserPersonaPrompt } from '../services/personaSummary.ts';
import type { AISettings, Contact, Mask, Message, UserProfile } from '../types';

export const buildChatReplySuggestionHistory = (
  historyMessages: Message[],
  contact: Contact,
  user: Pick<UserProfile, 'name'>,
  aiSettings?: Pick<AISettings, 'enableTimeAwareness'>
): string => {
  const modePolicy = getChatModePolicy(contact);
  const includeTimestamp = aiSettings?.enableTimeAwareness === true;
  const userName = user.name?.trim() || '';
  const contactName = contact.remark?.trim() || contact.name?.trim() || '';
  const userSpeakerLabel = userName || '用户（发送者，未提供姓名）';
  const contactSpeakerLabel = contactName || '联系人（接收者，未提供姓名）';

  return historyMessages
    .map((message) => {
      const speakerLabel = (message.type === 'system' || message.senderId === 'system')
        ? ''
        : (message.senderId === 'me' ? userSpeakerLabel : contactSpeakerLabel);
      const mapped = formatMessageForPolicyHistory(message, modePolicy, {
        includeTimestamp,
        includeTranslation: false,
        speakerLabel
      });
      return mapped?.text || '';
    })
    .filter(Boolean)
    .join('\n');
};

export const buildChatReplySuggestionInstruction = (input: {
  isStoryChat: boolean;
  myName: string;
  contactName: string;
  myPersona: string;
  contactPersona: string;
}) => {
  const myName = input.myName.trim();
  const contactName = input.contactName.trim();
  const userTarget = myName ? `「${myName}」` : '用户（发送者，未提供姓名）';
  const contactTarget = contactName ? `「${contactName}」` : '联系人（接收者，未提供姓名）';
  const qualityLines = buildReplySuggestionQualityLines({
    isStoryChat: input.isStoryChat,
    linePrefix: '- '
  }).join('\n');
  const suggestionAbilityBoundaryLine = buildSystemAbilityBoundaryLine({ subject: '候选句' });
  const personaLines = [
    input.myPersona.trim() ? `- 用户（发送者）人设：${input.myPersona.trim()}` : '',
    input.contactPersona.trim() ? `- 联系人（接收者）人设：${input.contactPersona.trim()}` : ''
  ].filter(Boolean);
  const personaBlock = personaLines.length ? `\n\n【双方人设】\n${personaLines.join('\n')}` : '';
  if (input.isStoryChat) {
    return `你是“剧情回复建议生成器”，只服务于沉浸式剧情互动。\n任务：基于当前剧情记录，替${userTarget}生成3句可直接发送给${contactTarget}的剧情回复候选。${personaBlock}\n\n【候选质量规则】\n${qualityLines}\n\n【剧情生成硬规则】\n1) 三句都必须是“用户第一人称口吻”，并且直接可发送；\n2) 三句都必须推动剧情，不得写成日常闲聊、寒暄、表情化灌水；\n3) 每句 10-32 字，至少包含以下之一：动作推进、情绪推进、关系推进、信息推进；\n4) 三句方向必须明显区分：A=试探/铺垫，B=正面推进，C=转折/施压或留钩子；\n5) 用词要贴合当前场景与人物关系，禁止出现“作为AI/系统”等出戏表达；\n6) suggestions 里的每一句只能是用户将要发送的正文，不要写心声、动作、旁白、翻译、括号舞台说明或 JSON 以外字段；\n7) ${suggestionAbilityBoundaryLine}\n8) 仅输出严格 JSON：{"suggestions":["句子1","句子2","句子3"]}，不要输出任何解释。`;
  }
  return `你是“用户回复建议生成器”。\n任务：基于聊天记录，替${userTarget}生成3句可直接发送给${contactTarget}的候选回复。${personaBlock}\n\n【候选质量规则】\n${qualityLines}\n\n要求：\n1) 3句都必须是“用户口吻”；\n2) 每句 8-28 字，自然口语化，贴合双方关系与上文语境；\n3) 三句语气或方向要有区分；\n4) suggestions 里的每一句只能是用户将要发送的正文，不要写心声、动作、旁白、翻译、括号舞台说明或 JSON 以外字段；\n5) ${suggestionAbilityBoundaryLine}\n6) 仅输出严格 JSON：{"suggestions":["句子1","句子2","句子3"]}；\n7) 不要输出额外解释。`;
};

export const buildChatReplySuggestionPrompt = (chatHistory: string, isStoryChat: boolean) => {
  const trimmedHistory = chatHistory.trim();
  const historySection = trimmedHistory
    ? `【最近聊天】\n${trimmedHistory}`
    : '【最近聊天】\n（本轮没有可用聊天记录；这不是聊天正文，不要把它当作用户或联系人说过的话。）';
  return `${isStoryChat ? '【任务类型】剧情回复候选\n' : ''}${historySection}\n请给出3句“用户可直接发送”的候选回复。`;
};

export const buildChatReplySuggestionRuntimePrompt = (input: {
  runtimeUserPromptBase?: string;
  memoryPrompt?: string;
  user: UserProfile;
  contact: Contact;
  masks?: Mask[];
}) => {
  const selectedMask = input.contact.selectedMaskId
    ? (input.masks || []).find((mask) => mask.id === input.contact.selectedMaskId) || null
    : null;
  const userInfoPrompt = buildRuntimeUserPersonaPrompt(input.user, {
    selectedMask,
    contactUserPersona: input.contact.userPersona
  });
  return [
    input.runtimeUserPromptBase,
    userInfoPrompt,
    input.memoryPrompt
  ].filter(Boolean).join('\n\n');
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const normalizeReplySuggestionText = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return normalizeGeneratedStrictNonSystemEventText(value, { collapseWhitespace: true });
};

export const parseReplySuggestions = (parsed: unknown): string[] => {
  if (!isRecord(parsed) || !Array.isArray(parsed.suggestions)) return [];
  if (Object.keys(parsed).some((key) => key !== 'suggestions')) return [];
  const suggestions = parsed.suggestions
    .map((item) => normalizeReplySuggestionText(item))
    .filter(Boolean)
    .slice(0, 3);
  return suggestions.length === 3 ? suggestions : [];
};
