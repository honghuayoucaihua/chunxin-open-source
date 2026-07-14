import assert from 'node:assert/strict';
import {
  getReplyMemoryText,
  markTypingContactEnd,
  markTypingContactStart,
  scheduleMainReplyCompletion,
  withTypingContact
} from '../src/utils/chat/replyLifecycle.ts';

type TimeoutTask = {
  delay: number;
  fn: () => void;
};

let typingState: string[] = [];
const setTypingContactIds = (updater: (prev: string[]) => string[]) => {
  typingState = updater(typingState);
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
  markTypingContactStart(setTypingContactIds, 'chat-1');
  markTypingContactStart(setTypingContactIds, 'chat-1');
  assert.deepEqual(typingState, ['chat-1'], '输入中开始标记不应重复追加同一会话');

  markTypingContactEnd(setTypingContactIds, 'chat-1');
  assert.deepEqual(typingState, [], '输入中结束标记应移除对应会话');

  typingState = [];
  const withTypingResult = await withTypingContact(setTypingContactIds, 'chat-2', async () => {
    assert.deepEqual(typingState, ['chat-2'], '包装执行期间应保持输入中状态');
    return 'ok';
  });
  assert.equal(withTypingResult, 'ok', '包装执行应透传原始返回值');
  assert.deepEqual(typingState, [], '包装执行结束后应自动清理输入中状态');

  let completed = 0;
  const completionDelay = scheduleMainReplyCompletion(300, () => {
    completed += 1;
  });
  assert.equal(completionDelay, 301, '主回复完成回调应晚于最后一条延迟消息一个最小时间片');
  assert.deepEqual(tasks.map((item) => item.delay), [301], '主回复完成回调应按统一时机注册');
  tasks.splice(0).forEach((task) => task.fn());
  assert.equal(completed, 1, '主回复完成回调应在调度触发时执行');

  let skipped = 0;
  scheduleMainReplyCompletion(120, () => {
    skipped += 1;
  }, () => false);
  tasks.splice(0).forEach((task) => task.fn());
  assert.equal(skipped, 0, '主回复完成回调应尊重失效守卫');

  assert.equal(
    getReplyMemoryText('', ['心声', '', '动作']),
    '心声 · 动作',
    '回复记忆文本应在正文为空时回退到可读元信息'
  );
  assert.equal(
    getReplyMemoryText('Je suis la.', ['动作：轻轻靠近一点', '译文：我在这里。']),
    'Je suis la. · 动作：轻轻靠近一点 · 译文：我在这里。',
    '回复记忆文本有正文时也应保留动作和译文，避免 AI 生成内容记忆不完整'
  );
} finally {
  globalThis.setTimeout = originalSetTimeout;
}

console.log('测试通过：共享回复生命周期工具的输入中、完成回调与记忆回退规则稳定。');
