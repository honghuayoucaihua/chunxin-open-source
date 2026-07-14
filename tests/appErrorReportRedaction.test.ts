import assert from 'node:assert/strict';
import { buildAppErrorReport } from '../src/appErrorReport.ts';

const error = new Error('request failed api_key=secret-key password=secret-pass');
error.stack = [
  'Error: request failed',
  '    at fetchToken (https://app.example.com/assets/app.js?access_token=secret-token:1:1)',
  'Authorization: Bearer secret-bearer'
].join('\n');

const report = buildAppErrorReport({
  error,
  componentStack: 'Component stack token=component-secret',
  now: '2026-01-01T00:00:00.000Z',
  userAgent: 'Test UA',
  url: 'https://app.example.com/chat?key=secret-url-key&name=ok&access_token=secret-url-token'
});

assert.match(report, /Time: 2026-01-01T00:00:00.000Z/, '错误报告应保留基础诊断时间');
assert.match(report, /URL: https:\/\/app\.example\.com\/chat\?key=\*\*\*&name=ok&access_token=\*\*\*/, '错误报告 URL 应隐藏敏感查询参数');
assert.doesNotMatch(
  report,
  /secret-key|secret-pass|secret-token|secret-bearer|component-secret|secret-url-key|secret-url-token/,
  '错误报告不应包含常见密钥、令牌或密码原文'
);

console.log('测试通过：应用错误报告会隐藏 URL 和错误栈中的敏感信息。');
