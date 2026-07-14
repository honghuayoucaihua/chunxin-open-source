import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build } from 'esbuild';

const bundledDir = join(tmpdir(), 'chunxin-story-runtime-context-tests');
mkdirSync(bundledDir, { recursive: true });
const entryFile = join(bundledDir, `storyRuntimeContextEntry-${Date.now()}.ts`);
const bundledFile = join(bundledDir, `storyRuntimeContextEntry-${Date.now()}.mjs`);
writeFileSync(entryFile, `
  export { buildStoryRuntimeContextPrompt } from '${resolve('src/utils/chat/storyRuntimeContext.ts').replace(/\\/g, '/')}';
  export { buildSingleReplyRequestContext } from '${resolve('src/utils/chat/singleReplyRequest.ts').replace(/\\/g, '/')}';
  export { buildGroupReplyRequestContext } from '${resolve('src/utils/chat/groupReplyRequest.ts').replace(/\\/g, '/')}';
`);
await build({
  entryPoints: [entryFile],
  outfile: bundledFile,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  logLevel: 'silent'
});
const {
  buildStoryRuntimeContextPrompt,
  buildSingleReplyRequestContext,
  buildGroupReplyRequestContext
} = await import(`file://${bundledFile.replace(/\\/g, '/')}`) as typeof import('../src/utils/chat/storyRuntimeContext.ts') & typeof import('../src/utils/chat/singleReplyRequest.ts') & typeof import('../src/utils/chat/groupReplyRequest.ts');

(globalThis as any).window = (globalThis as any).window || {
  customEmojis: [],
  customEmojiGroups: [],
  customEmojiGroupSettings: {}
};

const aiSettings: any = {
  provider: 'builtin',
  apiKey: '',
  model: '',
  baseUrl: '',
  responseFormat: 'openai',
  enableDelayReply: false,
  enableSentenceSend: false,
  enableTimeAwareness: false,
  momentInteractionSource: 'random',
  minimaxTTS: {
    enabled: false,
    region: 'official',
    apiKey: '',
    groupId: '',
    model: ''
  },
  promptRuleTree: { enabled: true, disabledRuleIds: [] }
};

const user: any = {
  name: '小满',
  avatar: '',
  gender: 'female',
  region: '杭州',
  signature: '',
  momentsCover: '',
  status: '',
  hobbies: ''
};

const contact: any = {
  id: 'c1',
  name: '林夏',
  pinyin: 'linxia',
  avatar: '',
  unreadCount: 0,
  isAi: true,
  chatMode: 'story',
  persona: '旧友，克制但关心',
  relationship: '朋友'
};

const storyMessages: any[] = [
  {
    id: 'u1',
    senderId: 'me',
    type: 'text',
    content: '我把门推开一点。',
    actionDesc: '指尖停在门把上',
    timestamp: 1
  },
  {
    id: 'm1',
    senderId: 'c1',
    type: 'text',
    content: '别急，里面可能有人。',
    innerVoice: '他担心惊动屋里的人',
    actionDesc: '压低手电光',
    narrationDesc: '走廊尽头传来轻响',
    timestamp: 2
  },
  {
    id: 'npc1',
    senderId: 'npc',
    type: 'text',
    content: '你们终于来了。',
    isNpc: true,
    npcName: '管理员',
    quotedMsg: {
      id: 'u1',
      senderId: 'me',
      content: '我把门推开一点。',
      timestamp: 1,
      type: 'text',
      npcName: '小满'
    },
    timestamp: 3
  }
];

const directPrompt = buildStoryRuntimeContextPrompt(storyMessages, {
  userLabel: '小满',
  contactNameById: { c1: '林夏' }
});
assert.match(directPrompt, /剧情连续性锚点/, '剧情锚点应有独立标题');
assert.match(directPrompt, /【剧情锚点索引】/, '剧情锚点应生成结构化索引，减少模型从历史文本自行猜重点');
assert.match(directPrompt, /最近用户输入：小满：我把门推开一点/, '剧情索引应从 senderId 结构字段定位最近用户输入');
assert.match(directPrompt, /最近角色回应：林夏：别急，里面可能有人/, '剧情索引应从联系人结构定位最近角色回应');
assert.match(directPrompt, /最近 NPC 发言：管理员：你们终于来了/, '剧情索引应从 isNpc/npcName 结构字段定位 NPC 发言');
assert.match(directPrompt, /最近动作锚点：林夏：压低手电光/, '剧情索引应从 actionDesc 结构字段提取动作锚点');
assert.match(directPrompt, /最近旁白锚点：走廊尽头传来轻响/, '剧情索引应从 narrationDesc 结构字段提取旁白锚点');
assert.match(directPrompt, /小满：我把门推开一点/, '锚点应保留最近用户输入');
assert.match(directPrompt, /林夏：别急，里面可能有人/, '锚点应保留角色回应');
assert.match(directPrompt, /动作：压低手电光/, '锚点应保留结构化动作');
assert.match(directPrompt, /旁白：走廊尽头传来轻响/, '锚点应保留结构化旁白');
assert.match(directPrompt, /心声：他担心惊动屋里的人/, '锚点应保留角色心声');
assert.match(directPrompt, /管理员：你们终于来了/, '锚点应保留 NPC 发言');
assert.match(directPrompt, /不替用户说话/, '锚点应保护用户自主');
assert.match(directPrompt, /【剧情近端注释】/, '剧情模式应生成靠近输出端的近端注释');
assert.match(directPrompt, /Author’s Note/, '剧情近端注释应吸收酒馆式近端提示经验');
assert.match(directPrompt, /不按用户普通正文词面触发或改写规则/, '剧情近端注释不应靠用户正文字面触发隐藏规则');
assert.match(directPrompt, /用户当前输入：小满：我把门推开一点/, '近端注释应保留当前用户输入');
assert.match(directPrompt, /最近对手戏：管理员：你们终于来了/, '近端注释应保留最近对手戏');
assert.match(directPrompt, /当前动作延续：林夏：压低手电光/, '近端注释应保留当前动作延续');
assert.match(directPrompt, /当前现场变化：走廊尽头传来轻响/, '近端注释应保留现场变化');
assert.match(directPrompt, /当前 NPC 线索：管理员：你们终于来了/, '近端注释应保留 NPC 线索');
assert.match(directPrompt, /【本轮剧情导演卡】/, '剧情近端注释应生成靠近输出端的导演卡');
assert.match(directPrompt, /回应焦点：小满：我把门推开一点/, '导演卡应用结构化消息确定本轮回应焦点');
assert.match(directPrompt, /承接锚点：动作延续：林夏：压低手电光/, '导演卡应优先承接结构化动作锚点');
assert.match(directPrompt, /推进许可：只推进角色自己的台词、动作、观察、情绪、环境细节或 NPC 反应中的一项/, '导演卡应限制每轮只小步推进一项');
assert.match(directPrompt, /留白要求：必须给用户留下下一步选择空间/, '导演卡应保护用户选择空间');
assert.match(directPrompt, /最后真实用户输入 > 本轮剧情导演卡\/Author’s Note > 当前输出格式锁 > 最近剧情摘要 > 更早历史/, '导演卡应明确近端层级顺序');
assert.match(directPrompt, /【本轮剧情执行】/, '近端注释应包含本轮剧情执行要求');
assert.match(directPrompt, /保留用户下一步选择空间/, '近端注释应防止跳过用户选择');

const actionOnlyUserPrompt = buildStoryRuntimeContextPrompt([
  ...storyMessages,
  {
    id: 'u2',
    senderId: 'me',
    type: 'text',
    content: '',
    actionDesc: '把蓝色通行牌按在门禁上',
    timestamp: 4
  }
], {
  userLabel: '小满',
  contactNameById: { c1: '林夏' }
});
assert.match(
  actionOnlyUserPrompt,
  /最近用户输入：小满：（动作）把蓝色通行牌按在门禁上/,
  '剧情锚点应把用户动作字段视为最近真实输入，而不是只读取正文 content'
);
assert.match(
  actionOnlyUserPrompt,
  /用户当前输入：小满：（动作）把蓝色通行牌按在门禁上/,
  '剧情近端注释应把用户动作输入放进本轮焦点'
);
assert.match(
  actionOnlyUserPrompt,
  /回应焦点：小满：（动作）把蓝色通行牌按在门禁上/,
  '剧情导演卡应回应用户刚输入的结构化动作'
);
assert.match(
  actionOnlyUserPrompt,
  /- 小满：（动作）把蓝色通行牌按在门禁上/,
  '剧情摘要应以明确说话人展示动作-only 用户消息'
);

const noNamePrompt = buildStoryRuntimeContextPrompt([
  {
    id: 'u-empty-name',
    senderId: 'me',
    type: 'text',
    content: '我停在门口。',
    timestamp: 5
  },
  {
    id: 'unknown-role',
    senderId: 'unknown-contact',
    type: 'text',
    content: '门后有脚步声。',
    timestamp: 6
  }
] as any[], {});
assert.doesNotMatch(noNamePrompt, /最近用户输入：用户：|最近角色回应：角色：|^- 用户：|^- 角色：/m, '剧情锚点缺名时不应把用户/角色补成固定名字');
assert.match(noNamePrompt, /用户（发送者，未提供姓名）：我停在门口。/, '剧情锚点缺用户姓名时应使用结构身份标签');
assert.match(noNamePrompt, /角色（未提供姓名）：门后有脚步声。/, '剧情锚点缺角色姓名时应使用结构身份标签');

const promptWithSystemEvents = buildStoryRuntimeContextPrompt([
  ...storyMessages,
  {
    id: 'sys-fail',
    senderId: 'system',
    type: 'system',
    content: 'AI 回复格式无效，请重试',
    timestamp: 4
  },
  {
    id: 'pay-1',
    senderId: 'c1',
    type: 'transfer',
    content: '转账 ¥8.88',
    amount: '8.88',
    timestamp: 5
  }
], {
  userLabel: '小满',
  contactNameById: { c1: '林夏' }
});
assert.doesNotMatch(promptWithSystemEvents, /AI 回复格式无效/, '剧情锚点不应把界面失败提示写入剧情连续性');
assert.doesNotMatch(promptWithSystemEvents, /转账 ¥8\.88/, '剧情锚点不应把支付流水当成剧情片段');
assert.match(promptWithSystemEvents, /最近用户输入：小满：我把门推开一点/, '过滤系统事件后仍应保留最近真实用户输入');
assert.match(promptWithSystemEvents, /最近角色回应：林夏：别急，里面可能有人/, '过滤支付事件后仍应保留最近真实角色回应');

const pollutedStoryPrompt = buildStoryRuntimeContextPrompt([
  {
    id: 'polluted-user',
    senderId: 'me',
    type: 'text',
    content: { text: '旧格式正文不应被强转' },
    actionDesc: { text: '旧格式动作不应被强转' },
    narrationDesc: ['旧格式旁白不应被强转'],
    innerVoice: { text: '旧格式心声不应被强转' },
    timestamp: 7
  },
  {
    id: 'clean-role',
    senderId: 'c1',
    type: 'text',
    content: '我先确认一下门后的动静。',
    timestamp: 8
  }
] as any[], {
  userLabel: '小满',
  contactNameById: { c1: '林夏' }
});
assert.doesNotMatch(pollutedStoryPrompt, /\[object Object\]/, '剧情锚点不应把对象型旧字段强转进近端上下文');
assert.doesNotMatch(pollutedStoryPrompt, /旧格式正文不应被强转|旧格式动作不应被强转|旧格式旁白不应被强转|旧格式心声不应被强转/, '剧情锚点应忽略对象或数组旧格式字段');
assert.doesNotMatch(pollutedStoryPrompt, /最近用户输入：小满/, '对象型用户旧格式字段不应被当作最近真实输入');
assert.match(pollutedStoryPrompt, /最近角色回应：林夏：我先确认一下门后的动静。/, '过滤脏旧格式后仍应保留干净剧情消息');

{
  const context = await buildSingleReplyRequestContext({
    contact,
    historyMessages: storyMessages,
    contactMemories: {},
    worldBooks: [],
    masks: [],
    user,
    aiSettings,
    internalRuntimePrompt: '【本轮剧情输入语义】用户选择了“剧情”输入，应作为当前场景片段处理。'
  });
  assert.match(context.runtimeUserPrompt, /剧情连续性锚点/, '单聊剧情模式应注入剧情连续性锚点');
  assert.match(context.runtimeUserPrompt, /剧情近端注释/, '单聊剧情模式应注入剧情近端注释');
  assert.match(context.runtimeUserPrompt, /本轮剧情导演卡/, '单聊剧情模式应注入剧情导演卡');
  assert.match(context.runtimeUserPrompt, /林夏：别急，里面可能有人/, '单聊剧情锚点应带入联系人名称');
  assert.ok(
    context.runtimeUserPrompt.indexOf('当前用户信息') < context.runtimeUserPrompt.indexOf('本轮剧情输入语义'),
    '单聊运行时提示应先给稳定用户资料，再给本轮输入语义'
  );
  assert.ok(
    context.runtimeUserPrompt.indexOf('本轮剧情输入语义') < context.runtimeUserPrompt.indexOf('剧情连续性锚点'),
    '单聊剧情连续性锚点应排在本轮输入语义之后，靠近运行时提示尾部'
  );
  assert.ok(
    context.runtimeUserPrompt.indexOf('剧情连续性锚点') < context.runtimeUserPrompt.indexOf('本轮剧情导演卡'),
    '单聊剧情导演卡应位于剧情连续性锚点之后'
  );
}

{
  const context = await buildSingleReplyRequestContext({
    contact: { ...contact, chatMode: 'online' },
    historyMessages: storyMessages,
    contactMemories: {},
    worldBooks: [],
    masks: [],
    user,
    aiSettings
  });
  assert.doesNotMatch(context.runtimeUserPrompt, /剧情连续性锚点/, '普通聊天模式不应注入剧情锚点');
}

{
  const groupContact = {
    ...contact,
    id: 'g1',
    name: '调查小队',
    isGroup: true,
    memberIds: ['c1']
  };
  const context = await buildGroupReplyRequestContext({
    contact: groupContact,
    contacts: [contact],
    historyMessages: storyMessages,
    contactMemories: {},
    worldBooks: [],
    masks: [],
    user,
    aiSettings,
    internalRuntimePrompt: '【本轮剧情输入语义】用户选择了“剧情”输入，应作为当前场景片段处理。'
  });
  assert.match(context.runtimeUserPrompt, /剧情连续性锚点/, '群聊剧情模式应注入剧情连续性锚点');
  assert.match(context.runtimeUserPrompt, /剧情近端注释/, '群聊剧情模式应注入剧情近端注释');
  assert.match(context.runtimeUserPrompt, /本轮剧情导演卡/, '群聊剧情模式应注入剧情导演卡');
  assert.match(context.runtimeUserPrompt, /林夏：别急，里面可能有人/, '群聊剧情锚点应使用成员名称');
  assert.ok(
    context.runtimeUserPrompt.indexOf('当前用户信息') < context.runtimeUserPrompt.indexOf('本轮剧情输入语义'),
    '群聊运行时提示应先给稳定用户资料，再给本轮输入语义'
  );
  assert.ok(
    context.runtimeUserPrompt.indexOf('本轮剧情输入语义') < context.runtimeUserPrompt.indexOf('剧情连续性锚点'),
    '群聊剧情连续性锚点应排在本轮输入语义之后，靠近运行时提示尾部'
  );
}

const storyRuntimeSource = readFileSync(new URL('../src/utils/chat/storyRuntimeContext.ts', import.meta.url), 'utf8');
assert.doesNotMatch(storyRuntimeSource, /关键词|keyword/i, '剧情锚点不应通过关键词逻辑触发');
assert.doesNotMatch(storyRuntimeSource, /咖啡|感冒|付款|支付/, '剧情锚点不应内置自然语言词表');
assert.match(storyRuntimeSource, /isStoryNarrativeMessage/, '剧情锚点应先通过结构化消息类型过滤非叙事事件');
assert.match(storyRuntimeSource, /message\.type === 'redpacket' \|\| message\.type === 'transfer'/, '剧情锚点应排除支付流水，避免系统事件污染剧情');

console.log('测试通过：剧情模式使用结构化连续性锚点，不靠关键词猜用户输入。');

rmSync(entryFile, { force: true });
rmSync(bundledFile, { force: true });
