import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseReplySuggestions } from '../src/app/chatReplySuggestionFlow.ts';

const source = readFileSync(new URL('../src/app/chatReplySuggestionFlow.ts', import.meta.url), 'utf8');

assert.deepEqual(parseReplySuggestions({ suggestions: ['  A  ', '', 'B', 'C', 'D'] }), ['A', 'B', 'C']);
assert.deepEqual(
  parseReplySuggestions({ suggestions: ['【动作】点点头\n我知道了', '心声：其实有点紧张\n那你先忙', '翻译：I know'] }),
  [],
  '候选回复清理后不足 3 条有效句子时应整组拒收'
);
assert.deepEqual(
  parseReplySuggestions({
    suggestions: [
      '我知道了【动作】点点头',
      '那你先忙 [心声]其实有点担心',
      '我晚点回你 译文：I will reply later'
    ]
  }),
  [],
  '候选回复同一行内混入心声、动作或翻译片段时应整条拒收，不再截断成半句'
);
assert.deepEqual(
  parseReplySuggestions({
    suggestions: [
      '我把位置发你了 [位置] 春信咖啡',
      '红包我发你了 [系统红包·待领取] ¥8.88',
      '我晚点认真回你。'
    ]
  }),
  [],
  '候选回复混入系统能力格式导致有效句不足 3 条时应整组拒收'
);
assert.deepEqual(
  parseReplySuggestions({
    suggestions: [
      '我给你转账了，先收下。',
      '红包收下，买杯热的。',
      '我现在不能给你转账，但可以陪你想办法。',
      '要不要我给你转账？'
    ]
  }),
  ['我给你转账了，先收下。', '红包收下，买杯热的。', '我现在不能给你转账，但可以陪你想办法。'],
  '候选回复不应靠关键词猜测普通自然语言，只按固定结构和格式边界处理'
);
assert.deepEqual(parseReplySuggestions(null), []);
assert.deepEqual(parseReplySuggestions([]), []);
assert.deepEqual(parseReplySuggestions({ suggestions: 'A' }), []);
assert.deepEqual(parseReplySuggestions({ suggestions: ['A', 'B'] }), [], '候选回复必须刚好生成 3 条有效句子，不应靠前端展示不足数量');
assert.deepEqual(
  parseReplySuggestions({ suggestions: ['A', { text: '对象旧格式不应转正文' }, 'C', 'D'] }),
  ['A', 'C', 'D'],
  '候选回复只接受字符串项，不应把对象旧格式转成 [object Object]'
);
assert.deepEqual(
  parseReplySuggestions({ suggestions: [{ text: '对象1' }, { text: '对象2' }, { text: '对象3' }] }),
  [],
  '候选回复不应接受对象数组旧结构'
);
assert.deepEqual(
  parseReplySuggestions({
    suggestions: ['A', 'B', 'C'],
    tags: [{ type: 'sentence', value: '旧分句' }]
  }),
  [],
  '候选回复根对象不应容忍 tags 等旧结构字段'
);

assert.doesNotMatch(source, /parseReplySuggestions = \(parsed: any\)/, '回复建议解析不应继续接收 parsed:any');
assert.doesNotMatch(source, /item: any/, '回复建议列表归一不应继续使用 item:any');
assert.match(source, /parseReplySuggestions = \(parsed: unknown\): string\[\]/, 'AI 回复建议解析应以 unknown 作为外部 JSON 边界');
assert.match(source, /typeof value !== 'string'/, '回复建议项必须是字符串，不能把对象旧结构转成正文');
assert.match(source, /key !== 'suggestions'/, '回复建议根对象应只允许 suggestions 字段');
assert.match(source, /suggestions\.length === 3 \? suggestions : \[\]/, '回复建议必须刚好 3 条有效候选，不应展示不足数量');
assert.doesNotMatch(source, /containsUnbackedPaymentClaimText/, '候选回复不应使用普通正文关键词伪支付守卫');
