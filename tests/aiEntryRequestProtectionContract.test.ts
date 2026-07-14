import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readSource = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');

const momentFlow = readSource('../src/app/momentActionFlow.ts');
const momentHandlers = readSource('../src/app/momentsActionHandlers.ts');
const officialHandlers = readSource('../src/app/officialArticleActionHandlers.ts');
const mailboxHandlers = readSource('../src/app/mailboxActionHandlers.ts');
const contactManagementHandlers = readSource('../src/app/contactManagementActionHandlers.ts');

assert.ok(
  momentFlow.includes('export const MAX_REMIND_WHO_POST_GENERATIONS_PER_BATCH = 3;'),
  '提醒联系人发朋友圈应有单次本地上限，避免一次选择过多联系人消耗过多 AI 次数'
);
assert.ok(
  momentFlow.includes('slice(0, MAX_REMIND_WHO_POST_GENERATIONS_PER_BATCH)'),
  '提醒联系人发朋友圈应只处理本批次上限内的联系人'
);
assert.ok(
  !momentFlow.includes('Promise.all(contactIds.map'),
  '提醒联系人发朋友圈不应并发打满所有选中联系人'
);
assert.ok(
  momentHandlers.includes('manualGenerateMomentPromise') && momentHandlers.includes('remindWhoPostPromise'),
  '朋友圈手动生成和提醒生成应复用运行中的本地请求'
);

assert.ok(
  officialHandlers.includes('manualArticleGenerationPromise'),
  '公众号手动生成文章应复用运行中的本地请求'
);
assert.ok(
  officialHandlers.includes('initialArticleCommentsPromises') && officialHandlers.includes('articleCommentReplyPromises'),
  '公众号评论生成和评论回复应按文章/评论复用运行中的本地请求'
);

assert.ok(
  mailboxHandlers.includes('pendingMailboxSendKeys') && mailboxHandlers.includes('buildMailboxSendKey'),
  '邮箱发送同一封信应有本地去重锁'
);
assert.ok(
  mailboxHandlers.includes("options.showToast('这封信正在发送，请稍候');"),
  '重复点击同一封信发送时应给出本地提示，不应再触发 AI 回信'
);

assert.ok(
  contactManagementHandlers.includes('contactFormGenerationPromises') && contactManagementHandlers.includes('buildContactFormGenerationKey'),
  '联系人表单 AI 生成应按描述复用运行中的本地请求'
);

console.log('测试通过：重 AI 入口已补充本地请求保护，不会因为连点或过量选择额外消耗额度。');
