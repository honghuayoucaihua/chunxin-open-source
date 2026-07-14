import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createNumericVersionGuard } from '../src/utils/chat/taskGuard.ts';

const resendFlowSource = readFileSync(new URL('../src/hooks/messageActions/resendFlow.ts', import.meta.url), 'utf8');
const replyTaskSource = readFileSync(new URL('../src/utils/chat/replyTaskVersion.ts', import.meta.url), 'utf8');

assert.match(resendFlowSource, /createReplyTaskGuard\(params\.replyTaskVersionRef, selectedContactId, \{ bump: true \}\)/, '重发应显式切断当前聊天旧回复链路');
assert.match(
  resendFlowSource,
  /if \(!((isReplyTaskCurrent|replyTaskGuard\.isCurrent)\(\))\) \{\s*replyTaskTracker\.markDroppedStale\('/,
  '重发主流程与延迟落地前都应检查旧线是否失效，并显式标记旧线丢弃'
);
assert.match(replyTaskSource, /createNumericVersionGuard/, '聊天重发任务守卫应复用共享版本守卫工具');

{
  const versions: Record<string, number> = {};
  const makeGuard = (chatId: string, bump = false) => {
    if (bump) {
      versions[chatId] = Number(versions[chatId] || 0) + 1;
    }
    const expectedVersion = Number(versions[chatId] || 0);
    return createNumericVersionGuard(() => Number(versions[chatId] || 0), expectedVersion);
  };

  const chatAFirst = makeGuard('chat-a');
  const chatBFirst = makeGuard('chat-b');

  assert.equal(chatAFirst.isCurrent(), true, '未重发前，聊天 A 的原任务应保持有效');
  assert.equal(chatBFirst.isCurrent(), true, '未重发前，聊天 B 的原任务也应保持有效');

  versions['chat-a'] = Number(versions['chat-a'] || 0) + 1;
  assert.equal(chatAFirst.isCurrent(), false, '聊天 A 重发后，旧任务应失效');
  assert.equal(chatBFirst.isCurrent(), true, '聊天 B 不应被聊天 A 的重发连带取消');

  const chatANext = makeGuard('chat-a');
  assert.equal(chatANext.isCurrent(), true, '聊天 A 的新版本任务应被视为当前有效任务');
}

console.log('测试通过：仅重发当前聊天会切断旧回复线，其他聊天后台回复不受影响。');
