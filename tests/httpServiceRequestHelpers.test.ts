import assert from 'node:assert/strict';
import {
  formatHttpErrorBody,
  isAbsoluteHttpUrl,
  parseHttpJson,
  redactSensitiveText,
  sanitizeHttpLogUrl,
  resolveHttpRequestUrl,
  httpPostExternal
} from '../src/services/httpService.ts';

assert.equal(isAbsoluteHttpUrl('https://api.example.com/v1'), true, 'HTTPS URL 应识别为绝对地址');
assert.equal(isAbsoluteHttpUrl('HTTP://api.example.com/v1'), true, 'HTTP URL 判断应大小写不敏感');
assert.equal(isAbsoluteHttpUrl('httpx://api.example.com/v1'), false, '非 HTTP(S) 协议不应被误判为可直接请求地址');

assert.equal(
  resolveHttpRequestUrl('/models', 'https://xushuo.cc/api/'),
  'https://xushuo.cc/api/models',
  '带斜杠的 API base 和 path 应稳定拼接'
);
assert.equal(
  resolveHttpRequestUrl('models', '/api'),
  '/api/models',
  '相对 API base 应支持无前导斜杠路径'
);
assert.equal(
  resolveHttpRequestUrl('https://api.example.com/v1', '/api'),
  'https://api.example.com/v1',
  '绝对 HTTP(S) 地址不应被重复拼接 API base'
);

const longBody = 'x'.repeat(520);
const formattedBody = formatHttpErrorBody(longBody);
assert.equal(formattedBody.length, 503, 'HTTP 错误正文应限制长度并保留省略标记');
assert.equal(formattedBody.endsWith('...'), true, '被截断的 HTTP 错误正文应带有省略标记');

assert.equal(
  sanitizeHttpLogUrl('https://api.example.com/v1/models?key=secret-key&name=test&access_token=secret-token'),
  'https://api.example.com/v1/models?key=***&name=test&access_token=***',
  'HTTP 日志 URL 应隐藏常见查询密钥'
);
assert.equal(
  sanitizeHttpLogUrl('/models?api_key=secret-key&name=test'),
  '/models?api_key=***&name=test',
  '相对 URL 日志也应隐藏查询密钥'
);
assert.doesNotMatch(
  redactSensitiveText('Authorization: Bearer secret-token, api_key="secret-key", password=secret-pass'),
  /secret-token|secret-key|secret-pass/,
  'HTTP 日志和错误正文应隐藏常见敏感字段'
);
assert.doesNotMatch(
  formatHttpErrorBody({ token: 'secret-token', message: 'failed' }),
  /secret-token/,
  'HTTP 错误正文里的敏感字段应脱敏'
);

const parsed = parseHttpJson<{ ok: boolean }>('{"ok":true}', 'TEST JSON');
assert.equal(parsed.ok, true, '合法 JSON 应正常解析');

const originalError = console.error;
const logs: string[] = [];
console.error = (...args: unknown[]) => {
  logs.push(args.map((item) => String(item)).join(' '));
};

try {
  assert.throws(
    () => parseHttpJson('{"token":"secret-value"', 'TEST JSON'),
    SyntaxError,
    '非法 JSON 应继续抛出解析错误'
  );
} finally {
  console.error = originalError;
}

assert.equal(logs.length, 1, 'JSON 解析失败应保留诊断日志');
assert.doesNotMatch(logs[0], /secret-value/, 'JSON 解析失败日志不应输出完整响应正文');

{
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  let aborted = false;
  console.error = () => {};
  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    init?.signal?.addEventListener('abort', () => {
      aborted = true;
    });
    return {
      ok: true,
      status: 200,
      text: async () => new Promise<string>(() => {})
    } as Response;
  };

  try {
    await assert.rejects(
      () => httpPostExternal('https://api.example.com/slow-body', { ok: true }, {}, { timeoutMs: 10 }),
      /timeout after 10ms/,
      'HTTP 超时应覆盖响应正文读取阶段，避免请求卡死'
    );
    assert.equal(aborted, true, '正文读取超时时也应中断底层 fetch');
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  }
}

console.log('测试通过：httpService 请求辅助逻辑已覆盖 URL 拼接、错误截断和解析失败日志边界。');
