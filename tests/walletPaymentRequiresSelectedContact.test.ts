import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

type PaymentAction = 'redpacket' | 'transfer';

const bundledDir = join(tmpdir(), 'chunxin-payment-tests');
mkdirSync(bundledDir, { recursive: true });
const bundledFile = join(bundledDir, `walletActionFlow-${Date.now()}.mjs`);
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
  let contacts = [];
  const contactDeltas = [];
  let backCount = 0;

  const params = {
    selectedContactId: null,
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
    getUserBalance: () => userBalance,
    getMessages: () => messages,
    getContactDeltas: () => contactDeltas,
    getBackCount: () => backCount
  };
};

const assertMissingContactDoesNotSpend = (action: PaymentAction) => {
  const harness = createHarness();
  if (action === 'redpacket') {
    runSendRedPacket(harness.params, '8', '测试红包');
  } else {
    runSendTransfer(harness.params, '8');
  }

  assert.equal(harness.getWalletBalance(), 100);
  assert.equal(harness.getUserBalance(), 100);
  assert.deepEqual(harness.getMessages(), {});
  assert.deepEqual(harness.getContactDeltas(), []);
  assert.equal(harness.getBackCount(), 0);
};

assertMissingContactDoesNotSpend('redpacket');
assertMissingContactDoesNotSpend('transfer');

console.log('测试通过：没有选中聊天对象时不会发起红包/转账扣款。');
