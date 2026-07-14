import assert from 'node:assert/strict';
import {
  appendMemoryEntriesWithAutoSummary,
  mergeContactMemoryEntries
} from '../src/utils/chat/replyMemory.ts';

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const baseOptions = {
  contactId: 'c-1',
  source: 'model' as const,
  contactName: '测试联系人',
  threshold: 3,
  contactMemories: {},
  aiSettings: { provider: 'gemini' } as any,
  setContactMemories: (() => undefined) as (updater: any) => void,
  errorLogScope: '[replyMemoryTest]'
};

{
  const added: Array<{ contactId: string; text: string; source: string }> = [];
  const runtimeCalls: Array<{ contactId: string; contactName: string; threshold?: number }> = [];
  let nextMemoryState: unknown = null;

  appendMemoryEntriesWithAutoSummary({
    ...baseOptions,
    texts: [' 第一条 ', '', null, '第二条', { text: '对象文本不应写入' } as any, 404 as any]
  }, {
    addPendingMessageFn: (contactId, text, source) => {
      added.push({ contactId, text, source });
      return added.length;
    },
    shouldTriggerSummaryFn: (contactId, threshold) => {
      runtimeCalls.push({ contactId, contactName: '触发检查', threshold });
      return true;
    },
    loadRuntime: async () => ({
      processPendingMessagesWithAI: async (_memoryMap, contactId, contactName, _aiSettings, setMemories, threshold) => {
        runtimeCalls.push({ contactId, contactName, threshold });
        setMemories([{ id: 'm-1', text: '已总结', source: 'model', timestamp: Date.now() }] as any);
      }
    })
  });

  await flushMicrotasks();
  appendMemoryEntriesWithAutoSummary({
    ...baseOptions,
    texts: []
  }, {
    addPendingMessageFn: () => {
      throw new Error('空文本不应写入记忆');
    },
    shouldTriggerSummaryFn: () => {
      throw new Error('空文本不应触发总结检查');
    }
  });

  const setStateOptions = {
    ...baseOptions,
    texts: ['第三条'],
    setContactMemories: (updater: any) => {
      const currentMemoryState = {
        'c-1': [{
          id: 'existing-during-summary',
          text: '总结期间新增的长期记忆',
          source: 'user',
          timestamp: 99
        }]
      };
      nextMemoryState = typeof updater === 'function' ? updater(currentMemoryState) : updater;
    }
  };
  appendMemoryEntriesWithAutoSummary(setStateOptions, {
    addPendingMessageFn: () => 1,
    shouldTriggerSummaryFn: () => true,
    loadRuntime: async () => ({
      processPendingMessagesWithAI: async (_memoryMap, _contactId, _contactName, _aiSettings, setMemories) => {
        setMemories([{ id: 'm-2', text: '第二次总结', source: 'model', timestamp: Date.now() }] as any);
      }
    })
  });
  await flushMicrotasks();

  assert.deepEqual(
    added,
    [
      { contactId: 'c-1', text: '第一条', source: 'model' },
      { contactId: 'c-1', text: '第二条', source: 'model' },
      { contactId: 'c-1', text: '404', source: 'model' }
    ],
    '批量记忆写入应过滤空文本和对象旧格式，并保持逐条入缓冲区'
  );
  assert.deepEqual(
    runtimeCalls,
    [
      { contactId: 'c-1', contactName: '触发检查', threshold: 3 },
      { contactId: 'c-1', contactName: '测试联系人', threshold: 3 }
    ],
    '批量记忆写入应按统一阈值只触发一次自动总结'
  );
  const mergedTexts = ((nextMemoryState as any)?.['c-1'] || []).map((entry: any) => entry.text).sort();
  assert.deepEqual(
    mergedTexts,
    ['总结期间新增的长期记忆', '第二次总结'].sort(),
    '自动总结完成后应与最新联系人记忆合并，不能覆盖总结期间新增的长期记忆'
  );
  assert.deepEqual(
    mergeContactMemoryEntries([
      { id: 'old', text: '用户喜欢拿铁', source: 'user', timestamp: 1, weight: 2, confidence: 0.6 }
    ] as any, [
      { id: 'new', text: '用户喜欢拿铁', source: 'user', timestamp: 2, weight: 4, confidence: 0.9, occurrenceCount: 2 }
    ] as any),
    [
      { id: 'new', text: '用户喜欢拿铁', source: 'user', timestamp: 2, weight: 4, confidence: 0.9, occurrenceCount: 2 }
    ],
    '合并联系人记忆时应按文本去重，并保留更可靠的新版本'
  );
  assert.deepEqual(
    mergeContactMemoryEntries([
      { id: 'dirty', text: { text: '对象记忆不应参与合并' }, source: 'user', timestamp: 3 }
    ] as any, [
      { id: 'number', text: 404, source: 'model', timestamp: 4 }
    ] as any).map((entry) => entry.id),
    ['number'],
    '记忆合并不应把对象旧格式强转成去重键，数字型可展示文本仍可保留'
  );
}

console.log('测试通过：共享回复记忆入口可批量写入，并按统一阈值触发一次自动总结。');
