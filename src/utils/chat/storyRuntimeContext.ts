import type { Message } from '../../types/message.ts';
import { STORY_DIRECTOR_BEGIN, STORY_DIRECTOR_END } from '../prompt/promptRuntimeMarkers.ts';

type StoryRuntimeContextOptions = {
  maxMessages?: number;
  userLabel?: string;
  contactNameById?: Record<string, string>;
};

const normalizeText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim().replace(/\s+/g, ' ');
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'bigint') return String(value);
  return '';
};

const clipText = (value: unknown, maxLength = 120): string => {
  const text = normalizeText(value);
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};

const getSenderLabel = (
  message: Message,
  options: StoryRuntimeContextOptions
): string => {
  if (message.senderId === 'me') return options.userLabel || '用户（发送者，未提供姓名）';
  if (message.senderId === 'system') return '系统';
  if (message.isNpc && message.npcName) return message.npcName;
  return options.contactNameById?.[message.senderId] || message.npcName || '角色（未提供姓名）';
};

const getMessageBody = (message: Message): string => {
  if (message.type === 'text') return clipText(message.content);
  if (message.type === 'image') return clipText(message.imageCaption) || '[图片]';
  if (message.type === 'voice') return clipText(message.content) || '[语音]';
  if (message.type === 'location') {
    return clipText([clipText(message.locationName), clipText(message.locationAddress)].filter(Boolean).join('，')) || '[位置]';
  }
  if (message.type === 'miniprogram') {
    return clipText([clipText(message.title), clipText(message.desc)].filter(Boolean).join('：')) || '[小程序]';
  }
  if (message.type === 'truthdare') return clipText(message.truthDareThemeName) || '[真心话大冒险]';
  if (message.type === 'call') return clipText(message.content) || '[通话]';
  if (message.type === 'system') return clipText(message.content);
  return clipText(message.content);
};

const getMessageFocusText = (message: Message): string => {
  const body = getMessageBody(message);
  if (body) return body;
  const actionDesc = clipText(message.actionDesc);
  if (actionDesc) return `（动作）${actionDesc}`;
  const narrationDesc = clipText(message.narrationDesc);
  if (narrationDesc) return `（旁白）${narrationDesc}`;
  return '';
};

const isStoryNarrativeMessage = (message: Message): boolean => {
  if (!message) return false;
  if (message.senderId === 'system' || message.type === 'system' || message.truthDareCommand) return false;
  if (message.type === 'redpacket' || message.type === 'transfer') return false;
  return Boolean(getMessageFocusText(message));
};

const formatStoryMessage = (
  message: Message,
  options: StoryRuntimeContextOptions
): string => {
  const lines: string[] = [];
  const senderLabel = getSenderLabel(message, options);
  const body = getMessageBody(message);
  const quotedText = clipText(message.quotedMsg?.content || message.quotedMsg?.imageCaption);
  const quotedSender = clipText(message.quotedMsg?.npcName);
  const innerVoice = clipText(message.innerVoice);
  const actionDesc = clipText(message.actionDesc);
  const narrationDesc = clipText(message.narrationDesc);
  const usedActionAsLead = !body && !!actionDesc;
  const usedNarrationAsLead = !body && !actionDesc && !!narrationDesc;

  if (body) lines.push(`- ${senderLabel}：${body}`);
  if (!body && actionDesc) lines.push(`- ${senderLabel}：（动作）${actionDesc}`);
  if (!body && !actionDesc && narrationDesc) lines.push(`- ${senderLabel}：（旁白）${narrationDesc}`);
  if (quotedText) lines.push(`  引用：${quotedSender ? `${quotedSender}：` : ''}${quotedText}`);
  if (actionDesc && !usedActionAsLead) lines.push(`  动作：${actionDesc}`);
  if (narrationDesc && !usedNarrationAsLead) lines.push(`  旁白：${narrationDesc}`);
  if (innerVoice && message.senderId !== 'me') lines.push(`  心声：${innerVoice}`);
  return lines.join('\n');
};

const buildStoryAnchorIndex = (
  messages: readonly Message[],
  options: StoryRuntimeContextOptions
): string[] => {
  const latestUser = [...messages].reverse().find((message) => message.senderId === 'me' && getMessageFocusText(message));
  const latestRole = [...messages].reverse().find((message) => message.senderId !== 'me' && message.senderId !== 'system' && !message.isNpc && getMessageFocusText(message));
  const latestNpc = [...messages].reverse().find((message) => message.isNpc && getMessageFocusText(message));
  const latestAction = [...messages].reverse().find((message) => clipText(message.actionDesc));
  const latestNarration = [...messages].reverse().find((message) => clipText(message.narrationDesc));

  const lines = [
    latestUser ? `- 最近用户输入：${getSenderLabel(latestUser, options)}：${getMessageFocusText(latestUser)}` : '',
    latestRole ? `- 最近角色回应：${getSenderLabel(latestRole, options)}：${getMessageFocusText(latestRole)}` : '',
    latestNpc ? `- 最近 NPC 发言：${getSenderLabel(latestNpc, options)}：${getMessageFocusText(latestNpc)}` : '',
    latestAction ? `- 最近动作锚点：${getSenderLabel(latestAction, options)}：${clipText(latestAction.actionDesc)}` : '',
    latestNarration ? `- 最近旁白锚点：${clipText(latestNarration.narrationDesc)}` : ''
  ].filter(Boolean);

  return lines.length > 0
    ? ['【剧情锚点索引】', ...lines]
    : [];
};

const buildStoryDirectorNote = (
  messages: readonly Message[],
  options: StoryRuntimeContextOptions
): string[] => {
  const latestUser = [...messages].reverse().find((message) => message.senderId === 'me' && getMessageFocusText(message));
  const latestRoleOrNpc = [...messages].reverse().find((message) => message.senderId !== 'me' && message.senderId !== 'system' && getMessageFocusText(message));
  const latestAction = [...messages].reverse().find((message) => clipText(message.actionDesc));
  const latestNarration = [...messages].reverse().find((message) => clipText(message.narrationDesc));
  const latestNpc = [...messages].reverse().find((message) => message.isNpc && getMessageFocusText(message));

  const focusLines = [
    latestUser ? `- 用户当前输入：${getSenderLabel(latestUser, options)}：${getMessageFocusText(latestUser)}` : '',
    latestRoleOrNpc ? `- 最近对手戏：${getSenderLabel(latestRoleOrNpc, options)}：${getMessageFocusText(latestRoleOrNpc)}` : '',
    latestAction ? `- 当前动作延续：${getSenderLabel(latestAction, options)}：${clipText(latestAction.actionDesc)}` : '',
    latestNarration ? `- 当前现场变化：${clipText(latestNarration.narrationDesc)}` : '',
    latestNpc ? `- 当前 NPC 线索：${getSenderLabel(latestNpc, options)}：${getMessageFocusText(latestNpc)}` : ''
  ].filter(Boolean);

  const responseFocus = latestUser
    ? `${getSenderLabel(latestUser, options)}：${getMessageFocusText(latestUser)}`
    : '最近一条真实聊天消息';
  const carryAnchor = latestAction
    ? `动作延续：${getSenderLabel(latestAction, options)}：${clipText(latestAction.actionDesc)}`
    : latestNarration
      ? `现场变化：${clipText(latestNarration.narrationDesc)}`
      : latestNpc
        ? `NPC 线索：${getSenderLabel(latestNpc, options)}：${getMessageFocusText(latestNpc)}`
        : latestRoleOrNpc
          ? `对手戏：${getSenderLabel(latestRoleOrNpc, options)}：${getMessageFocusText(latestRoleOrNpc)}`
          : '当前场景与关系状态';

  return [
    '【剧情近端注释】',
    '以下注释靠近本轮输出，只用于维持酒馆式剧情体验；它总结真实消息结构中的当前现场，不是用户台词。',
    '这相当于本轮 Author’s Note：只由结构化消息、当前剧情状态和输出开关生成，不按用户普通正文词面触发或改写规则。',
    ...focusLines,
    '【本轮剧情导演卡】',
    `- 回应焦点：${responseFocus}`,
    `- 承接锚点：${carryAnchor}`,
    '- 推进许可：只推进角色自己的台词、动作、观察、情绪、环境细节或 NPC 反应中的一项。',
    '- 留白要求：必须给用户留下下一步选择空间，不替用户补完未输入的动作、台词、同意、拒绝或心理。',
    '- 层级顺序：最后真实用户输入 > 本轮剧情导演卡/Author’s Note > 当前输出格式锁 > 最近剧情摘要 > 更早历史。',
    '【本轮剧情执行】',
    '- 先回应用户当前输入，再承接最近对手戏、动作、现场变化或 NPC 线索中的一项。',
    '- 只推进角色自己的观察、台词、动作、情绪、环境变化或 NPC 反应；不要替用户说话、行动、同意、拒绝或产生感受。',
    '- 推进幅度要小：保留用户下一步选择空间，不跳过关键选择，不突然换场、跳时间或总结大纲。',
    '- 如果历史格式与当前输出格式冲突，以本轮 JSON 模板、心声/动作开关和剧情模式字段为准。'
  ];
};

export const buildStoryRuntimeContextPrompt = (
  messages: readonly Message[],
  options: StoryRuntimeContextOptions = {}
): string => {
  const maxMessages = Math.max(1, Math.round(Number(options.maxMessages || 8)));
  const sourceMessages = [...(messages || [])]
    .filter(isStoryNarrativeMessage)
    .slice(-maxMessages);
  const formatted = sourceMessages
    .map((message) => formatStoryMessage(message, options))
    .filter(Boolean);

  if (formatted.length === 0) return '';

  return [
    '【剧情连续性锚点】',
    '以下是最近剧情片段的结构化摘要，只用于保持场景、动作、情绪和人物关系连续；不是新的用户台词。',
    ...buildStoryAnchorIndex(sourceMessages, options),
    ...formatted,
    '【剧情承接要求】',
    '- 承接最近出现的地点、动作、情绪、未完成事件和 NPC 发言，让下一句像同一场戏自然继续。',
    '- 如果这里的信息与最后一条真实用户消息冲突，以最后一条真实用户消息为准。',
    '- 不替用户说话，不替用户行动，不替用户决定内心；只推进角色、环境、NPC 或可自然发生的外部变化。',
    STORY_DIRECTOR_BEGIN,
    ...buildStoryDirectorNote(sourceMessages, options),
    STORY_DIRECTOR_END
  ].join('\n');
};
