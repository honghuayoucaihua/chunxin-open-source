import type { Message } from '../../types/index.ts';
import { applyWalletDelta, getMessagePaymentAmount, isPaymentMessageType, resolvePaymentStatus } from '../../app/walletFlowUtils.ts';
import type { UseMessageActionsParams } from './types.ts';

const collectPendingPaymentMessages = (messages: Message[]): Message[] => messages.filter((message) => (
  isPaymentMessageType(message.type)
  && resolvePaymentStatus(message) === 'pending'
  && getMessagePaymentAmount(message) !== null
));

export const rollbackPendingPaymentEffects = (
  params: Pick<UseMessageActionsParams, 'setWalletBalance' | 'setUser' | 'applyContactBalanceDelta'>,
  selectedContactId: string,
  removedMessages: Message[]
) => {
  const pendingPayments = collectPendingPaymentMessages(removedMessages);
  if (pendingPayments.length === 0) return;

  const walletRefund = pendingPayments.reduce((total, message) => {
    if (message.senderId !== 'me') return total;
    const amount = getMessagePaymentAmount(message);
    return amount === null ? total : Number((total + amount).toFixed(2));
  }, 0);
  const contactDeltas = new Map<string, number>();
  pendingPayments.forEach((message) => {
    const amount = getMessagePaymentAmount(message);
    if (amount === null) return;
    const contactId = message.senderId === 'me' ? selectedContactId : message.senderId;
    const delta = message.senderId === 'me' ? -amount : amount;
    contactDeltas.set(contactId, Number(((contactDeltas.get(contactId) || 0) + delta).toFixed(2)));
  });

  if (walletRefund > 0 && params.setWalletBalance && params.setUser) {
    params.setWalletBalance((prev) => {
      const next = applyWalletDelta(prev, walletRefund);
      params.setUser?.((userPrev) => ({ ...userPrev, balance: next }));
      return next;
    });
  }
  if (typeof params.applyContactBalanceDelta === 'function') {
    contactDeltas.forEach((delta, contactId) => {
      params.applyContactBalanceDelta?.(contactId, delta);
    });
  }
};
