import assert from 'node:assert/strict';
import { fetchContactCardImageBlob } from '../src/utils/contactCardImage.ts';

const originalFetch = globalThis.fetch;

{
  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    return await new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (signal?.aborted) {
        reject(signal.reason || new Error('aborted'));
        return;
      }
      signal?.addEventListener('abort', () => {
        reject(signal.reason || new Error('aborted'));
      }, { once: true });
    });
  };

  try {
    await assert.rejects(
      () => fetchContactCardImageBlob('https://example.com/card.png', 5),
      /AbortError|aborted/,
      '保存联系人名片读取图片卡住时应主动超时，避免界面一直等待'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

{
  globalThis.fetch = async () => new Response('not found', { status: 404 });

  try {
    await assert.rejects(
      () => fetchContactCardImageBlob('https://example.com/missing.png', 100),
      /status 404/,
      '保存联系人名片遇到异常响应时不应继续当作图片保存'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log('测试通过：联系人名片保存读取图片有超时和异常响应保护。');
