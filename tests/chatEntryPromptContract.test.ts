import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildAnonymousSystemPrompt } from '../src/app/anonymousChatUtils.ts';
import { buildAnonymousMatchSystemPrompt, normalizeAnonymousMatchResult } from '../src/app/anonymousFlowUtils.ts';
import { buildAnonymousReplyChunks } from '../src/app/anonymousReplyParsing.ts';
import { generateContactFormPatch } from '../src/app/contactFormAiRuntime.ts';
import {
  buildAnonymousChatQualityLines,
  buildChatOpeningQualityLines
} from '../src/utils/prompt/chatEntryQualityPrompt.ts';

{
  const lines = buildChatOpeningQualityLines().join('\n');
  assert.match(lines, /角色当下真的会发出的第一句话/, '聊天开场规则应强调真实角色第一句话');
  assert.match(lines, /不能只是无上下文的泛泛问候或自我介绍/, '聊天开场规则应避免空泛问候');
  assert.match(lines, /轻量真实意图/, '聊天开场规则应避免无意图开场');
  assert.match(lines, /给用户留下可接话空间/, '聊天开场规则应保留用户可接话空间');
  assert.match(lines, /系统能力必须通过对应结构化类型落地/, '聊天开场规则应隔离系统能力入口');
  assert.match(lines, /不能在正文中宣称系统状态已发生/, '聊天开场规则应禁止伪造已完成系统能力');
}

{
  const lines = buildAnonymousChatQualityLines().join('\n');
  assert.match(lines, /承接用户上一句的具体内容、语气或情绪/, '匿名聊天规则应承接用户具体输入');
  assert.match(lines, /像刚匹配到的真实网友/, '匿名聊天规则应保持匿名网友口吻');
  assert.match(lines, /明确但轻量的聊天意图/, '匿名聊天规则应避免空泛接话');
  assert.match(lines, /始终保持匿名边界/, '匿名聊天规则应保留隐私边界');
}

{
  const prompt = buildAnonymousMatchSystemPrompt({
    onlyOppositeSex: false,
    ageRange: [20, 28],
    tags: ['电影', '夜跑', '咖啡']
  }, 'other');

  assert.match(prompt, /JSON 结构：\{"gender":"male\|female","age":数字/, '匿名匹配仍应输出固定 JSON');
  assert.match(prompt, /开场白要求：自然、口语化、20字以内/, '匿名匹配仍应限制开场长度');
  assert.match(prompt, /系统能力必须通过对应结构化类型落地/, '匿名匹配开场白应隔离系统能力入口');
  assert.match(prompt, /不能在正文中宣称系统状态已发生/, '匿名匹配开场白应禁止伪造已完成系统能力');
  assert.match(prompt, /不能只是无上下文的泛泛问候或自我介绍/, '匿名匹配开场应避免空泛问候');
  assert.match(prompt, /轻量真实意图/, '匿名匹配开场应有具体聊天意图');
  assert.match(prompt, /给用户留下可接话空间/, '匿名匹配开场应方便用户接话');
}

{
  const prompt = buildAnonymousMatchSystemPrompt({
    onlyOppositeSex: false,
    ageRange: [{ value: 20 }, 28] as any,
    tags: [{ text: '对象标签不应进入提示词' }, '夜跑', 123] as any
  }, 'other');

  assert.match(prompt, /年龄范围：18-28/, '匿名匹配提示应对异常年龄范围安全归一化');
  assert.match(prompt, /偏好标签（优先参考）：夜跑、123/, '匿名匹配提示仍应保留可展示标量偏好标签');
  assert.doesNotMatch(prompt, /\[object Object\]|对象标签不应进入提示词/, '匿名匹配提示不应把对象型偏好标签强转成文本');
}

{
  const result = normalizeAnonymousMatchResult({
    gender: 'female',
    age: 24,
    tags: ['电影', '夜跑', '咖啡'],
    opening: '刚看完一部片，想找人聊聊。'
  }, {
    onlyOppositeSex: false,
    ageRange: [20, 28],
    tags: []
  }, 'other');

  assert.equal(result.opening, '刚看完一部片，想找人聊聊。', '匿名匹配开场白应保留干净结构字段');
  assert.deepEqual(result.partner.tags, ['电影', '夜跑', '咖啡'], '匿名匹配标签应保留干净结构字段');
}

{
  const result = normalizeAnonymousMatchResult({
    gender: ' FEMALE ',
    age: 99,
    tags: [{ text: '对象标签不应落地' }, '夜跑', 123, '咖啡'] as any,
    opening: '刚跑完，想找人聊两句。'
  }, {
    onlyOppositeSex: false,
    ageRange: [{ value: 20 }, 28] as any,
    tags: []
  }, 'other');

  assert.equal(result.partner.age, 28, '匿名匹配落地应对异常年龄范围安全归一化');
  assert.deepEqual(result.partner.tags, ['夜跑', '123', '咖啡'], '匿名匹配落地应拒收对象型标签并保留可展示标量');
  assert.doesNotMatch(result.partner.persona, /\[object Object\]|对象标签不应落地/, '匿名匹配人设不应被对象型标签污染');
}

assert.throws(
  () => normalizeAnonymousMatchResult({
    gender: 'female',
    age: 24,
    tags: ['电影【动作】摘下耳机', '夜跑', '[红包] 系统标签', '咖啡', '系统说明：标签解释'],
    opening: '刚看完一部片，想找人聊聊。【动作】把耳机摘下来'
  }, {
    onlyOppositeSex: false,
    ageRange: [20, 28],
    tags: []
  }, 'other'),
  /AI 返回的 tags 不足 3 个/,
  '匿名匹配标签混入动作、系统说明或系统事件格式时应拒收，不再截断凑数'
);

assert.throws(
  () => normalizeAnonymousMatchResult({
    gender: 'female',
    age: 24,
    tags: ['电影', '夜跑', '咖啡'],
    opening: '刚看完一部片，想找人聊聊。[位置] 影院门口'
  }, {
    onlyOppositeSex: false,
    ageRange: [20, 28],
    tags: []
  }, 'other'),
  /AI 返回的 opening 为空/,
  '匿名匹配开场混入系统能力格式时应拒收，而不是截断后继续使用'
);

{
  const result = normalizeAnonymousMatchResult({
    gender: 'female',
    age: 24,
    tags: ['电影', '夜跑', '咖啡'],
    opening: '我给你转账了，先收下。'
  }, {
    onlyOppositeSex: false,
    ageRange: [20, 28],
    tags: []
  }, 'other');
  assert.equal(result.opening, '我给你转账了，先收下。', '匿名匹配开场不应靠关键词猜测普通自然语言');
}

{
  const prompt = buildAnonymousSystemPrompt({
    gender: 'female',
    age: 24,
    tags: ['电影', '夜跑', '咖啡'],
    persona: ''
  }, [], [], {
    id: 'me',
    name: '用户',
    gender: 'other',
    region: '中国 上海',
    avatar: ''
  } as any, '');

  assert.match(prompt, /【匿名聊天质量】/, '匿名聊天系统提示应接入质量规则');
  assert.match(prompt, /承接用户上一句的具体内容、语气或情绪/, '匿名聊天回复应承接具体上下文');
  assert.match(prompt, /不索要或暴露真实姓名、账号、联系方式/, '匿名聊天应保持隐私边界');
  assert.match(prompt, /JSON 结构必须且只能是：\{"text":"聊天正文"\}/, '匿名聊天仍应保持结构化回复格式');
  assert.doesNotMatch(prompt, /"tags":\[\{"type":"sentence"/, '匿名聊天不应继续要求 tags 分句旧结构');
}

const anonymousSessionFlowSource = readFileSync(new URL('../src/app/anonymousSessionFlow.ts', import.meta.url), 'utf8');
const anonymousReplyParsingSource = readFileSync(new URL('../src/app/anonymousReplyParsing.ts', import.meta.url), 'utf8');
assert.match(anonymousSessionFlowSource, /buildAnonymousReplyChunks/, '匿名聊天发送流程应走统一结构化回复解析');
assert.match(anonymousSessionFlowSource, /extractStrictJsonObjectLazy/, '匿名匹配不应从解释文本中截取 JSON 继续使用');
assert.match(anonymousSessionFlowSource, /const text = readVisibleScalarText\(params\.anonymousInputValue\)/, '匿名聊天发送入口应拒绝对象型输入成为用户消息');
assert.match(anonymousSessionFlowSource, /extractStrictJsonObjectLazy\(readVisibleScalarText\(raw\)\)/, '匿名匹配解析前应拒绝对象型 AI 返回值');
assert.doesNotMatch(anonymousSessionFlowSource, /String\(params\.anonymousInputValue \|\| ''\)|String\(raw \|\| ''\)/, '匿名聊天发送和匹配不应把对象型值强转成可见文本');
assert.match(anonymousReplyParsingSource, /normalizeGeneratedStrictNonSystemEventText/, '匿名聊天 AI 回复落地前应严格拒收系统能力格式');
assert.doesNotMatch(anonymousSessionFlowSource, /fallbackChunks/, '匿名聊天不应把非 JSON 回复兜底展示为正文');
assert.doesNotMatch(anonymousReplyParsingSource, /fallbackChunks/, '匿名聊天结构化解析不应保留正文兜底分支');

{
  assert.deepEqual(
    buildAnonymousReplyChunks(JSON.stringify({
      text: '我刚从电影院出来。'
    })),
    ['我刚从电影院出来。'],
    '匿名聊天应只落地结构化 JSON 中干净的 text 正文'
  );
  assert.throws(
    () => buildAnonymousReplyChunks(JSON.stringify({
      text: '我刚从电影院出来。',
      tags: [{ type: 'sentence', value: '这片子后劲有点大。' }]
    })),
    /不支持的字段/,
    '匿名聊天不应继续接受 tags 分句旧结构'
  );
  assert.throws(
    () => buildAnonymousReplyChunks(JSON.stringify({
      text: '我刚从电影院出来。【动作】摘下耳机',
      tags: [{ type: 'sentence', value: '这片子后劲有点大。译文：The movie lingers.' }]
    })),
    /不支持的字段/,
    '匿名聊天正文或分句混入动作、译文格式时应拒收，避免截断后继续展示'
  );
  assert.throws(
    () => buildAnonymousReplyChunks(JSON.stringify({ text: '我把位置发你了 [位置] 影院门口' })),
    /匿名聊天回复缺少正文/,
    '匿名聊天回复混入系统能力格式时应拒收，避免截断后留下假系统能力正文'
  );
  assert.throws(
    () => buildAnonymousReplyChunks('我不是 JSON，但我想直接展示'),
    /匿名聊天回复不是合法 JSON/,
    '匿名聊天不应把非 JSON 回复当作正文兜底展示'
  );
  assert.throws(
    () => buildAnonymousReplyChunks('解释一下 {"text":"这句不应被截取"}'),
    /匿名聊天回复不是合法 JSON/,
    '匿名聊天不应从解释文本中截取 JSON 当作有效回复'
  );
  assert.deepEqual(
    buildAnonymousReplyChunks(JSON.stringify({
      text: '我给你转账了，先收下。'
    })),
    ['我给你转账了，先收下。'],
    '匿名聊天不应靠关键词猜测普通自然语言，只按结构和格式边界处理'
  );
}

const contactFormSource = readFileSync(new URL('../src/app/contactFormAiRuntime.ts', import.meta.url), 'utf8');
assert.match(contactFormSource, /buildChatOpeningQualityLines/, '联系人 AI 生成应接入开场质量规则');
assert.match(contactFormSource, /openingLine 必须是一句可直接发出的角色开场白/, '联系人 AI 生成应明确生成可发送开场白');
assert.match(contactFormSource, /persona\/background\/expressionStyle 要能支撑后续自然聊天/, '联系人 AI 生成应强化后续聊天人设字段');
assert.match(contactFormSource, /buildRuntimeUserPersonaPrompt\(user\)/, '联系人 AI 生成应在运行时补充当前用户信息');
assert.match(contactFormSource, /贴合用户身份、状态、兴趣、关系期待和表达风格/, '联系人 AI 生成应要求联系人和开场贴合用户资料');
assert.match(contactFormSource, /normalizeGeneratedStrictNonSystemEventText/, '联系人 AI 生成落地前应严格拒收系统能力格式');
assert.match(contactFormSource, /AI 未返回有效联系人 JSON/, '联系人 AI 生成解析失败时应明确失败，不应使用空对象兜底');
assert.match(contactFormSource, /validateContactFormAiPayload/, '联系人 AI 生成应先校验固定字段，不应靠表单默认值补成有效结果');
assert.match(contactFormSource, /CONTACT_FORM_AI_ALLOWED_KEYS/, '联系人 AI 生成应固定可接受字段白名单');
assert.match(contactFormSource, /CONTACT_FORM_AI_TEXT_KEYS/, '联系人 AI 生成应拒收对象型文本字段');
assert.match(contactFormSource, /AI 联系人 JSON 缺少 openingLine 字段/, '联系人 AI 生成缺少开场字段时应明确失败');

{
  let capturedRuntimePrompt = '';
  const patch = await generateContactFormPatch(
    '生成一个会陪我聊画展和咖啡的旧友',
    {} as any,
    '【当前北京时间】2026/7/6',
    {
      id: 'me',
      name: '小满',
      avatar: '',
      status: '最近睡眠不好',
      occupation: '插画师',
      hobbies: '咖啡、散步、画展'
    } as any,
    async (_messages, _systemInstruction, _settings, runtimeUserPrompt) => {
      capturedRuntimePrompt = String(runtimeUserPrompt || '');
      return JSON.stringify({
        name: '林夏',
        gender: 'female',
        persona: '嘴硬心软的旧友\n系统说明：这是人设解释',
        openingLine: '小满，画展那边我刚路过，咖啡也还热着。【动作】晃了晃纸袋'
      });
    }
  );
  assert.equal(patch.name, '林夏', '联系人 AI 生成仍应正常解析联系人字段');
  assert.equal(patch.openingLine, '', '联系人 AI 生成开场白混入动作格式时应清空，不再截断成半句');
  assert.equal(patch.persona, '', '联系人 AI 生成人设混入系统说明格式时应清空，不再截断成半句');
  assert.match(capturedRuntimePrompt, /当前用户信息/, '联系人 AI 生成请求应携带当前用户信息段');
  assert.match(capturedRuntimePrompt, /昵称：小满/, '联系人 AI 生成请求应携带用户昵称');
  assert.match(capturedRuntimePrompt, /状态：最近睡眠不好/, '联系人 AI 生成请求应携带用户状态');
  assert.match(capturedRuntimePrompt, /兴趣爱好：咖啡、散步、画展/, '联系人 AI 生成请求应携带用户兴趣');
}

{
  const patch = await generateContactFormPatch(
    '生成一个会陪我聊画展和咖啡的旧友',
    {} as any,
    '',
    { id: 'me', name: '小满', avatar: '' } as any,
    async () => JSON.stringify({
      name: '林夏',
      gender: 'female',
      openingLine: '小满，我把咖啡钱转你了 [系统转账·待收款] ¥8.88'
    })
  );
  assert.equal(patch.openingLine, '', '联系人 AI 开场白混入系统能力格式时应清空，不应截断成假转账正文');
}

{
  const patch = await generateContactFormPatch(
    '生成一个会陪我聊画展和咖啡的旧友',
    {} as any,
    '【当前北京时间】2026/7/6',
    { id: 'me', name: '小满', gender: 'other', avatar: '' } as any,
    async () => JSON.stringify({
      name: '林夏',
      gender: 'female',
      openingLine: '我给你转账了，先收下。'
    })
  );

  assert.equal(patch.openingLine, '我给你转账了，先收下。', '联系人 AI 开场白不应靠关键词猜测普通自然语言');
}

await assert.rejects(
  () => generateContactFormPatch(
    '生成一个联系人',
    {} as any,
    '',
    { id: 'me', name: '小满', avatar: '' } as any,
    async () => '这不是 JSON'
  ),
  /AI 未返回有效联系人 JSON/,
  '联系人 AI 生成不应把非 JSON 回复当作空表单补丁'
);
await assert.rejects(
  () => generateContactFormPatch(
    '生成一个联系人',
    {} as any,
    '',
    { id: 'me', name: '小满', avatar: '' } as any,
    async () => '解释一下 {"name":"林夏","gender":"female"}'
  ),
  /AI 未返回有效联系人 JSON/,
  '联系人 AI 生成不应从解释文本中截取 JSON 当作有效联系人'
);
await assert.rejects(
  () => generateContactFormPatch(
    '生成一个联系人',
    {} as any,
    '',
    { id: 'me', name: '小满', avatar: '' } as any,
    async () => JSON.stringify({
      name: '林夏',
      gender: 'female',
      firstMessage: '旧字段开场不应被接受'
    })
  ),
  /AI 联系人 JSON 不应使用 firstMessage 旧字段/,
  '联系人 AI 生成不应用 firstMessage 旧字段兜底 openingLine'
);
await assert.rejects(
  () => generateContactFormPatch(
    '生成一个联系人',
    {} as any,
    '',
    { id: 'me', name: '小满', avatar: '' } as any,
    async () => JSON.stringify({
      name: '林夏',
      gender: 'female',
      openingLine: '小满，今天想聊点什么？',
      firstMessage: '旧字段开场不应混入协议'
    })
  ),
  /AI 联系人 JSON 不应使用 firstMessage 旧字段/,
  '联系人 AI 生成不应在 openingLine 存在时容忍 firstMessage 旧字段'
);
await assert.rejects(
  () => generateContactFormPatch(
    '生成一个联系人',
    {} as any,
    '',
    { id: 'me', name: '小满', avatar: '' } as any,
    async () => JSON.stringify({
      name: '林夏',
      gender: '女',
      openingLine: '小满，今天想聊点什么？'
    })
  ),
  /AI 联系人 JSON 的 gender 无效/,
  '联系人 AI 生成不应把非枚举 gender 靠程序默认改成 female'
);
await assert.rejects(
  () => generateContactFormPatch(
    '生成一个联系人',
    {} as any,
    '',
    { id: 'me', name: '小满', avatar: '' } as any,
    async () => JSON.stringify({
      name: '林夏',
      gender: 'female',
      personality: '旧字段不应被当作性格特质',
      openingLine: '小满，今天想聊点什么？'
    })
  ),
  /AI 联系人 JSON 不应使用 personality 旧字段/,
  '联系人 AI 生成不应用 personality 旧字段兜底 personalityTraits'
);
await assert.rejects(
  () => generateContactFormPatch(
    '生成一个联系人',
    {} as any,
    '',
    { id: 'me', name: '小满', avatar: '' } as any,
    async () => JSON.stringify({
      name: '林夏',
      gender: 'female',
      personalityTraits: '温和、敏锐',
      personality: '旧字段不应混入协议',
      openingLine: '小满，今天想聊点什么？'
    })
  ),
  /AI 联系人 JSON 不应使用 personality 旧字段/,
  '联系人 AI 生成不应在 personalityTraits 存在时容忍 personality 旧字段'
);
await assert.rejects(
  () => generateContactFormPatch(
    '生成一个联系人',
    {} as any,
    '',
    { id: 'me', name: '小满', avatar: '' } as any,
    async () => JSON.stringify({
      name: { text: '林夏' },
      gender: 'female',
      openingLine: '小满，今天想聊点什么？'
    })
  ),
  /AI 联系人 JSON 字段 name 必须是字符串/,
  '联系人 AI 生成不应把对象型 name 强转成可见名称'
);
await assert.rejects(
  () => generateContactFormPatch(
    '生成一个联系人',
    {} as any,
    '',
    { id: 'me', name: '小满', avatar: '' } as any,
    async () => JSON.stringify({
      name: '林夏',
      gender: 'female',
      openingLine: '小满，今天想聊点什么？',
      tags: ['旧结构标签']
    })
  ),
  /AI 联系人 JSON 包含不支持字段 tags/,
  '联系人 AI 生成不应在核心字段合法时容忍未声明旧结构字段'
);

const contactPatchSource = readFileSync(new URL('../src/app/contactFormPatchUtils.ts', import.meta.url), 'utf8');
assert.doesNotMatch(contactPatchSource, /raw\.firstMessage|raw\.personality(?!Traits)/, '联系人表单转换层不应保留 AI 旧字段兜底');

const shakeSource = readFileSync(new URL('../src/utils/shakeContactAiRuntime.ts', import.meta.url), 'utf8');
const shakeViewSource = readFileSync(new URL('../src/utils/UtilsBasicSubPages.tsx', import.meta.url), 'utf8');
const discoveryActionSource = readFileSync(new URL('../src/app/subviews/discoveryActionSubViews.tsx', import.meta.url), 'utf8');
assert.match(shakeSource, /openingLine\(48字内\)/, '摇一摇 AI 联系人应要求返回 openingLine');
assert.match(shakeSource, /openingLine,/, '摇一摇 AI 联系人应把 openingLine 写入联系人');
assert.match(shakeSource, /摇到后角色主动发出的第一句话/, '摇一摇开场应贴合场景');
assert.match(shakeSource, /buildChatOpeningQualityLines/, '摇一摇 AI 联系人应复用聊天开场质量规则');
assert.match(shakeSource, /buildRuntimeUserPersonaPrompt\(user\)/, '摇一摇 AI 联系人应在运行时补充当前用户信息');
assert.match(shakeSource, /贴合用户身份、状态、兴趣、地区、关系期待和表达风格/, '摇一摇 AI 联系人应要求人设和开场贴合用户资料');
assert.match(shakeSource, /自然引用用户资料中最适合承接的一处具体线索/, '摇一摇开场应要求引用用户具体线索');
assert.match(shakeSource, /normalizeGeneratedStrictNonSystemEventText/, '摇一摇 AI 联系人落地前应严格拒收系统能力格式');
assert.doesNotMatch(shakeSource, /containsUnbackedPaymentClaimText/, '摇一摇 AI 联系人不应使用普通正文关键词伪支付守卫');
assert.match(shakeSource, /requireText\('openingLine', 48\)/, '摇一摇 AI 联系人缺少合格 openingLine 时应失败，不应补默认开场白');
assert.doesNotMatch(shakeSource, /刚刚摇到你了/, '摇一摇 AI 联系人不应保留程序默认开场白兜底');
assert.match(shakeSource, /extractStrictJsonObject } from '\.\/chat\/aiReplyParser\.ts'/, '摇一摇 AI 联系人应复用统一严格 JSON 解析器');
assert.match(shakeSource, /getGeminiChatReply\(\[\{ role: 'user', text: userPrompt \}\], systemInstruction, aiSettings, runtimeUserPrompt\)/, '摇一摇 AI 请求应实际传入用户信息运行时提示');
assert.match(shakeViewSource, /buildShakeContactByAI\(preference, contacts\.filter\(c => !c\.isGroup && c\.id !== 'officialAccounts'\), aiSettings, user\)/, '摇一摇视图应把当前用户资料传给 AI 生成器');
assert.match(discoveryActionSource, /user=\{params\.user\}/, '摇一摇子视图应从应用状态接收当前用户资料');

console.log('测试通过：聊天入口和开场生成已接入质量规则。');
