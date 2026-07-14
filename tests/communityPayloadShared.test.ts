import assert from 'node:assert/strict';
import {
  COMMUNITY_UPLOAD_PAYLOAD_LIMIT_BYTES,
  decryptCommunityExportEnvelope,
  encryptCommunityExportEnvelope,
  prepareCommunityPayloadForStorage,
  sanitizeContactForCommunity
} from '../src/community/communityPayloadShared.js';

const buildLargeText = (size: number) => 'x'.repeat(size);

const heavyContact = {
  id: 'contact-heavy',
  name: '小柯',
  avatar: 'assets/image/ovo.png',
  persona: '保留的人设',
  wallpaper: `data:image/png;base64,${buildLargeText(1_500_000)}`,
  messages: Array.from({ length: 754 }, (_, index) => ({ id: index, text: `msg-${index}` })),
  longtermMemory: { entries: Array.from({ length: 50 }, (_, index) => `memory-${index}`) },
  storyContext: buildLargeText(20_000),
  context: buildLargeText(18_000),
  background: '可保留的背景'
};

const cleanedContact = sanitizeContactForCommunity(heavyContact);
assert.equal('wallpaper' in cleanedContact, false, '联系人分享不应带入超大壁纸');
assert.equal('messages' in cleanedContact, false, '联系人分享不应带入聊天记录');
assert.equal('longtermMemory' in cleanedContact, false, '联系人分享不应带入长期记忆');
assert.equal('storyContext' in cleanedContact, false, '联系人分享不应带入超长剧情上下文');
assert.equal(cleanedContact.persona, '保留的人设', '核心人设字段应保留');
assert.equal(cleanedContact.background, '可保留的背景', '普通文本字段应保留');

const plainPrepared = prepareCommunityPayloadForStorage('contact', {
  contacts: [heavyContact],
  messages: { contact_heavy: heavyContact.messages }
});
assert.ok(plainPrepared.bytes < COMMUNITY_UPLOAD_PAYLOAD_LIMIT_BYTES, '瘦身后的联系人分享应能落进 D1 payload 限制');
const plainPayload = JSON.parse(plainPrepared.payloadString);
assert.deepEqual(plainPayload.messages, {}, '联系人分享导出后不应再带聊天记录映射');
assert.equal(Array.isArray(plainPayload.contacts), true, '联系人分享仍应保留 contacts 数组');
assert.equal('wallpaper' in plainPayload.contacts[0], false, '瘦身后的联系人不应再含超大壁纸');

const encryptedPayload = encryptCommunityExportEnvelope({
  contacts: [heavyContact],
  messages: { contact_heavy: heavyContact.messages }
}, 'contacts');
const encryptedPrepared = prepareCommunityPayloadForStorage('contact', encryptedPayload, true);
assert.ok(encryptedPrepared.bytes < COMMUNITY_UPLOAD_PAYLOAD_LIMIT_BYTES, '加密联系人分享瘦身后也应能落进 D1 payload 限制');
const decrypted = decryptCommunityExportEnvelope(JSON.parse(encryptedPrepared.payloadString));
assert.ok(decrypted, '瘦身后的加密联系人分享仍应可解密');
assert.deepEqual(decrypted?.data?.messages, {}, '加密联系人分享解密后不应再带聊天记录映射');
assert.equal('wallpaper' in (decrypted?.data?.contacts?.[0] || {}), false, '加密联系人分享解密后不应再带壁纸大图');

console.log('测试通过：社区 payload 会在上传/迁移前统一瘦身并压进 D1 限制内。');
