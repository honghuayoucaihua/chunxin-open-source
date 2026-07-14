import assert from 'node:assert/strict';
import type { Message } from '../src/types';
import {
  MAX_ANONYMOUS_CONTEXT_MESSAGES,
  buildAnonymousModelHistory
} from '../src/app/anonymousModelHistory.ts';

const buildMessage = (index: number): Message => ({
  id: `msg-${index}`,
  senderId: index % 2 === 0 ? 'me' : '__anonymous_chat__',
  content: `第${index}条消息`,
  timestamp: index,
  type: 'text'
});

{
  const messages = Array.from({ length: MAX_ANONYMOUS_CONTEXT_MESSAGES + 25 }, (_, index) => buildMessage(index + 1));
  const history = buildAnonymousModelHistory(messages);

  assert.equal(history.length, MAX_ANONYMOUS_CONTEXT_MESSAGES, '匿名聊天发给模型的历史条数应有硬上限');
  assert.ok(history[0]?.text.includes(`第${26}条消息`), '超出上限后应从最近消息开始保留');
  assert.ok(history.at(-1)?.text.includes(`第${MAX_ANONYMOUS_CONTEXT_MESSAGES + 25}条消息`), '最近一条消息必须保留');
  assert.ok(history.every((item) => !item.text.includes('第1条消息')), '最早消息不应继续进入匿名聊天上下文');
}

{
  const history = buildAnonymousModelHistory([
    { id: 'm1', senderId: 'me', content: { text: '对象旧正文不应进入模型' }, timestamp: 1, type: 'text' } as any,
    { id: 'm2', senderId: '__anonymous_chat__', content: ['数组旧正文不应进入模型'], timestamp: 2, type: 'text' } as any,
    { id: 'm3', senderId: 'me', content: 123, timestamp: 3, type: 'text' } as any
  ]);

  assert.deepEqual(
    history.map((item) => item.text),
    ['', '', '123'],
    '匿名聊天历史只应把可展示标量交给模型，不应把对象或数组强转成 [object Object]'
  );
}

console.log('测试通过：匿名聊天只会向模型传递最近一段历史，且不会把对象旧正文强转进上下文。');
