import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  collectReplySentenceCandidates,
  normalizeSentenceRange,
  selectReplySentencePiecesWithinRange
} from '../src/utils/sentenceRange.ts';

const sentenceRangeSource = readFileSync(new URL('../src/utils/sentenceRange.ts', import.meta.url), 'utf8');
assert.doesNotMatch(sentenceRangeSource, /fallbackText/, '分句工具不应保留原文兜底入口');

{
  const candidates = collectReplySentenceCandidates({
    sentences: ['第一句。', '第一句。', '第二句。'],
    dedupe: true
  });
  assert.deepEqual(candidates, ['第一句。', '第二句。'], '开启去重时应合并重复 sentence 项');
}

{
  const candidates = collectReplySentenceCandidates({
    parsedText: '第一句。第二句？',
    dedupe: false
  });
  assert.deepEqual(candidates, ['第一句。', '第二句？'], '未提供 sentence 数组时应从正文中提取候选分句');
}

{
  const range = normalizeSentenceRange({ min: 1, max: 2 });
  const result = selectReplySentencePiecesWithinRange({
    candidates: ['第一句。', '第二句。', '第三句。'],
    range
  });
  assert.deepEqual(result.pieces, ['第一句。', '第二句。'], '应按 sentenceRange 上限裁剪分句');
  assert.equal(result.truncated, true, '超出上限时应标记为已裁剪');
}

{
  const range = normalizeSentenceRange({ min: 2, max: 3 });
  const result = selectReplySentencePiecesWithinRange({
    candidates: [],
    range
  });
  assert.deepEqual(result.pieces, [], '没有结构化候选分句时不应使用原文兜底');
  assert.equal(result.truncated, false, '没有候选分句时不应误报裁剪');
}

console.log('测试通过：单聊分句候选提取与 sentenceRange 裁剪规则稳定。');
