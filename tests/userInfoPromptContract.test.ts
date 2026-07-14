import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build } from 'esbuild';
import { buildRuntimeUserPersonaPrompt, buildUserPersonaSummary } from '../src/services/personaSummary.ts';
import { buildUserInfoSection, buildBehaviorSection } from '../src/utils/prompt/personaPromptSections.ts';
import { buildAnonymousRuntimeUserPrompt } from '../src/app/anonymousChatUtils.ts';
import type { AISettings, Contact, Mask, Message, UserProfile } from '../src/types/index.ts';

const promptBuildersSource = readFileSync(new URL('../src/utils/promptBuilders.ts', import.meta.url), 'utf8');
const singleReplyRequestSource = readFileSync(new URL('../src/utils/chat/singleReplyRequest.ts', import.meta.url), 'utf8');
const groupReplyRequestSource = readFileSync(new URL('../src/utils/chat/groupReplyRequest.ts', import.meta.url), 'utf8');
const chatRuntimeContextSource = readFileSync(new URL('../src/hooks/useChatRuntimeContext.ts', import.meta.url), 'utf8');
const anonymousSessionFlowSource = readFileSync(new URL('../src/app/anonymousSessionFlow.ts', import.meta.url), 'utf8');
const forumAISource = readFileSync(new URL('../src/forum/hooks/useForumAI.ts', import.meta.url), 'utf8');
const forumSubPagesSource = readFileSync(new URL('../src/forum/ForumSubPages.tsx', import.meta.url), 'utf8');
const forumSubViewsSource = readFileSync(new URL('../src/app/subviews/forumSubViews.tsx', import.meta.url), 'utf8');
const contentSubViewDispatcherSource = readFileSync(new URL('../src/app/subviewDispatchers/contentSubViewDispatcher.tsx', import.meta.url), 'utf8');

const user: UserProfile = {
  name: '小满',
  wechatId: 'xiaoman_01',
  avatar: '',
  gender: 'female',
  region: '杭州',
  signature: '慢慢来，也会到',
  momentsCover: '',
  status: '最近在准备考试',
  age: '24',
  constellation: '巨蟹座',
  mbti: 'INFP',
  occupation: '插画师',
  personalityTraits: '慢热但细腻',
  hobbies: '咖啡、散步、画画',
  description: '容易被细节打动',
  persona: '熟人面前会放松，陌生时比较慢热',
  background: '最近从自由接稿转向稳定项目',
  expressionStyle: '喜欢先轻轻开玩笑再说正事',
  styleFeatures: '回复偏短，但会记得细节',
  speakingStyle: '口语自然，偶尔自嘲',
  goals: '希望保持规律作息',
  catchphrase: '先喝口水',
  patDesc: '提醒我别熬夜'
};

const contact: Contact = {
  id: 'c1',
  name: '林夏',
  pinyin: 'linxia',
  avatar: '',
  unreadCount: 0,
  relationship: '朋友',
  userPersona: '和林夏熟悉后会更愿意开玩笑'
};

const selectedMask: Mask = {
  id: 'mask-1',
  name: '咖啡店打工人',
  occupation: '咖啡师',
  hobbies: '拉花、夜跑',
  description: '下班后话会变多',
  createdAt: 1
};

const aiSettings: AISettings = {
  provider: 'builtin',
  apiKey: '',
  model: '',
  baseUrl: '',
  responseFormat: 'openai',
  enableDelayReply: false,
  enableSentenceSend: false,
  enableTimeAwareness: true,
  momentInteractionSource: 'none',
  minimaxTTS: {
    enabled: false,
    region: 'official',
    apiKey: '',
    groupId: '',
    model: ''
  }
};

const bundledDir = join(tmpdir(), 'chunxin-user-info-prompt-tests');
mkdirSync(bundledDir, { recursive: true });
const entryFile = join(bundledDir, `requestContextEntry-${Date.now()}.ts`);
const bundledFile = join(bundledDir, `requestContextEntry-${Date.now()}.mjs`);
writeFileSync(entryFile, `
  export { buildSingleReplyRequestContext } from '${resolve('src/utils/chat/singleReplyRequest.ts').replace(/\\/g, '/')}';
  export { buildGroupReplyRequestContext } from '${resolve('src/utils/chat/groupReplyRequest.ts').replace(/\\/g, '/')}';
  export { buildRuntimePromptWithUserContext } from '${resolve('src/hooks/useChatRuntimeContext.ts').replace(/\\/g, '/')}';
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
  buildSingleReplyRequestContext,
  buildGroupReplyRequestContext,
  buildRuntimePromptWithUserContext
} = await import(`file://${bundledFile.replace(/\\/g, '/')}`) as typeof import('../src/utils/chat/singleReplyRequest.ts') & typeof import('../src/utils/chat/groupReplyRequest.ts') & typeof import('../src/hooks/useChatRuntimeContext.ts');
const testWindow = (globalThis as any).window || {};
(globalThis as any).window = {
  customEmojis: [],
  emojiGroups: [],
  allGroupEmojis: {},
  hiddenEmojiIds: [],
  customEmojiOrder: [],
  ...testWindow
};

{
  const summary = buildUserPersonaSummary(user);
  assert.match(summary, /微信号：xiaoman_01/, '用户摘要应包含微信号');
  assert.match(summary, /地区：杭州/, '用户摘要应包含地区');
  assert.match(summary, /签名：慢慢来，也会到/, '用户摘要应包含签名');
  assert.match(summary, /状态：最近在准备考试/, '用户摘要应包含状态');
  assert.match(summary, /口头禅：先喝口水/, '用户摘要应包含口头禅');
  assert.match(summary, /用户人设：熟人面前会放松/, '用户摘要应包含用户人设扩展字段');
  assert.match(summary, /背景：最近从自由接稿转向稳定项目/, '用户摘要应包含用户背景');
  assert.match(summary, /表达风格：喜欢先轻轻开玩笑再说正事/, '用户摘要应包含表达风格');
  assert.match(summary, /目标：希望保持规律作息/, '用户摘要应包含目标');
  assert.match(summary, /拍一拍：提醒我别熬夜/, '用户摘要应包含拍一拍资料');
}

{
  const section = buildUserInfoSection({ contact, masks: [], user });
  assert.match(section, /昵称：小满/, '单聊用户信息应包含昵称');
  assert.match(section, /用户人设：熟人面前会放松/, '单聊用户信息应包含用户人设扩展字段');
  assert.match(section, /背景：最近从自由接稿转向稳定项目/, '单聊用户信息应包含用户背景');
  assert.match(section, /表达风格：喜欢先轻轻开玩笑再说正事/, '单聊用户信息应包含表达风格');
  assert.match(section, /额外说明：和林夏熟悉后会更愿意开玩笑/, '单聊用户信息应包含联系人专属用户说明');
  assert.match(section, /状态时效：用户状态“最近在准备考试”可能是近期或临时状态/, '单聊用户信息应标记用户状态的时效性');
  assert.match(section, /回复应把用户当作有具体身份、偏好、状态和经历的人/, '单聊用户信息应说明如何自然使用资料');
  assert.match(section, /优先自然带出一处未冲突且不过期的信息/, '单聊用户信息应通过结构化资料规则要求自然引用资料');
  assert.match(section, /不要把用户资料当成档案逐条复述/, '单聊用户信息应避免资料复读');
  assert.match(section, /资料缺失时不要编造/, '单聊用户信息应禁止编造用户资料');
}

{
  const section = buildUserInfoSection({
    contact: { ...contact, selectedMaskId: selectedMask.id },
    masks: [selectedMask],
    user
  });
  assert.match(section, /昵称：小满/, '启用面具后仍应保留用户基础昵称');
  assert.match(section, /地区：杭州/, '启用面具后仍应保留用户基础地区');
  assert.match(section, /当前聊天面具：咖啡店打工人/, '启用面具后应包含当前聊天面具');
  assert.match(section, /面具职业：咖啡师/, '启用面具后应包含面具资料');
  assert.match(section, /用户基础资料仍可作为背景信息自然引用/, '提示词应说明面具不应吞掉基础资料');
}

{
  const runtimePrompt = buildRuntimeUserPersonaPrompt(user, {
    selectedMask,
    contactUserPersona: contact.userPersona
  });
  assert.match(runtimePrompt, /当前用户信息/, '运行时提示应单独注入当前用户信息');
  assert.match(runtimePrompt, /用户基础资料：.*昵称：小满/, '运行时提示应包含可直接称呼的用户昵称');
  assert.match(runtimePrompt, /用户基础资料：.*用户人设：熟人面前会放松/, '运行时提示应包含用户人设扩展字段');
  assert.match(runtimePrompt, /用户基础资料：.*背景：最近从自由接稿转向稳定项目/, '运行时提示应包含用户背景');
  assert.match(runtimePrompt, /用户基础资料：.*表达风格：喜欢先轻轻开玩笑再说正事/, '运行时提示应包含表达风格');
  assert.match(runtimePrompt, /当前聊天面具：.*咖啡店打工人/, '运行时提示应包含当前面具资料');
  assert.match(runtimePrompt, /当前聊天补充：和林夏熟悉后会更愿意开玩笑/, '运行时提示应包含联系人专属用户说明');
  assert.match(runtimePrompt, /状态时效：用户状态“最近在准备考试”可能是近期或临时状态/, '运行时提示应提醒用户状态不是永久事实');
  assert.match(runtimePrompt, /优先自然引用一处未冲突且不过期的用户信息或长期记忆/, '运行时提示应强化结构化用户资料引用');
  assert.match(runtimePrompt, /必须出现在对用户可见的聊天正文里/, '运行时提示应要求引用用户信息落在可见正文');
  assert.match(runtimePrompt, /不要只泛泛称“你”/, '运行时提示应避免泛泛回应用户');
}

{
  const memoryNow = Date.now();
  const day = 1000 * 60 * 60 * 24;
  const sharedRuntimePrompt = buildRuntimePromptWithUserContext({
    runtimeUserPromptBase: '【当前北京时间】2026/7/6 22:00',
    contact: { ...contact, selectedMaskId: selectedMask.id },
    contactMemories: {
      c1: [{
        id: 'mem-1',
        text: '用户最近睡眠不好，希望被温柔提醒早点休息',
        source: 'user',
        timestamp: memoryNow,
        weight: 3,
        confidence: 0.8,
        category: 'health',
        topic: '睡眠',
        temporalType: 'short_term',
        status: 'active',
        validDays: 7,
        expiresAt: memoryNow + 7 * day
      }]
    },
    user,
    masks: [selectedMask],
    limit: 6
  });
  assert.match(sharedRuntimePrompt, /当前北京时间/, '共享运行时提示应保留基础时间上下文');
  assert.match(sharedRuntimePrompt, /当前用户信息/, '共享运行时提示应补充当前用户信息');
  assert.match(sharedRuntimePrompt, /状态：最近在准备考试/, '共享运行时提示应携带用户状态');
  assert.match(sharedRuntimePrompt, /用户人设：熟人面前会放松/, '共享运行时提示应携带用户人设扩展字段');
  assert.match(sharedRuntimePrompt, /状态时效：用户状态“最近在准备考试”可能是近期或临时状态/, '共享运行时提示应保留用户状态时效说明');
  assert.match(sharedRuntimePrompt, /当前聊天面具：.*咖啡店打工人/, '共享运行时提示应携带当前聊天面具');
  assert.match(sharedRuntimePrompt, /当前聊天补充：和林夏熟悉后会更愿意开玩笑/, '共享运行时提示应携带联系人专属用户补充');
  assert.match(sharedRuntimePrompt, /联系人记忆/, '共享运行时提示应继续携带联系人记忆');
  assert.match(sharedRuntimePrompt, /睡眠不好/, '共享运行时提示应携带相关联系人记忆内容');
}

{
  const behavior = buildBehaviorSection(contact);
  assert.match(behavior, /把用户当作有具体身份、偏好、状态和经历的人/, '行为规则应要求把用户当成具体的人');
  assert.match(behavior, /自然使用一处用户昵称、职业、地区、兴趣、状态或补充说明/, '行为规则应要求相关时引用用户信息');
}

{
  const anonymousRuntimePrompt = buildAnonymousRuntimeUserPrompt('【当前北京时间】2026/7/6 22:00', user);
  assert.match(anonymousRuntimePrompt, /当前用户信息/, '匿名聊天运行时提示应包含用户信息段');
  assert.match(anonymousRuntimePrompt, /状态：最近在准备考试/, '匿名聊天运行时提示应携带可聊状态');
  assert.match(anonymousRuntimePrompt, /状态时效：用户状态“最近在准备考试”可能是近期或临时状态/, '匿名聊天运行时提示应提醒状态时效性');
  assert.match(anonymousRuntimePrompt, /兴趣爱好：咖啡、散步、画画/, '匿名聊天运行时提示应携带可聊兴趣');
  assert.match(anonymousRuntimePrompt, /用户人设：熟人面前会放松/, '匿名聊天运行时提示应携带可聊用户人设');
  assert.match(anonymousRuntimePrompt, /表达风格：喜欢先轻轻开玩笑再说正事/, '匿名聊天运行时提示应携带可聊表达风格');
  assert.doesNotMatch(anonymousRuntimePrompt, /微信号：xiaoman_01/, '匿名聊天运行时提示不应携带微信号');
  assert.doesNotMatch(anonymousRuntimePrompt, /名字：小满/, '匿名聊天运行时提示不应携带真实姓名');
  assert.match(anonymousRuntimePrompt, /不要主动暴露用户真实姓名/, '匿名聊天运行时提示应保留隐私边界');
}

{
  const dirtyAnonymousRuntimePrompt = buildAnonymousRuntimeUserPrompt('', {
    ...user,
    status: { text: '对象状态不应落地' },
    hobbies: { text: '对象兴趣不应落地' },
    occupation: 123
  } as any);
  assert.match(dirtyAnonymousRuntimePrompt, /职业：123/, '匿名聊天运行时提示仍应保留数字型可展示用户资料');
  assert.doesNotMatch(dirtyAnonymousRuntimePrompt, /\[object Object\]|对象状态不应落地|对象兴趣不应落地/, '匿名聊天运行时提示不应把对象型用户资料强转成可见文本');
  assert.doesNotMatch(dirtyAnonymousRuntimePrompt, /状态时效：用户状态/, '匿名聊天对象型用户状态不应生成时效提示');
}

{
  assert.match(promptBuildersSource, /用户信息：\$\{options\.userPersona\}/, '群聊提示应包含用户信息摘要');
  assert.match(promptBuildersSource, /群成员回复时应把用户当作有具体身份、偏好、状态和经历的人/, '群聊提示应说明如何使用用户资料');
  assert.match(promptBuildersSource, /不要只泛泛称“你”/, '群聊提示应避免泛泛称呼用户');
  assert.match(singleReplyRequestSource, /buildRuntimeUserPersonaPrompt\(options\.user/, '单聊请求应在运行时补充当前用户信息');
  assert.match(groupReplyRequestSource, /buildRuntimeUserPersonaPrompt\(options\.user/, '群聊请求应在运行时补充当前用户信息');
  assert.match(chatRuntimeContextSource, /buildRuntimePromptWithUserContext/, '聊天周边共享运行时提示应集中补充用户信息');
  assert.match(chatRuntimeContextSource, /buildRuntimeUserPersonaPrompt\(user/, '聊天周边共享运行时提示应复用当前用户信息构建器');
  assert.match(anonymousSessionFlowSource, /buildAnonymousRuntimeUserPrompt\(params\.runtimeUserPromptBase, params\.user\)/, '匿名聊天请求应在运行时补充匿名专用用户信息');
  assert.match(contentSubViewDispatcherSource, /user: params\.user/, '论坛上层入口应向论坛视图传入当前用户资料');
  assert.match(forumSubViewsSource, /user=\{params\.user\}/, '论坛子视图应把当前用户资料传给论坛组件');
  assert.match(forumSubPagesSource, /user,\s*\n\s*currentUserName/, '论坛组件应接收完整用户资料，而不是只接收用户名');
  assert.match(forumAISource, /buildRuntimeUserPersonaPrompt\(user, \{ selectedMask \}\)/, '论坛 AI 运行时提示应补充当前用户资料和论坛面具');
  assert.match(forumAISource, /getGeminiChatReply\(\[\{ role: 'user', text: '生成帖子 JSON' \}\], prompt, aiSettings, runtimeUserPrompt\)/, '论坛发帖 AI 请求应实际传入用户信息运行时提示');
  assert.match(forumAISource, /getGeminiChatReply\(\[\{ role: 'user', text: '生成评论 JSON' \}\], prompt, aiSettings, runtimeUserPrompt\)/, '论坛评论 AI 请求应实际传入用户信息运行时提示');
}

{
  const singleContext = await buildSingleReplyRequestContext({
    contact: { ...contact, isAi: true, chatMode: 'online', selectedMaskId: selectedMask.id },
    historyMessages: [
      { id: 'u1', senderId: 'me', content: '今天有点累', timestamp: 1, type: 'text' } as Message
    ],
    contactMemories: {},
    worldBooks: [],
    masks: [selectedMask],
    user,
    aiSettings,
    extraSystemPrompt: ''
  });
  assert.match(singleContext.runtimeUserPrompt, /当前用户信息/, '单聊真实请求应包含当前用户信息段');
  assert.match(singleContext.runtimeUserPrompt, /状态：最近在准备考试/, '单聊真实请求应携带用户状态');
  assert.match(singleContext.runtimeUserPrompt, /表达风格：喜欢先轻轻开玩笑再说正事/, '单聊真实请求应携带用户表达风格');
  assert.match(singleContext.runtimeUserPrompt, /状态时效：用户状态“最近在准备考试”可能是近期或临时状态/, '单聊真实请求应携带用户状态时效说明');
  assert.match(singleContext.runtimeUserPrompt, /兴趣爱好：咖啡、散步、画画/, '单聊真实请求应携带用户兴趣');
  assert.match(singleContext.runtimeUserPrompt, /当前聊天面具：.*咖啡店打工人/, '单聊真实请求应携带当前聊天面具');
  assert.match(singleContext.runtimeUserPrompt, /当前聊天补充：和林夏熟悉后会更愿意开玩笑/, '单聊真实请求应携带联系人专属用户补充');
}

{
  const groupContact: Contact = {
    id: 'g1',
    name: '周末小群',
    pinyin: 'zhoumoxiaoqun',
    avatar: '',
    unreadCount: 0,
    isAi: true,
    isGroup: true,
    chatMode: 'online',
    memberIds: ['c1'],
    selectedMaskId: selectedMask.id,
    userPersona: '在这个群里更熟悉轻松'
  };
  const groupContext = await buildGroupReplyRequestContext({
    contact: groupContact,
    historyMessages: [
      { id: 'u2', senderId: 'me', content: '今晚想早点休息', timestamp: 2, type: 'text' } as Message
    ],
    contacts: [{ ...contact, id: 'c1', isAi: true, chatMode: 'online' }],
    contactMemories: {},
    worldBooks: [],
    masks: [selectedMask],
    user,
    aiSettings,
    extraSystemPrompt: '全局补充：所有群成员都要记得用户怕冷，回应时避免泛泛问候。',
    maxMessages: 2
  });
  assert.match(groupContext.systemPrompt, /系统覆盖指令/, '群聊系统提示应保留全局补充提示段');
  assert.match(groupContext.systemPrompt, /所有群成员都要记得用户怕冷/, '群聊真实请求应继承额外系统提示');
  assert.match(groupContext.runtimeUserPrompt, /当前用户信息/, '群聊真实请求应包含当前用户信息段');
  assert.match(groupContext.runtimeUserPrompt, /状态时效：用户状态“最近在准备考试”可能是近期或临时状态/, '群聊真实请求应携带用户状态时效说明');
  assert.match(groupContext.runtimeUserPrompt, /地区：杭州/, '群聊真实请求应携带用户地区');
  assert.match(groupContext.runtimeUserPrompt, /职业：插画师/, '群聊真实请求应携带用户职业');
  assert.match(groupContext.runtimeUserPrompt, /目标：希望保持规律作息/, '群聊真实请求应携带用户目标');
  assert.match(groupContext.runtimeUserPrompt, /当前聊天补充：在这个群里更熟悉轻松/, '群聊真实请求应携带群聊专属用户补充');
}

console.log('测试通过：用户信息会进入单聊、群聊提示词，并被要求自然用于回复。');

rmSync(entryFile, { force: true });
rmSync(bundledFile, { force: true });
