import assert from 'node:assert/strict';
import { createNumericVersionGuard } from '../src/utils/chat/taskGuard.ts';
import { readFileSync } from 'node:fs';

const replyTaskSource = readFileSync(new URL('../src/utils/chat/replyTaskVersion.ts', import.meta.url), 'utf8');
const anonymousFlowSource = readFileSync(new URL('../src/app/anonymousSessionFlow.ts', import.meta.url), 'utf8');

{
  let currentVersion = 2;
  const guard = createNumericVersionGuard(() => currentVersion, 2);
  assert.equal(guard.version, 2, '通用任务守卫应保留预期版本号');
  assert.equal(guard.isCurrent(), true, '当前版本一致时守卫应通过');
  assert.equal(guard.getState(), 'current', '当前版本一致时守卫状态应为 current');
  currentVersion = 3;
  assert.equal(guard.isCurrent(), false, '当前版本变化后守卫应失效');
  assert.equal(guard.getState(), 'stale', '当前版本变化后守卫状态应为 stale');
}

assert.match(
  replyTaskSource,
  /createNumericVersionGuard/,
  '聊天重发版本守卫应复用通用版本守卫工具'
);
assert.match(
  anonymousFlowSource,
  /createNumericVersionGuard/,
  '匿名会话版本守卫应复用通用版本守卫工具'
);

console.log('测试通过：普通聊天与匿名会话已复用共享任务守卫。');
