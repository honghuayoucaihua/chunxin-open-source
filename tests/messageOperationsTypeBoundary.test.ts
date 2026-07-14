import assert from 'node:assert/strict';
import { handleEdit, handleSendEmoji } from '../src/hooks/messageActions/messageOperations.ts';
import type { Message } from '../src/types/index.ts';

{
  const targetMsg = {
    id: 'm1',
    senderId: 'me',
    type: 'text',
    content: { text: '旧对象正文不应进入编辑框' },
    timestamp: 1
  } as any as Message;
  const messages: Record<string, Message[]> = { c1: [targetMsg] };
  const toasts: string[] = [];
  let promptInitialValue: string | undefined;
  let promptSubmit: ((value: unknown) => boolean | void) | undefined;
  let setMessagesCalled = false;

  handleEdit({
    messages,
    setMessages: (updater: any) => {
      setMessagesCalled = true;
      Object.assign(messages, typeof updater === 'function' ? updater(messages) : updater);
    },
    setContacts: () => {},
    openPrompt: (_title: string, initialValue: string, onSubmit: (value: unknown) => boolean | void) => {
      promptInitialValue = initialValue;
      promptSubmit = onSubmit;
    },
    showToast: (message: string) => toasts.push(message)
  } as any, 'c1', targetMsg, 'm1', { field: 'content' });

  assert.equal(promptInitialValue, '', '编辑旧对象正文时不应把 [object Object] 放进输入框');
  assert.equal(promptSubmit?.({ text: '对象提交不应保存' }), false, '编辑提交对象值时应按空值拒收');
  assert.equal(setMessagesCalled, false, '对象提交不应写回消息');
  assert.deepEqual(toasts, ['正文至少需要 1 个字符']);

  assert.equal(promptSubmit?.('新的正文'), true, '正常字符串编辑仍应保存');
  assert.equal(messages.c1[0]?.content, '新的正文');
}

{
  const messages: Record<string, Message[]> = { c1: [] };
  const contacts = [{ id: 'c1', name: '联系人', lastMessage: '', unreadCount: 0 }] as any[];

  handleSendEmoji({
    setMessages: (updater: any) => {
      Object.assign(messages, typeof updater === 'function' ? updater(messages) : updater);
    },
    setContacts: (updater: any) => {
      const next = typeof updater === 'function' ? updater(contacts) : updater;
      contacts.splice(0, contacts.length, ...next);
    }
  } as any, 'c1', {
    id: { value: 'emoji-1' },
    desc: { text: '不应落地' },
    groupId: { value: 'group-1' }
  });

  assert.equal(messages.c1.length, 0, '对象型表情参数不应被强转成 [object Object] token 发出');

  handleSendEmoji({
    setMessages: (updater: any) => {
      Object.assign(messages, typeof updater === 'function' ? updater(messages) : updater);
    },
    setContacts: (updater: any) => {
      const next = typeof updater === 'function' ? updater(contacts) : updater;
      contacts.splice(0, contacts.length, ...next);
    }
  } as any, 'c1', {
    id: 'emoji-1',
    desc: '微笑',
    groupId: { value: 'group-1' }
  });

  assert.equal(messages.c1.length, 1);
  assert.equal(messages.c1[0]?.content, '[emoji:id=emoji-1;group=custom;desc=微笑]', '异常 groupId 应回退默认分组');
}

console.log('测试通过：消息编辑和表情发送不会把对象参数强转成可见内容。');
