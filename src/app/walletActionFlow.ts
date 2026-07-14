import type { Dispatch, SetStateAction } from 'react';
import type { Contact, Message, UserProfile } from '../types';
import { appendChatMessagesAndRefreshPreview } from './chatMessageFlowUtils';
import { applyWalletDelta, buildOutgoingLocationMessage, buildOutgoingRedPacketMessage, buildOutgoingTransferMessage, formatWalletAmount, parseWalletAmount } from './walletFlowUtils';
import { showWechatAlert } from '../utils/wechatDialog';

type WalletMessageMap = Record<string, Message[]>;

type WalletActionBaseContext = {
  selectedContactId: string | null;
  setMessages: Dispatch<SetStateAction<WalletMessageMap>>;
  setContacts: Dispatch<SetStateAction<Contact[]>>;
  goBackSubView: () => void;
};

type WalletPaymentActionContext = WalletActionBaseContext & {
  walletBalance: number;
  setWalletBalance: Dispatch<SetStateAction<number>>;
  setUser: Dispatch<SetStateAction<UserProfile>>;
  applyContactBalanceDelta: (contactId: string | null | undefined, delta?: string | number) => void;
};

type LocationPayload = {
  name: string;
  address: string;
};

export const applyWalletBalanceChange = (
  walletBalance: number,
  amount: number,
  setWalletBalance: Dispatch<SetStateAction<number>>,
  setUser: Dispatch<SetStateAction<UserProfile>>
): void => {
  const nextBalance = applyWalletDelta(walletBalance, amount);
  setWalletBalance(nextBalance);
  setUser((prev) => ({ ...prev, balance: nextBalance }));
};

export const showInsufficientWalletAlert = (): void => {
  showWechatAlert('零钱不足，请先充值');
};

export const showInvalidWalletAmountAlert = (): void => {
  showWechatAlert('请输入大于0且最多两位小数的金额');
};

export const runSendRedPacket = (params: WalletPaymentActionContext, amount: string, message: string): void => {
  if (!params.selectedContactId) return;
  const parsedAmount = parseWalletAmount(amount);
  if (parsedAmount === null) {
    showInvalidWalletAmountAlert();
    return;
  }
  if (params.walletBalance < parsedAmount) {
    showInsufficientWalletAlert();
    return;
  }
  applyWalletBalanceChange(params.walletBalance, -parsedAmount, params.setWalletBalance, params.setUser);
  const outgoing = buildOutgoingRedPacketMessage(String(parsedAmount), message);
  appendChatMessagesAndRefreshPreview(params, params.selectedContactId, [outgoing], {
    previewText: message.trim() || '红包'
  });
  params.applyContactBalanceDelta(params.selectedContactId, parsedAmount);
  params.goBackSubView();
};

export const runSendTransfer = (params: WalletPaymentActionContext, amount: string): void => {
  if (!params.selectedContactId) return;
  const parsedAmount = parseWalletAmount(amount);
  if (parsedAmount === null) {
    showInvalidWalletAmountAlert();
    return;
  }
  if (params.walletBalance < parsedAmount) {
    showInsufficientWalletAlert();
    return;
  }
  applyWalletBalanceChange(params.walletBalance, -parsedAmount, params.setWalletBalance, params.setUser);
  const outgoing = buildOutgoingTransferMessage(String(parsedAmount));
  appendChatMessagesAndRefreshPreview(params, params.selectedContactId, [outgoing], {
    previewText: `转账 ¥${formatWalletAmount(parsedAmount)}`
  });
  params.applyContactBalanceDelta(params.selectedContactId, parsedAmount);
  params.goBackSubView();
};

export const runSendLocation = (params: WalletActionBaseContext, location: LocationPayload): void => {
  const outgoing = buildOutgoingLocationMessage(location);
  if (params.selectedContactId) {
    appendChatMessagesAndRefreshPreview(params, params.selectedContactId, [outgoing], {
      previewText: `[位置] ${location.name}`
    });
  }
  params.goBackSubView();
};
