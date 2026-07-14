import type { Contact, Message } from '../../types';
import { getLastDisplayMessage, getMessagePreview } from './messagePreview.ts';
import { scheduleSequentialReplyItems } from './replyMessageScheduler.ts';

type SetState<T> = (updater: T | ((prev: T) => T)) => void;
type ShouldRun = () => boolean;

type DeliveryParams = {
  setMessages: SetState<Record<string, Message[]>>;
  setContacts?: SetState<Contact[]>;
  playReceiveSignal?: () => void;
};

type DeliveryOptions = {
  previewText?: string;
  previewTimestamp?: number;
  updateContact?: (contact: Contact) => Contact;
  refreshTimestamp?: boolean;
};

type ScheduledDeliveryOptions = {
  getDelayMs: (message: Message, index: number) => number;
  shouldRun?: ShouldRun;
  onSkippedMessage?: (message: Message, index: number) => void;
  getDeliveryOptions?: (message: Message, index: number) => DeliveryOptions | undefined;
};

const cloneDeliveredMessages = (
  messages: Message[],
  refreshTimestamp?: boolean
): Message[] => {
  if (!refreshTimestamp) return messages;
  const baseNow = Date.now();
  return messages.map((message, index) => ({
    ...message,
    timestamp: baseNow + index
  }));
};

const refreshDeliveredConversationPreview = (
  params: Pick<DeliveryParams, 'setContacts'>,
  chatId: string,
  deliveredMessages: Message[],
  options: DeliveryOptions = {}
): void => {
  if (!params.setContacts) return;
  const lastMessage = getLastDisplayMessage(deliveredMessages);
  if (!lastMessage && !options.previewText) return;
  const previewText = options.previewText ?? getMessagePreview(lastMessage);
  const previewTimestamp = options.previewTimestamp ?? lastMessage?.timestamp;
  params.setContacts((prev) => prev.map((contact) => {
    if (contact.id !== chatId) return contact;
    const nextContact = {
      ...contact,
      lastMessage: previewText,
      lastTime: previewTimestamp,
      lastMessagePreviewMode: options.previewText ? 'custom' as const : 'message' as const,
      lastMessageSourceId: lastMessage?.id
    };
    return options.updateContact ? options.updateContact(nextContact) : nextContact;
  }));
};

export const appendDeliveredReplyMessages = (
  params: DeliveryParams,
  chatId: string,
  messages: Message[],
  options: DeliveryOptions = {}
): Message[] => {
  if (messages.length === 0) return [];
  const deliveredMessages = cloneDeliveredMessages(messages, options.refreshTimestamp);
  params.setMessages((prev) => ({
    ...prev,
    [chatId]: [...(prev[chatId] || []), ...deliveredMessages]
  }));
  refreshDeliveredConversationPreview(params, chatId, deliveredMessages, options);
  params.playReceiveSignal?.();
  return deliveredMessages;
};

export const scheduleDeliveredReplyMessages = (
  params: DeliveryParams,
  chatId: string,
  messages: Message[],
  options: ScheduledDeliveryOptions
): number => {
  return scheduleSequentialReplyItems(messages, {
    getDelayMs: options.getDelayMs,
    shouldRun: options.shouldRun,
    onSkipped: options.onSkippedMessage,
    run: (message, index) => {
      appendDeliveredReplyMessages(
        params,
        chatId,
        [message],
        options.getDeliveryOptions?.(message, index) || { refreshTimestamp: true }
      );
    }
  });
};
