import type { Contact, Message } from '../types';

export type WalletBankInfo = {
  name: string;
  last4: string;
};

export const buildProfilePlaceholder = (id: string | null | undefined, avatar: string): Contact => ({
  id: id || 'unknown',
  name: '加载中...',
  pinyin: '',
  avatar,
  unreadCount: 0
});

export const parseWalletBankInput = (raw: string, fallback: WalletBankInfo): WalletBankInfo => {
  const parts = raw.split(/[-\s]/).filter(Boolean);
  return {
    name: parts.slice(0, -1).join('') || fallback.name,
    last4: parts.slice(-1)[0] || fallback.last4
  };
};

export const buildOpeningLineMessage = (
  contactId: string,
  openingLine: string,
  idPrefix: string
): Message => ({
  id: `${idPrefix}-${Date.now()}`,
  senderId: contactId,
  content: openingLine,
  timestamp: Date.now(),
  type: 'text'
});

export const patchContactByLastMessage = (
  contact: Contact,
  contactId: string,
  content: string,
  timestamp: number
): Contact => {
  if (contact.id !== contactId) return contact;
  return {
    ...contact,
    unreadCount: (contact.unreadCount || 0) + 1,
    lastMessage: content,
    lastTime: timestamp
  };
};
