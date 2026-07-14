import assert from 'node:assert/strict';
import {
  clearRecentReplyTaskLifecycleEvents,
  createReplyTaskLifecycleTracker,
  isReplyTaskLifecycleDebugEnabled,
  setReplyTaskLifecycleDebugEnabled
} from '../src/utils/chat/replyTaskState.ts';
import {
  installReplyTaskDebugBridge,
  uninstallReplyTaskDebugBridge,
  type ReplyTaskDebugWindow
} from '../src/utils/chat/replyTaskDebugRuntime.ts';

const fakeWindow = {} as ReplyTaskDebugWindow;

clearRecentReplyTaskLifecycleEvents();
setReplyTaskLifecycleDebugEnabled(false);
installReplyTaskDebugBridge(fakeWindow);

try {
  assert.ok(fakeWindow.replyTaskDebug, '调试桥接安装后应暴露 replyTaskDebug 入口');
  assert.equal(fakeWindow.replyTaskDebug?.isEnabled(), false, '默认未显式开启时，调试标记应保持关闭');

  const tracker = createReplyTaskLifecycleTracker(31, {
    chatId: 'chat-a',
    channel: 'single_send'
  });
  tracker.markRunning('started');
  tracker.markCompleted('done');

  assert.deepEqual(
    fakeWindow.replyTaskDebug?.getRecentEvents({ chatId: 'chat-a' }).map((item) => item.to),
    ['running', 'completed'],
    '调试桥接应支持按会话过滤最近事件'
  );
  assert.deepEqual(
    fakeWindow.replyTaskDebug?.getRecentEvents({ channel: 'single_send', to: 'completed' }).map((item) => item.reason),
    ['done'],
    '调试桥接应支持按链路和目标状态过滤最近事件'
  );

  const originalTable = console.table;
  const printedRows: unknown[] = [];
  console.table = (rows?: unknown) => {
    printedRows.push(rows);
  };
  try {
    const printed = fakeWindow.replyTaskDebug?.print({ chatId: 'chat-a' }) || [];
    assert.equal(printed.length, 2, '调试桥接打印入口应返回实际打印的数据');
    assert.equal(printedRows.length, 1, '调试桥接打印入口应优先使用 console.table 输出');
  } finally {
    console.table = originalTable;
  }

  assert.equal(fakeWindow.replyTaskDebug?.enable(), true, '调试桥接应支持直接开启调试标记');
  assert.equal(isReplyTaskLifecycleDebugEnabled(), true, '调试桥接开启后应同步到共享调试标记');
  assert.equal(fakeWindow.replyTaskDebug?.disable(), false, '调试桥接应支持直接关闭调试标记');
  assert.equal(isReplyTaskLifecycleDebugEnabled(), false, '调试桥接关闭后应同步清理共享调试标记');

  fakeWindow.replyTaskDebug?.clear();
  assert.equal(fakeWindow.replyTaskDebug?.getRecentEvents().length, 0, '调试桥接清空入口应重置最近事件缓冲');
} finally {
  uninstallReplyTaskDebugBridge(fakeWindow);
  clearRecentReplyTaskLifecycleEvents();
  setReplyTaskLifecycleDebugEnabled(false);
}

assert.equal(fakeWindow.replyTaskDebug, undefined, '调试桥接卸载后不应残留全局入口');

console.log('测试通过：回复任务调试桥接可筛选、打印、清空最近事件，并控制调试开关。');
