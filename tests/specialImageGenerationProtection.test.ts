import assert from 'node:assert/strict';
import { buildSpecialMessages } from '../src/app/sendMessage/specialMessages.ts';

const originalFetch = globalThis.fetch;
const originalInfo = console.info;
const originalWarn = console.warn;

const contact = {
  id: 'contact-1',
  name: '测试联系人',
  avatar: '',
  remark: ''
} as any;

const user = {
  id: 'me',
  name: '我',
  avatar: ''
} as any;

try {
  {
    const logs: unknown[][] = [];
    console.info = (...args: unknown[]) => {
      logs.push(args);
    };
    globalThis.fetch = async () => new Response(JSON.stringify({
      generatedImages: [{
        image: {
          imageBytes: 'YWJj'
        }
      }]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    const messages = await buildSpecialMessages({
      specials: [{
        type: 'imageGen',
        content: '画一张测试图'
      } as any]
    }, contact, {
      user,
      aiSettings: {
        enableImageGeneration: true,
        imageResponseFormat: 'google',
        imageApiKey: 'secret-image-key',
        imageModel: 'imagen-test',
        imageBaseUrl: 'https://generativelanguage.googleapis.com'
      } as any
    }, 'contact-1');

    assert.equal(messages.length, 1, '生图成功时应生成一条图片消息');
    assert.equal(messages[0].type, 'image');
    assert.doesNotMatch(
      JSON.stringify(logs),
      /secret-image-key|key=/,
      '生图请求日志不应包含 API Key 或带 key 参数的完整地址'
    );
  }

  {
    let fetchCalls = 0;
    const warnings: unknown[][] = [];
    console.info = () => {};
    console.warn = (...args: unknown[]) => {
      warnings.push(args);
    };
    globalThis.fetch = async () => {
      fetchCalls += 1;
      return new Response(JSON.stringify({
        error: 'temporary unavailable',
        api_key: 'secret-image-key',
        Authorization: 'Bearer secret-token'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const messages = await buildSpecialMessages({
      specials: [{
        type: 'imageGen',
        content: '失败时不要重试'
      } as any]
    }, contact, {
      user,
      aiSettings: {
        enableImageGeneration: true,
        imageResponseFormat: 'openai',
        imageApiKey: 'secret-image-key',
        imageModel: 'image-test',
        imageBaseUrl: 'https://image.example.com/v1'
      } as any
    }, 'contact-1');

    assert.equal(fetchCalls, 1, '生图接口失败时不应自动重试，避免放大外部服务调用次数');
    assert.equal(messages.length, 0, '生图接口失败时不应落地失败文本，避免系统失败状态污染角色聊天');
    assert.doesNotMatch(
      JSON.stringify(warnings),
      /secret-image-key|secret-token/,
      '生图失败日志不应暴露服务商回显的密钥'
    );
  }
} finally {
  globalThis.fetch = originalFetch;
  console.info = originalInfo;
  console.warn = originalWarn;
}

console.log('测试通过：生图日志不会暴露密钥，失败时不会自动重试或污染聊天正文。');
