import type { Contact, Message, UserProfile } from '../types';
import { normalizePaymentMessage } from './walletFlowUtils.ts';
import { getLastDisplayMessage, getMessagePreview } from '../utils/chatHelpers.ts';

export const normalizeIncomingChatMessage = (message: Message): Message => {
  if (message.senderId !== 'me' && (message.type === 'redpacket' || message.type === 'transfer')) {
    return normalizePaymentMessage(message);
  }
  return message;
};

type SetState<T> = (updater: T | ((prev: T) => T)) => void;

type AppendChatMessagesOptions = {
  previewText?: string;
  previewTimestamp?: number;
  updateContact?: (contact: Contact) => Contact;
};

type AppendChatMessagesParams = {
  setMessages: SetState<Record<string, Message[]>>;
  setContacts: SetState<Contact[]>;
};

export const refreshConversationPreview = (
  params: Pick<AppendChatMessagesParams, 'setContacts'>,
  chatId: string,
  appendedMessages: Message[],
  options: AppendChatMessagesOptions = {}
) => {
  const lastMsg = getLastDisplayMessage(appendedMessages);
  if (!lastMsg && !options.previewText) return;
  const preview = options.previewText ?? getMessagePreview(lastMsg);
  const lastTime = options.previewTimestamp ?? lastMsg?.timestamp;
  params.setContacts((prev) => prev.map((contact) => {
    if (contact.id !== chatId) return contact;
    const next = {
      ...contact,
      lastMessage: preview,
      lastTime,
      lastMessagePreviewMode: options.previewText ? 'custom' as const : 'message' as const,
      lastMessageSourceId: lastMsg?.id
    };
    return options.updateContact ? options.updateContact(next) : next;
  }));
};

export const refreshConversationPreviewFromMessages = (
  params: Pick<AppendChatMessagesParams, 'setContacts'>,
  chatId: string,
  chatMessages: Message[]
) => {
  const lastMsg = getLastDisplayMessage(chatMessages);
  params.setContacts((prev) => prev.map((contact) => (
    contact.id === chatId
      ? {
          ...contact,
          lastMessage: getMessagePreview(lastMsg),
          lastTime: lastMsg?.timestamp,
          lastMessagePreviewMode: 'message',
          lastMessageSourceId: lastMsg?.id
        }
      : contact
  )));
};

export const appendChatMessagesAndRefreshPreview = (
  params: AppendChatMessagesParams,
  chatId: string,
  appendedMessages: Message[],
  options: AppendChatMessagesOptions = {}
) => {
  if (appendedMessages.length === 0) return;
  params.setMessages((prev) => ({
    ...prev,
    [chatId]: [...(prev[chatId] || []), ...appendedMessages]
  }));
  refreshConversationPreview(params, chatId, appendedMessages, options);
};

export const buildPatMessage = (input: {
  fromId: string;
  fromName: string;
  targetName: string;
  fromPatDesc: string;
}) => {
  const patText = input.fromPatDesc ? `「${input.fromPatDesc}」` : '';
  return {
    id: `pat-${Date.now()}`,
    senderId: input.fromId,
    content: `${input.fromName} 拍了拍 ${input.targetName}${patText ? ` ${patText}` : ''}`,
    timestamp: Date.now(),
    type: 'system' as const,
    pat: { fromId: input.fromId, fromName: input.fromName, targetName: input.targetName }
  };
};

export const resolvePatContext = (fromId: string, targetId: string, user: UserProfile, contacts: Contact[]) => {
  const fromName = fromId === 'me' ? user.name : (contacts.find(contact => contact.id === fromId)?.name || '对方');
  const targetName = targetId === 'me' ? user.name : (contacts.find(contact => contact.id === targetId)?.name || '对方');
  const fromPatDesc = fromId === 'me'
    ? (user.patDesc?.trim() || '')
    : (contacts.find(contact => contact.id === fromId)?.patDesc?.trim() || '');
  return { fromName, targetName, fromPatDesc };
};
