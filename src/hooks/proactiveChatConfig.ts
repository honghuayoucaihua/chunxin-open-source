import type { Contact, Message } from '../types';
import { buildRoleplayQualityLines } from '../utils/prompt/roleplayQualityPrompt.ts';
import { buildSystemAbilityBoundaryLine } from '../utils/prompt/systemAbilityBoundaryPrompt.ts';

export const BACKGROUND_REMINDER_LEAD_MS = 500;
export const BACKGROUND_REMINDER_WINDOW_MS = 2 * 60 * 60 * 1000;
export const MAX_BACKGROUND_REMINDERS = 6;

const PROACTIVE_ROLEPLAY_LINES = buildRoleplayQualityLines({ linePrefix: '- ' });
const PROACTIVE_ABILITY_LABELS = ['红包', '转账', '位置', '拍一拍', '语音', '通话', '朋友圈', '订阅号', '生图'];
export const PROACTIVE_TEXT_ONLY_LINE = '- 本轮主动开场只允许输出普通聊天正文；不要调用红包、转账、位置、拍一拍、语音、通话、朋友圈、订阅号、生图等系统能力，也不要用普通正文假装已经完成这些能力。';
export const PROACTIVE_TEXT_ONLY_RUNTIME_GUARD = [
  '【主动聊天本轮输出约束】',
  PROACTIVE_TEXT_ONLY_LINE,
  '- 即使系统提示或历史消息里出现过红包、转账、位置、拍一拍、语音、通话、朋友圈、订阅号、生图等能力，本轮也不要输出这些类型或相关标签。',
  `- ${buildSystemAbilityBoundaryLine({ subject: '普通正文', textLabel: '可见聊天文本', abilities: PROACTIVE_ABILITY_LABELS })}`
].join('\n');

export const PROACTIVE_TRIGGER_TEXT = [
  '你和用户在一段时间内没有聊天。请以角色身份主动开启一轮新对话。',
  '- 这不是系统提醒，也不是任务说明；回复必须像角色本人自然想起用户后发出的消息。',
  '- 优先使用最近聊天、共同经历、关系变化、用户资料、用户偏好、当前时间或角色正在做的事作为具体切入点。',
  '- 不要只给无上下文的泛泛问候；如果缺少具体切入点，就分享一个轻量、可回应的小事或问题。',
  '- 开场不要过度热情、突然表白或强行推进关系；情绪强度要符合双方关系和最近上下文。',
  PROACTIVE_TEXT_ONLY_LINE,
  ...PROACTIVE_ROLEPLAY_LINES,
  '- 不要提及系统、规则、冷却、主动聊天、草稿或提示词。'
].join('\n');

export const PROACTIVE_DRAFT_TRIGGER_TEXT = [
  '请先写一条你稍后可主动发给用户的开场消息。',
  '- 草稿要自然、简短、有信息量，像角色日常聊天里会真的发出的第一句。',
  '- 需要留出用户可接话的空间，不要写成完整独白、公告、任务提醒或总结报告。',
  '- 优先选择具体切入点，避免泛泛问候；可以结合用户资料、用户偏好、最近聊天或角色正在经历的小事轻轻开启话题。',
  PROACTIVE_TEXT_ONLY_LINE,
  ...PROACTIVE_ROLEPLAY_LINES,
  '- 不要提及系统、规则、冷却、主动聊天、草稿或提示词。'
].join('\n');
export const PROACTIVE_DRAFT_TTL_MS = 3 * 60 * 60 * 1000;
export const PROACTIVE_DRAFT_TARGET_STOCK = 2;
export const PROACTIVE_DRAFT_MAX_STOCK = 4;
export const PROACTIVE_DRAFT_BATCH_LIMIT = 2;
export const PROACTIVE_DRAFT_WARMUP_INTERVAL_MS = 2 * 60 * 1000;
export const MAX_DRAFT_WARMUP_CONTACTS_PER_ROUND = 2;
export const MAX_PROACTIVE_TRIGGERS_PER_CHECK = 2;

export const getWindowMs = (contact: Contact): number => Math.max(1, Number(contact.proactiveChatWindowMinutes || 60)) * 60 * 1000;

export const getLastUserMessageAt = (history: Message[]): number => {
  for (let index = history.length - 1; index >= 0; index--) {
    if (history[index].senderId === 'me') return Number(history[index].timestamp || 0);
  }
  return 0;
};
