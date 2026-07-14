import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages/NovelDiscoverView.tsx', import.meta.url), 'utf8');

const assertBefore = (first: string, second: string, message: string) => {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second, firstIndex + first.length);
  assert.notEqual(firstIndex, -1, `${message}：缺少前置片段`);
  assert.notEqual(secondIndex, -1, `${message}：缺少后置片段`);
  assert.ok(firstIndex < secondIndex, message);
};

assertBefore(
  'if (!tryEnterKeyedGuard(chapterGeneratingRef.current, key)) return null;',
  'const runtimeEpoch = captureActiveRuntimeEpoch();',
  '章节正文生成应先进入本地闸门，再捕获运行批次，避免重复点击影响正在执行的请求'
);

assertBefore(
  'if (isLoadingMoreChapters || !tryEnterBooleanGuard(moreChaptersGeneratingRef)) return null;',
  'const runtimeEpoch = captureActiveRuntimeEpoch();',
  '续写章节应先进入本地闸门，再发起 AI 请求'
);

assertBefore(
  'if (!tryEnterBooleanGuard(commentReplyGeneratingRef)) return;',
  'const runtimeEpoch = captureActiveRuntimeEpoch();',
  '章评回复应先进入本地闸门，避免连点发送重复 AI 回复'
);

assertBefore(
  'if (!tryEnterBooleanGuard(publishingRef)) return;',
  'const runtimeEpoch = captureActiveRuntimeEpoch();',
  '创建完整小说项目应先进入本地闸门，避免连点重复构建'
);

console.log('测试通过：小说 AI 重请求入口已在发起前接入本地闸门。');
