import type { Dispatch, SetStateAction } from 'react';
import type { Contact, Message, SubView, UserProfile } from '../types';
import { parseWalletBankInput } from './contactViewUtils';
import { applyWalletBalanceChange, runSendLocation, runSendRedPacket, runSendTransfer } from './walletActionFlow';
import { parseWalletAmount } from './walletFlowUtils';

type WalletBank = { name: string; last4: string };

type BuildWalletActionHandlersOptions = {
  walletBank: WalletBank;
  openPrompt: (message: string, defaultValue: string, onConfirm: (value?: string) => boolean | void, title?: string) => void;
  setWalletBank: Dispatch<SetStateAction<WalletBank>>;
  walletBalance: number;
  setWalletBalance: Dispatch<SetStateAction<number>>;
  setUser: Dispatch<SetStateAction<UserProfile>>;
  selectedContactId: string | null;
  setMessages: Dispatch<SetStateAction<Record<string, Message[]>>>;
  setContacts: Dispatch<SetStateAction<Contact[]>>;
  applyContactBalanceDelta: (contactId: string | null | undefined, delta?: string | number) => void;
  goBackSubView: () => void;
};

const createHandleEditWalletBank = (options: BuildWalletActionHandlersOptions) => (title: string) => {
  options.openPrompt(title, `${options.walletBank.name}-${options.walletBank.last4}`, (value) => {
    if (!value) return;
    options.setWalletBank(parseWalletBankInput(value, options.walletBank));
  });
};

const createHandleWalletTopUpConfirm = (options: BuildWalletActionHandlersOptions) => (amount: string | number) => {
  const parsedAmount = parseWalletAmount(String(amount));
  if (parsedAmount === null) return;
  applyWalletBalanceChange(options.walletBalance, parsedAmount, options.setWalletBalance, options.setUser);
  options.goBackSubView();
};

const createHandleWalletWithdrawConfirm = (options: BuildWalletActionHandlersOptions) => (amount: string | number) => {
  const parsedAmount = parseWalletAmount(String(amount));
  if (parsedAmount === null || parsedAmount > options.walletBalance) return;
  applyWalletBalanceChange(options.walletBalance, -parsedAmount, options.setWalletBalance, options.setUser);
  options.goBackSubView();
};

const createWalletActionContext = (options: BuildWalletActionHandlersOptions) => ({
  walletBalance: options.walletBalance,
  setWalletBalance: options.setWalletBalance,
  setUser: options.setUser,
  selectedContactId: options.selectedContactId,
  setMessages: options.setMessages,
  setContacts: options.setContacts,
  applyContactBalanceDelta: options.applyContactBalanceDelta,
  goBackSubView: options.goBackSubView
});

const createHandleSendRedPacket = (options: BuildWalletActionHandlersOptions) => (amount: string, message: string) => {
  runSendRedPacket(createWalletActionContext(options), amount, message);
};

const createHandleSendTransfer = (options: BuildWalletActionHandlersOptions) => (amount: string) => {
  runSendTransfer(createWalletActionContext(options), amount);
};

const createHandleSendLocation = (options: BuildWalletActionHandlersOptions) => (loc: { name: string; address: string }) => {
  runSendLocation({
    selectedContactId: options.selectedContactId,
    setMessages: options.setMessages,
    setContacts: options.setContacts,
    goBackSubView: options.goBackSubView
  }, loc);
};

export const buildWalletActionHandlers = (options: BuildWalletActionHandlersOptions) => ({
  handleEditWalletBank: createHandleEditWalletBank(options),
  handleWalletTopUpConfirm: createHandleWalletTopUpConfirm(options),
  handleWalletWithdrawConfirm: createHandleWalletWithdrawConfirm(options),
  handleSendRedPacket: createHandleSendRedPacket(options),
  handleSendTransfer: createHandleSendTransfer(options),
  handleSendLocation: createHandleSendLocation(options)
});
