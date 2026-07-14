import type { Dispatch, SetStateAction } from 'react';
import type { AISettings, Contact, Message, QuotedMessageSnapshot, SubView, UserProfile } from '../types';
import {
  appendChatMessagesAndRefreshPreview,
  buildPatMessage,
  normalizeIncomingChatMessage,
  resolvePatContext
} from './chatMessageFlowUtils';
import { createQuotedMessageSnapshot } from '../utils/chat/messageQuote';
import { getAppendedMessageMemoryRecord } from '../utils/chat/appendedMessageMemory.ts';
import { canOpenIncomingPaymentMessage, getMessagePaymentAmount, markPaymentMessageOpened, resolvePaymentStatus } from './walletFlowUtils';

type PaymentType = 'redpacket' | 'transfer';
type ActivePayment = { chatId: string; msgId: string; type: PaymentType } | null;
type ChatOverrideText =
  | string
  | {
      text?: string;
      append?: boolean;
      source?: 'manual' | 'generated' | 'storyAdvance' | 'storyInsight';
      inputKind?: 'chat' | 'story';
      messageType?: 'text' | 'image';
      imageUrl?: string;
      imageCaption?: string;
    };

type BuildChatActionHandlersOptions = {
  inputValue: string;
  selectedContactId: string | null;
  quotedMessage: QuotedMessageSnapshot | null;
  setMessages: Dispatch<SetStateAction<Record<string, Message[]>>>;
  setContacts: Dispatch<SetStateAction<Contact[]>>;
  playSendSignal: () => void;
  setInputValue: Dispatch<SetStateAction<string>>;
  setQuotedMessage: Dispatch<SetStateAction<QuotedMessageSnapshot | null>>;
  setSelectedContactId: Dispatch<SetStateAction<string | null>>;
  goBackSubView: () => void;
  currentChat: Contact | undefined;
  pushSubView: (next: SubView) => void;
  setActiveVoiceCallContactId: Dispatch<SetStateAction<string | null>>;
  user: UserProfile;
  contacts: Contact[];
  setProfileSnapshot: Dispatch<SetStateAction<Contact | null>>;
  setProfileId: Dispatch<SetStateAction<string | null>>;
  messages: Record<string, Message[]>;
  setActivePaymentMessage: Dispatch<SetStateAction<ActivePayment>>;
  setShowRedPacketPreview: Dispatch<SetStateAction<boolean>>;
  updateMemoryWithAutoSummary: (
    contactId: string,
    text: string,
    source: 'user' | 'model',
    contactName: string,
    summaryThreshold?: number
  ) => void;
  resolveMemorySummaryThreshold: (contact?: Contact | null) => number;
  aiSettings: AISettings;
  handleSendMessage: (overrideText?: ChatOverrideText) => Promise<void>;
  applyWalletIncome: (amount?: string | number) => void;
  applyContactBalanceDelta: (contactId: string | null | undefined, delta?: string | number) => void;
  showToast: (message: string, duration?: number) => void;
};

const buildMeProfile = (user: UserProfile): Contact => ({
  id: 'me',
  name: user.name,
  pinyin: '',
  avatar: user.avatar,
  unreadCount: 0,
  wechatId: user.wechatId,
  signature: user.signature,
  region: user.region
});

const createTempMessage = (content: string, quotedMessage: Message | null): Message => ({
  id: Date.now().toString(),
  senderId: 'me',
  content,
  timestamp: Date.now(),
  type: 'text',
  quotedMsg: createQuotedMessageSnapshot(quotedMessage)
});

const findProfileById = (
  id: string,
  user: UserProfile,
  currentChat: Contact | undefined,
  contacts: Contact[]
): Contact | null => {
  if (id === 'me') return buildMeProfile(user);
  if (currentChat && currentChat.id === id) return currentChat;
  return contacts.find(contact => contact.id === id) || null;
};

const createHandleChatTempSend = (options: BuildChatActionHandlersOptions) => () => {
  const content = options.inputValue.trim();
  const chatId = options.selectedContactId;
  if (!content || !chatId) return;
  const tempMsg = createTempMessage(content, options.quotedMessage);
  appendChatMessagesAndRefreshPreview(options, chatId, [tempMsg]);
  options.playSendSignal();
  options.setInputValue('');
  if (options.quotedMessage) options.setQuotedMessage(null);
};

const createHandleChatBack = (options: BuildChatActionHandlersOptions) => () => {
  options.setSelectedContactId(null);
  options.goBackSubView();
};

const createHandleChatMore = (options: BuildChatActionHandlersOptions) => () => {
  if (!options.currentChat) return;
  options.pushSubView(options.currentChat.isGroup ? 'groupDetails' : 'chatDetails');
};

const createHandleChatVoiceCallStateChange = (options: BuildChatActionHandlersOptions) => (active: boolean) => {
  options.setActiveVoiceCallContactId(prev => {
    if (!options.selectedContactId) return active ? prev : null;
    if (active) return options.selectedContactId;
    return prev === options.selectedContactId ? null : prev;
  });
};

const createHandleChatAvatarClick = (options: BuildChatActionHandlersOptions) => (id: string) => {
  const nextProfile = findProfileById(id, options.user, options.currentChat, options.contacts);
  if (nextProfile) options.setProfileSnapshot(nextProfile);
  options.setProfileId(id);
  options.pushSubView('profile');
};

const createHandleChatPaymentClick = (options: BuildChatActionHandlersOptions) => (
  msgId: string,
  type: PaymentType
) => {
  if (!options.selectedContactId) return;
  const targetMsg = (options.messages[options.selectedContactId] || []).find((message) => message.id === msgId);
  if (!targetMsg || targetMsg.senderId === 'me' || targetMsg.type !== type) return;
  const paymentStatus = resolvePaymentStatus(targetMsg);
  if (paymentStatus !== 'pending' && paymentStatus !== 'received') return;
  if (paymentStatus === 'pending' && !canOpenIncomingPaymentMessage(targetMsg)) return;
  options.setActivePaymentMessage({ chatId: options.selectedContactId, msgId, type });
  if (type === 'redpacket') {
    options.setShowRedPacketPreview(paymentStatus === 'pending');
  }
};

const createHandleChatAppendMessage = (options: BuildChatActionHandlersOptions) => (message: Message) => {
  if (!options.selectedContactId) return;
  const normalizedMessage = normalizeIncomingChatMessage(message);
  appendChatMessagesAndRefreshPreview(options, options.selectedContactId, [normalizedMessage]);
  const memoryRecord = getAppendedMessageMemoryRecord(normalizedMessage);
  if (!memoryRecord) return;
  const selectedContact = options.currentChat || options.contacts.find((item) => item.id === options.selectedContactId);
  const contactName = selectedContact?.remark?.trim() || selectedContact?.name?.trim() || '';
  options.updateMemoryWithAutoSummary(
    options.selectedContactId,
    memoryRecord.text,
    memoryRecord.source,
    contactName,
    options.resolveMemorySummaryThreshold(selectedContact)
  );
};

const createHandleChatPat = (options: BuildChatActionHandlersOptions) => (fromId: string, targetId: string) => {
  if (!options.selectedContactId) return;
  const { fromName, targetName, fromPatDesc } = resolvePatContext(fromId, targetId, options.user, options.contacts);
  const patMsg = buildPatMessage({ fromId, fromName, targetName, fromPatDesc });
  appendChatMessagesAndRefreshPreview(options, options.selectedContactId, [patMsg]);
  if (fromId !== 'me') return;
  const patInput = `我拍了拍${targetName}${fromPatDesc ? `，${fromPatDesc}` : ''}`;
  if (!options.aiSettings.enableSentenceSend) {
    void options.handleSendMessage({ text: patInput, append: false });
  }
};

const applyReceivePayment = (
  options: BuildChatActionHandlersOptions,
  paymentMsg: Message,
  onAfter?: () => void
) => {
  if (!options.selectedContactId || paymentMsg.senderId === 'me') return;
  if (!canOpenIncomingPaymentMessage(paymentMsg)) return;
  const amount = getMessagePaymentAmount(paymentMsg);
  if (amount === null) return;
  const openedAt = Date.now();
  options.setMessages((prev) => ({
    ...prev,
    [options.selectedContactId!]: (prev[options.selectedContactId!] || []).map((item) => (
      item.id === paymentMsg.id ? markPaymentMessageOpened(item, openedAt) : item
    ))
  }));
  options.applyWalletIncome(amount);
  onAfter?.();
};

const createHandleConfirmReceiveTransfer = (options: BuildChatActionHandlersOptions) => (paymentMsg: Message) => {
  applyReceivePayment(options, paymentMsg, () => {
    options.setActivePaymentMessage(null);
    options.showToast('已确认收款');
  });
};

const createHandleConfirmReceiveRedPacket = (options: BuildChatActionHandlersOptions) => (paymentMsg: Message) => {
  applyReceivePayment(options, paymentMsg, () => {
    options.setShowRedPacketPreview(false);
    options.showToast('已领取红包');
  });
};

export const buildChatActionHandlers = (options: BuildChatActionHandlersOptions) => ({
  handleChatTempSend: createHandleChatTempSend(options),
  handleChatBack: createHandleChatBack(options),
  handleChatMore: createHandleChatMore(options),
  handleChatVoiceCallStateChange: createHandleChatVoiceCallStateChange(options),
  handleChatAvatarClick: createHandleChatAvatarClick(options),
  handleChatPaymentClick: createHandleChatPaymentClick(options),
  handleChatAppendMessage: createHandleChatAppendMessage(options),
  handleChatPat: createHandleChatPat(options),
  handleConfirmReceiveTransfer: createHandleConfirmReceiveTransfer(options),
  handleConfirmReceiveRedPacket: createHandleConfirmReceiveRedPacket(options)
});
