import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildDivinationRequestPayload,
  createDefaultDivinationDraft,
  DIVINATION_REQUEST_TIMEOUT_MS,
  DIVINATION_TYPE_OPTIONS,
  normalizeDivinationHistory,
  parseSseEventBlocks,
  requestDivination,
  splitSseBuffer,
  upsertDivinationHistory
} from '../src/services/divinationService.ts';
import { markdownToHtml } from '../src/services/divinationMarkdown.ts';

const buildDraft = () => createDefaultDivinationDraft();
const divinationServiceSource = readFileSync(new URL('../src/services/divinationService.ts', import.meta.url), 'utf8');

{
  assert.equal(DIVINATION_TYPE_OPTIONS.some((item) => String(item.value) === 'daily'), false);
}

{
  const draft = {
    ...buildDraft(),
    type: 'liuyao' as const,
    question: '我最近换工作是否顺利？',
    method: 'number' as const,
    divinationNumber: '123',
    temperature: '0.8',
    supplementaryInfo: {
      gender: '男' as const,
      birthYear: '1990',
      interpretationStyle: '专业' as const,
      outputLength: '详细' as const
    }
  };
  const payload = buildDivinationRequestPayload(draft);
  assert.equal(payload.type, 'liuyao');
  assert.equal(payload.question, '我最近换工作是否顺利？');
  assert.equal(payload.options.method, 'number');
  assert.equal(payload.options.divinationNumber, 123);
  assert.equal(payload.options.temperature, 0.8);
  assert.deepEqual(payload.options.supplementaryInfo, {
    gender: '男',
    birthYear: 1990,
    interpretationStyle: '专业',
    outputLength: '详细'
  });
}

{
  assert.doesNotMatch(divinationServiceSource, /const options: Record<string, any>/, '占卜请求 options 不应继续使用 Record<string, any>');
  assert.doesNotMatch(divinationServiceSource, /const supplementaryInfo: Record<string, any>/, '占卜补充信息 payload 不应继续使用 Record<string, any>');
  assert.doesNotMatch(divinationServiceSource, /\.map\(\(item: any/, '占卜历史归一化不应继续用 item:any 读取恢复数据');
  assert.match(divinationServiceSource, /type DivinationRequestOptions = Partial/, '占卜请求 options 应有明确字段类型');
}

{
  assert.throws(
    () => buildDivinationRequestPayload({ ...buildDraft(), type: 'tarot' as const, question: '   ' }),
    /请输入要占卜的问题/
  );
}

{
  const draft = {
    ...buildDraft(),
    type: 'tarot' as const,
    question: '我和TA接下来会怎样？',
    spreadType: 'celtic'
  };
  const payload = buildDivinationRequestPayload(draft);
  assert.equal(payload.options.spreadType, 'celtic');
}

{
  const history = normalizeDivinationHistory([]);
  assert.deepEqual(history, []);
}

{
  assert.ok(DIVINATION_REQUEST_TIMEOUT_MS >= 60000, '占卜接口超时阈值至少应为 60 秒，避免慢响应被过早中断');
}

{
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = globalThis.localStorage;
  let receivedClientId = '';

  globalThis.localStorage = {
    get length() {
      return 0;
    },
    key() {
      return null;
    },
    getItem() {
      throw new Error('localStorage unavailable');
    },
    setItem() {
      throw new Error('localStorage unavailable');
    },
    removeItem() {},
    clear() {}
  } as Storage;
  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    receivedClientId = new Headers(init?.headers).get('X-Client-ID') || '';
    return new Response(JSON.stringify({
      ok: true,
      data: { text: 'ok' }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  try {
    const response = await requestDivination({
      ...buildDraft(),
      type: 'liuyao' as const,
      question: '本地存储不可用时还能请求吗？'
    });
    assert.equal(response.ok, true);
    assert.match(receivedClientId, /^client_/, '本地存储不可用时仍应使用临时客户端标识');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalLocalStorage;
  }
}

{
  const events = parseSseEventBlocks('event: meta\ndata: {"requestId":"1","type":"tarot_single"}\n\ndata: {"choices":[{"delta":{"content":"你好"}}]}\n\ndata: [DONE]\n\n');
  assert.equal(events.length, 3);
  assert.equal(events[0].event, 'meta');
  assert.equal(events[1].event, 'message');
  assert.equal(events[1].data.includes('你好'), true);
  assert.equal(events[2].data, '[DONE]');
}

{
  const { events, rest } = splitSseBuffer('event: meta\r\ndata: {"requestId":"1"}\r\n\r\ndata: {"choices":[{"delta":{"content":"第一段"}}]}\r\n\r\ndata: {"choices":[{"delta":{"content":"第二段');
  assert.equal(events.length, 2);
  assert.equal(events[0].includes('requestId'), true);
  assert.equal(events[1].includes('第一段'), true);
  assert.equal(rest.includes('第二段'), true);
}

{
  const html = markdownToHtml('# 标题\n\n1. 第一条\n2. 第二条\n\n> 提示\n\n```ts\nconst a = 1;\n```');
  assert.equal(html.includes('<h1>标题</h1>'), true);
  assert.equal(html.includes('<ol><li>第一条</li><li>第二条</li></ol>'), true);
  assert.equal(html.includes('<blockquote><p>提示</p></blockquote>'), true);
  assert.equal(html.includes('<pre><code>const a = 1;'), true);
}

{
  const html = markdownToHtml('#### 四级标题\n\n###### 六级标题');
  assert.equal(html.includes('<h4>四级标题</h4>'), true);
  assert.equal(html.includes('<h6>六级标题</h6>'), true);
}

{
  const html = markdownToHtml('> 第一行\n> 第二行\n\n[查看详情](https://example.com)\n\n~~仅供参考~~\n\n| 项目 | 含义 |\n| --- | --- |\n| 正位 | 顺势 |\n| 逆位 | 阻滞 |');
  assert.equal(html.includes('<blockquote><p>第一行<br/>第二行</p></blockquote>'), true);
  assert.equal(html.includes('<a href="https://example.com" target="_blank" rel="noopener noreferrer">查看详情</a>'), true);
  assert.equal(html.includes('<del>仅供参考</del>'), true);
  assert.equal(html.includes('<table>'), true);
  assert.equal(html.includes('<th>项目</th>'), true);
  assert.equal(html.includes('<td>顺势</td>'), true);
}

{
  const html = markdownToHtml('<script>alert(1)</script>\n\n[危险](javascript:alert(1))\n\n[安全](https://example.com/path?q=1)');
  assert.equal(html.includes('<script>'), false, 'Markdown HTML 渲染不应输出可执行 script 标签');
  assert.equal(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), true, '脚本标签应被转义为文本');
  assert.equal(html.includes('href="javascript:alert(1)"'), false, '非 HTTP(S) 链接不应被渲染成 href');
  assert.equal(html.includes('[危险](javascript:alert(1))'), true, '非 HTTP(S) 链接应保留为普通文本');
  assert.equal(html.includes('rel="noopener noreferrer"'), true, '外链新窗口应阻断 opener 引用');
}

{
  const first = {
    id: 'a',
    createdAt: 100,
    requestId: 'r1',
    title: '第一次',
    draft: { ...buildDraft(), type: 'liuyao' as const, question: '第一次问题' },
    type: 'liuyao' as const,
    divination: { foo: 1 },
    interpretation: '解释一'
  };
  const second = {
    id: 'b',
    createdAt: 200,
    requestId: 'r2',
    title: '第二次',
    draft: { ...buildDraft(), type: 'tarot' as const, question: 'test' },
    type: 'tarot' as const,
    divination: { bar: 2 },
    interpretation: '解释二'
  };
  const merged = upsertDivinationHistory([first as any], second as any);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, 'b');
  assert.equal(merged[1].id, 'a');
}

console.log('divinationService.test.ts 通过');
