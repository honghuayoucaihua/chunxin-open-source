import React from 'react';

export const PayView = React.lazy(() => import('../../finance/FinanceSubPages').then((m) => ({ default: m.PayView })));
export const ReceivePayView = React.lazy(() => import('../../finance/FinanceSubPages').then((m) => ({ default: m.ReceivePayView })));
export const WalletView = React.lazy(() => import('../../finance/FinanceSubPages').then((m) => ({ default: m.WalletView })));
export const WalletTopUpView = React.lazy(() => import('../../finance/FinanceSubPages').then((m) => ({ default: m.WalletTopUpView })));
export const WalletWithdrawView = React.lazy(() => import('../../finance/FinanceSubPages').then((m) => ({ default: m.WalletWithdrawView })));
export const MiniProgramsView = React.lazy(() => import('../../utils/UtilsSubPages').then((m) => ({ default: m.MiniProgramsView })));
export const FavoritesView = React.lazy(() => import('../../utils/UtilsSubPages').then((m) => ({ default: m.FavoritesView })));
export const EmojiGroupsView = React.lazy(() => import('../../utils/UtilsSubPages').then((m) => ({ default: m.EmojiGroupsView })));
export const ImageLibraryGroupsView = React.lazy(() => import('../../utils/UtilsSubPages').then((m) => ({ default: m.ImageLibraryGroupsView })));
