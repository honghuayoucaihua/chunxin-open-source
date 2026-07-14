import assert from 'node:assert/strict';
import { GeminiService } from '../src/services/geminiService.ts';

const originalFetch = globalThis.fetch;
const originalWarn = console.warn;
const originalError = console.error;

try {
  console.warn = () => {};
  console.error = () => {};

  {
    let fetchCalls = 0;
    globalThis.fetch = async () => {
      fetchCalls += 1;
      return new Response(JSON.stringify({ error: 'rate limited' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const service = new GeminiService();
    await assert.rejects(
      () => service.getChatReply(
        [{ role: 'user', text: '你好' }],
        '只返回 JSON',
        {
          provider: 'custom',
          apiKey: 'secret-key',
          model: 'test-model',
          baseUrl: 'https://api.example.com/v1'
        } as any
      ),
      /HTTP 429/,
      '服务商明确限流时应直接失败'
    );
    assert.equal(fetchCalls, 1, '429 限流不应自动重试，避免放大额度消耗');
  }

  {
    let fetchCalls = 0;
    globalThis.fetch = async () => {
      fetchCalls += 1;
      return new Response(JSON.stringify({ error: 'temporary unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const service = new GeminiService();
    await assert.rejects(
      () => service.getChatReply(
        [{ role: 'user', text: '你好' }],
        '只返回 JSON',
        {
          provider: 'custom',
          apiKey: 'secret-key',
          model: 'test-model',
          baseUrl: 'https://api.example.com/v1'
        } as any
      ),
      /HTTP 503/,
      '临时服务错误重试后仍失败时应抛出原始状态'
    );
    assert.equal(fetchCalls, 2, '临时服务错误最多自动补一次请求');
  }

  {
    const wrappedContent = '{"content":"{\\"text\\":\\"不应被服务层解包\\"}"}';
    globalThis.fetch = async () => new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: wrappedContent
          }
        }
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    const service = new GeminiService();
    const reply = await service.getChatReply(
      [{ role: 'user', text: '你好' }],
      '只返回 JSON',
      {
        provider: 'custom',
        apiKey: 'secret-key',
        model: 'test-model',
        baseUrl: 'https://api.example.com/v1'
      } as any
    );
    assert.equal(reply, wrappedContent, '服务层不应再把 content 字符串内包 JSON 解包成有效回复');
  }
} finally {
  globalThis.fetch = originalFetch;
  console.warn = originalWarn;
  console.error = originalError;
}

console.log('测试通过：通用 AI 请求不会在限流或临时失败时放大调用次数。');
