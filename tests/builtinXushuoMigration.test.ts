import assert from 'node:assert/strict';
import { INITIAL_CONTACTS } from '../src/constants.ts';
import { mergeBuiltInContacts } from '../src/appBootstrapUtils.ts';

const builtinXushuo = INITIAL_CONTACTS.find((contact) => contact.name === '徐烁');
assert.ok(builtinXushuo, '内置联系人中应存在徐烁');

{
  const merged = mergeBuiltInContacts([
    {
      id: builtinXushuo.id,
      name: '旧徐烁',
      pinyin: 'J',
      avatar: '/assets/image/old-xs.png',
      unreadCount: 7,
      lastMessage: '这是旧缓存消息',
      lastTime: 1711111111111,
      lastMessagePreviewMode: 'custom',
      lastMessageSourceId: 'old-message-id',
      isPinned: true,
      personality: '旧版徐烁人设',
      mbti: 'ISTJ',
      occupation: '旧岗位'
    } as any,
    {
      id: 'custom-contact',
      name: '自定义联系人',
      pinyin: 'Z',
      avatar: '/assets/image/custom.png',
      unreadCount: 2,
      personality: '自定义人设'
    } as any
  ]);

  const mergedXushuo = merged.find((contact) => contact.id === builtinXushuo.id);
  assert.ok(mergedXushuo, '合并后应保留徐烁联系人');
  assert.equal(mergedXushuo?.name, builtinXushuo.name, '老用户缓存中的徐烁姓名应被内置版本覆盖');
  assert.equal(mergedXushuo?.personality, builtinXushuo.personality, '老用户缓存中的徐烁人设应被内置版本覆盖');
  assert.equal(mergedXushuo?.mbti, builtinXushuo.mbti, '老用户缓存中的徐烁 MBTI 应被内置版本覆盖');
  assert.equal(mergedXushuo?.occupation, builtinXushuo.occupation, '老用户缓存中的徐烁职业应被内置版本覆盖');
  assert.equal(mergedXushuo?.persona, builtinXushuo.persona, '老用户缓存中的徐烁核心人设应被内置版本覆盖');
  assert.equal(mergedXushuo?.unreadCount, 7, '老用户的未读数应被保留');
  assert.equal(mergedXushuo?.lastMessage, '这是旧缓存消息', '老用户的最后一条消息预览应被保留');
  assert.equal(mergedXushuo?.lastTime, 1711111111111, '老用户的最后消息时间应被保留');
  assert.equal(mergedXushuo?.lastMessagePreviewMode, 'custom', '老用户的最后消息预览来源模式应被保留');
  assert.equal(mergedXushuo?.lastMessageSourceId, 'old-message-id', '老用户的最后消息预览来源消息应被保留');
  assert.equal(mergedXushuo?.isPinned, true, '老用户的置顶状态应被保留');

  const customContact = merged.find((contact) => contact.id === 'custom-contact');
  assert.equal(customContact?.name, '自定义联系人', '非内置联系人不应被内置覆盖');
}

console.log('测试通过：内置徐烁会覆盖所有老用户缓存中的旧版人设，并保留运行时状态。');
