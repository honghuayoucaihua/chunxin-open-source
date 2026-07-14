import assert from 'node:assert/strict';
import {
  leaveBooleanGuard,
  leaveKeyedGuard,
  tryEnterBooleanGuard,
  tryEnterKeyedGuard
} from '../src/utils/requestGuards.ts';

{
  const guard = { current: false };

  assert.equal(tryEnterBooleanGuard(guard), true, '空闲布尔闸门应允许进入');
  assert.equal(tryEnterBooleanGuard(guard), false, '运行中的布尔闸门不应重复进入');
  leaveBooleanGuard(guard);
  assert.equal(tryEnterBooleanGuard(guard), true, '释放后布尔闸门应允许下一次进入');
}

{
  const guard = new Set<string>();

  assert.equal(tryEnterKeyedGuard(guard, 'chapter-1'), true, '空闲 key 闸门应允许进入');
  assert.equal(tryEnterKeyedGuard(guard, 'chapter-1'), false, '同一 key 运行中不应重复进入');
  assert.equal(tryEnterKeyedGuard(guard, 'chapter-2'), true, '不同 key 可独立进入');
  leaveKeyedGuard(guard, 'chapter-1');
  assert.equal(tryEnterKeyedGuard(guard, 'chapter-1'), true, '释放指定 key 后应允许再次进入');
}

console.log('测试通过：本地请求闸门会阻止重复进入，并能正常释放。');
