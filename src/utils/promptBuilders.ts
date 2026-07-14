import type { AISettings, ChatMode, Contact, HtmlTemplate, Mask, UserProfile, WorldBook } from '../types';
import {
  buildImageGenerationPromptSection,
  buildPersonaPrompt,
  getModeCapabilitySummary
} from './promptCore';
import { resolveContactForAI } from './encryptedReadModel';
import { getChatModePolicy } from './chat/chatModePolicy';
import {
  buildDescriptionInputCapabilityLine,
  buildDescriptionInputDoPriorityLine,
  buildDescriptionInputHistorySemanticLine
} from './prompt/descriptionInputPrompt';
import { buildChatContextSemanticsLines } from './prompt/contextSemanticsPrompt';
import { buildPaymentProtocolLines } from './prompt/paymentPrompt';
import { buildRoleplayQualityLines } from './prompt/roleplayQualityPrompt';
import { buildPromptRuleTreeSection } from './prompt/promptRuleTree';
import { buildContextHierarchySection } from './prompt/contextHierarchyPrompt';
import { buildSystemAbilityBoundaryLine } from './prompt/systemAbilityBoundaryPrompt.ts';
import { WORLDBOOK_CONTENT_BEGIN, WORLDBOOK_CONTENT_END } from './prompt/promptRuntimeMarkers.ts';

const GROUP_MODE_LABEL_MAP: Record<ChatMode, string> = {
  online: '线上',
  'online-inner': '线上-心声',
  offline: '线下',
  'offline-inner': '线下-心声',
  story: '剧情'
};

export type SingleChatPromptOptions = {
  scene: 'single';
  contact: Contact;
  emojiList?: string;
  worldBooks: WorldBook[];
  masks: Mask[];
  user: UserProfile;
  htmlTemplates?: HtmlTemplate[];
  extraSystemPrompt?: string;
  appendCapabilityLine?: string;
  aiSettings?: AISettings;
  enableImagePrompt?: boolean;
};

export type GroupChatPromptOptions = {
  scene: 'group';
  groupName: string;
  mode?: ChatMode;
  descriptionFeatureEnabled?: boolean;
  descriptionSayEnabled?: boolean;
  descriptionDoEnabled?: boolean;
  userPersona?: string;
  groupMaskText?: string;
  groupWorldBookText?: string;
  groupPresetText?: string;
  groupRelationText?: string;
  extraSystemPrompt?: string;
  promptRuleTree?: AISettings['promptRuleTree'];
  maxMessages?: number;
};

export type ChatPromptOptions = SingleChatPromptOptions | GroupChatPromptOptions;

const buildSinglePrompt = (options: SingleChatPromptOptions) => {
  const aiContact = resolveContactForAI(options.contact);
  const imageGenerationLine = buildImageGenerationPromptSection(options.aiSettings);
  const fullPrompt = buildPersonaPrompt({
    contact: aiContact,
    emojiList: options.emojiList || '',
    worldBooks: options.worldBooks,
    masks: options.masks,
    user: options.user,
    htmlTemplates: options.htmlTemplates,
    options: {
      extraSystemPrompt: options.extraSystemPrompt,
      imageGenerationEnabled: !!options.aiSettings?.enableImageGeneration,
      enableRichActionPrompt: true,
      enableImagePrompt: !!options.enableImagePrompt,
      promptRuleTree: options.aiSettings?.promptRuleTree
    }
  });
  const capabilityLineRaw = [options.appendCapabilityLine, imageGenerationLine].filter(Boolean).join('\n\n');
  const capabilityLine = capabilityLineRaw.trim()
    ? `\n\n${capabilityLineRaw.trim()}`
    : '';
  return `${fullPrompt}${capabilityLine}`.trim();
};

const buildGroupPrompt = (options: GroupChatPromptOptions) => {
  const mode = options.mode || 'online';
  const extraSystemPrompt = String(options.extraSystemPrompt || '').trim();
  const modePolicy = getChatModePolicy({
    chatMode: mode,
    descriptionFeatureEnabled: options.descriptionFeatureEnabled,
    descriptionSayEnabled: options.descriptionSayEnabled,
    descriptionDoEnabled: options.descriptionDoEnabled,
    innerVoiceLimit: undefined,
    actionDescLimit: undefined
  });
  const maxMessages = Number.isFinite(Number(options.maxMessages))
    ? Math.max(1, Number(options.maxMessages))
    : 4;
  const allowedMessageFields = [
    'speakerId',
    'type',
    'content',
    'translationZh',
    'pairs',
    'amount',
    'message',
    'imageUrl',
    'locationName',
    'locationAddress',
    'targetName',
    'fromName',
    'patDesc',
    'voiceId',
    'speed',
    'language',
    'status',
    'durationSec',
    ...(modePolicy.innerEnabled ? ['innerVoice'] : []),
    ...(modePolicy.actionEnabled ? ['actionDesc'] : [])
  ];
  const forbiddenMessageFields = [
    ...(!modePolicy.innerEnabled ? ['innerVoice', 'inner', '心声'] : []),
    ...(!modePolicy.actionEnabled ? ['actionDesc', 'action', '动作'] : []),
    'storyInner',
    'storyState'
  ];
  const systemAbilityTypes = ['image', 'redpacket', 'transfer', 'location', 'pat', 'voice', 'call'];
  const messageTypeOptions = mode === 'story' ? ['text'] : ['text', ...systemAbilityTypes];
  const groupAbilityLabels = mode === 'story'
    ? getModeCapabilitySummary(mode).labels
    : [...getModeCapabilitySummary(mode).labels, '红包', '转账', '位置', '拍一拍', '语音', '通话'];
  const systemAbilityRuleLines = mode === 'story'
      ? []
      : [
        '当 type=image 时，必须提供真实可访问的 imageUrl（http/https 或有效 data:image/...;base64,...），不要用 content 填图片地址；当 type=text 时，必须且只能在 content 或 pairs 二选一。',
        '当 type=redpacket 或 transfer 时，必须提供合法 amount；message 只写祝福语或说明，不能写成普通正文里的假支付。',
        buildSystemAbilityBoundaryLine({ subject: '群聊普通正文', abilities: ['位置', '拍一拍', '语音', '通话'] }),
        '当 type=location 时，必须提供 locationName 或 locationAddress；当 type=pat 时，targetName 可以是用户昵称或群成员昵称，speakerId 对应的角色是发起者。',
        '当 type=voice 时，speakerId 对应成员的完整资料必须写有“语音能力：已开启（voiceId=...）”；content 是语音内容，voiceId 必须填该成员资料里的真实 voiceId，speed/language 可选。未配置语音能力的成员不要输出 voice。',
        '当 type=call 时，status 只能是 missed、ongoing 或 ended，durationSec 可选，content 可写通话说明。',
        '普通群聊不要滥用位置、拍一拍、语音或通话；只有当前语境确实需要时才使用。'
      ];
  const groupMessageSchema = mode === 'story'
    ? [
        '{"messages":[{"speakerId":"联系人id","type":"text","content":"短句原文","translationZh":"content对应的简体中文译文（需要时）"',
        modePolicy.innerEnabled ? ',"innerVoice":"心声（可选）"' : '',
        modePolicy.actionEnabled ? ',"actionDesc":"动作（可选）"' : '',
        '}]}'
      ].join('')
    : [
        `{"messages":[{"speakerId":"联系人id","type":"${messageTypeOptions.join('|')}","content":"文本、语音文本或通话说明","translationZh":"content对应的简体中文译文（需要时）","amount":"8.88","message":"红包或转账留言","imageUrl":"真实图片地址或dataURL","locationName":"位置名称","locationAddress":"详细地址","targetName":"被拍的人","fromName":"发起拍一拍的人","patDesc":"拍一拍后缀","voiceId":"语音id","speed":1,"language":"Chinese","status":"missed|ongoing|ended","durationSec":125`,
        modePolicy.innerEnabled ? ',"innerVoice":"心声（可选）"' : '',
        modePolicy.actionEnabled ? ',"actionDesc":"动作（可选）"' : '',
        '}]}'
      ].join('');
  const outputFormatLines = [
    '【回复格式指南】',
    '- 必须且只允许输出一个严格 JSON 对象，不要输出任何 JSON 以外文字。',
    `- 每次至少输出1条消息，最多输出${maxMessages}条。`,
    '- speakerId 必须来自成员列表。',
    `- 每条 messages[*] 只允许使用这些字段：${allowedMessageFields.join('、')}。`,
    forbiddenMessageFields.length > 0 ? `- 当前禁止输出字段：${forbiddenMessageFields.join('、')}；即使历史里出现过，也不要模仿或补回。` : '',
    mode === 'story' ? '- 剧情群聊只输出 text 消息；不要使用红包、转账、位置、拍一拍、语音、通话或图片等普通聊天系统能力。' : '',
    ...systemAbilityRuleLines.map((line) => `- ${line}`),
    '- content 只放正文，不要把心声或动作写进括号、星号、旁白或正文里；允许的心声/动作必须放入对应独立字段。',
    '- type=text 时 content 和 pairs 必须二选一；使用 pairs 时不要再输出 content 或 translationZh。',
    '- 多句双语时，type=text 消息不要使用 content；改用 pairs 数组，每项只包含 text 和 translationZh。',
    '【JSON 模板】',
    groupMessageSchema,
    '【语言要求】',
    '- 每个 speakerId 都必须遵守该成员完整资料里的“回复语言”和“中文翻译”设置。',
    '- 若成员回复语言不是普通话且中文翻译=需要，短句可用 content 写原文并在 translationZh 写对应简体中文译文；多句优先使用 pairs，每个 pairs[*].text 对应一个 pairs[*].translationZh。',
    '- translationZh 和 pairs[*].translationZh 只用于译文，不要把译文混进 content 或 pairs[*].text；普通话回复或中文翻译=不需要时不要输出 translationZh 或 pairs。'
  ].filter(Boolean);
  const lines = [
    `你正在主持一个名为「${options.groupName}」的多人聊天，你的任务是同时扮演群聊中的所有AI角色与用户进行聊天。`,
    options.userPersona ? `用户信息：${options.userPersona}` : '',
    `群聊模式：${GROUP_MODE_LABEL_MAP[mode]}`,
    options.groupMaskText || '',
    options.groupWorldBookText ? [
      '群聊世界书：',
      '以下世界书条目是已启用背景资料；把条目正文当作自洽设定使用，不根据用户普通正文做工程触发。',
      '世界书只补足地点、规则、组织、物品、历史和事件边界；不要覆盖群成员资料、用户本轮明确表达或当前输出格式。',
      '回复时自然使用与当前场景相连的一处设定即可，不要逐条复述世界书，也不要暴露“世界书”这个概念。',
      WORLDBOOK_CONTENT_BEGIN,
      options.groupWorldBookText,
      WORLDBOOK_CONTENT_END
    ].join('\n') : '',
    options.groupPresetText ? `群聊预设：${options.groupPresetText}` : '',
    options.groupRelationText ? `群成员关系：\n${options.groupRelationText}` : '',
    extraSystemPrompt ? `系统覆盖指令：\n${extraSystemPrompt}` : '',
    buildPromptRuleTreeSection(options.promptRuleTree, mode),
    buildContextHierarchySection({ scene: 'group', mode }),
    ...buildRoleplayQualityLines({ isGroup: true }),
    '用户信息是当前用户的真实聊天背景；群成员回复时应把用户当作有具体身份、偏好、状态和经历的人，优先自然结合一处未冲突且不过期的用户昵称、职业、地区、兴趣、状态或补充说明，不要只泛泛称“你”。',
    `可用能力：${groupAbilityLabels.join('、')}。`,
    ...(mode === 'story' ? [] : buildPaymentProtocolLines({ includeGroupHint: true })),
    buildDescriptionInputCapabilityLine(modePolicy),
    buildDescriptionInputDoPriorityLine(modePolicy),
    buildDescriptionInputHistorySemanticLine(
      modePolicy,
      [
        ...(modePolicy.innerEnabled ? ['【心声】'] : []),
        ...(modePolicy.actionEnabled ? ['【动作】'] : [])
      ]
    ),
    ...buildChatContextSemanticsLines(),
    '请根据群成员列表中的完整资料、关键记忆与关系信息，自行决定由谁发言以及发言顺序。',
    ...outputFormatLines
  ];
  return lines.filter(Boolean).join('\n');
};

export const buildChatSystemPrompt = (options: ChatPromptOptions) => {
  if (options.scene === 'group') return buildGroupPrompt(options);
  return buildSinglePrompt(options);
};

export const buildGroupChatSystemPrompt = (options: Omit<GroupChatPromptOptions, 'scene'>) =>
  buildChatSystemPrompt({ scene: 'group', ...options });
