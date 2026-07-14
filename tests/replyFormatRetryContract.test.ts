import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildReplyFormatRetryRuntimePrompt } from '../src/utils/chat/replyFormatRetry.ts';

const retryPrompt = buildReplyFormatRetryRuntimePrompt('原运行时上下文');
assert.match(retryPrompt, /原运行时上下文/, '格式修复重试应保留原运行时上下文');
assert.match(retryPrompt, /上一轮 AI 回复格式无效/, '格式修复重试应明确说明上一轮没有落地');
assert.match(retryPrompt, /合法 JSON 对象/, '格式修复重试应把合法 JSON 放在最近端要求里');
assert.match(retryPrompt, /不要输出 Markdown、代码块/, '格式修复重试应继续禁止代码块包装 JSON');
assert.match(retryPrompt, /\{"text":"自然回复"\}/, '格式修复重试应给普通聊天最小可落地模板');

const singleFlowSource = readFileSync(new URL('../src/app/sendMessage/singleChatFlow.ts', import.meta.url), 'utf8');
const resendFlowSource = readFileSync(new URL('../src/hooks/messageActions/resendFlow.ts', import.meta.url), 'utf8');

assert.match(singleFlowSource, /buildReplyFormatRetryRuntimePrompt\(requestContext\.runtimeUserPrompt\)/, '单聊首发格式无效时应自动重试一次');
assert.match(resendFlowSource, /buildReplyFormatRetryRuntimePrompt\(requestContext\.runtimeUserPrompt\)/, '单聊重发格式无效时应自动重试一次');
assert.match(resendFlowSource, /acceptPlainText: true/, '单聊重发应和首发一样允许纯文本回复兜底落地');
assert.match(singleFlowSource, /single_send_after_format_retry/, '首发格式修复重试仍应受旧任务丢弃保护');
assert.match(resendFlowSource, /single_resend_after_format_retry/, '重发格式修复重试仍应受旧任务丢弃保护');

console.log('测试通过：单聊格式无效会先自动修复重试，重发保留纯文本兜底。');

