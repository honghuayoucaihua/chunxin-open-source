import assert from 'node:assert/strict';
import {
  clearRecentReplyTaskLifecycleEvents,
  createReplyTaskLifecycleTracker,
  getRecentReplyTaskLifecycleEvents,
  isReplyTaskLifecycleDebugEnabled,
  MAX_RECENT_REPLY_TASK_LIFECYCLE_EVENTS,
  setReplyTaskLifecycleDebugEnabled
} from '../src/utils/chat/replyTaskState.ts';

{
  clearRecentReplyTaskLifecycleEvents();
  const tracker = createReplyTaskLifecycleTracker(7);
  assert.equal(tracker.version, 7, '回复任务状态跟踪器应保留任务版本');
  assert.equal(tracker.getState(), 'pending', '新建回复任务状态应从 pending 开始');

  tracker.markRunning('resend_started');
  assert.deepEqual(tracker.getSnapshot(), {
    version: 7,
    state: 'running',
    reason: 'resend_started'
  }, '开始执行后应进入 running 状态并记录原因');

  tracker.markMainDelivered('main_queue_flushed');
  assert.deepEqual(tracker.getSnapshot(), {
    version: 7,
    state: 'main_delivered',
    reason: 'main_queue_flushed'
  }, '主消息送达后应进入 main_delivered 状态');

  tracker.markDroppedStale('late_delivery_skipped');
  assert.deepEqual(tracker.getSnapshot(), {
    version: 7,
    state: 'dropped_stale',
    reason: 'late_delivery_skipped'
  }, '旧线晚到被丢弃时应进入 dropped_stale 终态');

  tracker.markCompleted('should_not_override_terminal');
  assert.deepEqual(tracker.getSnapshot(), {
    version: 7,
    state: 'dropped_stale',
    reason: 'late_delivery_skipped'
  }, '进入终态后，不应再被后续完成状态覆盖');

  assert.deepEqual(
    getRecentReplyTaskLifecycleEvents().map((item) => ({
      version: item.version,
      from: item.from,
      to: item.to,
      reason: item.reason
    })),
    [
      { version: 7, from: 'pending', to: 'running', reason: 'resend_started' },
      { version: 7, from: 'running', to: 'main_delivered', reason: 'main_queue_flushed' },
      { version: 7, from: 'main_delivered', to: 'dropped_stale', reason: 'late_delivery_skipped' }
    ],
    '最近事件缓冲应记录有效状态迁移，且终态后的无效覆盖不应写入缓冲'
  );
}

{
  const tracker = createReplyTaskLifecycleTracker(8);
  tracker.markRunning('anonymous_started');
  tracker.markCompleted('memory_flushed');
  assert.equal(tracker.getState(), 'completed', '正常执行完成后应进入 completed 终态');
}

{
  clearRecentReplyTaskLifecycleEvents();
  const transitions: Array<{ from: string; to: string; reason?: string }> = [];
  const debugLogs: unknown[] = [];
  const originalDebug = console.debug;
  const globalWithDebugFlag = globalThis as typeof globalThis & { __CHAT_REPLY_TASK_DEBUG__?: boolean };
  globalWithDebugFlag.__CHAT_REPLY_TASK_DEBUG__ = true;
  console.debug = (...args: unknown[]) => {
    debugLogs.push(args);
  };

  try {
    const tracker = createReplyTaskLifecycleTracker(9, {
      chatId: 'chat-9',
      channel: 'single',
      onTransition: (nextSnapshot, previousSnapshot) => {
        transitions.push({
          from: previousSnapshot.state,
          to: nextSnapshot.state,
          reason: nextSnapshot.reason
        });
      }
    });
    tracker.markRunning('single_started');
    tracker.markMainDelivered('single_delivered');

    assert.deepEqual(transitions, [
      { from: 'pending', to: 'running', reason: 'single_started' },
      { from: 'running', to: 'main_delivered', reason: 'single_delivered' }
    ], '状态跟踪器应支持最小状态迁移观测回调');
    assert.equal(debugLogs.length, 2, '显式开启调试标记后应输出开发态生命周期日志');

    const recentEvents = getRecentReplyTaskLifecycleEvents();
    assert.equal(recentEvents[0]?.chatId, 'chat-9', '最近事件缓冲应保留会话标识');
    assert.equal(recentEvents[0]?.channel, 'single', '最近事件缓冲应保留链路来源标识');
  } finally {
    console.debug = originalDebug;
    delete globalWithDebugFlag.__CHAT_REPLY_TASK_DEBUG__;
  }
}

{
  const globalWithDebugFlag = globalThis as typeof globalThis & { __CHAT_REPLY_TASK_DEBUG__?: boolean };
  delete globalWithDebugFlag.__CHAT_REPLY_TASK_DEBUG__;

  setReplyTaskLifecycleDebugEnabled(true);
  assert.equal(globalWithDebugFlag.__CHAT_REPLY_TASK_DEBUG__, true, '显式开启调试标记后应写入全局 true 覆盖值');
  assert.equal(isReplyTaskLifecycleDebugEnabled(), true, '显式开启调试标记后应返回开启状态');

  setReplyTaskLifecycleDebugEnabled(false);
  assert.equal(globalWithDebugFlag.__CHAT_REPLY_TASK_DEBUG__, false, '显式关闭调试标记后应保留全局 false 覆盖值');
  assert.equal(isReplyTaskLifecycleDebugEnabled(), false, '显式关闭调试标记后应优先覆盖开发环境默认值');

  delete globalWithDebugFlag.__CHAT_REPLY_TASK_DEBUG__;
}

{
  clearRecentReplyTaskLifecycleEvents();
  for (let index = 0; index < MAX_RECENT_REPLY_TASK_LIFECYCLE_EVENTS + 5; index += 1) {
    const tracker = createReplyTaskLifecycleTracker(100 + index, {
      chatId: `chat-${index}`,
      channel: 'buffer'
    });
    tracker.markRunning(`running-${index}`);
  }
  const recentEvents = getRecentReplyTaskLifecycleEvents();
  assert.equal(recentEvents.length, MAX_RECENT_REPLY_TASK_LIFECYCLE_EVENTS, '最近事件缓冲应受固定上限约束');
  assert.equal(recentEvents[0]?.version, 105, '最近事件缓冲应按环形裁剪最老事件');
  assert.equal(recentEvents.at(-1)?.version, 224, '最近事件缓冲应保留最新事件');
}

console.log('测试通过：回复任务状态跟踪器可显式表达运行、送达、完成与旧线丢弃状态。');
