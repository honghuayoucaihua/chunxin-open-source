import type { Contact, HtmlTemplate, Mask, UserProfile, WorldBook } from '../../types/index.ts';
import { buildSection } from './promptSectionUtils.ts';
import { extractTemplateLoopMetas } from '../htmlTemplate/templateVarExtractor.ts';
import { buildChatContextSemanticsLines } from './contextSemanticsPrompt.ts';
import { buildRoleplayQualityLines } from './roleplayQualityPrompt.ts';
import { WORLDBOOK_CONTENT_BEGIN, WORLDBOOK_CONTENT_END } from './promptRuntimeMarkers.ts';
import { buildRoleStatusTemporalHint, buildUserStatusTemporalHint } from './userStatusTemporalHint.ts';

type UserInfoInput = {
  contact: Contact;
  masks: readonly Mask[];
  user: UserProfile;
};

type WorldBookInput = {
  contact: Contact;
  worldBooks: readonly WorldBook[];
};

const GENDER_LABELS: Record<string, string> = {
  male: '男',
  female: '女',
  other: '其他'
};

const getOpeningByMode = (contactName: string, mode: Contact['chatMode']) => {
  if (mode === 'story') {
    return `你正在扮演角色「${contactName}」，与用户共同推进一段沉浸式剧情。请始终以角色身份回应，并让每次回复都服务于剧情、关系或情绪的真实推进。`;
  }
  if (mode === 'offline' || mode === 'offline-inner') {
    return `你正在扮演角色「${contactName}」，与用户进行一场线下见面互动。请始终以角色身份回应，并在需要时自然带出动作、环境与情绪细节。`;
  }
  return `你正在扮演角色「${contactName}」，与用户进行自然、生活化的即时聊天。请始终以角色身份回应，语气像真实联系人一样自然。`;
};

const buildBasicRoleLines = (contact: Contact) => {
  const lines = [
    contact.relationship?.trim() ? `- 与用户关系：${contact.relationship.trim()}` : '',
    contact.age ? `- 年龄：${contact.age}岁` : '',
    contact.gender ? `- 性别：${GENDER_LABELS[contact.gender] || contact.gender}` : '',
    contact.region?.trim() ? `- 地区：${contact.region.trim()}` : '',
    contact.occupation?.trim() ? `- 职业：${contact.occupation.trim()}` : '',
    contact.constellation?.trim() ? `- 星座：${contact.constellation.trim()}` : '',
    contact.mbti?.trim() ? `- MBTI：${contact.mbti.trim()}` : '',
    contact.personalityTraits?.trim() ? `- 性格特质：${contact.personalityTraits.trim()}` : '',
    contact.hobbies?.trim() ? `- 兴趣爱好：${contact.hobbies.trim()}` : '',
    contact.description?.trim() ? `- 人物描述：${contact.description.trim()}` : '',
    contact.signature?.trim() ? `- 个性签名：${contact.signature.trim()}` : '',
    contact.status?.trim() ? `- 状态：${contact.status.trim()}` : '',
    buildRoleStatusTemporalHint(contact.status),
    contact.catchphrase?.trim() ? `- 口头禅：${contact.catchphrase.trim()}（仅在特别自然时偶尔使用）` : ''
  ];
  return lines.filter(Boolean);
};

const buildStructuredPersonaLines = (contact: Contact) => {
  const lines = [
    contact.persona?.trim() ? `- 核心人设：${contact.persona.trim()}` : '',
    contact.background?.trim() ? `- 背景故事：${contact.background.trim()}` : '',
    contact.expressionStyle?.trim() ? `- 表达风格：${contact.expressionStyle.trim()}` : ''
  ];
  return lines.filter(Boolean);
};

const buildBaseUserLines = (user: UserProfile) => [
  user.name?.trim() ? `- 昵称：${user.name.trim()}` : '',
  user.gender ? `- 性别：${GENDER_LABELS[user.gender] || user.gender}` : '',
  user.age ? `- 年龄：${user.age}岁` : '',
  user.region?.trim() ? `- 地区：${user.region.trim()}` : '',
  user.signature?.trim() ? `- 签名：${user.signature.trim()}` : '',
  user.status?.trim() ? `- 状态：${user.status.trim()}` : '',
  user.constellation?.trim() ? `- 星座：${user.constellation.trim()}` : '',
  user.mbti?.trim() ? `- MBTI：${user.mbti.trim()}` : '',
  user.occupation?.trim() ? `- 职业：${user.occupation.trim()}` : '',
  user.personalityTraits?.trim() ? `- 性格：${user.personalityTraits.trim()}` : '',
  user.hobbies?.trim() ? `- 兴趣爱好：${user.hobbies.trim()}` : '',
  user.description?.trim() ? `- 关于用户：${user.description.trim()}` : '',
  user.persona?.trim() ? `- 用户人设：${user.persona.trim()}` : '',
  user.background?.trim() ? `- 背景：${user.background.trim()}` : '',
  user.expressionStyle?.trim() ? `- 表达风格：${user.expressionStyle.trim()}` : '',
  user.styleFeatures?.trim() ? `- 风格特点：${user.styleFeatures.trim()}` : '',
  user.speakingStyle?.trim() ? `- 说话方式：${user.speakingStyle.trim()}` : '',
  user.personality?.trim() ? `- 补充设定：${user.personality.trim()}` : '',
  user.goals?.trim() ? `- 目标：${user.goals.trim()}` : '',
  user.catchphrase?.trim() ? `- 口头禅：${user.catchphrase.trim()}` : '',
  user.patDesc?.trim() ? `- 拍一拍：${user.patDesc.trim()}` : ''
].filter(Boolean);

const buildMaskUserLines = (selectedMask: Mask | null) => {
  if (!selectedMask) return [];
  return [
    selectedMask.name ? `- 当前聊天面具：${selectedMask.name}` : '',
    selectedMask.age ? `- 面具年龄：${selectedMask.age}岁` : '',
    selectedMask.gender ? `- 面具性别：${GENDER_LABELS[selectedMask.gender] || selectedMask.gender}` : '',
    selectedMask.constellation?.trim() ? `- 面具星座：${selectedMask.constellation.trim()}` : '',
    selectedMask.mbti?.trim() ? `- 面具MBTI：${selectedMask.mbti.trim()}` : '',
    selectedMask.occupation?.trim() ? `- 面具职业：${selectedMask.occupation.trim()}` : '',
    selectedMask.personalityTraits?.trim() ? `- 面具性格：${selectedMask.personalityTraits.trim()}` : '',
    selectedMask.hobbies?.trim() ? `- 面具兴趣爱好：${selectedMask.hobbies.trim()}` : '',
    selectedMask.description?.trim() ? `- 面具说明：${selectedMask.description.trim()}` : '',
    selectedMask.catchphrase?.trim() ? `- 面具口头禅：${selectedMask.catchphrase.trim()}` : ''
  ].filter(Boolean);
};

const buildUserLines = (input: UserInfoInput) => {
  const selectedMask = input.contact.selectedMaskId
    ? input.masks.find((mask) => mask.id === input.contact.selectedMaskId) || null
    : null;
  return [
    ...buildBaseUserLines(input.user),
    ...buildMaskUserLines(selectedMask)
  ];
};

const getBehaviorLinesByMode = (mode: Contact['chatMode']) => {
  if (mode === 'story') {
    return [
      '- 以剧情推进为先，每次回复至少推进场景、关系、情绪或事件中的一项。',
      '- 允许更完整的动作、环境与心理描写，但要具体、克制，并服务当前剧情。'
    ];
  }
  if (mode === 'offline' || mode === 'offline-inner') {
    return [
      '- 以见面互动为核心，必要时自然补充动作、表情、距离感与环境细节。',
      '- 保持口语化，不要写成堆砌辞藻的小说腔。'
    ];
  }
  return [
    '- 以自然口语聊天为主，优先简洁、直接、像真人。',
    '- 有内容时再展开，不用空泛套话和重复寒暄。'
  ];
};

export const buildOpeningPrompt = (contact: Contact, contactName: string) =>
  getOpeningByMode(contactName, contact.chatMode);

export const buildRoleProfileSection = (contact: Contact) => {
  const structuredPersonaLines = buildStructuredPersonaLines(contact);
  return buildSection('角色资料', [
    ...buildBasicRoleLines(contact),
    ...structuredPersonaLines
  ]);
};

export const buildUserInfoSection = (input: UserInfoInput) =>
  buildSection('用户信息', [
    ...buildUserLines(input),
    input.contact.userPersona?.trim() ? `- 额外说明：${input.contact.userPersona.trim()}` : '',
    buildUserStatusTemporalHint(input.user.status),
    '- 使用方式：这是当前正在聊天的用户资料；回复应把用户当作有具体身份、偏好、状态和经历的人，优先自然带出一处未冲突且不过期的信息，不要只泛泛称“你”。',
    '- 如果设置了当前聊天面具，优先按面具作为用户在这段关系里的身份表现；用户基础资料仍可作为背景信息自然引用。',
    '- 不要把用户资料当成档案逐条复述；只在相关语境里引用一两处具体信息，让对话像真的认识对方。',
    '- 如果用户本轮表达和这里的信息冲突，以用户本轮说法为准；资料缺失时不要编造。'
  ]);

export const buildWorldBookSection = (input: WorldBookInput) => {
  let enabledBooks: readonly import('../../types').WorldBook[];
  if (input.contact.useCustomWorldBooks === true) {
    // 使用自定义配置：只使用 contact.worldBookIds 指定的世界书
    enabledBooks = input.worldBooks.filter(
      (book) => book.enabled && input.contact.worldBookIds?.includes(book.id)
    );
  } else {
    // 使用全局配置：使用所有已启用的世界书
    enabledBooks = input.worldBooks.filter((book) => book.enabled);
  }
  const lines = enabledBooks
    .map((book) => {
      const entries = book.entries.map((entry) => entry.text).filter(Boolean).join('；');
      return entries ? `【${book.name}】${entries}` : '';
    })
    .filter(Boolean);
  return buildSection('世界观设定', [
    '以下世界书条目是已启用背景资料；把条目正文当作自洽设定使用，不根据用户普通正文做工程触发。',
    '世界书只补足地点、规则、组织、物品、历史和事件边界；不要覆盖角色资料、用户本轮明确表达或当前输出格式。',
    '回复时自然使用与当前场景相连的一处设定即可，不要逐条复述世界书，也不要暴露“世界书”这个概念。',
    lines.length > 0 ? WORLDBOOK_CONTENT_BEGIN : '',
    ...lines,
    lines.length > 0 ? WORLDBOOK_CONTENT_END : ''
  ]);
};

export const buildBehaviorSection = (contact: Contact) =>
  buildSection('行为与互动', [
    '- 全程保持角色身份，不要提及 AI、模型、系统、提示词或”设定”等幕后概念。',
    '- 角色资料、双方关系、用户信息和长期记忆是持续背景；近期聊天只用于补充当前语境，不能冲掉已确认的人设与关系。',
    '- 回复要把用户当作有具体身份、偏好、状态和经历的人；优先自然使用一处用户昵称、职业、地区、兴趣、状态或补充说明，不要只用泛泛的“你”。',
    '- 信息优先级：本轮用户明确表达 > 角色资料/双方关系/长期记忆 > 最近聊天上下文 > 不确定推测；不确定时保持含蓄，不要硬编事实。',
    '- 只补全自己的发言、动作、情绪与想法，不替用户说话，也不替用户做决定。',
    '- 回复贴合双方关系和当前语境，避免说教、催促、爹味、空泛鸡汤与机械复述。',
    '- 表达尽量具体，不堆叠同义词，不反复复述同一信息。',
    ...buildRoleplayQualityLines({ linePrefix: '- ' }),
    ...buildChatContextSemanticsLines({ linePrefix: '- ' }),
    ...getBehaviorLinesByMode(contact.chatMode)
  ]);

type HtmlTemplateInput = {
  contact: Contact;
  htmlTemplates: readonly HtmlTemplate[];
};

export const buildHtmlTemplateSection = (input: HtmlTemplateInput) => {
  let enabledTemplates: readonly import('../../types').HtmlTemplate[];
  if (input.contact.useCustomHtmlTemplates === true) {
    // 使用自定义配置：只使用 contact.htmlTemplateIds 指定的模板
    const templateIds = input.contact.htmlTemplateIds;
    if (!templateIds || templateIds.length === 0) return '';
    enabledTemplates = input.htmlTemplates.filter(
      (tpl) => tpl.enabled && templateIds.includes(tpl.id)
    );
  } else {
    // 使用全局配置：使用所有已启用的模板
    enabledTemplates = input.htmlTemplates.filter((tpl) => tpl.enabled);
  }
  if (enabledTemplates.length === 0) return '';
  const lines: string[] = [
    '以下 HTML 模板来自当前已启用配置；只有确实需要发送结构化卡片时，才在 tags 中输出 templateData 类型标签，内含 templateId 和 vars 对象。',
    '不要根据用户普通正文里的某个关键词自动触发模板；模板输出必须服务当前回复内容，并遵守当前聊天模式和系统能力边界。',
    '不要输出完整HTML，只输出变量值即可。',
    '',
    '重要：模板变量分为「顶层变量」与「循环列表变量」。',
    '- 顶层变量：直接放在 vars 中，如 "标题": "..."。',
    '- 循环列表变量：vars.列表名 必须输出 JSON 数组；每项为对象，且必须包含循环块内用到的字段。',
    '- 不要把循环块字段放到 vars 顶层，否则渲染会回退到外层变量，导致循环列表“每行都一样”。',
    '示例（正确）：',
    '"交易列表": [{"名称":"早餐","金额":"¥25"},{"名称":"地铁","金额":"¥6"}]',
    '示例（错误）：',
    '"名称":"早餐","金额":"¥25","交易列表":[{},{}]',
    '绝对不要把数组变量输出为字符串。'
  ];
  enabledTemplates.forEach((tpl) => {
    const loopMetas = extractTemplateLoopMetas(tpl.htmlContent || '');
    const loopFieldMap = new Map(loopMetas.map((item) => [item.listName, item.fields]));
    const loopListNames = new Set(loopMetas.map((item) => item.listName));
    const definedVarNames = new Set((tpl.variables || []).map((v) => v.name));

    lines.push(`\n【模板：${tpl.name}】(id: ${tpl.id})`);
    if (tpl.description) lines.push(`说明：${tpl.description}`);
    lines.push('变量：');
    (tpl.variables || []).forEach((v) => {
      const example = v.example ? `（例：${v.example}）` : '';
      const isLoopArray = v.type === 'array' || loopListNames.has(v.name);
      if (!isLoopArray) {
        lines.push(`  - ${v.name}: ${v.description}${example}`);
        return;
      }
      const fields = loopFieldMap.get(v.name) || [];
      const fieldHint = fields.length > 0 ? `，字段必须包含：${fields.join('、')}` : '';
      lines.push(`  - ${v.name}（数组，每项为对象${fieldHint}）: ${v.description}${example}`);
    });

    // 模板中存在循环块但未在变量定义中列出的列表：仍需提示AI必须输出
    loopMetas.forEach((meta) => {
      if (definedVarNames.has(meta.listName)) return;
      const fields = meta.fields || [];
      const fieldHint = fields.length > 0 ? `，字段必须包含：${fields.join('、')}` : '';
      lines.push(`  - ${meta.listName}（数组，每项为对象${fieldHint}）:（模板中检测到循环块，但未在变量定义中列出）`);
    });
  });
  return buildSection('HTML变量', lines);
};
