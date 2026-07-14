import assert from 'node:assert/strict';
import {
  clampOrderedTextSegmentCountWithinSentenceRange,
  normalizeSentenceRange
} from '../src/utils/sentenceRange.ts';

{
  const range = normalizeSentenceRange({ min: 1, max: 1 });
  const result = clampOrderedTextSegmentCountWithinSentenceRange([
    { type: 'text', value: '第一句' },
    { type: 'text', value: '第二句' },
    { type: 'action', value: '站了起来' }
  ], range);

  assert.equal(result.truncated, true, '超出分句上限时应进入降级截断');
  assert.deepEqual(result.segments, [
    { type: 'text', value: '第一句' },
    { type: 'action', value: '站了起来' }
  ], '截断后应保留上限内正文，并继续保留非正文元片段');
}

{
  const range = normalizeSentenceRange({ min: 0, max: 3 });
  const result = clampOrderedTextSegmentCountWithinSentenceRange([
    { type: 'text', value: '第一句' },
    { type: 'text', value: '第二句' },
    { type: 'inner', value: '别露怯' }
  ], range);

  assert.equal(result.truncated, false, '未超过上限时不应误触发截断');
  assert.deepEqual(result.segments, [
    { type: 'text', value: '第一句' },
    { type: 'text', value: '第二句' },
    { type: 'inner', value: '别露怯' }
  ], '未超限时应完整保留片段');
}

console.log('测试通过：分句超限时会安全降级而不是直接抛错。');
