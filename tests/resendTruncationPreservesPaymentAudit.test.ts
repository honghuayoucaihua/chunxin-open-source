import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const bundledDir = join(tmpdir(), 'chunxin-resend-tests');
mkdirSync(bundledDir, { recursive: true });
const bundledFile = join(bundledDir, `resendFlow-${Date.now()}.mjs`);
await build({
  entryPoints: [resolve('src/hooks/messageActions/resendFlow.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundledFile,
  logLevel: 'silent'
});
const { handleResendFrom } = await import(pathToFileURL(bundledFile).href);

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
  lastMessage?: string;
  lastTime?: number;
  lastMessageSourceId?: string;
  [key: string]: unknown;
};

let messages: Record<string, TestMessage[]> = {
  'friend-1': [
    {
      id: 'user-1',
      senderId: 'me',
      content: '你好',
      timestamp: 1,
      type: 'text'
    },
    {
      id: 'pay-1',
      senderId: 'friend-1',
      content: '测试红包',
      amount: '9.00',
      timestamp: 2,
      type: 'redpacket',
      isOpened: false,
      paymentStatus: 'pending'
    },
    {
      id: 'text-2',
      senderId: 'friend-1',
      content: '后续回复',
      timestamp: 3,
      type: 'text'
    }
  ]
};
let contacts: TestContact[] = [{
  id: 'friend-1',
  name: '测试联系人',
  pinyin: '',
  avatar: '',
  unreadCount: 0,
  isAi: false,
  balance: 91,
  lastMessage: '后续回复',
  lastTime: 3
}];
let walletBalance = 19;
let userBalance = 19;

handleResendFrom({
  selectedContactId: 'friend-1',
  messages,
  favorites: [],
  contacts,
  aiSettings: {
    provider: 'builtin',
    apiKey: '',
    model: '',
    baseUrl: '',
    responseFormat: 'openai',
    enableDelayReply: false,
    enableSentenceSend: false,
    enableTimeAwareness: false,
    momentInteractionSource: 'none',
    minimaxTTS: {
      enabled: false,
      region: 'official',
      apiKey: '',
      groupId: '',
      model: ''
    }
  },
  worldBooks: [],
  masks: [],
  contactMemories: {},
  user: {
    name: '我',
    wechatId: 'me',
    avatar: '',
    gender: 'other',
    region: '',
    signature: '',
    momentsCover: ''
  },
  setMessages: (updater) => {
    messages = typeof updater === 'function' ? updater(messages) : updater;
  },
  setFavorites: () => undefined,
  setContacts: (updater) => {
    contacts = typeof updater === 'function' ? updater(contacts) : updater;
  },
  setWalletBalance: (updater) => {
    walletBalance = typeof updater === 'function' ? updater(walletBalance) : updater;
  },
  setUser: (updater) => {
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
  applyContactBalanceDelta: (contactId, delta) => {
    const parsed = Number(delta);
    contacts = contacts.map((contact) => (
      contact.id === contactId
        ? { ...contact, balance: Number(contact.balance || 0) + parsed }
        : contact
    ));
  },
  setSelectedContactId: () => undefined,
  pushSubView: () => undefined,
  setTypingContactIds: () => undefined,
  setQuotedMessage: () => undefined,
  setMoments: () => undefined,
  setOfficialArticles: () => undefined,
  setContactMemories: () => undefined,
  openPrompt: () => undefined,
  showToast: () => undefined
}, 'friend-1', 'user-1');

assert.deepEqual(messages['friend-1'].map((message) => message.id), ['user-1']);
assert.equal(walletBalance, 19);
assert.equal(userBalance, 19);
assert.equal(contacts[0].balance, 100);
assert.equal(contacts[0].lastMessage, '你好');
assert.equal(contacts[0].lastMessageSourceId, 'user-1');

messages = {
  'friend-2': [
    {
      id: 'user-2',
      senderId: 'me',
      content: '重新来',
      timestamp: 1,
      type: 'text'
    },
    {
      id: 'pay-2',
      senderId: 'me',
      content: '转账 ¥9.00',
      amount: '9.00',
      timestamp: 2,
      type: 'transfer',
      isOpened: false,
      paymentStatus: 'pending'
    }
  ]
};
contacts = [{
  id: 'friend-2',
  name: '测试联系人2',
  pinyin: '',
  avatar: '',
  unreadCount: 0,
  isAi: false,
  balance: 109,
  lastMessage: '[转账]',
  lastTime: 2
}];
walletBalance = 91;
userBalance = 91;

handleResendFrom({
  selectedContactId: 'friend-2',
  messages,
  favorites: [],
  contacts,
  aiSettings: {
    provider: 'builtin',
    apiKey: '',
    model: '',
    baseUrl: '',
    responseFormat: 'openai',
    enableDelayReply: false,
    enableSentenceSend: false,
    enableTimeAwareness: false,
    momentInteractionSource: 'none',
    minimaxTTS: {
      enabled: false,
      region: 'official',
      apiKey: '',
      groupId: '',
      model: ''
    }
  },
  worldBooks: [],
  masks: [],
  contactMemories: {},
  user: {
    name: '我',
    wechatId: 'me',
    avatar: '',
    gender: 'other',
    region: '',
    signature: '',
    momentsCover: '',
    balance: userBalance
  },
  setMessages: (updater) => {
    messages = typeof updater === 'function' ? updater(messages) : updater;
  },
  setFavorites: () => undefined,
  setContacts: (updater) => {
    contacts = typeof updater === 'function' ? updater(contacts) : updater;
  },
  setWalletBalance: (updater) => {
    walletBalance = typeof updater === 'function' ? updater(walletBalance) : updater;
  },
  setUser: (updater) => {
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
  applyContactBalanceDelta: (contactId, delta) => {
    const parsed = Number(delta);
    contacts = contacts.map((contact) => (
      contact.id === contactId
        ? { ...contact, balance: Number(contact.balance || 0) + parsed }
        : contact
    ));
  },
  setSelectedContactId: () => undefined,
  pushSubView: () => undefined,
  setTypingContactIds: () => undefined,
  setQuotedMessage: () => undefined,
  setMoments: () => undefined,
  setOfficialArticles: () => undefined,
  setContactMemories: () => undefined,
  openPrompt: () => undefined,
  showToast: () => undefined
}, 'friend-2', 'user-2');

assert.deepEqual(messages['friend-2'].map((message) => message.id), ['user-2']);
assert.equal(walletBalance, 100);
assert.equal(userBalance, 100);
assert.equal(contacts[0].balance, 100);
assert.equal(contacts[0].lastMessage, '重新来');
assert.equal(contacts[0].lastMessageSourceId, 'user-2');

console.log('测试通过：重发截断会删除后续支付消息并按方向回滚余额。');
