import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatMemoryEntryForResummary, normalizeSummarizedMemoryDrafts, summarizeMessagesWithAI } from '../src/services/memory/aiSummarization.ts';
import { addSummarizedMemory } from '../src/services/memory/memoryRetrieval.ts';
import { addPendingMessage, clearPendingMessages, peekPendingMessages } from '../src/services/memory/pendingMessageBuffer.ts';
import { extractJsonArrayFromText } from '../src/services/memory/textProcessing.ts';

const aiSummarizationSource = readFileSync(new URL('../src/services/memory/aiSummarization.ts', import.meta.url), 'utf8');
const memoryRetrievalSource = readFileSync(new URL('../src/services/memory/memoryRetrieval.ts', import.meta.url), 'utf8');
const memoryIndexSource = readFileSync(new URL('../src/services/memory/index.ts', import.meta.url), 'utf8');
const contactMemoryServiceSource = readFileSync(new URL('../src/services/contactMemoryService.ts', import.meta.url), 'utf8');
const textProcessingSource = readFileSync(new URL('../src/services/memory/textProcessing.ts', import.meta.url), 'utf8');
const pendingMessageBufferSource = readFileSync(new URL('../src/services/memory/pendingMessageBuffer.ts', import.meta.url), 'utf8');
assert.match(aiSummarizationSource, /category: "identity" \| "preference" \| "relationship" \| "event" \| "emotion" \| "habit" \| "health" \| "other"/, 'AI 记忆总结应要求返回记忆类别');
assert.match(aiSummarizationSource, /topic: 这条记忆的具体主题/, 'AI 记忆总结应要求返回具体主题用于精确修正');
assert.match(aiSummarizationSource, /temporalType: "stable"/, 'AI 记忆总结应要求返回时效类型');
assert.match(aiSummarizationSource, /status: "active"/, 'AI 记忆总结应要求返回状态是否仍有效');
assert.match(aiSummarizationSource, /validDays: 当 temporalType 为 "short_term" 或 "one_time" 时必须给 1-365 的数字/, 'AI 记忆总结应要求短期记忆给出有效天数');
assert.match(aiSummarizationSource, /结构字段优先/, '已有长期记忆再总结时应明确结构字段优先');
assert.match(aiSummarizationSource, /每条都是结构化 JSON 记录/, '已有长期记忆再总结不应只传自然语言文本');
assert.match(aiSummarizationSource, /formatMemoryEntryForResummary/, '已有长期记忆再总结应通过统一格式化器保留结构字段');
assert.match(aiSummarizationSource, /formatMemoryContactLabel/, '记忆总结提示应统一处理空联系人名，避免空占位进入 AI 请求');
assert.doesNotMatch(aiSummarizationSource, /与"\$\{contactName\}"|"\$\{contactName\}"相关/, '记忆总结提示不应直接拼接可能为空的联系人名');
assert.doesNotMatch(textProcessingSource, /\.match\(\s*\/\\\[/, 'AI 记忆总结不应从解释文本中截取 JSON 数组继续使用');
assert.doesNotMatch(memoryRetrievalSource, /upsertContactMemory/, '记忆服务不应保留绕过 AI 结构化总结的旧写入入口');
assert.doesNotMatch(memoryIndexSource, /upsertContactMemory/, '记忆统一出口不应重新导出旧写入入口');
assert.doesNotMatch(contactMemoryServiceSource, /upsertContactMemory/, '旧兼容服务不应重新导出旧写入入口');
assert.doesNotMatch(memoryIndexSource, /shouldRemember|splitToCandidates|normalizeMemorySource/, '记忆统一出口不应导出本地猜测式记忆工具');
assert.doesNotMatch(contactMemoryServiceSource, /shouldRemember|splitToCandidates|normalizeMemorySource/, '旧兼容服务不应重新导出本地猜测式记忆工具');
assert.doesNotMatch(pendingMessageBufferSource, /shouldRemember|splitToCandidates/, '待总结消息不应先被本地规则拆句或过滤');
assert.match(aiSummarizationSource, /normalizeSummarizedMemoryDrafts/, 'AI 记忆总结落地前应整组校验结构化字段');
assert.doesNotMatch(aiSummarizationSource, /normalizeMemorySource\(item\?\.source\)/, 'AI 记忆总结不应把缺失或非法 source 兜底成 system');
assert.match(memoryRetrievalSource, /SummarizedMemoryEntry/, '总结记忆写入口应要求完整结构化记忆类型');
assert.match(memoryRetrievalSource, /总结记忆缺少必需结构字段/, '总结记忆写入口遇到半结构化数据应整批失败');
assert.match(memoryRetrievalSource, /isPromptEligibleMemoryEntry/, '长期记忆进入提示词前应先校验结构化字段');
assert.match(memoryRetrievalSource, /\(memoryMap\[contactId\] \|\| \[\]\)\.filter\(isPromptEligibleMemoryEntry\)/, '记忆提示选择不应直接读取旧半结构记忆');
assert.doesNotMatch(memoryRetrievalSource, /peekPendingMessages/, '记忆提示层不应读取待总结缓冲区作为未结构化兜底');
assert.doesNotMatch(memoryRetrievalSource, /待整理近期信息/, '记忆提示不应把未结构化待整理信息注入聊天上下文');

const strictMemoryJson = '[{"text":"用户最近睡眠不好","source":"user","weight":3}]';
assert.equal(extractJsonArrayFromText(`  ${strictMemoryJson}\n`).length, 1, '记忆总结严格解析应接受完整 JSON 数组和前后空白');
assert.throws(
  () => extractJsonArrayFromText(`总结如下：${strictMemoryJson}`),
  /完整 JSON 数组/,
  '记忆总结不应从解释文字中截取 JSON 数组'
);
assert.throws(
  () => extractJsonArrayFromText(`\`\`\`json\n${strictMemoryJson}\n\`\`\``),
  /完整 JSON 数组/,
  '记忆总结不应接受 Markdown 代码块包裹的 JSON 数组'
);

{
  const contactId = `pending-complete-message-${Date.now()}`;
  clearPendingMessages(contactId);
  const count = addPendingMessage(contactId, '嗯。最近感冒了！明天还有考试。', 'user');
  const pending = peekPendingMessages(contactId);
  assert.equal(count, 1, '待总结缓冲区应按完整消息计数，不应按标点拆成多个候选记忆');
  assert.equal(pending.length, 1, '待总结缓冲区应只写入一条完整消息');
  assert.equal(pending[0]?.text, '嗯。最近感冒了！明天还有考试。', '短句和短期状态应原样交给 AI 总结判断');
  clearPendingMessages(contactId);
}

{
  const now = Date.now();
  const normalized = normalizeSummarizedMemoryDrafts([
    {
      text: '用户最近睡眠不好',
      source: 'user',
      weight: 3,
      confidence: 0.8,
      category: 'health',
      topic: '睡眠',
      temporalType: 'short_term',
      status: 'active',
      validDays: 7
    }
  ], now);

  assert.equal(normalized.length, 1, '完整结构化记忆应能通过归一化');
  assert.equal(normalized[0]?.expiresAt, now + 7 * 24 * 60 * 60 * 1000, '短期记忆应按 validDays 写入过期时间');
}

assert.throws(
  () => normalizeSummarizedMemoryDrafts([
    {
      text: '用户最近睡眠不好',
      source: 'user',
      weight: 3,
      confidence: 0.8,
      category: 'health',
      temporalType: 'short_term',
      status: 'active',
      validDays: 7
    }
  ], Date.now()),
  /不完整的结构化记忆/,
  'AI 记忆总结缺少 topic 时不应落地'
);

assert.throws(
  () => normalizeSummarizedMemoryDrafts([
    {
      text: '用户最近睡眠不好',
      source: 'user',
      weight: 3,
      confidence: 0.8,
      category: 'health',
      topic: '睡眠',
      temporalType: 'short_term',
      status: 'active'
    }
  ], Date.now()),
  /不完整的结构化记忆/,
  '短期记忆缺少 validDays 或未来 expiresAt 时不应落地'
);

assert.throws(
  () => normalizeSummarizedMemoryDrafts([
    {
      text: '用户最近睡眠不好',
      source: 'assistant',
      weight: 3,
      confidence: 0.8,
      category: 'health',
      topic: '睡眠',
      temporalType: 'short_term',
      status: 'active',
      validDays: 7
    }
  ], Date.now()),
  /不完整的结构化记忆/,
  'AI 记忆总结不应把非法 source 兜底成有效来源'
);

assert.throws(
  () => normalizeSummarizedMemoryDrafts([
    {
      text: '用户最近睡眠不好',
      source: '用户',
      weight: 3,
      confidence: 0.8,
      category: 'health',
      topic: '睡眠',
      temporalType: 'short_term',
      status: 'active',
      validDays: 7
    }
  ], Date.now()),
  /不完整的结构化记忆/,
  'AI 记忆总结 source 不应接受中文标签兜底'
);

assert.throws(
  () => addSummarizedMemory({}, 'c1', [
    {
      text: { value: '对象正文不应写入长期记忆' },
      source: 'user',
      weight: 3,
      confidence: 0.8,
      category: 'health',
      topic: '睡眠',
      temporalType: 'short_term',
      status: 'active',
      validDays: 7,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    } as any
  ]),
  /总结记忆缺少必需结构字段/,
  '直接写入总结记忆时也不应把对象 text 强转成 [object Object]'
);

assert.throws(
  () => addSummarizedMemory({}, 'c1', [
    {
      text: '用户最近睡眠不好',
      source: 'user',
      weight: 3,
      confidence: 0.8,
      category: 'health',
      topic: { value: '睡眠' },
      temporalType: 'short_term',
      status: 'active',
      validDays: 7,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    } as any
  ]),
  /总结记忆缺少必需结构字段/,
  '直接写入总结记忆时 topic 也必须是可展示标量'
);

assert.throws(
  () => normalizeSummarizedMemoryDrafts([
    {
      text: { value: '对象正文不应强转' },
      source: 'user',
      weight: 3,
      confidence: 0.8,
      category: 'health',
      topic: '睡眠',
      temporalType: 'short_term',
      status: 'active',
      validDays: 7
    }
  ], Date.now()),
  /不完整的结构化记忆/,
  'AI 记忆总结 text 只接受可展示标量，不应把对象强转成 [object Object]'
);

assert.throws(
  () => normalizeSummarizedMemoryDrafts([
    {
      text: '用户最近睡眠不好',
      source: 'user',
      weight: 3,
      confidence: 0.8,
      category: 'health',
      topic: { value: '睡眠' },
      temporalType: 'short_term',
      status: 'active',
      validDays: 7
    }
  ], Date.now()),
  /不完整的结构化记忆/,
  'AI 记忆总结 topic 只接受可展示标量，不应把对象强转成主题'
);

{
  const normalized = normalizeSummarizedMemoryDrafts([
    {
      text: 404,
      source: 'user',
      weight: 3,
      confidence: 0.8,
      category: 'other',
      topic: 404,
      temporalType: 'stable',
      status: 'active'
    }
  ], Date.now());
  assert.equal(normalized[0]?.text, '404', '数字型记忆正文仍可作为可展示文本通过结构校验');
  assert.equal(normalized[0]?.topic, '404', '数字型主题仍可作为可展示文本通过结构校验');
}

{
  const next = addSummarizedMemory({}, 'c1', [
    {
      text: '用户最近睡眠不好',
      source: 'user',
      weight: 3,
      confidence: 0.8,
      category: 'health',
      topic: '睡眠',
      temporalType: 'short_term',
      status: 'active',
      validDays: 7,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    }
  ]);

  assert.equal(next.c1?.length, 1, '完整总结记忆应能写入长期记忆');
  assert.equal(next.c1?.[0]?.topic, '睡眠', '写入后的记忆应保留结构化主题');
  assert.equal(next.c1?.[0]?.temporalType, 'short_term', '写入后的记忆应保留时效类型');
}

{
  const before = Date.now();
  const next = addSummarizedMemory({}, 'c1', [
    {
      text: '用户今天临时嗓子不舒服',
      source: 'user',
      weight: 3,
      confidence: 0.8,
      category: 'health',
      topic: '嗓子状态',
      temporalType: 'short_term',
      status: 'active',
      validDays: 2
    }
  ]);
  const expiresAt = Number(next.c1?.[0]?.expiresAt || 0);
  assert.ok(expiresAt >= before + 2 * 24 * 60 * 60 * 1000, '总结记忆写入口应按 validDays 自动补 expiresAt');
  assert.ok(expiresAt <= Date.now() + 2 * 24 * 60 * 60 * 1000 + 1000, '自动补出的 expiresAt 不应偏离写入时间');
}

{
  const now = Date.now();
  const next = addSummarizedMemory({
    c1: [{
      id: 'old-short-like',
      text: '用户喜欢热拿铁',
      source: 'user',
      timestamp: now - 1000,
      weight: 3,
      confidence: 0.8,
      occurrenceCount: 1,
      lastReinforcedAt: now - 1000,
      category: 'preference',
      topic: '拿铁',
      temporalType: 'short_term',
      status: 'active',
      validDays: 2,
      expiresAt: now + 2 * 24 * 60 * 60 * 1000
    }]
  }, 'c1', [
    {
      text: '用户喜欢热拿铁',
      source: 'user',
      weight: 4,
      confidence: 0.9,
      category: 'preference',
      topic: '拿铁',
      temporalType: 'stable',
      status: 'active'
    }
  ]);
  assert.equal(next.c1?.[0]?.temporalType, 'stable', '同文本记忆被新总结改为稳定事实时，应以新时效类型为准');
  assert.equal(next.c1?.[0]?.validDays, undefined, '稳定事实不应继续残留旧短期 validDays');
  assert.equal(next.c1?.[0]?.expiresAt, undefined, '稳定事实不应继续残留旧短期 expiresAt');
}

assert.throws(
  () => addSummarizedMemory({}, 'c1', [
    {
      text: '用户喜欢热拿铁',
      source: 'user',
      weight: 3,
      confidence: 0.9,
      category: 'preference',
      topic: '拿铁',
      temporalType: 'stable',
      status: 'active'
    },
    {
      text: '用户最近睡眠不好',
      source: 'user',
      weight: 3,
      confidence: 0.8,
      category: 'health',
      temporalType: 'short_term',
      status: 'active',
      validDays: 7
    } as any
  ]),
  /总结记忆缺少必需结构字段/,
  '总结记忆批量写入时只要有一条缺少结构字段，就不应半组落地'
);

assert.throws(
  () => addSummarizedMemory({}, 'c1', [
    {
      text: '用户最近睡眠不好',
      source: 'user',
      weight: 3,
      confidence: 0.8,
      category: 'health',
      topic: '睡眠',
      temporalType: 'short_term',
      status: 'active'
    } as any
  ]),
  /总结记忆缺少必需结构字段/,
  '短期总结记忆缺少 validDays 或未来 expiresAt 时不应写入'
);

assert.throws(
  () => addSummarizedMemory({}, 'c1', [
    {
      text: '用户最近睡眠不好',
      source: 'user',
      category: 'health',
      topic: '睡眠',
      temporalType: 'short_term',
      status: 'active',
      validDays: 7
    } as any
  ]),
  /总结记忆缺少必需结构字段/,
  '总结记忆缺少 weight 或 confidence 时不应用默认值补成有效记忆'
);

{
  const serialized = formatMemoryEntryForResummary({
    id: 'cold-ended',
    text: '用户感冒已经好了',
    source: 'user',
    timestamp: Date.now(),
    weight: 3,
    confidence: 0.9,
    category: 'health',
    topic: '感冒',
    temporalType: 'short_term',
    status: 'ended',
    validDays: 30,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
  });
  const parsed = JSON.parse(serialized);
  assert.equal(parsed.text, '用户感冒已经好了', '再总结输入应保留记忆文本');
  assert.equal(parsed.topic, '感冒', '再总结输入应保留结构化主题');
  assert.equal(parsed.temporalType, 'short_term', '再总结输入应保留时效类型');
  assert.equal(parsed.status, 'ended', '再总结输入应保留已结束状态');
}

await assert.rejects(
  () => summarizeMessagesWithAI(
    [{ text: '用户喜欢热拿铁', source: 'user', timestamp: Date.now() }],
    '林夏',
    { provider: 'gemini', apiKey: '', model: '', baseUrl: '' },
    2
  ),
  /阈值 2/,
  'AI 记忆总结应使用调用方传入的自定义阈值，而不是固定默认阈值'
);

console.log('测试通过：AI 记忆总结会尊重调用方传入的自定义阈值。');
