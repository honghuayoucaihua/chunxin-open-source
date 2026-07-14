import type { Message } from '../types';

const CURRENCY_DECIMALS = 2;
const MAX_WALLET_AMOUNT = 999999.99;
export type PaymentMessageType = Extract<Message['type'], 'redpacket' | 'transfer'>;
export type PaymentStatus = NonNullable<Message['paymentStatus']>;

const roundCurrency = (value: number): number =>
  Number(value.toFixed(CURRENCY_DECIMALS));

export const applyWalletDelta = (currentBalance: number, delta: number): number =>
  Math.max(0, roundCurrency(currentBalance + delta));

export const parseWalletAmount = (rawAmount: string): number | null => {
  const normalized = String(rawAmount || '').trim();
  if (!/^(?:\d+|\d+\.\d{1,2}|\.\d{1,2})$/.test(normalized)) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_WALLET_AMOUNT) return null;
  return roundCurrency(parsed);
};

export const parseWalletDelta = (rawDelta: string | number | undefined): number | null => {
  if (typeof rawDelta === 'number') {
    if (!Number.isFinite(rawDelta) || Math.abs(rawDelta) > MAX_WALLET_AMOUNT) return null;
    return roundCurrency(rawDelta);
  }
  const normalized = String(rawDelta ?? '').trim();
  if (!/^-?(?:\d+|\d+\.\d{1,2}|\.\d{1,2})$/.test(normalized)) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || Math.abs(parsed) > MAX_WALLET_AMOUNT) return null;
  return roundCurrency(parsed);
};

export const formatWalletAmount = (amount: string | number): string => {
  const parsed = typeof amount === 'number' ? amount : parseWalletAmount(amount);
  if (!Number.isFinite(Number(parsed)) || Number(parsed) <= 0) return '0.00';
  return roundCurrency(Number(parsed)).toFixed(CURRENCY_DECIMALS);
};

export const getMessagePaymentAmount = (message: Pick<Message, 'amount'>): number | null =>
  parseWalletAmount(String(message.amount ?? ''));

export const isPaymentMessageType = (type: Message['type']): type is PaymentMessageType =>
  type === 'redpacket' || type === 'transfer';

export const resolvePaymentStatus = (
  message: Pick<Message, 'paymentStatus' | 'isOpened'>
): PaymentStatus => {
  if (message.paymentStatus === 'received'
    || message.paymentStatus === 'refunded'
    || message.paymentStatus === 'expired'
    || message.paymentStatus === 'pending') {
    return message.paymentStatus;
  }
  return message.isOpened === true ? 'received' : 'pending';
};

export const normalizePaymentMessage = <T extends Message>(message: T): T => {
  if (!isPaymentMessageType(message.type)) return message;
  const amount = getMessagePaymentAmount(message);
  const paymentStatus = resolvePaymentStatus(message);
  return {
    ...message,
    amount: amount === null ? message.amount : formatWalletAmount(amount),
    paymentStatus,
    isOpened: paymentStatus === 'received'
  };
};

export const canOpenIncomingPaymentMessage = (
  message: Pick<Message, 'senderId' | 'type' | 'isOpened' | 'paymentStatus' | 'amount'>
): boolean => (
  message.senderId !== 'me'
  && isPaymentMessageType(message.type)
  && resolvePaymentStatus(message) === 'pending'
  && getMessagePaymentAmount(message) !== null
);

export const markPaymentMessageOpened = <T extends Message>(message: T, openedAt = Date.now()): T => ({
  ...message,
  isOpened: true,
  paymentStatus: 'received',
  openedAt
});

export const summarizePaymentAmounts = (messages: Message[]): number =>
  messages.reduce((total, message) => {
    if (!isPaymentMessageType(message.type)) return total;
    const amount = getMessagePaymentAmount(message);
    return amount === null ? total : roundCurrency(total + amount);
  }, 0);

const buildPaymentMessageBase = (input: {
  senderId: string;
  amount: string | number;
  content: string;
  type: PaymentMessageType;
}): Message => ({
  id: Date.now().toString(),
  senderId: input.senderId,
  content: input.content,
  amount: formatWalletAmount(input.amount),
  timestamp: Date.now(),
  type: input.type,
  isOpened: false,
  paymentStatus: 'pending'
});

export const buildOutgoingRedPacketMessage = (amount: string, message: string): Message =>
  buildPaymentMessageBase({
    senderId: 'me',
    content: message.trim() || '恭喜发财，大吉大利',
    amount,
    type: 'redpacket'
  });

export const buildOutgoingTransferMessage = (amount: string): Message =>
  buildPaymentMessageBase({
    senderId: 'me',
    content: `转账 ¥${formatWalletAmount(amount)}`,
    amount,
    type: 'transfer'
  });

export const buildOutgoingLocationMessage = (location: { name: string; address: string }): Message => ({
  id: Date.now().toString(),
  senderId: 'me',
  content: `${location.name}\n${location.address}`,
  locationName: location.name,
  locationAddress: location.address,
  timestamp: Date.now(),
  type: 'location'
});
