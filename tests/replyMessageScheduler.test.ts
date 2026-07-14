import assert from 'node:assert/strict';
import {
  getGroupReplyMemoryText,
  getGroupReplyPreviewText,
  scheduleReplyFollowup,
  scheduleSequentialReplyItems
} from '../src/utils/chat/replyMessageScheduler.ts';

type TimeoutTask = {
  delay: number;
  fn: () => void;
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
  {
    const executed: string[] = [];
    const totalDelay = scheduleSequentialReplyItems(['甲', '乙', '丙'], {
      getDelayMs: (_, index) => [100, 200, 0][index] || 0,
      run: (item) => {
        executed.push(item);
      }
    });

    assert.equal(totalDelay, 300, '顺序调度器应返回累计总延迟');
    assert.deepEqual(tasks.map((item) => item.delay), [100, 300, 300], '顺序调度器应按累计时间注册任务');
    tasks.splice(0).forEach((task) => task.fn());
    assert.deepEqual(executed, ['甲', '乙', '丙'], '顺序调度器应按注册顺序执行全部任务');
  }

  {
    let allowRun = true;
    const executed: string[] = [];
    const skipped: string[] = [];
    scheduleSequentialReplyItems(['保留', '丢弃'], {
      getDelayMs: () => 50,
      shouldRun: () => allowRun,
      onSkipped: (item) => {
        skipped.push(item);
      },
      run: (item) => {
        executed.push(item);
        allowRun = false;
      }
    });

    tasks.splice(0).forEach((task) => task.fn());
    assert.deepEqual(executed, ['保留'], '顺序调度器应在执行时尊重失效守卫');
    assert.deepEqual(skipped, ['丢弃'], '顺序调度器应在旧线失效时显式触发跳过回调');
  }

  {
    let executed = 0;
    let skipped = 0;
    const immediateDelay = scheduleReplyFollowup(0, () => {
      executed += 1;
    }, () => false, () => {
      skipped += 1;
    });
    assert.equal(immediateDelay, 0, '零延迟跟随任务应直接执行');
    assert.equal(executed, 0, '零延迟跟随任务在守卫失效时不应执行');
    assert.equal(skipped, 1, '零延迟跟随任务在守卫失效时应触发跳过回调');
    assert.equal(tasks.length, 0, '零延迟跟随任务不应残留调度任务');
  }

  {
    const delayedRuns: string[] = [];
    let delayedSkipped = 0;
    const followupDelay = scheduleReplyFollowup(80, () => {
      delayedRuns.push('ok');
    }, () => false, () => {
      delayedSkipped += 1;
    });
    assert.equal(followupDelay, 80, '跟随任务应返回原始延迟');
    assert.deepEqual(tasks.map((item) => item.delay), [80], '跟随任务应按指定延迟注册');
    tasks.splice(0).forEach((task) => task.fn());
    assert.deepEqual(delayedRuns, [], '守卫失效时，跟随任务不应执行');
    assert.equal(delayedSkipped, 1, '守卫失效时，跟随任务应触发跳过回调');
  }

  assert.equal(
    getGroupReplyPreviewText({ type: 'image', content: 'https://example.com/demo.png' }),
    '[图片]',
    '群聊图片预览应统一显示为图片占位文案'
  );
  assert.equal(
    getGroupReplyPreviewText({ type: 'text', content: '', innerVoice: '心声', actionDesc: '挥手' }),
    '心声 · 挥手',
    '群聊空正文时应回退到可读的动作预览'
  );
  assert.equal(
    getGroupReplyPreviewText({ type: 'text', content: '我到了', innerVoice: '其实有点紧张', actionDesc: '把包放下' }),
    '我到了',
    '群聊预览有正文时应保持简洁'
  );
  assert.equal(
    getGroupReplyPreviewText({ type: 'redpacket', content: '拿去买咖啡' }),
    '[红包]',
    '群聊红包预览应显示系统支付占位，而不是红包留言普通文本'
  );
  assert.equal(
    getGroupReplyPreviewText({ type: 'transfer', content: '转账 ¥8.88' }),
    '[转账]',
    '群聊转账预览应显示系统支付占位，而不是转账正文普通文本'
  );
  assert.equal(
    getGroupReplyPreviewText({ type: 'location', content: '春信咖啡' }),
    '[位置]',
    '群聊位置预览应显示系统能力占位'
  );
  assert.equal(
    getGroupReplyPreviewText({ type: 'call', content: '', callStatus: 'ended', callDurationSec: 65 }),
    '[语音通话 65秒]',
    '群聊通话预览应显示通话状态，而不是普通文本'
  );
  assert.equal(
    getGroupReplyMemoryText({ type: 'text', content: 'Je suis la.', innerVoice: '其实有点紧张', actionDesc: '把包放下', translatedContentZhCN: '我在这里。' }),
    'Je suis la. · 心声：其实有点紧张 · 动作：把包放下 · 译文：我在这里。',
    '群聊记忆文本应保留正文、心声、动作和译文'
  );
  assert.equal(
    getGroupReplyMemoryText({
      type: 'text',
      content: '',
      innerVoice: { value: '对象心声不应进入记忆' } as any,
      actionDesc: ['数组动作不应进入记忆'] as any,
      narrationDesc: { value: '对象旁白不应进入记忆' } as any,
      translatedContentZhCN: { value: '对象译文不应进入记忆' } as any
    }),
    '',
    '群聊记忆文本不应把对象或数组型元信息强转成 [object Object]'
  );
  assert.equal(
    getGroupReplyMemoryText({ type: 'redpacket', content: '拿去买咖啡' }),
    '',
    '群聊红包不应进入角色记忆，避免支付事件污染长期记忆'
  );
  assert.equal(
    getGroupReplyMemoryText({ type: 'transfer', content: '转账 ¥8.88' }),
    '',
    '群聊转账不应进入角色记忆，避免钱包事件污染长期记忆'
  );
  assert.equal(
    getGroupReplyMemoryText({ type: 'system', content: '小白 拍了拍 小满' }),
    '',
    '群聊系统通知不应进入角色记忆，避免系统事件被当成角色台词'
  );
  assert.equal(
    getGroupReplyMemoryText({ type: 'location', content: '春信咖啡', locationName: '春信咖啡', locationAddress: '春风路18号' }),
    '位置：春信咖啡，春风路18号',
    '群聊位置进入记忆时应带位置语义标签，避免被当成普通台词'
  );
  assert.equal(
    getGroupReplyMemoryText({
      type: 'location',
      content: { value: '对象位置正文不应进入记忆' } as any,
      locationName: { value: '对象位置名不应进入记忆' } as any,
      locationAddress: ['数组地址不应进入记忆'] as any
    }),
    '',
    '群聊位置记忆不应把对象或数组型位置字段强转成文本'
  );
  assert.equal(
    getGroupReplyMemoryText({ type: 'voice', content: '我马上到' }),
    '语音：我马上到',
    '群聊语音进入记忆时应带语音语义标签，避免被当成普通文本消息'
  );
  assert.equal(
    getGroupReplyMemoryText({ type: 'call', content: '刚刚通话结束', callStatus: 'ended', callDurationSec: 125 }),
    '通话：通话 125秒 · 刚刚通话结束',
    '群聊通话进入记忆时应带通话语义标签，避免被当成普通台词'
  );
} finally {
  globalThis.setTimeout = originalSetTimeout;
}

console.log('测试通过：共享回复调度器时序与群聊预览规则稳定。');
