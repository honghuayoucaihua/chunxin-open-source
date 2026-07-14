import React from 'react';

export const SendRedPacketView = React.lazy(() => import('../../finance/FinanceSubPages').then((m) => ({ default: m.SendRedPacketView })));
export const TransferView = React.lazy(() => import('../../finance/FinanceSubPages').then((m) => ({ default: m.TransferView })));
export const ReceiveTransferView = React.lazy(() => import('../../finance/FinanceSubPages').then((m) => ({ default: m.ReceiveTransferView })));
export const ReceiveRedPacketView = React.lazy(() => import('../../finance/FinanceSubPages').then((m) => ({ default: m.ReceiveRedPacketView })));
export const SendLocationView = React.lazy(() => import('../../utils/UtilsSubPages').then((m) => ({ default: m.SendLocationView })));
