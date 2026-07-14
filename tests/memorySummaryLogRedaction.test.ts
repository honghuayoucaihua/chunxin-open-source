import assert from 'node:assert/strict';
import { formatMemorySummaryLogError } from '../src/services/memory/aiSummarization.ts';

const formatted = formatMemorySummaryLogError(
  new Error(`summary failed password=secret-pass token=secret-token ${'聊天隐私内容'.repeat(80)}`)
);

assert.equal(formatted.name, 'Error', '记忆总结日志应保留错误类型');
assert.doesNotMatch(
  formatted.message,
  /secret-pass|secret-token/,
  '记忆总结失败日志不应暴露密码或令牌'
);
assert.ok(formatted.message.length <= 240, '记忆总结失败日志应截断长文本，避免记录完整对话内容');

console.log('测试通过：记忆总结失败日志会脱敏并截断。');
