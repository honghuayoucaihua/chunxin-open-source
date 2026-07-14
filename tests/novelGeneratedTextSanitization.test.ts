import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildChapterCommentsInstruction,
  buildChapterInstruction,
  buildExpandChaptersInstruction,
  buildListInstruction,
  buildPublishProjectInstruction,
  isUsableGeneratedNovelMeta,
  normalizeAdditionalChapters,
  normalizeGeneratedChapterCommentReply,
  normalizeGeneratedChapterComments,
  normalizeMeta,
  normalizeNovelList
} from '../src/pages/novelDiscoverHelpers.ts';

const cleanBooks = normalizeNovelList({
  books: [{
    title: '雾港来信',
    author: '青芜',
    tags: ['悬疑', '成长'],
    wordCount: '18万字',
    favorites: '3.2万',
    rating: '9.1',
    description: '她回到雾港追查旧案。'
  }]
}, 0);

assert.equal(cleanBooks[0]?.title, '雾港来信', 'AI 小说书名应保留干净结构字段');
assert.deepEqual(cleanBooks[0]?.tags, ['悬疑', '成长'], 'AI 小说标签应保留干净结构字段');
assert.equal(cleanBooks[0]?.description, '她回到雾港追查旧案。', 'AI 小说简介应保留干净结构字段');

const dirtyBooks = normalizeNovelList({
  books: [{
    title: '雾港来信【动作】翻开旧信',
    author: '青芜',
    tags: ['悬疑', '心声：隐藏标签', '[红包] 系统标签', '成长'],
    wordCount: '18万字',
    favorites: '3.2万',
    rating: '9.1',
    description: '她回到雾港追查旧案。【系统说明】这是钩子 [位置] 雾港'
  }]
}, 0);

assert.equal(dirtyBooks.length, 0, 'AI 小说关键字段混入动作、系统说明或系统事件格式时应拒收整本书条目');

const meta = normalizeMeta({
  intro: '一个关于重逢的故事。\n译文：A story\n[系统转账·待收款] ¥20',
  storyBible: {
    premise: '旧案重新浮出水面【旁白】推进剧情',
    worldRules: ['每封信都有代价', '动作：写给模型看的说明', '[通话] 未接通'],
    readerDirectives: ['保持慢热', '系统说明：不要展示']
  },
  chapters: [{
    title: '第一章 雨夜【动作】关门',
    summary: '她收到第一封信【翻译】bad',
    content: '雨落在窗沿。\n【心声】她很害怕\n[位置] 雾港老街\n她拆开信封。'
  }]
});

assert.equal(meta.intro, '', 'AI 小说简介块混入译文或系统事件格式时应清空');
assert.equal(meta.storyBible.premise, '', 'AI 小说设定混入旁白格式时应清空');
assert.deepEqual(meta.storyBible.worldRules, ['每封信都有代价'], 'AI 小说世界规则不应保留动作说明');
assert.deepEqual(meta.storyBible.readerDirectives, ['保持慢热'], 'AI 小说读者指令不应保留系统说明');
assert.deepEqual(meta.chapters, [], 'AI 章节标题、摘要或正文混入格式标记时应拒收章节');

const incompleteMeta = normalizeMeta({
  storyBible: {},
  chapters: [{ title: '只有标题' }]
});
assert.equal(incompleteMeta.intro, '', 'AI 小说简介缺失时不应用默认简介兜底');
assert.equal(incompleteMeta.storyBible.premise, '', 'AI 小说主线缺失时不应用默认剧情兜底');
assert.deepEqual(incompleteMeta.storyBible.worldRules, [], 'AI 小说世界规则缺失时不应用默认规则兜底');
assert.deepEqual(incompleteMeta.chapters, [], 'AI 小说章节缺少摘要时不应用默认章节摘要兜底');
assert.equal(isUsableGeneratedNovelMeta(incompleteMeta), false, 'AI 小说目录缺少关键结构时应判为不可用');

const chapters = normalizeAdditionalChapters({
  chapters: [{
    title: '第二章 旧街【动作】转身',
    summary: '线索出现【系统说明】解释',
    goal: '推进调查',
    cliffhanger: '门后有人【旁白】制造悬念'
  }]
}, 1);

assert.deepEqual(chapters, [], 'AI 后续章节标题、摘要或钩子混入格式标记时应拒收章节');

const validComments = normalizeGeneratedChapterComments({
  comments: [
    { name: '追更小号', content: '这一章信息量很足【动作】点头' },
    { name: '晚风读者', content: '红包收下这种话在这里就是普通评论。' },
    { name: '雾港信笺', content: '我猜门后的人和旧案有关。' },
    { name: '纸页灯影', content: '最后一段的停顿很有画面感。' }
  ]
}, 1000, () => 18);

assert.equal(validComments.length, 3, 'AI 章评必须按 comments 对象数组落地，污染评论应整条过滤');
assert.equal(validComments[0]?.content, '红包收下这种话在这里就是普通评论。', 'AI 章评不应靠关键词猜测普通自然语言');
assert.equal(validComments[1]?.content, '我猜门后的人和旧案有关。', 'AI 章评应保留干净评论');
assert.equal(validComments[2]?.content, '最后一段的停顿很有画面感。', 'AI 章评应保留干净评论');
assert.deepEqual(
  normalizeGeneratedChapterComments({ comments: ['旧字符串章评不应补成读者', { name: '缺内容' }] }, 1000, () => 18),
  [],
  'AI 章评不应接受字符串数组或缺字段对象兜底'
);
assert.deepEqual(
  normalizeGeneratedChapterComments({ comments: [{ name: '只有一条', content: '数量不足不落地' }] }, 1000, () => 18),
  [],
  'AI 章评数量不足时不应展示半组结果'
);

const validReply = normalizeGeneratedChapterCommentReply({
  name: '章节考据党',
  reply: '我也觉得这句是在埋线。[位置] 雾港'
}, 2000, () => 7);
assert.equal(validReply, null, 'AI 章评回复混入系统事件格式时应整条拒收');
assert.equal(
  normalizeGeneratedChapterCommentReply({ reply: '缺昵称不应补默认读者' }, 2000, () => 7),
  null,
  'AI 章评回复缺少昵称时不应补默认昵称'
);

const novelViewSource = readFileSync(new URL('../src/pages/NovelDiscoverView.tsx', import.meta.url), 'utf8');
assert.match(novelViewSource, /normalizeGeneratedNonSystemEventText/, '小说生成展示前应清理非展示格式和系统事件格式片段');
assert.match(novelViewSource, /normalizeGeneratedChapterComments\(parsed\)/, 'AI 章节评论应通过统一结构化落地函数');
assert.match(novelViewSource, /const parsed = parseRequiredJsonObject\(raw, '章节正文生成格式无效，请重试'\)/, 'AI 章节正文应先通过必需 JSON 边界');
assert.match(novelViewSource, /extractStrictJsonObject\(raw \|\| ''\)/, '小说 AI 生成不应从解释文本中截取 JSON 继续落地');
assert.match(novelViewSource, /cleanGeneratedNovelBlock\(parsed\.content\)/, 'AI 章节正文展示前应清理非展示格式片段');
assert.match(novelViewSource, /normalizeGeneratedChapterCommentReply\(parsed\)/, 'AI 评论回复应通过统一结构化落地函数');
assert.match(novelViewSource, /isUsableGeneratedNovelMeta\(parsedMeta\)/, 'AI 阅读目录缺少关键字段时不应保存为空目录');
assert.match(novelViewSource, /isUsableGeneratedNovelMeta\(meta\)/, 'AI 小说项目缺少关键目录字段时不应保存为有效项目');
assert.doesNotMatch(novelViewSource, /extractFirstJsonObject\([^\\n]+\) \|\| \{\}/, '小说生成不应再用空对象兜底解析失败的 AI 输出');
assert.doesNotMatch(novelViewSource, /本章内容生成失败，请重试/, '小说章节正文不应用失败占位文本冒充生成内容');
assert.doesNotMatch(novelViewSource, /name \|\| '读者'/, 'AI 章评回复缺少昵称时不应补默认读者');

const novelHelpersSource = readFileSync(new URL('../src/pages/novelDiscoverHelpers.ts', import.meta.url), 'utf8');
assert.doesNotMatch(novelHelpersSource, /暂无简介|故事开场|剧情推进章节|命运将两人卷入同一场风暴|情感与利益冲突并行/, '小说 AI 归一化不应保留程序默认剧情兜底');
assert.doesNotMatch(novelHelpersSource, /existingTitles\.join\('、'\) \|\| '无'|readerDirectives\.join\('；'\) \|\| '无'|transientDirectives\.join\('；'\) \|\| '无'|excerpt \|\| '无'|未命名项目/, '小说 AI 提示词不应把空列表或空字段写成固定占位');

assert.doesNotMatch(buildListInstruction('治愈成长', []), /避免以下书名|无/, '小说书单提示没有已有书名时不应写入空名字占位');
assert.match(buildListInstruction('治愈成长', ['雾港来信']), /避免以下书名：雾港来信/, '小说书单提示有已有书名时应保留去重约束');
assert.doesNotMatch(buildExpandChaptersInstruction({
  intro: '',
  storyBible: {
    premise: '旧案重启',
    coreConflict: '信件与真相冲突',
    heroineArc: '从逃避到追问',
    relationArc: '从误解到合作',
    worldRules: ['每封信都有代价'],
    writingStyle: '克制悬疑',
    readerDirectives: []
  },
  chapters: []
}), /最近剧情：暂无|最后一章：无|结尾钩子：无|readerDirectives:无/, '小说续章提示缺少可用字段时不应写固定空占位');
assert.doesNotMatch(buildChapterInstruction(cleanBooks[0]!, { index: 1, title: '第一章 雨夜', summary: '她收到旧信' }, {
  intro: '',
  storyBible: {
    premise: '旧案重启',
    coreConflict: '信件与真相冲突',
    heroineArc: '从逃避到追问',
    relationArc: '从误解到合作',
    worldRules: ['每封信都有代价'],
    writingStyle: '克制悬疑',
    readerDirectives: []
  },
  chapters: []
}, '', []), /readerDirectives: 无|transientDirectives: 无/, '小说章节正文提示缺少读者指令时不应写固定空占位');
assert.doesNotMatch(buildPublishProjectInstruction({} as any), /未命名项目/, '小说项目提示缺少项目名时不应写固定项目名占位');
assert.doesNotMatch(buildChapterCommentsInstruction('第一章', '她收到旧信', ''), /章节片段：无/, '小说章评提示缺少片段时不应写固定空占位');

console.log('测试通过：小说模块 AI 生成文本落地前会清理非展示格式和明确系统事件格式片段。');
