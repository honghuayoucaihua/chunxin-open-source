import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const bundledDir = join(tmpdir(), 'chunxin-wallet-tests');
mkdirSync(bundledDir, { recursive: true });
const bundledFile = join(bundledDir, `wallet-action-handlers-${Date.now()}.mjs`);
await build({
  entryPoints: [resolve('src/app/walletActionHandlers.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundledFile,
  logLevel: 'silent'
});
const { buildWalletActionHandlers } = await import(pathToFileURL(bundledFile).href);

const noop = () => undefined;

const createHarness = (initialBalance = 10) => {
  let walletBalance = initialBalance;
  let userBalance = initialBalance;
  let backCount = 0;
  const handlers = buildWalletActionHandlers({
    walletBank: { name: '工商银行', last4: '4780' },
    openPrompt: noop,
    setWalletBank: noop,
    walletBalance,
    setWalletBalance: (updater: any) => {
      walletBalance = typeof updater === 'function' ? updater(walletBalance) : updater;
    },
    setUser: (updater: any) => {
      const nextUser = typeof updater === 'function'
        ? updater({ name: '我', balance: userBalance })
        : updater;
      userBalance = Number(nextUser.balance || 0);
    },
    selectedContactId: null,
    setMessages: noop,
    setContacts: noop,
    applyContactBalanceDelta: noop,
    goBackSubView: () => {
      backCount += 1;
    }
  });
  return {
    handlers,
    getWalletBalance: () => walletBalance,
    getUserBalance: () => userBalance,
    getBackCount: () => backCount
  };
};

const tinyTopUp = createHarness(10);
tinyTopUp.handlers.handleWalletTopUpConfirm(0.001);
assert.equal(tinyTopUp.getWalletBalance(), 10, '三位小数充值不应改动余额');
assert.equal(tinyTopUp.getUserBalance(), 10, '三位小数充值不应改动用户资料余额');
assert.equal(tinyTopUp.getBackCount(), 0, '无效充值不应返回上一页');

const exponentTopUp = createHarness(10);
exponentTopUp.handlers.handleWalletTopUpConfirm('1e3');
assert.equal(exponentTopUp.getWalletBalance(), 10, '科学计数法充值不应绕过金额格式校验');
assert.equal(exponentTopUp.getBackCount(), 0);

const preciseTopUp = createHarness(10);
preciseTopUp.handlers.handleWalletTopUpConfirm(1.23);
assert.equal(preciseTopUp.getWalletBalance(), 11.23);
assert.equal(preciseTopUp.getUserBalance(), 11.23);
assert.equal(preciseTopUp.getBackCount(), 1);

const tinyWithdraw = createHarness(10);
tinyWithdraw.handlers.handleWalletWithdrawConfirm(0.001);
assert.equal(tinyWithdraw.getWalletBalance(), 10, '三位小数提现不应改动余额');
assert.equal(tinyWithdraw.getBackCount(), 0, '无效提现不应返回上一页');

const exponentWithdraw = createHarness(2000);
exponentWithdraw.handlers.handleWalletWithdrawConfirm('1e3');
assert.equal(exponentWithdraw.getWalletBalance(), 2000, '科学计数法提现不应绕过金额格式校验');
assert.equal(exponentWithdraw.getBackCount(), 0);

const tooLargeWithdraw = createHarness(10);
tooLargeWithdraw.handlers.handleWalletWithdrawConfirm(10.01);
assert.equal(tooLargeWithdraw.getWalletBalance(), 10, '超出余额的提现不应改动余额');
assert.equal(tooLargeWithdraw.getBackCount(), 0);

const validWithdraw = createHarness(10);
validWithdraw.handlers.handleWalletWithdrawConfirm(2.5);
assert.equal(validWithdraw.getWalletBalance(), 7.5);
assert.equal(validWithdraw.getUserBalance(), 7.5);
assert.equal(validWithdraw.getBackCount(), 1);

const financeSource = readFileSync(new URL('../src/finance/FinanceSubPages.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(financeSource, /type="number"/, '充值/提现输入不应使用会接受科学计数法的 number 输入框');
assert.match(financeSource, /const canTopUp = parseWalletAmount\(amount\) !== null/, '充值按钮可用态应复用钱包金额校验');
assert.match(financeSource, /const canWithdraw = parsedAmount !== null && parsedAmount <= available/, '提现按钮可用态应复用钱包金额校验');

console.log('测试通过：充值/提现金额校验与钱包支付金额规则保持一致。');
