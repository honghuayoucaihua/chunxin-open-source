import assert from 'node:assert/strict';
import {
  HIGH_CONTEXT_MESSAGE_WARNING_THRESHOLD,
  buildAiContextWarningMessage,
  shouldWarnOnAiContextBudget,
  shouldWarnOnContextLimitIncrease
} from '../src/services/aiContextWarning.ts';

{
  assert.equal(shouldWarnOnContextLimitIncrease(HIGH_CONTEXT_MESSAGE_WARNING_THRESHOLD - 1, HIGH_CONTEXT_MESSAGE_WARNING_THRESHOLD), true, '从低风险调到高风险时应触发提醒');
  assert.equal(shouldWarnOnContextLimitIncrease(HIGH_CONTEXT_MESSAGE_WARNING_THRESHOLD, HIGH_CONTEXT_MESSAGE_WARNING_THRESHOLD + 20), false, '已经处于高风险区时继续上调不应重复触发 crossing 判断');
}

{
  assert.equal(shouldWarnOnAiContextBudget(50001, 50000), true, '超过预算时应触发发送前提醒');
  assert.equal(shouldWarnOnAiContextBudget(50000, 50000), false, '刚好等于预算时不视为超出');
}

{
  const limitWarning = buildAiContextWarningMessage({ mode: 'highLimit', contextLimit: 88, limitChars: 50000 });
  assert.ok(limitWarning.includes('最大上下文条数'), '高上下文条数提醒应明确指出检查项');
  assert.ok(limitWarning.includes('仅针对内置AI'), '提醒文案应明确说明仅影响内置AI');
  assert.ok(limitWarning.includes('自定义API不受此限制'), '提醒文案应明确说明自定义API不受此限制');

  const budgetWarning = buildAiContextWarningMessage({
    mode: 'overBudget',
    totalChars: 54321,
    limitChars: 50000,
    breakdown: [
      { key: 'historyText', label: '最近聊天记录', chars: 12345 },
      { key: 'systemPrompt', label: '角色设定 / 世界书 / 模板', chars: 30000 },
      { key: 'runtimePrompt', label: '记忆 / 时间 / 本轮规则', chars: 8000 }
    ]
  });
  assert.ok(budgetWarning.includes('54321 / 50000'), '超预算提醒应包含当前估算值和上限');
  assert.ok(budgetWarning.includes('本次上下文占用'), '超预算提醒应直接展示占用明细');
  assert.ok(budgetWarning.includes('角色设定 / 世界书 / 模板：30000 字符'), '占用明细应显示各部分字符数');
  assert.ok(budgetWarning.indexOf('角色设定 / 世界书 / 模板') < budgetWarning.indexOf('最近聊天记录'), '占用明细应按占用从高到低排序');
  assert.ok(budgetWarning.includes('仅针对内置AI'), '超预算提醒也应明确说明仅影响内置AI');
  assert.ok(budgetWarning.includes('自定义API不受此限制'), '超预算提醒也应明确说明自定义API不受此限制');
}

console.log('测试通过：AI 上下文提醒阈值与文案正常。');
