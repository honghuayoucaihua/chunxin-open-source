import assert from 'node:assert/strict';
import { formatSafeLogError } from '../src/utils/logRedaction.ts';

const formatted = formatSafeLogError(
  new Error(`AI failed api_key=secret-key Authorization: Bearer secret-token ${'用户隐私内容'.repeat(80)}`)
);

assert.equal(formatted.name, 'Error', '匿名聊天日志应保留错误类型');
assert.doesNotMatch(
  formatted.message,
  /secret-key|secret-token/,
  '匿名聊天失败日志不应暴露密钥或令牌'
);
assert.ok(formatted.message.length <= 240, '匿名聊天失败日志应截断长文本，避免记录完整 AI 原文');

console.log('测试通过：匿名聊天失败日志会脱敏并截断。');
