import assert from 'node:assert/strict';
import type { Contact, Message } from '../src/types.ts';
import {
  appendDeliveredReplyMessages,
  scheduleDeliveredReplyMessages
} from '../src/utils/chat/replyDelivery.ts';

type TimeoutTask = {
  delay: number;
  fn: () => void;
};

const contacts: Contact[] = [{
  id: 'c-1',
  name: '测试联系人',
  pinyin: '',
  avatar: '',
  unreadCount: 0
}];
let messagesState: Record<string, Message[]> = {};
let contactsState: Contact[] = contacts;
let receiveSignalCount = 0;

const setMessages = (updater: Record<string, Message[]> | ((prev: Record<string, Message[]>) => Record<string, Message[]>)) => {
  messagesState = typeof updater === 'function' ? updater(messagesState) : updater;
};
const setContacts = (updater: Contact[] | ((prev: Contact[]) => Contact[])) => {
  contactsState = typeof updater === 'function' ? updater(contactsState) : updater;
};

const originalSetTimeout = globalThis.setTimeout;
const tasks: TimeoutTask[] = [];

globalThis.setTimeout = ((fn: TimerHandler, delay?: number) => {
  tasks.push({
    delay: Number(delay || 0),
    fn: fn as () => void
  });
  return tasks.length as unknown as ReturnType<typeof setTimeout>;
}) as typeof setTimeout;

try {
  const baseMessage: Message = {
    id: 'm-1',
    senderId: 'c-1',
    content: '第一条回复',
    timestamp: 1,
    type: 'text'
  };

  appendDeliveredReplyMessages({
    setMessages,
    setContacts,
    playReceiveSignal: () => {
      receiveSignalCount += 1;
    }
  }, 'c-1', [baseMessage]);

  assert.equal(messagesState['c-1']?.length, 1, '可见回复落地器应追加消息');
  assert.equal(contactsState[0]?.lastMessage, '第一条回复', '可见回复落地器应刷新会话预览');
  assert.equal(receiveSignalCount, 1, '可见回复落地器应播放一次接收提示音');

  let allowRun = true;
  const skippedIds: string[] = [];
  const delayedMessages: Message[] = [
    {
      id: 'm-2',
      senderId: 'c-1',
      content: '第二条回复',
      timestamp: 2,
      type: 'text'
    },
    {
      id: 'm-3',
      senderId: 'c-1',
      content: '第三条回复',
      timestamp: 3,
      type: 'text'
    }
  ];

  const totalDelay = scheduleDeliveredReplyMessages({
    setMessages,
    setContacts,
    playReceiveSignal: () => {
      receiveSignalCount += 1;
    }
  }, 'c-1', delayedMessages, {
    getDelayMs: (_, index) => [100, 200][index] || 0,
    shouldRun: () => allowRun,
    onSkippedMessage: (message) => {
      skippedIds.push(message.id);
    },
    getDeliveryOptions: (message, index) => ({
      previewText: `${index + 1}:${message.content}`,
      refreshTimestamp: true
    })
  });

  assert.equal(totalDelay, 300, '顺序可见回复落地器应返回累计总延迟');
  assert.deepEqual(tasks.map((item) => item.delay), [100, 300], '顺序可见回复落地器应复用累计调度时序');
  tasks.splice(0).forEach((task, index) => {
    task.fn();
    allowRun = index === 0 ? false : allowRun;
  });

  assert.equal(messagesState['c-1']?.length, 2, '顺序可见回复落地器应在失效后停止后续落地');
  assert.equal(contactsState[0]?.lastMessage, '1:第二条回复', '顺序可见回复落地器应支持自定义预览');
  assert.equal(receiveSignalCount, 2, '顺序可见回复落地器应按实际落地次数播放提示音');
  assert.deepEqual(skippedIds, ['m-3'], '顺序可见回复落地器应在旧线失效时显式报告被丢弃的晚到消息');
} finally {
  globalThis.setTimeout = originalSetTimeout;
}

console.log('测试通过：共享回复落地器可统一处理消息展示、预览刷新、提示音与顺序调度。');
