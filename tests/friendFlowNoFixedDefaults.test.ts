import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildAcceptedFriendMessages, buildIncomingFriendRequest } from '../src/app/friendFlowUtils.ts';
import { buildContactFormData } from '../src/utils/UtilsContactFormModel.ts';

const form = {
  ...buildContactFormData(),
  name: '林夏'
};

const request = buildIncomingFriendRequest({
  form,
  greeting: '',
  openingLine: '',
  existingContacts: []
});

assert.ok(request, '有效姓名应能创建好友请求');
assert.equal(request.contact.personality?.includes('普通联系人'), false, '好友请求联系人不应补默认关系');
assert.equal(request.contact.gender, undefined, '好友请求联系人不应补默认性别');
assert.equal(request.greeting, '', '底层好友请求不应补默认打招呼文案');

const messages = buildAcceptedFriendMessages(request);
assert.equal(messages.greeting, undefined, '接受好友请求时不应补默认打招呼消息，也不应写入空消息');

const source = readFileSync(new URL('../src/app/friendFlowUtils.ts', import.meta.url), 'utf8');
assert.doesNotMatch(source, /普通联系人|greeting \|\| '你好，想加你为好友'|request\.greeting \|\| '你好，想加你为好友'/, '好友请求流程不应保留隐藏固定资料兜底');

console.log('测试通过：好友请求流程不再补固定关系、性别和打招呼正文。');
