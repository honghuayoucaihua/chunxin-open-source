import assert from 'node:assert/strict';

const STORAGE_KEY = 'xushuo_contact_pending_memories_v1';
const contactId = 'pending-persistence-contact';

localStorage.clear();

const firstBuffer = await import('../src/services/memory/pendingMessageBuffer.ts?pending-persist-first');
firstBuffer.clearPendingMessages(contactId);

firstBuffer.addPendingMessage(contactId, '用户明天上午要去牙医复诊', 'user');

const storedAfterAdd = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
assert.equal(storedAfterAdd[contactId]?.length, 1, '新增待总结消息后应写入本地存储');
assert.equal(storedAfterAdd[contactId]?.[0]?.text, '用户明天上午要去牙医复诊', '本地存储应保留原始待总结内容');
assert.equal(storedAfterAdd[contactId]?.[0]?.source, 'user', '本地存储应保留消息来源');

const reloadedBuffer = await import('../src/services/memory/pendingMessageBuffer.ts?pending-persist-reloaded');
const restored = reloadedBuffer.peekPendingMessages(contactId);
assert.equal(restored.length, 1, '模块重新加载后应从本地存储恢复待总结消息');
assert.equal(restored[0]?.text, '用户明天上午要去牙医复诊', '恢复后的待总结消息内容应一致');

const summarizingBatch = reloadedBuffer.peekPendingMessages(contactId);
reloadedBuffer.addPendingMessage(contactId, '用户周末要去上海', 'user');
reloadedBuffer.dropPendingMessages(contactId, summarizingBatch);

const storedAfterDrop = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
assert.equal(storedAfterDrop[contactId]?.length, 1, '移除已总结消息后，本地存储应只保留期间新增的消息');
assert.equal(storedAfterDrop[contactId]?.[0]?.text, '用户周末要去上海', '本地存储不应重复保留已总结的旧消息');

reloadedBuffer.clearPendingMessages(contactId);
assert.equal(localStorage.getItem(STORAGE_KEY), null, '清空最后一个联系人后应同步清理本地存储');

const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  get() {
    throw new Error('localStorage unavailable');
  }
});

const fallbackBuffer = await import('../src/services/memory/pendingMessageBuffer.ts?pending-persist-unavailable');
const fallbackCount = fallbackBuffer.addPendingMessage(contactId, '用户最近在准备考试', 'user');
assert.equal(fallbackCount, 1, '本地存储不可用时仍应保留内存待总结消息');
assert.equal(fallbackBuffer.peekPendingMessages(contactId)[0]?.text, '用户最近在准备考试', '本地存储异常不应打断待总结缓冲区');

if (originalLocalStorageDescriptor) {
  Object.defineProperty(globalThis, 'localStorage', originalLocalStorageDescriptor);
} else {
  delete (globalThis as { localStorage?: Storage }).localStorage;
}

console.log('测试通过：待总结消息会持久化、可恢复，并兼容本地存储不可用。');
