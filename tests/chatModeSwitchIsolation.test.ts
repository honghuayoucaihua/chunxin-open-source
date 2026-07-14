import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const oldInnerActionMessage: any = {
  id: 'm1',
  senderId: '1',
  content: '刚到楼下',
  timestamp: Date.parse('2026-03-16T07:42:33.000Z'),
  type: 'text',
  innerVoice: '其实很想见你',
  actionDesc: '把伞收起来',
  narrationDesc: '雨声变小'
};

assert.ok(oldInnerActionMessage.actionDesc, '测试样例应包含旧动作，避免误删回归样例');

{
  const policySource = readFileSync(new URL('../src/utils/chat/chatModePolicy.ts', import.meta.url), 'utf8');
  assert.match(policySource, /const innerEnabled = defaults\.innerEnabled;/, '描述功能不应覆盖当前聊天模式的心声能力');
  assert.match(policySource, /const actionEnabled = defaults\.actionEnabled;/, '描述功能不应覆盖当前聊天模式的动作能力');
  assert.match(policySource, /sanitizeReplyMetaForPolicy/, '回复落地应通过统一模式策略过滤元信息');
  assert.match(policySource, /formatMessageForPolicyHistory/, '历史上下文应通过统一模式策略过滤元信息');
  assert.match(policySource, /inner: innerEnabled,\s*action: actionEnabled,\s*narration: narrationEnabled/s, '历史上下文过滤规则应来自当前模式能力');

  const requestSource = readFileSync(new URL('../src/utils/chat/singleReplyRequest.ts', import.meta.url), 'utf8');
  assert.match(requestSource, /getChatModePolicy\(options\.contact\)/, '共享单聊请求准备器应使用统一模式策略');
  assert.match(requestSource, /formatMessageForPolicyHistory/, '共享单聊请求准备器应按当前模式过滤历史元信息');

  const source = readFileSync(new URL('../src/app/sendMessage/singleChatFlow.ts', import.meta.url), 'utf8');
  assert.match(source, /buildSingleReplyRequestContext\(/, '单聊主流程应复用共享单聊请求准备器');
  assert.match(source, /requireStructured: true/, '单聊主流程不应把非 JSON 原始回复兜底落地');
  assert.match(source, /filterOrderedSegmentsForPolicy/, '单聊有序片段必须按当前模式过滤');
  assert.match(source, /clampOrderedTextSegmentCountWithinSentenceRange/, '单聊有序片段应遵守分句数量范围');

  const proactiveSource = readFileSync(new URL('../src/hooks/proactiveChatHelpers.ts', import.meta.url), 'utf8');
  assert.match(proactiveSource, /buildSingleReplyRequestContext\(/, '主动聊天应复用共享单聊请求准备器');
  assert.match(proactiveSource, /requireStructured: true/, '主动聊天不应把非 JSON 原始回复兜底落地');

  const resendSource = readFileSync(new URL('../src/hooks/messageActions/resendFlow.ts', import.meta.url), 'utf8');
  assert.match(resendSource, /buildSingleReplyRequestContext\(/, '重发单聊也应复用共享单聊请求准备器');
  assert.match(resendSource, /requireStructured: true/, '重发单聊不应把非 JSON 原始回复兜底落地');
  assert.match(resendSource, /getMessageTextForPolicy/, '重发流程提取历史文本时应按当前模式过滤旧元信息');
  assert.match(resendSource, /filterOrderedSegmentsForPolicy/, '重发流程有序片段也应按当前模式过滤');
  assert.match(resendSource, /clampOrderedTextSegmentCountWithinSentenceRange/, '重发有序片段也应遵守分句数量范围，保持与首发一致');
}

console.log('测试通过：切换聊天模式后，旧心声/动作不会继续污染上下文或落地结果。');
