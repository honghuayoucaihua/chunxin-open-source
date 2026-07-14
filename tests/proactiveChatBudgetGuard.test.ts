import assert from 'node:assert/strict';
import type { Contact, Message } from '../src/types/index.ts';
import {
  canWarmupProactiveDraft,
  selectDueProactiveContacts
} from '../src/hooks/proactiveChatBudgetGuard.ts';
import {
  MAX_PROACTIVE_TRIGGERS_PER_CHECK,
  PROACTIVE_DRAFT_WARMUP_INTERVAL_MS
} from '../src/hooks/proactiveChatConfig.ts';

const now = 10 * 60 * 1000;

const buildContact = (id: string, lastProactiveChatAt = 0): Contact => ({
  id,
  name: id,
  avatar: '',
  isAi: true,
  isGroup: false,
  proactiveChatEnabled: true,
  proactiveChatWindowMinutes: 1,
  lastProactiveChatAt
} as Contact);

const buildUserMessage = (timestamp: number): Message => ({
  id: `msg-${timestamp}`,
  senderId: 'me',
  content: 'hi',
  timestamp,
  type: 'text'
} as Message);

{
  const contacts = [
    buildContact('due-oldest', 0),
    buildContact('due-second', 60 * 1000),
    buildContact('due-third', 120 * 1000),
    { ...buildContact('group'), isGroup: true },
    { ...buildContact('disabled'), proactiveChatEnabled: false },
    buildContact('not-yet', now - 30 * 1000)
  ];
  const messages: Record<string, Message[]> = {
    'due-oldest': [buildUserMessage(0)],
    'due-second': [buildUserMessage(60 * 1000)],
    'due-third': [buildUserMessage(120 * 1000)],
    group: [buildUserMessage(0)],
    disabled: [buildUserMessage(0)],
    'not-yet': [buildUserMessage(now - 30 * 1000)]
  };

  const selected = selectDueProactiveContacts({ contacts, messages }, now);

  assert.equal(
    selected.length,
    MAX_PROACTIVE_TRIGGERS_PER_CHECK,
    '主动联系每轮检查不应把所有到期联系人一次性触发'
  );
  assert.deepEqual(
    selected.map((item) => item.id),
    ['due-oldest', 'due-second'],
    '主动联系应优先触发最早到期的联系人'
  );
}

{
  const warmupAt: Record<string, number> = { contact: now };

  assert.equal(
    canWarmupProactiveDraft(warmupAt, 'contact', now + PROACTIVE_DRAFT_WARMUP_INTERVAL_MS - 1),
    false,
    '后台草稿预热不应绕过本地冷却时间'
  );
  assert.equal(
    canWarmupProactiveDraft(warmupAt, 'contact', now + PROACTIVE_DRAFT_WARMUP_INTERVAL_MS),
    true,
    '冷却结束后应允许继续补充主动消息草稿'
  );
}

console.log('测试通过：主动联系本地调度会限制每轮触发量，并让后台草稿预热遵守冷却。');
