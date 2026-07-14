import type { Contact } from '../../types';
import { resolveLanguageHint } from './languageHints';
import { getContactMetaCapabilities, getContactModeCapabilitySummary } from './modeCapabilities';
import { buildSection } from './promptSectionUtils';
import {
  buildDescriptionInputCapabilityLine,
  buildDescriptionInputDoPriorityLine
} from './descriptionInputPrompt';
import {
  buildSentenceRangeRuleLines,
  isSentenceTagEnabled
} from '../sentenceRange';
import { buildPaymentProtocolLines } from './paymentPrompt';
import { buildSystemAbilityBoundaryLine } from './systemAbilityBoundaryPrompt.ts';

type PersonaPromptOutputInput = {
  contact: Contact;
  imageGenerationEnabled: boolean;
  richActionsPromptEnabled: boolean;
  imagePromptEnabled: boolean;
};

const hasConfiguredVoice = (contact: Contact): boolean => Boolean(
  contact.minimaxTTS?.enabled && String(contact.minimaxTTS?.voiceId || '').trim()
);

const getAbilityNames = (input: PersonaPromptOutputInput) => {
  if (input.contact.chatMode === 'story') return [];
  return [
    '转账',
    '红包',
    '位置',
    '拍一拍',
    '通话',
    ...(input.imagePromptEnabled ? ['图片'] : []),
    ...(hasConfiguredVoice(input.contact) ? ['语音'] : []),
    ...(input.richActionsPromptEnabled ? ['朋友圈', '订阅号'] : []),
    ...(input.imageGenerationEnabled ? ['图像生成请求'] : [])
  ];
};

const buildAbilityLines = (input: PersonaPromptOutputInput) => {
  const abilityNames = getAbilityNames(input);
  return [
    abilityNames.length > 0 ? `- 可用能力：${abilityNames.join('、')}。` : '',
    abilityNames.length > 0 ? '- 普通聊天优先输出正文；只有在语境明确需要时才调用能力标签。' : '',
    abilityNames.length > 0 ? `- ${buildSystemAbilityBoundaryLine({ abilities: ['位置', '拍一拍', '通话', '语音', '朋友圈', '订阅号'] })}` : '',
    input.imagePromptEnabled && input.imageGenerationEnabled
      ? '- 发送现成图片用 image；需要新生成图片时用 imageGen。'
      : '',
    ...buildPaymentProtocolLines({ balance: input.contact.balance }),
    hasConfiguredVoice(input.contact)
      ? `- 语音标签可用：voice_id=${String(input.contact.minimaxTTS?.voiceId || '').trim()}，speed=${Number(input.contact.minimaxTTS?.speed ?? 1)}，language=${input.contact.minimaxTTS?.language || 'Chinese'}。`
      : '',
    input.richActionsPromptEnabled ? `- 每日可发布朋友圈 ${input.contact.socialPostLimit ?? 1} 次、订阅号 ${input.contact.socialPostLimit ?? 1} 次（各自独立计算）。` : '',
    input.richActionsPromptEnabled ? '- 朋友圈/订阅号仅在语境真实需要对外发布时使用。' : ''
  ];
};

const getEnabledSpecialTypes = (input: PersonaPromptOutputInput) => {
  if (input.contact.chatMode === 'story') return [];
  return [
    ...(input.imagePromptEnabled ? ['image'] : []),
    ...(input.imageGenerationEnabled ? ['imageGen'] : []),
    'redpacket',
    'transfer',
    'location',
    'pat',
    'call',
    ...(hasConfiguredVoice(input.contact) ? ['voice'] : []),
    ...(input.richActionsPromptEnabled ? ['moments', 'officialAccount'] : []),
    'templateData'
  ];
};

const getBaseTagTypes = (input: PersonaPromptOutputInput) => {
  const metaCapabilities = getContactMetaCapabilities(input.contact);
  const sentenceTagEnabled = isSentenceTagEnabled(input.contact.sentenceRange);
  return [
    ...(input.contact.chatMode === 'story' || !sentenceTagEnabled ? [] : ['sentence']),
    ...(metaCapabilities.innerEnabled ? ['inner'] : []),
    ...(metaCapabilities.actionEnabled ? ['action'] : []),
    ...(input.contact.chatMode === 'story' ? ['storyInner', 'storyState', 'narration'] : []),
    ...(input.contact.chatMode === 'story' ? [] : ['status']),
    'patDesc',
    'quote',
    ...getEnabledSpecialTypes(input)
  ];
};

const getSchemaTagLines = (input: PersonaPromptOutputInput) => {
  const metaCapabilities = getContactMetaCapabilities(input.contact);
  const sentenceTagEnabled = isSentenceTagEnabled(input.contact.sentenceRange);
  return [
    ...(input.contact.chatMode === 'story' || !input.imagePromptEnabled ? [] : [`    { "type": "image", "url": "真实图片地址或dataURL" }`]),
    ...(input.contact.chatMode === 'story' || !input.imageGenerationEnabled ? [] : [`    { "type": "imageGen", "prompt": "生图提示词", "size": "1920x1920(可选)", "caption": "图片说明(可选)", "options": { "quality": "high" } }`]),
    ...(input.contact.chatMode === 'story' ? [] : [`    { "type": "redpacket", "amount": "8.88", "message": "红包留言" }`]),
    ...(input.contact.chatMode === 'story' ? [] : [`    { "type": "transfer", "amount": "8.88", "message": "转账说明" }`]),
    ...(input.contact.chatMode === 'story' ? [] : [`    { "type": "location", "locationName": "位置名称", "locationAddress": "详细地址" }`]),
    ...(input.contact.chatMode === 'story' ? [] : [`    { "type": "pat", "targetName": "你/我/联系人名" }`]),
    ...(input.contact.chatMode === 'story' ? [] : [`    { "type": "call", "status": "missed|ongoing|ended", "durationSec": 125, "content": "通话说明(可选)" }`]),
    ...(input.contact.chatMode === 'story' || !hasConfiguredVoice(input.contact) ? [] : [`    { "type": "voice", "content": "语音内容", "voiceId": "${String(input.contact.minimaxTTS?.voiceId || '').trim()}", "speed": ${Number(input.contact.minimaxTTS?.speed ?? 1)}, "language": "${input.contact.minimaxTTS?.language || 'Chinese'}" }`]),
    ...(input.contact.chatMode === 'story' || !input.richActionsPromptEnabled ? [] : [`    { "type": "moments", "content": "朋友圈正文", "location": "位置(可选)", "likes": ["昵称"], "comments": [{"user":"昵称","text":"评论","replyTo":"可选"}] }`]),
    ...(input.contact.chatMode === 'story' || !input.richActionsPromptEnabled ? [] : [`    { "type": "officialAccount", "title": "标题", "desc": "正文摘要", "thumb": "封面图(可选)" }`]),
    ...(input.contact.chatMode === 'story' || !sentenceTagEnabled ? [] : [`    { "type": "sentence", "value": "分句文本（可选，用于多句回复）" }`]),
    ...(metaCapabilities.innerEnabled ? [`    { "type": "inner", "value": "心声（按需）" }`] : []),
    ...(metaCapabilities.actionEnabled ? [`    { "type": "action", "value": "动作（按需）" }`] : []),
    ...(input.contact.chatMode === 'story' ? [`    { "type": "storyInner", "value": "内心想法（必填）" }`] : []),
    ...(input.contact.chatMode === 'story' ? [`    { "type": "storyState", "value": "正在做的事情与当下心情（必填）" }`] : []),
    ...(input.contact.chatMode === 'story' ? [`    { "type": "narration", "value": "旁白（第一行请加粗）" }`] : []),
    ...(input.contact.chatMode === 'story' ? [] : [`    { "type": "status", "value": "状态更新" }`]),
    `    { "type": "patDesc", "value": "拍一拍后缀更新" }`,
    `    { "type": "quote", "target": "引用对象", "text": "引用内容" }`,
    `    { "type": "templateData", "templateId": "模板ID", "vars": { "标题": "值", "列表变量": [{"字段1":"值1","字段2":"值2"}] } }`
  ];
};

const getOutputLanguageConfig = (contact: Contact) => {
  const outputLanguage = contact.language || '普通话';
  const languageHint = resolveLanguageHint(outputLanguage);
  const usePairsSchema = outputLanguage !== '普通话' && !!contact.translateToChinese;
  return { outputLanguage, languageHint, usePairsSchema };
};

const buildResponseSchema = (input: PersonaPromptOutputInput) => {
  const schemaTagLines = getSchemaTagLines(input).join(',\n');
  const { outputLanguage, languageHint, usePairsSchema } = getOutputLanguageConfig(input.contact);
  if (input.contact.chatMode === 'story') {
    return `{
  "messages": [
    { "role": "self", "text": "主角台词或叙述" },
    { "role": "npc", "npcName": "NPC名称", "text": "NPC台词" }
  ],
  "text": "单人发言时可用（可选）",
  "tags": [
${schemaTagLines}
  ]
}`;
  }
  if (usePairsSchema) {
    return `{
  "pairs": [
    { "text": "${languageHint || outputLanguage}原文句子1", "translationZh": "简体中文译文1" },
    { "text": "${languageHint || outputLanguage}原文句子2", "translationZh": "简体中文译文2" }
  ],
  "tags": [
${schemaTagLines}
  ]
}`;
  }
  return `{
  "text": "正文内容（不要包含括号动作或心声）",
  "tags": [
${schemaTagLines}
  ]
}`;
};

const buildSequenceRuleLine = (input: PersonaPromptOutputInput) => {
  const metaCapabilities = getContactMetaCapabilities(input.contact);
  const sentenceTagEnabled = isSentenceTagEnabled(input.contact.sentenceRange);
  if (input.contact.chatMode === 'story') {
    return '- **顺序规则**：渲染严格按顺序执行；支持 text/messages 与 tags 交错输出。';
  }
  const sequenceParts = [
    ...(sentenceTagEnabled ? ['sentence'] : []),
    ...(metaCapabilities.innerEnabled ? ['inner'] : []),
    ...(metaCapabilities.actionEnabled ? ['action'] : [])
  ];
  if (sequenceParts.length === 0) {
    return '- **顺序规则**：正文只放在 text 中，不要额外输出 sentence、inner 或 action。';
  }
  return `- **顺序规则**：渲染严格按顺序执行；text 作为首条正文（可选），后续可在 tags 中按出现顺序交错使用 ${sequenceParts.join(' / ')}。`;
};

const buildForbiddenTypeLine = (input: PersonaPromptOutputInput) => {
  if (input.contact.chatMode === 'story') return '';
  const metaCapabilities = getContactMetaCapabilities(input.contact);
  const forbidden = [
    ...(!metaCapabilities.innerEnabled ? ['inner', 'innerVoice', '心声'] : []),
    ...(!metaCapabilities.actionEnabled ? ['action', 'actionDesc', '动作'] : []),
    'storyInner',
    'storyState'
  ];
  if (forbidden.length === 0) return '';
  return `- **禁用格式**：本轮禁止输出 ${forbidden.join('、')}；即使历史里出现过，也不要模仿或补回。`;
};

const buildOutputRules = (input: PersonaPromptOutputInput) => {
  const { outputLanguage, usePairsSchema } = getOutputLanguageConfig(input.contact);
  return [
    '- **必须且只允许输出一个 JSON 对象**，不要输出任何其他文字。',
    '- **禁止二次包裹**：不要输出 {"content":"{...}"}，也不要输出 "content":"{...}" 片段；必须直接输出顶层 JSON。',
    '- **tags 数组**：只放心声、动作、旁白、引用或系统能力等附加结构；剧情里 NPC 发言必须放入 messages 数组，不得用 tags 表示。',
    input.contact.chatMode === 'story'
      ? '- **剧情模式多人发言**：必须使用 messages 数组，按发言顺序逐条输出（self/npc 分开）。'
      : '',
    buildSequenceRuleLine(input),
    buildForbiddenTypeLine(input),
    '- **每个 tag**：至少包含 type 字段；文本类优先使用 value 字段。',
    `- **允许的 type**：${getBaseTagTypes(input).join('、')}。`,
    usePairsSchema
      ? '- **双语模式**：正文只使用 pairs 字段，确保每个 text 与 translationZh 一一对应；不要再输出顶层 text/content/sentences 作为正文。'
      : '- **text 字段**：仅用于正文，不得包含括号动作或心声。',
    input.imagePromptEnabled
      ? '- **图片规则**：当 type=image 时，仅输出 url，且 url 必须为真实图片地址或有效 dataURL。'
      : '',
    input.imageGenerationEnabled && input.contact.chatMode !== 'story'
      ? '- **生图规则**：当需要发起生图时，使用 type=imageGen；必须提供 prompt，不要伪造图片 URL。'
      : '',
    ...buildSentenceRangeRuleLines(input.contact.sentenceRange),
    outputLanguage !== '普通话' && !usePairsSchema
      ? `- **语言规则**：text 必须使用${resolveLanguageHint(outputLanguage) || outputLanguage}输出，不要附带中文翻译字段。`
      : ''
  ];
};

const buildLanguageSection = (contact: Contact) => {
  const { outputLanguage, languageHint, usePairsSchema } = getOutputLanguageConfig(contact);
  if (usePairsSchema) {
    return buildSection('语言要求', [
      `- pairs[*].text 必须使用${languageHint || outputLanguage}输出原文。`,
      '- pairs[*].translationZh 必须是对应句子的简体中文译文。',
      '- pairs 的顺序就是最终消息顺序；不要把译文混进 text，也不要把原文混进 translationZh。'
    ]);
  }
  if (outputLanguage === '普通话') return '';
  return buildSection('语言要求', [
    `- text 必须使用${languageHint || outputLanguage}输出。`,
    '- 不要输出中文翻译字段。'
  ]);
};

export const buildAbilitySection = (input: PersonaPromptOutputInput) =>
  buildSection('能力范围', buildAbilityLines(input));

export const buildModeSection = (contact: Contact) => {
  const modeCapability = getContactModeCapabilitySummary(contact);
  const metaCapabilities = getContactMetaCapabilities(contact);
  const tagLines = modeCapability.tagTemplates.map((tag) => `- 模式标签：${tag}`);
  const lines = [
    contact.chatMode === 'story' ? '- 当前模式：剧情。重点是沉浸式体验与连续推进。' : '',
    contact.chatMode === 'offline-inner' ? '- 当前模式：线下-心声。可同时表达动作与心声。' : '',
    contact.chatMode === 'offline' ? '- 当前模式：线下。可结合动作细节进行见面互动。' : '',
    contact.chatMode === 'online-inner' ? '- 当前模式：线上-心声。正文之外可补充心声。' : '',
    (!contact.chatMode || contact.chatMode === 'online') ? '- 当前模式：线上。以即时聊天为主。' : '',
    buildDescriptionInputCapabilityLine(metaCapabilities, {
      linePrefix: '- ',
      labelPrefix: '前端特色：已开启“说/做”发送；当前允许用户使用：',
      lineSuffix: '。'
    }),
    buildDescriptionInputDoPriorityLine(metaCapabilities, {
      linePrefix: '- '
    }),
    ...tagLines,
    contact.chatMode === 'story' ? '- 若同回合有多人发言，必须拆成 messages[*]，不要把 NPC 台词塞进 tags。' : ''
  ];
  return buildSection('聊天模式', lines);
};

export const buildOutputFormatSection = (input: PersonaPromptOutputInput) => {
  let result = buildSection('回复格式指南', buildOutputRules(input));
  result += `\n\n【JSON 模板】\n${buildResponseSchema(input)}`;
  result += buildLanguageSection(input.contact);
  return result;
};

export const buildRichActionCreationSection = (enabled: boolean) => {
  if (!enabled) return '';
  return buildSection('创作标准（仅当输出 moments/officialAccount 时生效）', [
    '- 严格基于当前角色的人设、经历、价值观与说话习惯进行创作。',
    '- 内容必须具体、有画面感、有细节，不写空泛鸡汤与套话。',
    '- 当输出 moments 时，请同时给出点赞与评论：likes 需为 3-5 条、comments 需为 3-5 条。',
    '- moments.author 固定为 “contact”。',
    '- likes 为昵称字符串数组；comments 为对象数组，结构为 { "user": "评论人", "text": "评论内容", "replyTo": "被回复人(可选)" }。',
    '- 如果是回复评论，不要把“回复某人：”塞进 text；应使用 replyTo 字段表达被回复对象。',
    '- 输出成品，不要解释。'
  ]);
};
