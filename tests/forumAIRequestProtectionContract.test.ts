import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractForumAiJsonObject, normalizeCommentList, sanitizeGeneratedForumText } from '../src/forum/forumUtils.ts';

const source = readFileSync(new URL('../src/forum/hooks/useForumAI.ts', import.meta.url), 'utf8');
const forumUtilsSource = readFileSync(new URL('../src/forum/forumUtils.ts', import.meta.url), 'utf8');

assert.ok(
  source.includes('forumPostInflightRef') && source.includes('forumCommentInflightRef'),
  '论坛发帖和评论生成应有本地运行中请求缓存，避免重复触发额外 AI 调用'
);

assert.ok(
  source.includes('buildForumPostInflightKey') && source.includes('buildForumCommentInflightKey'),
  '论坛 AI 请求应按论坛/帖子维度建立稳定复用 key'
);

assert.ok(
  source.includes('const existing = forumPostInflightRef.current.get(key);') && source.includes('if (existing) return existing;'),
  '论坛发帖生成重复触发时应直接复用正在运行的请求'
);

assert.ok(
  source.includes('const existing = forumCommentInflightRef.current.get(key);') && source.includes('if (existing) return existing;'),
  '论坛评论生成重复触发时应直接复用正在运行的请求'
);

assert.ok(
  source.includes('runGenerateAndInsertPost') && source.includes('runGenerateCommentsForPost'),
  '论坛 AI 的实际请求逻辑应包在复用锁之后执行，避免先发请求再丢弃'
);

assert.ok(
  source.includes('sanitizeGeneratedForumText(parsed?.title)') && source.includes('sanitizeGeneratedForumText(parsed?.content'),
  '论坛帖子标题和正文落地前应清理心声、动作、翻译等非展示格式片段'
);

assert.doesNotMatch(source, /sanitizeGeneratedForumText\(raw/, '论坛帖子正文不应把 AI 原始回复兜底落地');
assert.doesNotMatch(source, /欢迎在评论区交流/, '论坛帖子正文不应使用默认欢迎语兜底');
assert.doesNotMatch(source, /fallbackNews|discussionFallback/, '论坛快讯不应用程序伪造帖子补足数量');
assert.doesNotMatch(source, /extractFirstJsonObject\(raw\) \|\| \{\}/, '论坛评论解析失败不应继续交给空对象兜底');
assert.doesNotMatch(source, /未指定|无可用联系人|论坛标签：\$\{[^}]+\|\||论坛世界书：\\n\$\{[^}]+\|\||论坛联系人：\$\{[^}]+\|\||currentUserName \|\| '楼主'/, '论坛 AI 提示词不应把空字段写成固定占位交给模型猜');
assert.doesNotMatch(forumUtilsSource, /fallbackAuthor/, '论坛 AI 评论缺少作者时不应补默认身份');
assert.doesNotMatch(source, /realAuthor/, '论坛 AI 帖子匿名真实作者不应接受 realAuthor 旧字段兜底 bindAuthor');
assert.doesNotMatch(forumUtilsSource, /realAuthor/, '论坛 AI 评论匿名真实作者不应接受 realAuthor 旧字段兜底 bindAuthor');
assert.doesNotMatch(source, /rawAuthor === '匿名'|sanitize\(parsed\?\.author\) === '匿名'/, '论坛 AI 帖子不应根据 author 文本猜 isAnonymous');
assert.doesNotMatch(forumUtilsSource, /rawAuthor === '匿名'/, '论坛 AI 评论不应根据 author 文本猜 isAnonymous');
assert.match(source, /if \(typeof parsed\?\.isAnonymous !== 'boolean'\) return null;/, '论坛 AI 帖子缺少 isAnonymous 布尔字段时应丢弃');
assert.match(forumUtilsSource, /if \(typeof raw\?\.isAnonymous !== 'boolean'\)/, '论坛 AI 评论缺少 isAnonymous 布尔字段时应丢弃');
assert.doesNotMatch(source, /params\.mode === 'init'/, '论坛 AI 帖子缺少 pinned 时不应默认置顶开场帖');
assert.equal(
  extractForumAiJsonObject('解释一下 {"posts":[{"title":"不应截取","content":"正文"}]}'),
  null,
  '论坛 AI 生成不应从解释文本中截取 JSON 继续落地'
);
assert.match(source, /if \(!title \|\| !content\) return null;/, '论坛帖子缺少结构化标题或正文时应丢弃该条');
assert.match(source, /if \(!parsedRoot\) return \[\];/, '论坛发帖解析不到 JSON 时不应落地内容');
assert.match(source, /只能使用 posts 数组承载帖子/, '论坛发帖提示应明确固定 posts 数组协议');
assert.match(source, /不要使用 post 单条字段，也不要把帖子对象直接放在根对象/, '论坛发帖提示应禁止旧单条字段和根对象兜底');
assert.match(source, /const postItems = Array\.isArray\(parsedRoot\?\.posts\) \? parsedRoot\.posts : \[\];/, '论坛发帖解析应只接受 posts 数组');
assert.match(source, /if \(postItems\.length !== count\) return \[\];/, '论坛发帖原始 posts 数量必须等于本轮要求数量');
assert.match(source, /return result\.length === count \? result : \[\];/, '论坛发帖过滤后数量不足时不应展示半组成品');
assert.match(source, /const prompt = buildForumPostPrompt\(\{ forum, mode: params\.mode, topic: params\.topic, count, contactNames \}\);/, '论坛发帖提示词应集中组装，避免在请求现场散落空字段占位');
assert.match(source, /if \(contactNames\.length === 0\) return \[\];/, '论坛发帖没有可用联系人时不应调用 AI 让模型编作者');
assert.doesNotMatch(source, /parsedRoot\?\.post(?!s)|\[\s*parsedRoot\s*\]/, '论坛发帖不应接受 post 旧字段或根对象帖子兜底');
assert.match(source, /if \(!normalizedBoards\.includes\(categoryRaw\)\) return null;/, '论坛发帖板块必须来自结构化可用板块，非法板块应丢弃');
assert.doesNotMatch(source, /normalizedBoards\[idx % normalizedBoards\.length\]/, '论坛发帖不应把 AI 非法板块按序号兜底成有效板块');
assert.match(source, /只能使用 comments 数组承载评论/, '论坛评论提示应明确固定 comments 数组协议');
assert.match(source, /不要使用 comment 单条字段，也不要把评论对象直接放在根对象/, '论坛评论提示应禁止旧单条字段和根对象兜底');
assert.match(source, /normalizeCommentList\(parsed\?\.comments, currentUserName, roleContacts\)/, '论坛评论解析应只接受 comments 数组');
assert.match(source, /requiredCount: randomCount/, '论坛批量评论落地应要求有效评论数量等于本轮生成数量');
assert.match(source, /requireReply: true/, '论坛批量评论落地应要求至少一条有效楼中楼');
assert.match(source, /const prompt = buildForumCommentPrompt\(\{ forum, post, randomCount, contactNames \}\);/, '论坛评论提示词应集中组装，避免在请求现场散落空字段占位');
assert.match(source, /if \(contactNames\.length === 0\) \{\s+if \(!options\?\.silent\) onToast\?\.\('暂时没有新的讨论'\);\s+return 0;\s+\}/, '论坛评论没有可用联系人时不应调用 AI 让模型编作者');
assert.doesNotMatch(forumUtilsSource, /raw\?\.id|raw\?\.createdAt|raw\?\.maskId|raw\?\.replyToId|raw\?\.replyToAuthor/, '论坛 AI 评论不应读取本地运行时字段或旧引用字段');

assert.equal(
  sanitizeGeneratedForumText('这个话题挺真实的。【动作】摸了摸杯沿 [位置] 春信咖啡'),
  '',
  '论坛 AI 纯文本混入系统能力格式时应整段拒收，避免截断后留下假系统能力正文'
);

assert.equal(
  sanitizeGeneratedForumText('我给你转账了，先收下。'),
  '我给你转账了，先收下。',
  '论坛 AI 文本不应靠关键词猜测普通自然语言'
);

const comments = normalizeCommentList([
  { content: '没有作者不应补成任何默认身份' },
  { user: '林夏', content: '旧 user 字段不应补成作者' },
  { name: '林夏', content: '旧 name 字段不应补成作者' },
  { author: '林夏', text: '旧 text 字段不应补成正文' },
  { author: '林夏', reply: '旧 reply 字段不应补成正文' },
  { author: '匿名', realAuthor: '林夏', content: '旧 realAuthor 字段不应补成匿名绑定作者' },
  { author: '匿名', bindAuthor: '林夏', content: '缺 isAnonymous 时不应根据匿名作者兜底绑定身份' },
  { author: '匿名', bindAuthor: '林夏', isAnonymous: true, content: '匿名评论可使用当前 bindAuthor 字段' },
  { author: '林夏', isAnonymous: false, content: '我也遇到过 【心声】有点想起昨晚' },
  { author: '林夏', isAnonymous: false, content: '【系统说明】这是一条评论\n先别急着下结论' },
  { author: '林夏', isAnonymous: false, content: '[系统红包·待领取] ¥8.88' },
  { author: '林夏 [位置] 春信咖啡', isAnonymous: false, content: '作者名被污染不应落地' },
  { author: '林夏', isAnonymous: false, content: '这句不应该保留 [系统转账·待收款] ¥20' },
  { author: '林夏', isAnonymous: false, content: '红包收下，买杯热的。' },
  { author: '林夏', isAnonymous: false, content: '我现在不能给你转账，但可以陪你想办法。' },
  {
    author: '林夏',
    isAnonymous: false,
    content: 'AI 不应指定本地运行时字段',
    id: 'ai-id',
    createdAt: 1,
    maskId: 'ai-mask',
    replyToId: 'ai-reply-id',
    replyToAuthor: 'ai-reply-author'
  }
], '小满', [{ id: 'c1', name: '林夏' } as any]);

assert.equal(comments.length, 4);
assert.equal(comments[0]?.author, '匿名');
assert.equal(comments[0]?.authorContactId, 'c1');
assert.equal(comments[0]?.content, '匿名评论可使用当前 bindAuthor 字段');
assert.equal(comments[1]?.content, '红包收下，买杯热的。');
assert.equal(comments[2]?.content, '我现在不能给你转账，但可以陪你想办法。');
assert.notEqual(comments[3]?.id, 'ai-id');
assert.notEqual(comments[3]?.createdAt, 1);
assert.equal(comments[3]?.maskId, '');
assert.equal(comments[3]?.replyToId, '');
assert.equal(comments[3]?.replyToAuthor, '');

assert.deepEqual(
  normalizeCommentList([
    { author: '林夏', isAnonymous: false, content: '第一条有效评论' },
    { author: '林夏', isAnonymous: false, content: '[系统红包·待领取] ¥8.88' }
  ], '小满', [{ id: 'c1', name: '林夏' } as any], { requiredCount: 2 }),
  [],
  '论坛评论过滤后不足本轮要求数量时不应展示半组成品'
);

assert.deepEqual(
  normalizeCommentList([
    { author: '林夏', isAnonymous: false, content: '第一条有效评论' },
    { author: '林夏', isAnonymous: false, content: '第二条有效评论' }
  ], '小满', [{ id: 'c1', name: '林夏' } as any], { requiredCount: 2, requireReply: true }),
  [],
  '论坛评论要求楼中楼时不应接受没有有效回复的整组结果'
);

const strictComments = normalizeCommentList([
  {
    author: '林夏',
    isAnonymous: false,
    content: '第一条有效评论',
    replies: [{ author: '林夏', isAnonymous: false, content: '这条楼中楼也有效' }]
  },
  { author: '林夏', isAnonymous: false, content: '红包收下，买杯热的。' }
], '小满', [{ id: 'c1', name: '林夏' } as any], { requiredCount: 2, requireReply: true });
assert.equal(strictComments.length, 2, '论坛评论数量正确且含有效楼中楼时应正常落地');
assert.equal(strictComments[0]?.replies.length, 1, '论坛评论应保留结构有效的楼中楼');
assert.equal(strictComments[1]?.content, '红包收下，买杯热的。', '论坛评论严格模式不应靠关键词猜测普通自然语言');

console.log('测试通过：论坛 AI 生成入口已接入本地单飞保护，重复触发不会额外消耗 AI 次数。');
