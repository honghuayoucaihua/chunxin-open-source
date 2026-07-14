import assert from 'node:assert/strict';
import {
  adjustComposerTextareaHeight,
  scheduleComposerTextareaHeightAdjust
} from '../src/chatroom/chatRoomUiUtils.ts';

{
  const element = {
    style: {
      height: '',
      overflowY: ''
    },
    scrollHeight: 200
  } as any;

  adjustComposerTextareaHeight(element);

  assert.equal(element.style.height, '160px', '输入框高度应被限制在最大高度内');
  assert.equal(element.style.overflowY, 'auto', '超出最大高度后应允许内部滚动');
}

{
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const frameQueue = new Map<number, FrameRequestCallback>();
  const cancelledFrameIds: number[] = [];
  let frameIdSeed = 0;

  globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    frameIdSeed += 1;
    frameQueue.set(frameIdSeed, callback);
    return frameIdSeed;
  }) as typeof globalThis.requestAnimationFrame;

  globalThis.cancelAnimationFrame = ((frameId: number) => {
    cancelledFrameIds.push(frameId);
    frameQueue.delete(frameId);
  }) as typeof globalThis.cancelAnimationFrame;

  const element = {
    style: {
      height: '',
      overflowY: ''
    },
    scrollHeight: 44
  } as any;

  scheduleComposerTextareaHeightAdjust(element);
  element.scrollHeight = 92;
  scheduleComposerTextareaHeightAdjust(element);

  assert.equal(frameQueue.size, 1, '连续输入时应只保留最后一次高度调整任务');
  assert.deepEqual(cancelledFrameIds, [1], '新的高度调整应取消上一帧未执行的任务');

  const [[pendingFrameId, pendingCallback]] = frameQueue.entries();
  frameQueue.delete(pendingFrameId);
  pendingCallback(16);

  assert.equal(element.style.height, '92px', '最终应按最后一次输入后的内容高度更新');
  assert.equal(element.style.overflowY, 'hidden', '未超过最大高度时不应显示内部滚动条');

  if (typeof originalRequestAnimationFrame === 'function') {
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
  } else {
    delete (globalThis as Partial<typeof globalThis>).requestAnimationFrame;
  }

  if (typeof originalCancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
  } else {
    delete (globalThis as Partial<typeof globalThis>).cancelAnimationFrame;
  }
}

console.log('测试通过：输入框高度调整会合并到同一帧执行。');
