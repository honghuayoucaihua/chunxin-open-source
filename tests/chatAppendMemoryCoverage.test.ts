import assert from 'node:assert/strict';
import { getAppendedMessageMemoryRecord } from '../src/utils/chat/appendedMessageMemory.ts';
import type { Message } from '../src/types/index.ts';

const baseMessage = (patch: Partial<Message>): Message => ({
  id: `m-${Math.random()}`,
  senderId: 'me',
  content: '',
  timestamp: Date.now(),
  type: 'text',
  ...patch
} as Message);

{
  const record = getAppendedMessageMemoryRecord(baseMessage({
    senderId: 'me',
    innerVoice: '我其实有点紧张',
    actionDesc: '把杯子握紧'
  }));

  assert.deepEqual(record, {
    text: '用户心声：我其实有点紧张 · 用户行为：把杯子握紧',
    source: 'user'
  }, '用户通过 ChatRoom 追加的纯心声/动作应带语义写入记忆');
}

{
  const record = getAppendedMessageMemoryRecord(baseMessage({
    senderId: 'me',
    actionDesc: '轻轻敲了敲门'
  }));

  assert.deepEqual(record, {
    text: '用户行为：轻轻敲了敲门',
    source: 'user'
  }, '用户通过“做”发送的行为应作为用户行为写入记忆，避免后续被当成角色动作');
}

{
  const record = getAppendedMessageMemoryRecord(baseMessage({
    senderId: 'contact-1',
    content: 'Je suis la.',
    actionDesc: '轻轻靠近一点',
    translatedContentZhCN: '我在这里。'
  }));

  assert.deepEqual(record, {
    text: 'Je suis la. · 动作：轻轻靠近一点 · 译文：我在这里。',
    source: 'model'
  }, 'AI 通过 ChatRoom 内部入口追加的正文、动作和译文应作为模型记忆写入');
}

{
  const record = getAppendedMessageMemoryRecord(baseMessage({
    senderId: 'contact-1',
    type: 'truthdare',
    content: '邀请你参加真心话大冒险'
  }));

  assert.deepEqual(record, {
    text: '邀请你参加真心话大冒险',
    source: 'model'
  }, '真心话大冒险卡片的有效内容应进入记忆，避免特殊玩法聊天被遗忘');
}

{
  const pollutedTextRecord = getAppendedMessageMemoryRecord(baseMessage({
    senderId: 'contact-1',
    content: { text: '对象正文不应写入记忆' } as any,
    innerVoice: { text: '对象心声不应写入记忆' } as any,
    actionDesc: ['数组动作不应写入记忆'] as any,
    translatedContentZhCN: { text: '对象译文不应写入记忆' } as any
  }));
  const pollutedImageRecord = getAppendedMessageMemoryRecord(baseMessage({
    senderId: 'contact-1',
    type: 'image',
    imageCaption: { text: '对象图片说明不应写入记忆' } as any
  }));
  const numericTextRecord = getAppendedMessageMemoryRecord(baseMessage({
    senderId: 'contact-1',
    content: 404 as any
  }));

  assert.equal(pollutedTextRecord, null, '追加记忆不应把对象或数组旧格式字段强转成 [object Object]');
  assert.equal(pollutedImageRecord, null, '图片说明为对象旧格式时不应写入记忆');
  assert.deepEqual(numericTextRecord, {
    text: '404',
    source: 'model'
  }, '数字型旧正文仍可作为可展示文本写入记忆');
}

{
  const systemRecord = getAppendedMessageMemoryRecord(baseMessage({
    senderId: 'system',
    type: 'system',
    content: '【真心话大冒险状态】第1轮'
  }));
  const paymentRecord = getAppendedMessageMemoryRecord(baseMessage({
    senderId: 'contact-1',
    type: 'transfer',
    content: '转账'
  }));

  assert.equal(systemRecord, null, '系统玩法状态不应污染联系人记忆');
  assert.equal(paymentRecord, null, '红包转账类流水不应写入聊天记忆');
}

console.log('测试通过：ChatRoom 内部追加的真实聊天消息会进入记忆，系统和支付事件不会污染记忆。');
