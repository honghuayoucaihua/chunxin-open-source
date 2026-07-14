import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildContactCardPayload, parseContactCardPayload } from '../src/app/contactCardFlowUtils.ts';
import { CONTACT_CARD_PREFIX, encodeBase64Unicode } from '../src/app/contactCardCodec.ts';
import type { Contact } from '../src/types';

const contact = {
  id: 'contact-1',
  name: '林夏',
  pinyin: 'LX',
  avatar: '/avatar.png',
  isAi: true,
  unreadCount: 9
} as Contact;

const payload = buildContactCardPayload(contact);
const parsed = parseContactCardPayload(payload);

assert.equal(parsed?.id, 'contact-1', '有效联系人名片应保留原始 id');
assert.equal(parsed?.name, '林夏', '有效联系人名片应保留名称');
assert.equal(parsed?.avatar, '/avatar.png', '有效联系人名片应保留头像');
assert.equal(parsed?.isAi, true, '有效联系人名片应保留 isAi 显式结构');
assert.equal(parsed?.unreadCount, 0, '导入联系人名片仍应清理运行时未读状态');

const encodeCard = (contactPatch: Record<string, unknown>, envelopePatch: Record<string, unknown> = {}) => (
  `${CONTACT_CARD_PREFIX}${encodeBase64Unicode(JSON.stringify({
    v: 1,
    type: 'contact-card',
    project: 'xushuo-app',
    contact: {
      id: 'contact-2',
      name: '周宁',
      pinyin: 'ZN',
      avatar: '/avatar-2.png',
      isAi: true,
      ...contactPatch
    },
    ...envelopePatch
  }))}`
);

assert.equal(parseContactCardPayload(encodeCard({ id: '' })), null, '联系人名片缺 id 时不应生成 scan 兜底 id');
assert.equal(parseContactCardPayload(encodeCard({ avatar: '' })), null, '联系人名片缺头像时不应补默认头像');
assert.equal(parseContactCardPayload(encodeCard({ isAi: undefined })), null, '联系人名片缺 isAi 显式结构时不应默认当作 AI 联系人');
assert.equal(parseContactCardPayload(encodeCard({}, { type: 'anything' })), null, '联系人名片不应从非 contact-card envelope 中捞 contact 字段');
assert.equal(parseContactCardPayload(encodeCard({ id: { text: 'object-id' } })), null, '对象型 id 不应强转成 [object Object] 后通过导入');
assert.equal(parseContactCardPayload(encodeCard({ name: { text: '对象姓名' } })), null, '对象型姓名不应强转成 [object Object] 后通过导入');
assert.equal(parseContactCardPayload(encodeCard({ avatar: { url: '/avatar.png' } })), null, '对象型头像不应强转成 [object Object] 后通过导入');

const numericNameCard = parseContactCardPayload(encodeCard({ name: 123, pinyin: { text: '对象拼音不应落地' } }));
assert.equal(numericNameCard?.name, '123', '数字型名称仍可作为可展示标量导入');
assert.equal(numericNameCard?.pinyin, '', '对象型拼音不应强转成可见字段');

const looseJsonPayload = `${CONTACT_CARD_PREFIX}${encodeBase64Unicode(JSON.stringify({
  contact: {
    id: 'loose',
    name: '松散结构',
    avatar: '/loose.png',
    isAi: true
  }
}))}`;
assert.equal(parseContactCardPayload(looseJsonPayload), null, '联系人名片不应接受缺少本项目 envelope 的松散 JSON');

const contactCardSource = readFileSync(new URL('../src/app/contactCardFlowUtils.ts', import.meta.url), 'utf8');
assert.doesNotMatch(contactCardSource, /这个人很有趣，快来聊聊吧/, '联系人名片图片不应给空签名补造固定文案');
assert.match(contactCardSource, /const signature = readText\(contact\.signature\)\.slice\(0, 24\)/, '联系人名片 fallback canvas 应只绘制明确签名');

console.log('测试通过：联系人名片导入和导出不再补造关键身份字段。');
