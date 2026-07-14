import assert from 'node:assert/strict';
import {
  applyWalletDelta,
  buildOutgoingRedPacketMessage,
  buildOutgoingTransferMessage,
  canOpenIncomingPaymentMessage,
  formatWalletAmount,
  getMessagePaymentAmount,
  markPaymentMessageOpened,
  normalizePaymentMessage,
  resolvePaymentStatus,
  summarizePaymentAmounts,
  parseWalletAmount,
  parseWalletDelta
} from '../src/app/walletFlowUtils.ts';
import type { Message } from '../src/types/message.ts';

assert.equal(parseWalletAmount('12'), 12);
assert.equal(parseWalletAmount('12.3'), 12.3);
assert.equal(parseWalletAmount('.50'), 0.5);
assert.equal(parseWalletAmount('12.345'), null);
assert.equal(parseWalletAmount('1e3'), null);
assert.equal(parseWalletAmount('-1'), null);
assert.equal(parseWalletAmount('0'), null);
assert.equal(parseWalletAmount('1000000'), null);

assert.equal(parseWalletDelta('12.34'), 12.34);
assert.equal(parseWalletDelta('-12.34'), -12.34);
assert.equal(parseWalletDelta(0), 0);
assert.equal(parseWalletDelta('0.001'), null);
assert.equal(parseWalletDelta('1e3'), null);
assert.equal(parseWalletDelta('-1e3'), null);
assert.equal(parseWalletDelta('1000000'), null);

assert.equal(formatWalletAmount('12.3'), '12.30');
assert.equal(formatWalletAmount(0.1 + 0.2), '0.30');
assert.equal(applyWalletDelta(1, -2), 0);
assert.equal(applyWalletDelta(0.1, 0.2), 0.3);

const redPacket = buildOutgoingRedPacketMessage('8.8', '');
assert.equal(redPacket.amount, '8.80');
assert.equal(redPacket.content, '恭喜发财，大吉大利');
assert.equal(redPacket.isOpened, false);

const transfer = buildOutgoingTransferMessage('10');
assert.equal(transfer.amount, '10.00');
assert.equal(transfer.content, '转账 ¥10.00');

const incoming: Message = {
  id: 'pay-1',
  senderId: 'friend-1',
  content: '测试红包',
  amount: '6.66',
  timestamp: 1,
  type: 'redpacket',
  isOpened: false
};
assert.equal(getMessagePaymentAmount(incoming), 6.66);
assert.equal(canOpenIncomingPaymentMessage(incoming), true);
assert.equal(canOpenIncomingPaymentMessage({ ...incoming, senderId: 'me' }), false);
assert.equal(canOpenIncomingPaymentMessage({ ...incoming, amount: '6.666' }), false);
assert.equal(canOpenIncomingPaymentMessage({ ...incoming, isOpened: true }), false);
assert.equal(resolvePaymentStatus({ isOpened: false }), 'pending');
assert.equal(resolvePaymentStatus({ isOpened: true }), 'received');
assert.equal(resolvePaymentStatus({ paymentStatus: 'expired', isOpened: false }), 'expired');

const opened = markPaymentMessageOpened(incoming, 123);
assert.equal(opened.isOpened, true);
assert.equal(opened.openedAt, 123);
assert.equal(opened.paymentStatus, 'received');

const normalizedPending = normalizePaymentMessage({ ...incoming, amount: '7', isOpened: false });
assert.equal(normalizedPending.amount, '7.00');
assert.equal(normalizedPending.paymentStatus, 'pending');
assert.equal(normalizedPending.isOpened, false);

const normalizedLegacyOpened = normalizePaymentMessage({ ...incoming, amount: '8', isOpened: true });
assert.equal(normalizedLegacyOpened.amount, '8.00');
assert.equal(normalizedLegacyOpened.paymentStatus, 'received');
assert.equal(normalizedLegacyOpened.isOpened, true);

assert.equal(summarizePaymentAmounts([
  incoming,
  { ...incoming, id: 'pay-2', type: 'transfer', amount: '3.34' },
  { ...incoming, id: 'text-1', type: 'text', amount: '100' },
  { ...incoming, id: 'pay-bad', amount: '1.234' }
]), 10);

const characterPayments = [
  normalizePaymentMessage({ ...incoming, id: 'role-red', amount: '2' }),
  normalizePaymentMessage({ ...incoming, id: 'role-transfer', type: 'transfer', amount: '3.5' })
];
assert.equal(summarizePaymentAmounts(characterPayments), 5.5);
assert.deepEqual(characterPayments.map((message) => message.paymentStatus), ['pending', 'pending']);

console.log('测试通过：钱包支付金额与领取状态规则稳定。');
