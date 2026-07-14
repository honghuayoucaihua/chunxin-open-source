import assert from 'node:assert/strict';

(globalThis as any).Audio = class {
  paused = true;
  currentTime = 0;
  duration = 0;
  src = '';
  preload = 'auto';
  play = async () => {
    this.paused = false;
  };
  pause = () => {
    this.paused = true;
  };
  addEventListener = () => {};
  removeEventListener = () => {};
};
(globalThis as any).window = globalThis;
(globalThis as any).localStorage = {
  removeItem() {
    throw new Error('localStorage unavailable');
  }
};

const { runClearMusicFlow } = await import('../src/app/clearDataFlow.ts');

let didResetMusicState = false;
const toasts: string[] = [];

assert.doesNotThrow(() => {
  runClearMusicFlow({
    openConfirm: (_message: string, onConfirm: () => void) => onConfirm(),
    setMusicState: (value: unknown) => {
      didResetMusicState = !!value;
    },
    showToast: (message: string) => {
      toasts.push(message);
    }
  });
}, '本地播放列表缓存删除失败时，清空音乐数据不应中断');

assert.equal(didResetMusicState, true, '清空音乐数据应继续重置播放器状态');
assert.deepEqual(toasts, ['音乐数据已清空']);

console.log('测试通过：清空音乐数据在本地存储不可用时仍能重置界面状态。');
