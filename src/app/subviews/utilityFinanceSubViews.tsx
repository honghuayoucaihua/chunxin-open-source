import React from 'react';
import type { Contact, Message, SubView, UserProfile } from '../../types';
import {
  EmojiGroupsView,
  FavoritesView,
  ImageLibraryGroupsView,
  MiniProgramsView,
  PayView,
  ReceivePayView,
  WalletTopUpView,
  WalletView,
  WalletWithdrawView
} from '../lazyViews/utilityFinanceLazyViews';

type WalletBank = {
  name: string;
  last4: string;
};

export type UtilityFinanceSubView = Extract<
  SubView,
  | 'pay'
  | 'receivePay'
  | 'wallet'
  | 'walletTopUp'
  | 'walletWithdraw'
  | 'miniprograms'
  | 'favorites'
  | 'emojiGroups'
  | 'imageLibraryGroups'
>;

type UtilityFinanceSubViewParams = {
  subView: UtilityFinanceSubView;
  goBackSubView: () => void;
  pushSubView: (sub: SubView) => void;
  walletBalance: number;
  walletBank: WalletBank;
  onEditWalletBank: (title: string) => void;
  onWalletTopUpConfirm: (amount: string | number) => void;
  onWalletWithdrawConfirm: (amount: string | number) => void;
  favorites: Message[];
  contacts: Contact[];
  user: UserProfile;
};

export const renderUtilityFinanceSubView = (params: UtilityFinanceSubViewParams) => {
  switch (params.subView) {
    case 'pay':
      return <PayView onBack={params.goBackSubView} onWallet={() => params.pushSubView('wallet')} onReceivePay={() => params.pushSubView('receivePay')} balance={params.walletBalance} />;
    case 'receivePay':
      return <ReceivePayView onBack={params.goBackSubView} />;
    case 'wallet':
      return (
        <WalletView
          balance={params.walletBalance}
          onBack={params.goBackSubView}
          onTopUp={() => params.pushSubView('walletTopUp')}
          onWithdraw={() => params.pushSubView('walletWithdraw')}
        />
      );
    case 'walletTopUp':
      return (
        <WalletTopUpView
          bankName={params.walletBank.name}
          bankLast4={params.walletBank.last4}
          onEditBank={() => params.onEditWalletBank('充值方式')}
          onBack={params.goBackSubView}
          onConfirm={params.onWalletTopUpConfirm}
        />
      );
    case 'walletWithdraw':
      return (
        <WalletWithdrawView
          balance={params.walletBalance}
          bankName={params.walletBank.name}
          bankLast4={params.walletBank.last4}
          onEditBank={() => params.onEditWalletBank('到账银行卡')}
          onBack={params.goBackSubView}
          onConfirm={params.onWalletWithdrawConfirm}
        />
      );
    case 'miniprograms':
      return <MiniProgramsView onBack={params.goBackSubView} />;
    case 'favorites':
      return <FavoritesView favorites={params.favorites} contacts={params.contacts} user={params.user} onBack={params.goBackSubView} />;
    case 'emojiGroups':
      return <EmojiGroupsView onBack={params.goBackSubView} />;
    case 'imageLibraryGroups':
      return <ImageLibraryGroupsView onBack={params.goBackSubView} />;
    default:
      return null;
  }
};
