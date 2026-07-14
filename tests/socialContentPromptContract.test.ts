import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildMomentPostQualityLines,
  buildOfficialArticleQualityLines,
  buildSocialInteractionQualityLines
} from '../src/utils/prompt/socialInteractionQualityPrompt.ts';
import {
  generateOfficialArticleDraft,
  generateOfficialArticleCommentReply,
  generateOfficialArticleInitialComments
} from '../src/app/officialArticleAiUtils.ts';

{
  const momentLines = buildMomentPostQualityLines().join('\n');
  assert.match(momentLines, /角色某个真实瞬间发出的内容/, '朋友圈文案规则应像角色真实发布');
  assert.match(momentLines, /具体触发点、画面或选择/, '朋友圈文案规则应避免空泛心情总结');
  assert.match(momentLines, /系统能力必须通过对应结构化类型落地/, '朋友圈文案规则应隔离系统能力入口');
  assert.match(momentLines, /互动要像可见范围内真实朋友的反应/, '朋友圈文案规则应约束点赞评论质量');
}

{
  const interactionLines = buildSocialInteractionQualityLines().join('\n');
  assert.match(interactionLines, /帖子、文章、图片、位置或用户评论里的具体信息/, '社交评论规则应承接具体内容');
  assert.match(interactionLines, /语气、关注点和亲疏距离应有区别/, '社交评论规则应避免联系人同质化');
  assert.match(interactionLines, /系统能力必须通过对应结构化类型落地/, '社交评论规则应隔离系统能力入口');
  assert.match(interactionLines, /回复评论时必须针对对方刚说的话/, '社交评论规则应避免复读原帖');
}

{
  const articleLines = buildOfficialArticleQualityLines().join('\n');
  assert.match(articleLines, /基于自身经历、职业、兴趣或价值观/, '订阅号文章规则应贴合角色来源');
  assert.match(articleLines, /明确观点与具体信息密度/, '订阅号文章规则应避免空泛文章');
  assert.match(articleLines, /适合公开发布/, '订阅号文章规则应区分公开文章和私聊口吻');
  assert.match(articleLines, /系统能力必须通过对应结构化类型落地/, '订阅号文章规则应隔离系统能力入口');
}

const momentSource = readFileSync(new URL('../src/app/momentActionFlow.ts', import.meta.url), 'utf8');
assert.match(momentSource, /buildMomentPostQualityLines/, '朋友圈生成应接入朋友圈内容质量规则');
assert.match(momentSource, /buildSocialInteractionQualityLines/, '朋友圈评论与互动应接入社交评论质量规则');
assert.match(momentSource, /【朋友圈质量规则】/, '朋友圈生成提示应输出质量规则段落');
assert.match(momentSource, /【评论互动质量】/, '朋友圈评论提示应输出互动质量规则段落');
assert.match(momentSource, /buildRuntimePromptWithMemory\(contact, 4\)/, '用户发布朋友圈后的自动互动应复用统一运行时用户信息和联系人记忆上下文');
assert.doesNotMatch(momentSource, /buildRuntimePromptWithMemory\([^)]*trigger/, '朋友圈互动不应把帖子正文作为记忆检索触发词');
assert.doesNotMatch(momentSource, /hasRuntimePromptWithMemory|getContactMemoryPrompt\(params\.contactMemories/, '朋友圈互动不应保留旧记忆拼接回退');
assert.match(momentSource, /buildMomentInteractionUserPrompt/, '朋友圈互动输入应统一按有值字段构建');
assert.doesNotMatch(momentSource, /targetMoment\.content \|\| '无'|targetMoment\.location \|\| '无'|newMoment\.content \|\| '（空）'|descSummary \|\| '无'/, '朋友圈互动输入不应把空字段补成固定文本交给 AI');
assert.doesNotMatch(momentSource, /momentAuthor[^;\n]+ '未知'|发布者是「未知」|【发帖人】未知/, '朋友圈评论回复缺少发布者时不应把“未知”写进 AI 提示词');
assert.match(momentSource, /const readVisibleScalarText = \(value: unknown\): string =>/, '朋友圈互动提示应先按可展示标量读取文本');
assert.match(momentSource, /const authorContext = cleanMomentAuthor \?/, '朋友圈评论回复应只在发布者有值时写入发布者上下文');
assert.doesNotMatch(momentSource, /String\(targetMoment\.author \|\| ''\)|String\(item \|\| ''\)|String\(text \|\| ''\)|replyTo\?\.user \|\| params\.user\?\.name/, '朋友圈互动不应把对象型作者、图片描述或回复对象强转成可见文本');
assert.match(momentSource, /extractStrictJsonObject\(readVisibleScalarText\(textReply\)\)/, '朋友圈自动互动解析 AI 回复前应拒绝对象型返回值');
assert.match(momentSource, /只输出一个 JSON 对象/, '朋友圈生成仍应保持 JSON 输出约束');
assert.match(momentSource, /\{"author":"contact","content":"最终文案","location":"可选地点"\}/, '朋友圈生成 JSON 示例应使用合法英文双引号');
assert.match(momentSource, /\{"likes":\["昵称1"\],"comments":\[\{"user":"昵称","text":"评论","replyTo":"可选"\}\]\}/, '朋友圈互动 JSON 示例应使用合法英文双引号');
assert.doesNotMatch(momentSource, /[{\[,]\s*“|”\s*:|:\s*”|\[\s*“/, '朋友圈 JSON 契约不应使用中文弯引号，避免诱导模型输出非法 JSON');
assert.match(momentSource, /normalizeGeneratedStrictNonSystemEventText/, '朋友圈生成正文和评论落地应严格拒收系统能力格式');
assert.doesNotMatch(momentSource, /normalizeGeneratedNonSystemEventText\(parsedJson\?\.location/, '朋友圈定位字段混入系统能力格式时不应温和截断保留半句');
assert.match(momentSource, /extractStrictJsonObject/, '朋友圈生成和互动不应从解释文本中截取 JSON 继续落地');
assert.match(momentSource, /buildContactInteractionNames/, '朋友圈联系人模式应由落地层生成允许名单');
assert.match(momentSource, /resolveInteractionMinCount\(allowedInteractionNames\)/, '朋友圈互动落地应按当前允许名单确定最小有效数量');
assert.match(momentSource, /normalizeAiLikeNames\(parsedJson\?\.likes, allowedInteractionNames, \{ minCount: interactionMinCount \}\)/, '朋友圈 AI 点赞不应只靠提示词约束联系人名单和数量');
assert.match(momentSource, /normalizeAiComments\(parsedJson\?\.comments, 'manual-comment', allowedInteractionNames, \{ minCount: interactionMinCount \}\)/, '朋友圈手动生成评论不应只靠提示词约束联系人名单和数量');
assert.match(momentSource, /normalizeAiComments\(parsedJson\?\.comments, 'remind-comment', allowedInteractionNames, \{ minCount: interactionMinCount \}\)/, '提醒联系人发朋友圈评论不应只靠提示词约束联系人名单和数量');
assert.match(momentSource, /normalizeAiComments\(parsed\?\.comments, 'post-comment', allowedInteractionNames, \{ minCount: interactionMinCount \}\)/, '用户发朋友圈后的自动互动不应只靠提示词约束联系人名单和数量');
assert.doesNotMatch(momentSource, /String\(parsed\?\.text \|\| ''\)/, '朋友圈评论回复不应把对象型 text 强转成可见正文');
assert.doesNotMatch(momentSource, /containsUnbackedPaymentClaimText/, '朋友圈生成正文和评论回复不应使用普通正文关键词伪支付守卫');

const officialSource = readFileSync(new URL('../src/app/officialArticleAiUtils.ts', import.meta.url), 'utf8');
const officialSubPageSource = readFileSync(new URL('../src/official/OfficialAccountSubPages.tsx', import.meta.url), 'utf8');
assert.match(officialSource, /buildSocialInteractionQualityLines/, '订阅号评论应接入社交评论质量规则');
assert.match(officialSource, /buildOfficialArticleQualityLines/, '订阅号文章应接入文章质量规则');
assert.match(officialSource, /【评论互动质量】/, '订阅号评论提示应输出互动质量规则段落');
assert.match(officialSource, /【订阅号文章质量】/, '订阅号文章提示应输出文章质量规则段落');
assert.match(officialSource, /输出结构：\{"comments"/, '订阅号评论仍应保留 JSON 输出结构');
assert.match(officialSource, /只输出一个 JSON 对象/, '订阅号文章仍应保留 JSON 输出约束');
assert.match(officialSource, /buildRuntimePromptWithMemory/, '订阅号评论区应复用统一用户资料和联系人记忆上下文');
assert.doesNotMatch(officialSource, /getContactMemoryPrompt|ContactMemories/, '订阅号评论不应保留旧记忆构建器回退');
assert.match(officialSource, /normalizeGeneratedStrictNonSystemEventText/, '订阅号评论落地应严格拒收系统能力格式');
assert.match(officialSource, /extractStrictJsonObject/, '订阅号生成不应从解释文本中截取 JSON 继续落地');
assert.match(officialSource, /hasOnlyAllowedKeys/, '订阅号生成入口应按固定字段白名单校验 AI JSON');
assert.doesNotMatch(officialSource, /containsUnbackedPaymentClaimText/, '订阅号评论和文章正文不应使用普通正文关键词伪支付守卫');
assert.doesNotMatch(officialSource, /parsedJson\?\.content \|\| parsedJson\?\.summary/, '订阅号文章正文不应使用 summary 旧字段兜底 content');
assert.doesNotMatch(officialSubPageSource, /发现更多精彩内容|不断探索，发现未知的世界|探索者/, '订阅号列表不应用程序假文章兜底补内容');
assert.doesNotMatch(officialSubPageSource, /item\.user \|\| '读者'/, '订阅号初始评论缺用户名时不应补默认读者身份');

{
  let capturedRuntimePrompt = '';
  const comments = await generateOfficialArticleInitialComments({
    article: { title: '睡前散步', desc: '写给总是睡不好的朋友。' },
    contacts: [
      { id: 'c1', name: '林夏', remark: '夏夏', avatar: '' } as any,
      { id: 'c2', name: '阿澈', avatar: '' } as any
    ],
    runtimeUserPromptBase: '【当前北京时间】2026/7/6',
    aiSettings: {} as any,
    buildRuntimePromptWithMemory: (contact, limit) => {
      assert.equal(limit, 4, '订阅号初始评论应按联系人取轻量记忆上下文');
      return `【当前用户信息】\n- 用户基础资料：昵称：小满；状态：最近睡眠不好\n【联系人记忆】\n- ${contact.name}知道用户睡前容易想太多`;
    },
    getChatReply: async (_messages, systemInstruction, _settings, runtimeUserPrompt) => {
      capturedRuntimePrompt = String(runtimeUserPrompt || '');
      assert.match(systemInstruction, /生成 2 条一级评论/, '订阅号初始评论应按当前联系人池确定精确条数');
      return '{"comments":[{"user":"夏夏","text":"这篇像是写给小满的，睡前那段挺贴。"},{"user":"阿澈","text":"我也觉得那段挺像小满昨晚说的。"}]}';
    }
  });
  assert.equal(comments.length, 2, '订阅号初始评论应正常解析完整结果');
  assert.equal(comments[0]?.text, '这篇像是写给小满的，睡前那段挺贴。', '订阅号初始评论应保留干净结构字段');
  assert.match(capturedRuntimePrompt, /当前用户信息/, '订阅号初始评论请求应携带当前用户信息');
  assert.match(capturedRuntimePrompt, /最近睡眠不好/, '订阅号初始评论请求应携带可自然引用的用户近况');
}

{
  const comments = await generateOfficialArticleInitialComments({
    article: { title: '睡前散步', desc: '今晚聊聊睡眠。' },
    contacts: [{ id: 'c1', name: '林夏', avatar: '' } as any],
    runtimeUserPromptBase: '',
    aiSettings: {} as any,
    buildRuntimePromptWithMemory: () => '',
    getChatReply: async () => '{"comments":[{"user":"林夏","text":"这段挺贴。","content":"旧字段正文"}]}'
  });
  assert.deepEqual(comments, [], '订阅号初始评论不应在 user/text 合法时容忍 content 旧字段');
}

{
  const comments = await generateOfficialArticleInitialComments({
    article: { title: '睡前散步', desc: '今晚聊聊睡眠。' },
    contacts: [
      { id: 'c1', name: '林夏', avatar: '' } as any,
      { id: 'c2', name: '阿澈', avatar: '' } as any
    ],
    runtimeUserPromptBase: '',
    aiSettings: {} as any,
    buildRuntimePromptWithMemory: () => '',
    getChatReply: async () => {
      return '{"comments":[{"user":"林夏","text":"红包收下，买杯热的。"},{"user":"阿澈","text":"我现在不能给你转账，但可以陪你想办法。"}]}';
    }
  });
  assert.equal(comments.length, 2, '订阅号初始评论不应靠关键词猜测普通自然语言');
  assert.equal(comments[0]?.text, '红包收下，买杯热的。');
  assert.equal(comments[1]?.text, '我现在不能给你转账，但可以陪你想办法。');
}

{
  const comments = await generateOfficialArticleInitialComments({
    article: { title: '睡前散步', desc: '今晚聊聊睡眠。' },
    contacts: [
      { id: 'c1', name: '林夏', avatar: '' } as any,
      { id: 'c2', name: '阿澈', avatar: '' } as any
    ],
    runtimeUserPromptBase: '',
    aiSettings: {} as any,
    buildRuntimePromptWithMemory: () => '',
    getChatReply: async () => {
      return '{"comments":[{"user":"林夏","text":"这篇写得挺贴近昨晚那种状态。"},{"user":"阿澈","text":"[系统红包·待领取] ¥8.88"}]}';
    }
  });
  assert.deepEqual(comments, [], '订阅号初始评论过滤后数量不足时不应展示半组成品');
}

{
  const comments = await generateOfficialArticleInitialComments({
    article: { title: '睡前散步', desc: '写给总是睡不好的朋友。' },
    contacts: [{ id: 'c1', name: '林夏', remark: '夏夏', avatar: '' } as any],
    runtimeUserPromptBase: '',
    aiSettings: {} as any,
    buildRuntimePromptWithMemory: () => '',
    getChatReply: async () => '解释一下 {"comments":[{"user":"夏夏","text":"不应被截取"}]}'
  });
  assert.deepEqual(comments, [], '订阅号初始评论不应从解释文本中截取 JSON 继续落地');
}

{
  let capturedRuntimePrompt = '';
  let capturedContactId = '';
  const reply = await generateOfficialArticleCommentReply({
    article: { title: '睡前散步', desc: '写给总是睡不好的朋友。' },
    commentText: '我昨晚又没睡好，看到这篇有点被说中了。',
    contacts: [{ id: 'c1', name: '林夏', remark: '夏夏', avatar: '' }],
    runtimeUserPromptBase: '【当前北京时间】2026/7/6',
    aiSettings: {} as any,
    buildRuntimePromptWithMemory: (contact, limit) => {
      capturedContactId = contact.id;
      assert.equal(limit, 4, '订阅号评论回复应按发言联系人取轻量记忆上下文');
      return '【当前用户信息】\n- 用户基础资料：昵称：小满；状态：最近睡眠不好\n【联系人记忆】\n- 林夏知道用户最近睡眠不好';
    },
    getChatReply: async (_messages, _systemInstruction, _settings, runtimeUserPrompt) => {
      capturedRuntimePrompt = String(runtimeUserPrompt || '');
      return '{"user":"夏夏","text":"小满，这篇确实戳你，今晚别再硬撑到很晚。"}';
    }
  });
  assert.equal(capturedContactId, 'c1', '订阅号评论回复应把候选联系人传给统一上下文构建器');
  assert.equal(reply?.text, '小满，这篇确实戳你，今晚别再硬撑到很晚。');
  assert.match(capturedRuntimePrompt, /当前用户信息/, '订阅号评论回复请求应携带当前用户信息');
  assert.match(capturedRuntimePrompt, /林夏知道用户最近睡眠不好/, '订阅号评论回复请求应携带联系人记忆');
}

{
  const reply = await generateOfficialArticleCommentReply({
    article: { title: '睡前散步', desc: '写给总是睡不好的朋友。' },
    commentText: '我昨晚又没睡好，看到这篇有点被说中了。',
    contacts: [{ id: 'c1', name: '林夏', remark: '夏夏', avatar: '' }],
    runtimeUserPromptBase: '',
    aiSettings: {} as any,
    buildRuntimePromptWithMemory: () => '',
    getChatReply: async () => '{"user":"夏夏","text":"小满，这篇确实戳你，今晚别再硬撑到很晚。 译文：Sleep earlier."}'
  });
  assert.equal(reply, null, '订阅号评论回复混入译文格式时应拒收，不再截断成半句');
}

{
  const reply = await generateOfficialArticleCommentReply({
    article: { title: '睡前散步', desc: '今晚聊聊睡眠。' },
    commentText: '我昨晚又没睡好。',
    contacts: [{ id: 'c1', name: '林夏', avatar: '' }],
    runtimeUserPromptBase: '',
    aiSettings: {} as any,
    buildRuntimePromptWithMemory: () => '',
    getChatReply: async () => '{"user":"林夏","text":"我给你转账了，先收下。"}'
  });
  assert.equal(reply?.text, '我给你转账了，先收下。', '订阅号评论回复不应靠关键词猜测普通自然语言');
}

{
  const reply = await generateOfficialArticleCommentReply({
    article: { title: '睡前散步', desc: '写给总是睡不好的朋友。' },
    commentText: '我昨晚又没睡好。',
    contacts: [{ id: 'c1', name: '林夏', remark: '夏夏', avatar: '' }],
    runtimeUserPromptBase: '',
    aiSettings: {} as any,
    buildRuntimePromptWithMemory: () => '',
    getChatReply: async () => '{"user":"夏夏","text":"我把位置发你了 [位置] 春信咖啡"}'
  });
  assert.equal(reply, null, '订阅号评论回复混入系统能力格式时应整条拒收');
}

{
  const reply = await generateOfficialArticleCommentReply({
    article: { title: '睡前散步', desc: '写给总是睡不好的朋友。' },
    commentText: '我昨晚又没睡好。',
    contacts: [{ id: 'c1', name: '林夏', remark: '夏夏', avatar: '' }],
    runtimeUserPromptBase: '',
    aiSettings: {} as any,
    buildRuntimePromptWithMemory: () => '',
    getChatReply: async () => '解释一下 {"user":"夏夏","text":"不应被截取"}'
  });
  assert.equal(reply, null, '订阅号评论回复不应从解释文本中截取 JSON 继续落地');
}

{
  const reply = await generateOfficialArticleCommentReply({
    article: { title: '睡前散步', desc: '写给总是睡不好的朋友。' },
    commentText: '我昨晚又没睡好。',
    contacts: [{ id: 'c1', name: '林夏', avatar: '' }],
    runtimeUserPromptBase: '',
    aiSettings: {} as any,
    buildRuntimePromptWithMemory: () => '',
    getChatReply: async () => '{"user":{"name":"林夏"},"text":"对象用户不应被转成名字"}'
  });
  assert.equal(reply, null, '订阅号评论回复不应把对象型 user 强转成联系人名');
}

{
  const draft = await generateOfficialArticleDraft({
    contacts: [{ id: 'c1', name: '林夏', avatar: '', allowRichActions: true } as any],
    aiSettings: {} as any,
    getChatReply: async () => '{"title":"今晚别硬撑","content":"我给你转账了，先收下。"}',
    sanitizeTitle: (raw) => String(raw || '').trim(),
    sanitizeText: (raw) => String(raw || '').trim(),
    buildContactPersonaSummary: () => '林夏嘴硬心软',
    buildRuntimePromptWithMemory: () => ''
  });
  assert.equal(draft?.article.desc, '我给你转账了，先收下。', '订阅号文章正文不应靠关键词猜测普通自然语言');
}

{
  const draft = await generateOfficialArticleDraft({
    contacts: [{ id: 'c1', name: '林夏', avatar: '', allowRichActions: true } as any],
    aiSettings: {} as any,
    getChatReply: async () => '{"title":"只有旧摘要","summary":"summary 不应兜底正文"}',
    sanitizeTitle: (raw) => String(raw || '').trim(),
    sanitizeText: (raw) => String(raw || '').trim(),
    buildContactPersonaSummary: () => '林夏嘴硬心软',
    buildRuntimePromptWithMemory: () => ''
  });
  assert.equal(draft, null, '订阅号文章缺少 content 时不应使用 summary 旧字段继续落地');
}

{
  const draft = await generateOfficialArticleDraft({
    contacts: [{ id: 'c1', name: '林夏', avatar: '', allowRichActions: true } as any],
    aiSettings: {} as any,
    getChatReply: async () => '{"title":"今晚别硬撑","content":"正文合法","summary":"旧摘要"}',
    sanitizeTitle: (raw) => String(raw || '').trim(),
    sanitizeText: (raw) => String(raw || '').trim(),
    buildContactPersonaSummary: () => '林夏嘴硬心软',
    buildRuntimePromptWithMemory: () => ''
  });
  assert.equal(draft, null, '订阅号文章不应在 title/content 合法时容忍 summary 旧字段');
}

{
  const draft = await generateOfficialArticleDraft({
    contacts: [{ id: 'c1', name: '林夏', avatar: '', allowRichActions: true } as any],
    aiSettings: {} as any,
    getChatReply: async () => '{"title":{"text":"对象标题"},"content":{"text":"对象正文"}}',
    sanitizeTitle: (raw) => String(raw || '').trim(),
    sanitizeText: (raw) => String(raw || '').trim(),
    buildContactPersonaSummary: () => '林夏嘴硬心软',
    buildRuntimePromptWithMemory: () => ''
  });
  assert.equal(draft, null, '订阅号文章标题和正文不应把对象型 AI 字段强转成可见文本');
}

console.log('测试通过：朋友圈与订阅号生成入口已接入社交内容质量规则。');
