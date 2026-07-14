import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildMailboxActionHandlers } from '../src/app/mailboxActionHandlers.ts';
import { generateMailboxReplyText } from '../src/app/mailboxReplyRuntime.ts';
import { buildMailboxReplyQualityLines } from '../src/utils/prompt/mailboxReplyQualityPrompt.ts';

{
  const lines = buildMailboxReplyQualityLines().join('\n');
  assert.match(lines, /回应来信里的具体内容、情绪、问题或关系暗示/, '信箱回信规则应要求回应来信具体内容');
  assert.match(lines, /符合联系人完整人设、与用户的亲疏距离和信件场景/, '信箱回信规则应贴合人设和关系');
  assert.match(lines, /自然带出一处具体信息/, '信箱回信规则应要求自然引用用户资料或联系人记忆');
  assert.match(lines, /情绪要有来由和层次/, '信箱回信规则应要求真实情绪层次');
  assert.match(lines, /blessing 要贴合关系、来信内容和角色表达习惯/, '信箱祝语应贴合内容和关系');
  assert.match(lines, /系统能力必须通过对应结构化类型落地/, '信箱回信规则应隔离系统能力入口');
  assert.match(lines, /不要输出心声、动作、旁白、翻译或系统说明/, '信箱回信应隔离聊天历史格式');
}

{
  const mailboxRuntimeSource = readFileSync(new URL('../src/app/mailboxReplyRuntime.ts', import.meta.url), 'utf8');
  const mailboxHandlersSource = readFileSync(new URL('../src/app/mailboxActionHandlers.ts', import.meta.url), 'utf8');
  assert.match(mailboxRuntimeSource, /buildMailboxReplyQualityLines/, '信箱回信生成应接入专用质量规则');
  assert.match(mailboxRuntimeSource, /【回信质量规则】/, '信箱回信系统提示应包含质量规则区块');
  assert.match(mailboxRuntimeSource, /来信主题：/, '信箱回信提示应包含来信主题');
  assert.match(mailboxRuntimeSource, /\{"content":"回信正文","blessing":"祝语"\}/, '信箱回信仍应保持固定 JSON 结构');
  assert.match(mailboxRuntimeSource, /extractStrictJsonObjectLazy/, '信箱回信不应从解释文本中截取 JSON 继续落地');
  assert.match(mailboxRuntimeSource, /validateMailboxReplyPayload/, '信箱回信应在落地前校验固定字段白名单');
  assert.match(mailboxRuntimeSource, /normalizeGeneratedStrictNonSystemEventText/, '信箱回信混入系统能力格式时应拒收而不是截断落地');
  assert.doesNotMatch(mailboxRuntimeSource, /parsed\?\.reply/, '信箱回信不应接受旧 reply 字段兜底');
  assert.match(mailboxHandlersSource, /buildRuntimePromptWithMemory/, '信箱回信动作应按联系人补充运行时记忆');
  assert.doesNotMatch(mailboxHandlersSource, /buildRuntimePromptWithMemory\([^)]*payload|buildRuntimePromptWithMemory\([^)]*信箱回信/, '信箱回信动作不应使用信件主题或正文检索联系人记忆');
}

{
  let captured: null | {
    messages: Array<{ role: 'user' | 'model'; text: string }>;
    systemInstruction: string;
    runtimeUserPrompt?: string;
  } = null;

  const reply = await generateMailboxReplyText({
    to: {
      id: 'c1',
      name: '林夏',
      remark: '夏夏',
      gender: 'female',
      age: 26,
      relationship: '旧友',
      personalityTraits: ['嘴硬心软'],
      hobbies: ['夜跑'],
      persona: '嘴硬心软，会用玩笑掩饰关心',
      expressionStyle: '短句多，偶尔调侃',
      background: '和用户曾经很熟，最近重新联系',
      status: '最近工作很忙'
    } as any,
    user: {
      id: 'u1',
      name: '许知',
      gender: 'other',
      avatar: '',
      persona: '慢热但认真',
      status: '最近睡眠不好'
    } as any,
    subject: '关于昨晚那通电话',
    content: '昨晚我有点失眠，还一直想起你说要离开的事。',
    date: '2026/7/6',
    aiSettings: {} as any,
    runtimeUserPromptBase: '用户自定义基础提示',
    getChatReply: async (messages, systemInstruction, _settings, runtimeUserPrompt) => {
      captured = { messages, systemInstruction, runtimeUserPrompt };
      return '{"content":"我看到你说昨晚失眠，也知道那句离开让你一直悬着。那不是我想轻轻带过的事。","blessing":"愿你今晚能睡得踏实一点"}';
    },
    buildUserPersonaSummary: () => '用户慢热但认真，最近睡眠不好',
    buildContactPersonaSummary: () => '林夏嘴硬心软，旧友关系'
  });

  assert.equal(reply.content, '我看到你说昨晚失眠，也知道那句离开让你一直悬着。那不是我想轻轻带过的事。');
  assert.equal(reply.blessing, '愿你今晚能睡得踏实一点');
  assert.ok(captured, '测试应捕获 AI 请求');
  assert.match(captured.systemInstruction, /【回信质量规则】/, '实际系统提示应包含信箱回信质量规则');
  assert.match(captured.systemInstruction, /回应来信里的具体内容、情绪、问题或关系暗示/, '实际系统提示应要求回应来信具体内容');
  assert.match(captured.systemInstruction, /不要只泛泛称“你”/, '实际系统提示应要求正文引用具体用户线索');
  assert.match(captured.systemInstruction, /blessing 要贴合关系、来信内容和角色表达习惯/, '实际系统提示应约束祝语质量');
  assert.match(captured.systemInstruction, /系统能力必须通过对应结构化类型落地/, '实际系统提示应约束信箱不能伪装系统能力');
  assert.match(captured.systemInstruction, /不要输出心声、动作、旁白、翻译或系统说明/, '实际系统提示应隔离心声动作翻译格式');
  assert.match(captured.messages[0].text, /来信主题：关于昨晚那通电话/, '实际用户提示应包含来信主题');
  assert.match(captured.messages[0].text, /来信内容：昨晚我有点失眠/, '实际用户提示应包含来信内容');
  assert.equal(captured.runtimeUserPrompt, '用户自定义基础提示', '回信生成仍应传递用户运行时提示');
}

await assert.rejects(
  () => generateMailboxReplyText({
    to: { id: 'c1', name: '林夏' } as any,
    user: { id: 'u1', name: '许知', avatar: '' } as any,
    subject: '格式边界',
    content: '这封信测试格式。',
    date: '2026/7/6',
    aiSettings: {} as any,
    runtimeUserPromptBase: '',
    getChatReply: async () => '解释一下 {"content":"这段不应被截取","blessing":"祝好"}',
    buildUserPersonaSummary: () => '',
    buildContactPersonaSummary: () => ''
  }),
  /AI 回信正文为空/,
  '信箱回信不应从解释文本中截取 JSON 当作有效回信'
);

{
  const reply = await generateMailboxReplyText({
    to: {
      id: 'c1',
      name: '林夏',
      relationship: '旧友',
      persona: '嘴硬心软'
    } as any,
    user: {
      id: 'u1',
      name: '许知',
      avatar: '',
      status: '最近睡眠不好'
    } as any,
    subject: '格式清理',
    content: '想确认这封信会不会好好显示。',
    date: '2026/7/6',
    aiSettings: {} as any,
    runtimeUserPromptBase: '',
    getChatReply: async () => JSON.stringify({
      content: '我会好好回你这封信。',
      blessing: '愿你今晚能睡稳一点'
    }),
    buildUserPersonaSummary: () => '用户最近睡眠不好',
    buildContactPersonaSummary: () => '林夏嘴硬心软'
  });

  assert.equal(reply.content, '我会好好回你这封信。', '信箱回信正文应保留干净结构字段');
  assert.equal(reply.blessing, '愿你今晚能睡稳一点', '信箱祝语应保留干净结构字段');
}

await assert.rejects(
  () => generateMailboxReplyText({
    to: {
      id: 'c1',
      name: '林夏',
      relationship: '旧友',
      persona: '嘴硬心软'
    } as any,
    user: {
      id: 'u1',
      name: '许知',
      avatar: '',
      status: '最近睡眠不好'
    } as any,
    subject: '格式清理',
    content: '想确认这封信会不会好好显示。',
    date: '2026/7/6',
    aiSettings: {} as any,
    runtimeUserPromptBase: '',
    getChatReply: async () => JSON.stringify({
      content: '我会好好回你这封信。【动作】把信纸重新折好\n心声：其实有点担心你',
      blessing: '愿你今晚能睡稳一点 译文：Sleep well'
    }),
    buildUserPersonaSummary: () => '用户最近睡眠不好',
    buildContactPersonaSummary: () => '林夏嘴硬心软'
  }),
  /AI 回信正文为空/,
  '信箱回信正文或祝语混入动作、心声、译文格式时应拒收，不再截断成半句'
);

await assert.rejects(
  () => generateMailboxReplyText({
    to: {
      id: 'c1',
      name: '林夏',
      relationship: '旧友',
      persona: '嘴硬心软'
    } as any,
    user: {
      id: 'u1',
      name: '许知',
      avatar: '',
      status: '最近睡眠不好'
    } as any,
    subject: '系统能力边界',
    content: '想确认这封信不会假装发红包。',
    date: '2026/7/6',
    aiSettings: {} as any,
    runtimeUserPromptBase: '',
    getChatReply: async () => JSON.stringify({
      content: '我把红包也一起放这里了 [系统红包·待领取] ¥8.88',
      blessing: '祝好'
    }),
    buildUserPersonaSummary: () => '用户最近睡眠不好',
    buildContactPersonaSummary: () => '林夏嘴硬心软'
  }),
  /AI 回信正文为空/,
  '信箱回信混入系统能力格式时应拒收，避免截断后留下假系统能力正文'
);

await assert.rejects(
  () => generateMailboxReplyText({
    to: {
      id: 'c1',
      name: '林夏',
      relationship: '旧友',
      persona: '嘴硬心软'
    } as any,
    user: {
      id: 'u1',
      name: '许知',
      avatar: ''
    } as any,
    subject: '旧字段边界',
    content: '想确认旧字段不会继续生效。',
    date: '2026/7/6',
    aiSettings: {} as any,
    runtimeUserPromptBase: '',
    getChatReply: async () => JSON.stringify({
      content: '这句本来合法。',
      blessing: '祝好',
      reply: '旧 reply 字段不应被容忍'
    }),
    buildUserPersonaSummary: () => '',
    buildContactPersonaSummary: () => ''
  }),
  /AI 回信 JSON 包含不支持字段/,
  '信箱回信不应在 content/blessing 合法时容忍 reply 旧字段'
);

await assert.rejects(
  () => generateMailboxReplyText({
    to: {
      id: 'c1',
      name: '林夏',
      relationship: '旧友',
      persona: '嘴硬心软'
    } as any,
    user: {
      id: 'u1',
      name: '许知',
      avatar: ''
    } as any,
    subject: '类型边界',
    content: '想确认对象字段不会显示。',
    date: '2026/7/6',
    aiSettings: {} as any,
    runtimeUserPromptBase: '',
    getChatReply: async () => JSON.stringify({
      content: { text: '对象正文' },
      blessing: '祝好'
    }),
    buildUserPersonaSummary: () => '',
    buildContactPersonaSummary: () => ''
  }),
  /AI 回信 content 必须是字符串/,
  '信箱回信正文不应把对象型 AI 字段强转成可见文本'
);

{
  const result = await generateMailboxReplyText({
    to: {
      id: 'c1',
      name: '林夏',
      relationship: '旧友',
      persona: '嘴硬心软'
    } as any,
    user: {
      id: 'u1',
      name: '许知',
      avatar: '',
      status: '最近睡眠不好'
    } as any,
    subject: '支付边界',
    content: '想确认这封信不会假装转账。',
    date: '2026/7/6',
    aiSettings: {} as any,
    runtimeUserPromptBase: '',
    getChatReply: async () => JSON.stringify({
      content: '我给你转账了，先收下。',
      blessing: '祝好'
    }),
    buildUserPersonaSummary: () => '用户最近睡眠不好',
    buildContactPersonaSummary: () => '林夏嘴硬心软'
  });
  assert.equal(result.content, '我给你转账了，先收下。', '信箱回信不应靠关键词猜测普通自然语言');
}

{
  let sentLetters: any[] = [];
  let inboxLetters: any[] = [];
  let capturedRuntimePrompt = '';
  const toContact = {
    id: 'mail-c1',
    name: '林夏',
    remark: '夏夏',
    avatar: '',
    signatureImage: '',
    stampImage: '',
    relationship: '旧友'
  } as any;

  const handlers = buildMailboxActionHandlers({
    contacts: [toContact],
    user: { id: 'u1', name: '许知', avatar: '' } as any,
    mailboxTheme: { signatureImage: '', stampImage: '' } as any,
    aiSettings: {} as any,
    buildRuntimePromptWithMemory: (contact, limit) => {
      assert.equal(contact?.id, toContact.id, '信箱回信应按收信联系人注入记忆');
      assert.equal(limit, 10, '信箱回信应使用适度的记忆条数');
      return '【当前北京时间】2026/7/6\n\n【联系人记忆】\n- 用户最近睡眠不好，林夏曾答应认真回信。';
    },
    setSelectedMailboxType: (() => {}) as any,
    setSelectedMailboxLetter: (() => {}) as any,
    pushSubView: (() => {}) as any,
    setSentLetters: ((updater: any) => {
      sentLetters = typeof updater === 'function' ? updater(sentLetters) : updater;
    }) as any,
    setInboxLetters: ((updater: any) => {
      inboxLetters = typeof updater === 'function' ? updater(inboxLetters) : updater;
    }) as any,
    showToast: (() => {}) as any,
    getChatReply: async (_messages, _systemInstruction, _settings, runtimeUserPrompt) => {
      capturedRuntimePrompt = String(runtimeUserPrompt || '');
      return '{"content":"我看到你说最近还是睡不好，这封信我会认真回。","blessing":"愿你今晚能安稳些"}';
    }
  });

  handlers.handleSendMailboxLetter({
    toContactId: toContact.id,
    subject: '近况',
    content: '最近还是睡不好，也想知道你会不会认真回信。',
    blessing: '祝好'
  });

  for (let i = 0; i < 20 && inboxLetters.length === 0; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  assert.equal(sentLetters.length, 1, '发送信箱信件应先写入已发送');
  assert.equal(inboxLetters.length, 1, 'AI 回信成功后应写入收件箱');
  assert.match(capturedRuntimePrompt, /联系人记忆/, '信箱回信请求应携带联系人记忆');
  assert.match(capturedRuntimePrompt, /睡眠不好/, '信箱回信请求应携带可自然引用的用户近况');
}

console.log('测试通过：信箱回信已接入角色化质量规则并保持稳定 JSON 格式。');
