import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const bundledDir = join(tmpdir(), 'chunxin-payment-tests');
mkdirSync(bundledDir, { recursive: true });
const bundledFile = join(bundledDir, `walletActionFlow-preview-${Date.now()}.mjs`);
await build({
  entryPoints: [resolve('src/app/walletActionFlow.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundledFile,
  logLevel: 'silent'
});
const { runSendRedPacket, runSendTransfer } = await import(pathToFileURL(bundledFile).href);

const createHarness = () => {
  let walletBalance = 100;
  let userBalance = 100;
  let messages = {};
  let contacts = [{
    id: 'friend-1',
    name: '测试联系人',
    pinyin: '',
    avatar: '',
    unreadCount: 0,
    lastMessage: ''
  }];
  let backCount = 0;
  const contactDeltas = [];

  const params = {
    selectedContactId: 'friend-1',
    walletBalance,
    setWalletBalance: (updater) => {
      walletBalance = typeof updater === 'function' ? updater(walletBalance) : updater;
    },
    setUser: (updater) => {
      const nextUser = typeof updater === 'function'
        ? updater({ name: '我', balance: userBalance })
        : updater;
      userBalance = Number(nextUser.balance || 0);
    },
    setMessages: (updater) => {
      messages = typeof updater === 'function' ? updater(messages) : updater;
    },
    setContacts: (updater) => {
      contacts = typeof updater === 'function' ? updater(contacts) : updater;
    },
    applyContactBalanceDelta: (contactId, delta) => {
      contactDeltas.push({ contactId, delta });
    },
    goBackSubView: () => {
      backCount += 1;
    }
  };

  return {
    params,
    getWalletBalance: () => walletBalance,
    getMessages: () => messages,
    getContacts: () => contacts,
    getContactDeltas: () => contactDeltas,
    getBackCount: () => backCount
  };
};

const redPacketHarness = createHarness();
runSendRedPacket(redPacketHarness.params, '5', '   ');
assert.equal(redPacketHarness.getWalletBalance(), 95);
assert.equal(redPacketHarness.getMessages()['friend-1'][0].content, '恭喜发财，大吉大利');
assert.equal(redPacketHarness.getContacts()[0].lastMessage, '红包');
assert.deepEqual(redPacketHarness.getContactDeltas(), [{ contactId: 'friend-1', delta: 5 }]);
assert.equal(redPacketHarness.getBackCount(), 1);

const transferHarness = createHarness();
runSendTransfer(transferHarness.params, '.5');
assert.equal(transferHarness.getWalletBalance(), 99.5);
assert.equal(transferHarness.getMessages()['friend-1'][0].content, '转账 ¥0.50');
assert.equal(transferHarness.getContacts()[0].lastMessage, '转账 ¥0.50');
assert.deepEqual(transferHarness.getContactDeltas(), [{ contactId: 'friend-1', delta: 0.5 }]);
assert.equal(transferHarness.getBackCount(), 1);

console.log('测试通过：红包/转账会话预览与实际支付消息保持一致。');
