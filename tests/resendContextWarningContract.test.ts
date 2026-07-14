import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const useChatActionDomainSource = readFileSync(new URL('../src/hooks/useChatActionDomain.ts', import.meta.url), 'utf8');
const messageActionsSource = readFileSync(new URL('../src/hooks/messageActions/index.ts', import.meta.url), 'utf8');
const messageActionTypesSource = readFileSync(new URL('../src/hooks/messageActions/types.ts', import.meta.url), 'utf8');
const resendFlowSource = readFileSync(new URL('../src/hooks/messageActions/resendFlow.ts', import.meta.url), 'utf8');

assert.match(
  messageActionTypesSource,
  /warnAiContextRiskIfNeeded\?: \(args: \{[\s\S]*personality: string;[\s\S]*runtimeUserPrompt\?: string;[\s\S]*history:/,
  '重发参数类型应暴露上下文风险提醒函数'
);
assert.match(
  useChatActionDomainSource,
  /useMessageActions\(\{[\s\S]*warnAiContextRiskIfNeeded,[\s\S]*extraSystemPrompt: ''/,
  '主聊天动作入口应把上下文风险提醒传给消息动作'
);
assert.match(
  messageActionsSource,
  /warnAiContextRiskIfNeeded,[\s\S]*const params: UseMessageActionsParams = \{[\s\S]*warnAiContextRiskIfNeeded,[\s\S]*extraSystemPrompt/,
  '消息动作分发器应继续把上下文风险提醒传给懒加载重发流程'
);
assert.match(
  resendFlowSource,
  /await params\.warnAiContextRiskIfNeeded\?\.\(\{[\s\S]*personality: requestContext\.systemPrompt,[\s\S]*runtimeUserPrompt: requestContext\.runtimeUserPrompt,[\s\S]*history: requestContext\.history[\s\S]*\}\);[\s\S]*groupReply = await withTypingContact/,
  '群聊重发应在 AI 请求前执行上下文风险提醒'
);
assert.match(
  resendFlowSource,
  /await params\.warnAiContextRiskIfNeeded\?\.\(\{[\s\S]*personality: requestContext\.systemPrompt,[\s\S]*runtimeUserPrompt: requestContext\.runtimeUserPrompt,[\s\S]*history: requestContext\.history[\s\S]*\}\);[\s\S]*let reply = '';/,
  '单聊重发应在 AI 请求前执行上下文风险提醒'
);

console.log('测试通过：重发链路会复用发送前 AI 上下文风险提醒。');
