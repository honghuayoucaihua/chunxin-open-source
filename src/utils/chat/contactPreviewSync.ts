import type { Contact, Message } from '../../types';
import { getLastDisplayMessage, getMessagePreview } from './messagePreview.ts';

export const syncContactPreviewFromMessages = (contact: Contact, chatMessages: Message[]): Contact => {
  if (!chatMessages.length) return contact;
  const lastMessage = getLastDisplayMessage(chatMessages);
  if (contact.lastMessagePreviewMode === 'custom' && contact.lastMessageSourceId === lastMessage?.id) return contact;
  const preview = getMessagePreview(lastMessage);
  const lastTime = lastMessage?.timestamp;
  if (
    contact.lastMessage === preview
    && contact.lastTime === lastTime
    && contact.lastMessagePreviewMode === 'message'
    && contact.lastMessageSourceId === lastMessage?.id
  ) {
    return contact;
  }
  return {
    ...contact,
    lastMessage: preview,
    lastTime,
    lastMessagePreviewMode: 'message',
    lastMessageSourceId: lastMessage?.id
  };
};
