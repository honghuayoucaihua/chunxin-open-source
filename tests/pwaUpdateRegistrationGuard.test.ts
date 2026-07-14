import assert from 'node:assert/strict';
import {
  claimPwaUpdateRegistration,
  releasePwaUpdateRegistration,
  type PwaUpdateRegistrationGuard
} from '../src/services/pwaUpdateRegistrationGuard.ts';

type TestCallback = () => string;

const guard: PwaUpdateRegistrationGuard<TestCallback> = {
  callback: null,
  registered: false
};

const firstCallback = () => 'first';
const secondCallback = () => 'second';

assert.equal(
  claimPwaUpdateRegistration(guard, firstCallback),
  true,
  '首次注册应允许启动 Service Worker 监听'
);
assert.equal(guard.callback?.(), 'first', '首次注册应保存回调');
assert.equal(guard.registered, true, '首次注册后应标记为已注册');

assert.equal(
  claimPwaUpdateRegistration(guard, secondCallback),
  false,
  '重复注册不应再次启动 Service Worker 监听或定时检查'
);
assert.equal(guard.callback?.(), 'second', '重复注册时仍应更新回调，避免旧页面状态残留');
assert.equal(guard.registered, true, '重复注册后仍保持已注册状态');

releasePwaUpdateRegistration(guard);
assert.equal(guard.registered, false, '注册失败后应允许下次重新注册');

assert.equal(
  claimPwaUpdateRegistration(guard),
  true,
  '释放注册状态后应允许再次注册'
);
assert.equal(guard.callback?.(), 'second', '未传入新回调时不应清空已有回调');

console.log('测试通过：PWA 更新监听不会重复注册，同时保留最新回调。');
