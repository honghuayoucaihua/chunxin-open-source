import assert from 'node:assert/strict';
import { appendMemoryEntriesWithAutoSummary } from '../src/utils/chat/replyMemory.ts';

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

let finishSummary: (() => void) | null = null;
let runtimeLoads = 0;
let processCalls = 0;

const options = {
  contactId: 'contact-single-flight',
  source: 'model' as const,
  contactName: '测试联系人',
  threshold: 1,
  contactMemories: {},
  aiSettings: { provider: 'gemini' } as any,
  setContactMemories: (() => undefined) as (updater: any) => void,
  errorLogScope: '[replyMemorySingleFlightTest]'
};

const deps = {
  addPendingMessageFn: () => 1,
  shouldTriggerSummaryFn: () => true,
  loadRuntime: async () => {
    runtimeLoads += 1;
    return {
      processPendingMessagesWithAI: async () => {
        processCalls += 1;
        await new Promise<void>((resolve) => {
          finishSummary = resolve;
        });
      }
    };
  }
};

appendMemoryEntriesWithAutoSummary({ ...options, texts: ['第一条'] }, deps);
appendMemoryEntriesWithAutoSummary({ ...options, texts: ['第二条'] }, deps);
await flushMicrotasks();

assert.equal(runtimeLoads, 1, '同一联系人已有总结进行中时不应再次加载 AI 总结运行时');
assert.equal(processCalls, 1, '同一联系人已有总结进行中时不应再次发起 AI 总结');

finishSummary?.();
await flushMicrotasks();
await flushMicrotasks();

appendMemoryEntriesWithAutoSummary({ ...options, texts: ['第三条'] }, deps);
await flushMicrotasks();

assert.equal(runtimeLoads, 2, '上一次总结结束后应允许下一轮正常触发');
assert.equal(processCalls, 2, '上一次总结结束后应允许下一轮正常发起');

finishSummary?.();
await flushMicrotasks();

console.log('测试通过：自动记忆总结会按联系人合并并发触发，避免重复消耗 AI 次数。');
