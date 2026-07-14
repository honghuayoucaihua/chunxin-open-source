import React from 'react';
import type { Contact, Message, SubView } from '../../types';
import { SendLocationView, SendRedPacketView, TransferView } from '../lazyViews/chatPaymentLazyViews';

export type ChatPaymentSubView = Extract<SubView, 'redPacket' | 'transfer' | 'sendLocation'>;

type ChatPaymentSubViewParams = {
  subView: ChatPaymentSubView;
  goBackSubView: () => void;
  selectedContactMessages: Message[];
  currentChat?: Contact;
  onSendRedPacket: (amount: string, message: string) => void;
  onSendTransfer: (amount: string) => void;
  onSendLocation: (location: { name: string; address: string }) => void;
};

const buildRecentLocations = (messages: Message[]) => {
  return messages
    .filter(message => message.type === 'location' && (message.locationName || message.content))
    .slice()
    .reverse()
    .filter((message, index, list) => {
      const name = message.locationName || message.content;
      const address = message.locationAddress || '';
      return list.findIndex(item => (item.locationName || item.content) === name && (item.locationAddress || '') === address) === index;
    })
    .slice(0, 8)
    .map(message => ({
      name: (message.locationName || message.content || '').trim(),
      address: (message.locationAddress || '').trim()
    }));
};

export const renderChatPaymentSubView = (params: ChatPaymentSubViewParams) => {
  switch (params.subView) {
    case 'redPacket':
      return <SendRedPacketView onBack={params.goBackSubView} onSend={params.onSendRedPacket} />;
    case 'transfer':
      return params.currentChat ? <TransferView contact={params.currentChat} onBack={params.goBackSubView} onSend={params.onSendTransfer} /> : null;
    case 'sendLocation':
      return <SendLocationView onBack={params.goBackSubView} recentLocations={buildRecentLocations(params.selectedContactMessages)} onSend={params.onSendLocation} />;
    default:
      return null;
  }
};
