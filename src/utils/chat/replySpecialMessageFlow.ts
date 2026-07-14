import type { Contact, Message } from '../../types';
import { normalizeIncomingChatMessage } from '../../app/chatMessageFlowUtils';
import { summarizePaymentAmounts } from '../../app/walletFlowUtils';
import { appendDeliveredReplyMessages } from './replyDelivery';
import { scheduleReplyFollowup } from './replyMessageScheduler';

type SpecialMessageAppendParams = {
  setMessages: (updater: Record<string, Message[]> | ((prev: Record<string, Message[]>) => Record<string, Message[]>)) => void;
  setContacts: (updater: Contact[] | ((prev: Contact[]) => Contact[])) => void;
  applyContactBalanceDelta?: (contactId: string | null | undefined, delta?: string | number) => void;
  playReceiveSignal?: () => void;
};

type AppendReplySpecialMessagesOptions = {
  chatId: string;
  params: SpecialMessageAppendParams;
  specialMessagesPromise: Promise<Message[]>;
  mainQueueDelayMs?: number;
  shouldRun?: () => boolean;
  onSkipped?: () => void;
  onError?: (error: unknown) => void;
};

export const normalizeReplySpecialMessages = (messages: Message[]): Message[] => {
  return messages.map((item) => {
    if (item.senderId !== 'me' && (item.type === 'redpacket' || item.type === 'transfer')) {
      return normalizeIncomingChatMessage(item);
    }
    return item;
  });
};

export const appendReplySpecialMessages = async (
  options: AppendReplySpecialMessagesOptions
): Promise<void> => {
  try {
    const safeExtras = await options.specialMessagesPromise;
    const normalizedExtras = normalizeReplySpecialMessages(safeExtras);
    if (normalizedExtras.length === 0) return;

    const outgoingPaymentTotal = summarizePaymentAmounts(normalizedExtras);
    const appendExtras = () => {
      if (options.shouldRun && !options.shouldRun()) return;
      appendDeliveredReplyMessages(options.params, options.chatId, normalizedExtras);
      if (outgoingPaymentTotal > 0 && typeof options.params.applyContactBalanceDelta === 'function') {
        options.params.applyContactBalanceDelta(options.chatId, -outgoingPaymentTotal);
      }
    };

    scheduleReplyFollowup(
      options.mainQueueDelayMs && options.mainQueueDelayMs > 0 ? options.mainQueueDelayMs + 50 : 0,
      appendExtras,
      options.shouldRun,
      options.onSkipped
    );
  } catch (error) {
    options.onError?.(error);
  }
};
