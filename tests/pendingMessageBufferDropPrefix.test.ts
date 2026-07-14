import assert from 'node:assert/strict';
import {
  addPendingMessage,
  clearPendingMessages,
  dropPendingMessages,
  peekPendingMessages
} from '../src/services/memory/pendingMessageBuffer.ts';

const contactId = 'pending-drop-prefix-contact';

clearPendingMessages(contactId);
addPendingMessage(contactId, '用户喜欢喝拿铁', 'user');
addPendingMessage(contactId, '用户最近在准备考试', 'user');

const summarizingBatch = peekPendingMessages(contactId);
assert.equal(summarizingBatch.length, 2, '测试前应准备两条待总结消息');

addPendingMessage(contactId, '用户周末要去上海', 'user');
dropPendingMessages(contactId, summarizingBatch);

const remaining = peekPendingMessages(contactId);
assert.equal(remaining.length, 1, '总结期间新增的消息应保留在缓冲区');
assert.equal(remaining[0]?.text, '用户周末要去上海', '已总结的旧消息应被移除，避免下次重复总结');

clearPendingMessages(contactId);

console.log('测试通过：记忆总结完成后只移除已处理消息，不会误删新消息或重复保留旧消息。');
