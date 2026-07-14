import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const bundledDir = join(tmpdir(), 'chunxin-payment-delete-tests');
mkdirSync(bundledDir, { recursive: true });
const entryFile = join(bundledDir, `paymentDelete-${Date.now()}.ts`);
const bundledFile = join(bundledDir, `paymentDelete-${Date.now()}.mjs`);
writeFileSync(entryFile, `
  export { handleDelete } from '${resolve('src/hooks/messageActions/messageOperations.ts').replace(/\\/g, '/')}';
  export { handleDeleteMultiple } from '${resolve('src/hooks/messageActions/batchActions.ts').replace(/\\/g, '/')}';
`);
await build({
  entryPoints: [entryFile],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundledFile,
  logLevel: 'silent'
});
const { handleDelete, handleDeleteMultiple } = await import(pathToFileURL(bundledFile).href);

type TestMessage = {
  id: string;
  senderId: string;
  content: string;
  timestamp: number;
  type: string;
  amount?: string;
  isOpened?: boolean;
  paymentStatus?: string;
  [key: string]: unknown;
};

type TestContact = {
  id: string;
  name: string;
  pinyin: string;
  avatar: string;
  unreadCount: number;
  balance?: number;
  lastMessage?: string;
  lastTime?: number;
  lastMessageSourceId?: string;
  [key: string]: unknown;
};

const createHarness = (
  chatId: string,
  initialMessages: TestMessage[],
  initialContactBalance: number,
  initialWalletBalance: number
) => {
  let messages: Record<string, TestMessage[]> = { [chatId]: initialMessages };
  let contacts: TestContact[] = [{
    id: chatId,
    name: '测试联系人',
    pinyin: '',
    avatar: '',
    unreadCount: 0,
    balance: initialContactBalance
  }];
  let walletBalance = initialWalletBalance;
  let userBalance = initialWalletBalance;
  const params = {
    messages,
    setMessages: (updater: any) => {
      messages = typeof updater === 'function' ? updater(messages) : updater;
      params.messages = messages;
    },
    setContacts: (updater: any) => {
      contacts = typeof updater === 'function' ? updater(contacts) : updater;
    },
    setWalletBalance: (updater: any) => {
      walletBalance = typeof updater === 'function' ? updater(walletBalance) : updater;
    },
    setUser: (updater: any) => {
      const nextUser = typeof updater === 'function'
        ? updater({
            name: '我',
            wechatId: 'me',
            avatar: '',
            gender: 'other',
            region: '',
            signature: '',
            momentsCover: '',
            balance: userBalance
          })
        : updater;
      userBalance = Number(nextUser.balance || 0);
    },
    applyContactBalanceDelta: (contactId: string | null | undefined, delta?: string | number) => {
      const parsed = Number(delta);
      contacts = contacts.map((contact) => (
        contact.id === contactId
          ? { ...contact, balance: Number(contact.balance || 0) + parsed }
          : contact
      ));
    },
    showToast: () => undefined
  };
  return {
    params,
    getMessages: () => messages,
    getContact: () => contacts[0],
    getWalletBalance: () => walletBalance,
    getUserBalance: () => userBalance
  };
};

{
  const harness = createHarness('friend-1', [
    { id: 'text-1', senderId: 'me', content: '先这样', timestamp: 1, type: 'text' },
    {
      id: 'pay-1',
      senderId: 'me',
      content: '转账 ¥9.00',
      amount: '9.00',
      timestamp: 2,
      type: 'transfer',
      isOpened: false,
      paymentStatus: 'pending'
    }
  ], 109, 91);

  handleDelete(harness.params, 'friend-1', harness.getMessages()['friend-1'][1]);

  assert.deepEqual(harness.getMessages()['friend-1'].map((message) => message.id), ['text-1']);
  assert.equal(harness.getWalletBalance(), 100);
  assert.equal(harness.getUserBalance(), 100);
  assert.equal(harness.getContact().balance, 100);
}

{
  const harness = createHarness('friend-2', [
    { id: 'text-2', senderId: 'me', content: '你好', timestamp: 1, type: 'text' },
    {
      id: 'pay-2',
      senderId: 'friend-2',
      content: '测试红包',
      amount: '8.00',
      timestamp: 2,
      type: 'redpacket',
      isOpened: false,
      paymentStatus: 'pending'
    }
  ], 92, 20);

  handleDelete(harness.params, 'friend-2', harness.getMessages()['friend-2'][1]);

  assert.deepEqual(harness.getMessages()['friend-2'].map((message) => message.id), ['text-2']);
  assert.equal(harness.getWalletBalance(), 20);
  assert.equal(harness.getUserBalance(), 20);
  assert.equal(harness.getContact().balance, 100);
}

{
  const harness = createHarness('friend-3', [
    { id: 'text-3', senderId: 'me', content: '重新整理', timestamp: 1, type: 'text' },
    {
      id: 'pay-3-user-pending',
      senderId: 'me',
      content: '转账 ¥6.00',
      amount: '6.00',
      timestamp: 2,
      type: 'transfer',
      isOpened: false,
      paymentStatus: 'pending'
    },
    {
      id: 'pay-3-ai-pending',
      senderId: 'friend-3',
      content: '测试红包',
      amount: '4.00',
      timestamp: 3,
      type: 'redpacket',
      isOpened: false,
      paymentStatus: 'pending'
    },
    {
      id: 'pay-3-received',
      senderId: 'me',
      content: '已收款转账',
      amount: '5.00',
      timestamp: 4,
      type: 'transfer',
      isOpened: true,
      paymentStatus: 'received'
    }
  ], 107, 89);

  handleDeleteMultiple(harness.params, 'friend-3', [
    'pay-3-user-pending',
    'pay-3-ai-pending',
    'pay-3-received'
  ]);

  assert.deepEqual(harness.getMessages()['friend-3'].map((message) => message.id), ['text-3']);
  assert.equal(harness.getWalletBalance(), 95);
  assert.equal(harness.getUserBalance(), 95);
  assert.equal(harness.getContact().balance, 105);
}

console.log('测试通过：删除未领取红包/转账会按方向回滚余额，已领取支付不会重复回滚。');
