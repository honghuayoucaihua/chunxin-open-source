import assert from 'node:assert/strict';
import { syncContactPreviewFromMessages } from '../src/utils/chat/contactPreviewSync.ts';
import type { Contact, Message } from '../src/types/index.ts';

const groupContact: Contact = {
  id: 'group-1',
  name: '测试群',
  pinyin: 'C',
  avatar: '',
  unreadCount: 0,
  isGroup: true,
  lastMessage: '小春：今天去哪里',
  lastTime: 1710000000000,
  lastMessagePreviewMode: 'custom',
  lastMessageSourceId: 'msg-1'
};

const lastMessage: Message = {
  id: 'msg-1',
  senderId: 'member-1',
  content: '今天去哪里',
  timestamp: 1710000000000,
  type: 'text'
};

const preserved = syncContactPreviewFromMessages(groupContact, [lastMessage]);
assert.equal(preserved.lastMessage, '小春：今天去哪里', '群聊自定义摘要不应被纯消息正文覆盖');
assert.equal(preserved.lastMessagePreviewMode, 'custom', '自定义摘要来源标记应保留');

const nextMessage: Message = {
  id: 'msg-2',
  senderId: 'member-1',
  content: '新的普通消息',
  timestamp: 1710000001000,
  type: 'text'
};

const recomputed = syncContactPreviewFromMessages(groupContact, [lastMessage, nextMessage]);
assert.equal(recomputed.lastMessage, '新的普通消息', '最后一条消息变化后应恢复按消息内容重算摘要');
assert.equal(recomputed.lastMessagePreviewMode, 'message', '重算后的摘要应标记为普通消息摘要');
assert.equal(recomputed.lastMessageSourceId, 'msg-2', '重算后的摘要应记录最新消息来源');

console.log('测试通过：聊天列表会保留仍指向最后消息的自定义会话摘要。');
