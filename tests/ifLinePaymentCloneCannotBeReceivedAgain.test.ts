import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const bundledDir = join(tmpdir(), 'chunxin-ifline-tests');
mkdirSync(bundledDir, { recursive: true });
const bundledFile = join(bundledDir, `batchActions-${Date.now()}.mjs`);
await build({
  entryPoints: [resolve('src/hooks/messageActions/batchActions.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundledFile,
  logLevel: 'silent'
});
const { handleIfLineMultiple } = await import(pathToFileURL(bundledFile).href);

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
  isAi?: boolean;
  isIfLine?: boolean;
  [key: string]: unknown;
};

let messages: Record<string, TestMessage[]> = {
  'friend-1': [
    {
      id: 'pay-1',
      senderId: 'friend-1',
      content: '测试红包',
      amount: '6.00',
      timestamp: 1,
      type: 'redpacket',
      isOpened: false,
      paymentStatus: 'pending'
    }
  ]
};
let contacts: TestContact[] = [
  {
    id: 'friend-1',
    name: '测试联系人',
    pinyin: '',
    avatar: '',
    unreadCount: 0,
    isAi: true
  }
];
let selectedContactId = 'friend-1';
const subViews = [];
const toasts = [];

handleIfLineMultiple({
  contacts,
  messages,
  setContacts: (updater) => {
    contacts = typeof updater === 'function' ? updater(contacts) : updater;
  },
  setMessages: (updater) => {
    messages = typeof updater === 'function' ? updater(messages) : updater;
  },
  setSelectedContactId: (updater) => {
    selectedContactId = typeof updater === 'function' ? updater(selectedContactId) : updater;
  },
  pushSubView: (subView) => {
    subViews.push(subView);
  },
  openPrompt: (_message, _defaultValue, onConfirm) => {
    onConfirm('测试分支');
  },
  showToast: (message) => {
    toasts.push(message);
  }
}, 'friend-1', messages['friend-1'], ['pay-1']);

const ifLineContact = contacts.find((contact) => contact.isIfLine);
assert.ok(ifLineContact);
const clonedPayment = messages[ifLineContact.id][0];
assert.notEqual(clonedPayment.id, 'pay-1');
assert.equal(clonedPayment.type, 'redpacket');
assert.equal(clonedPayment.senderId, 'friend-1');
assert.equal(clonedPayment.amount, '6.00');
assert.equal(clonedPayment.isOpened, false);
assert.equal(clonedPayment.paymentStatus, 'expired');
assert.equal(messages['friend-1'][0].paymentStatus, 'pending');
assert.equal(selectedContactId, ifLineContact.id);
assert.deepEqual(subViews, ['ifLine', 'chat']);
assert.deepEqual(toasts, ['正在跳转至if线']);

messages = {
  'friend-2': [
    {
      id: 'user-pay-1',
      senderId: 'me',
      content: '转账 ¥7.00',
      amount: '7.00',
      timestamp: 1,
      type: 'transfer',
      isOpened: false,
      paymentStatus: 'pending'
    }
  ]
};
contacts = [
  {
    id: 'friend-2',
    name: '测试联系人2',
    pinyin: '',
    avatar: '',
    unreadCount: 0,
    isAi: true
  }
];
selectedContactId = 'friend-2';
subViews.length = 0;
toasts.length = 0;

handleIfLineMultiple({
  contacts,
  messages,
  setContacts: (updater) => {
    contacts = typeof updater === 'function' ? updater(contacts) : updater;
  },
  setMessages: (updater) => {
    messages = typeof updater === 'function' ? updater(messages) : updater;
  },
  setSelectedContactId: (updater) => {
    selectedContactId = typeof updater === 'function' ? updater(selectedContactId) : updater;
  },
  pushSubView: (subView) => {
    subViews.push(subView);
  },
  openPrompt: (_message, _defaultValue, onConfirm) => {
    onConfirm('测试分支2');
  },
  showToast: (message) => {
    toasts.push(message);
  }
}, 'friend-2', messages['friend-2'], ['user-pay-1']);

const outgoingIfLineContact = contacts.find((contact) => contact.isIfLine);
assert.ok(outgoingIfLineContact);
const clonedOutgoingPayment = messages[outgoingIfLineContact.id][0];
assert.equal(clonedOutgoingPayment.senderId, 'me');
assert.equal(clonedOutgoingPayment.type, 'transfer');
assert.equal(clonedOutgoingPayment.amount, '7.00');
assert.equal(clonedOutgoingPayment.isOpened, false);
assert.equal(clonedOutgoingPayment.paymentStatus, 'expired');
assert.equal(messages['friend-2'][0].paymentStatus, 'pending');

console.log('测试通过：if线复制未领取红包/转账时不会生成可重复领取的新票据。');
