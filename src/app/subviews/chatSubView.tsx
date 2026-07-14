import React from 'react';
import type { AISettings, AppearanceSettings, Contact, Message, QuotedMessageSnapshot, SoundVibrationSettings, SubView, UserProfile } from '../../types';
import { ReceiveRedPacketView, ReceiveTransferView } from '../lazyViews/chatPaymentLazyViews';
import { resolvePaymentStatus } from '../walletFlowUtils';

const ChatRoom = React.lazy(() => import('../../ChatRoom'));
const ChatRedPacketPreviewOverlay = React.lazy(() => import('../lazyViews/ChatRedPacketPreviewOverlay'));

type PaymentState = {
  chatId: string;
  msgId: string;
  type: 'redpacket' | 'transfer';
};

export type ChatSubView = Extract<SubView, 'chat'>;

type ChatSendOptions = {
  text?: string;
  append?: boolean;
  source?: 'manual' | 'generated' | 'storyAdvance' | 'storyInsight';
  inputKind?: 'chat' | 'story';
  descriptionInputKind?: 'say' | 'do';
  messageType?: 'text' | 'image';
  imageUrl?: string;
  imageCaption?: string;
};

type ChatSubViewParams = {
  subView: ChatSubView;
  currentChat: Contact | null;
  selectedContactId: string | null;
  user: UserProfile;
  contacts: Contact[];
  messages: Record<string, Message[]>;
  aiSettings: AISettings;
  buildRuntimePromptWithMemory?: (contact: Contact | undefined, limit?: number) => string;
  settings: AppearanceSettings;
  soundVibrationSettings: SoundVibrationSettings;
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  inputMode: 'text' | 'voice';
  setInputMode: React.Dispatch<React.SetStateAction<'text' | 'voice'>>;
  showPanel: 'emoji' | 'more' | 'none';
  setShowPanel: React.Dispatch<React.SetStateAction<'emoji' | 'more' | 'none'>>;
  typingContactIds: string[];
  enableSentenceSend: boolean;
  quotedMessage: QuotedMessageSnapshot | null;
  onCancelQuote: () => void;
  activePaymentMessage: PaymentState | null;
  setActivePaymentMessage: React.Dispatch<React.SetStateAction<PaymentState | null>>;
  showRedPacketPreview: boolean;
  setShowRedPacketPreview: React.Dispatch<React.SetStateAction<boolean>>;
  onSend: () => void;
  onSendWithOptions: (payload: ChatSendOptions) => Promise<void> | void;
  onGenerateReplies: (input: { inputKind?: 'chat' | 'story' }) => Promise<string[]>;
  onTempSend: () => void;
  onBack: () => void;
  onMore: () => void;
  onVoiceCallStateChange: (active: boolean) => void;
  hideHeaderAvatar: boolean;
  onAvatarClick: (id: string) => void;
  onSub: (sub: SubView) => void;
  onAction: (action: string, msgId: string, data?: unknown) => void;
  onPaymentClick: (msgId: string, type: 'redpacket' | 'transfer') => void;
  onAppendMessage: (message: Message) => void;
  onPat: (fromId: string, targetId: string) => void;
  onConfirmReceiveTransfer: (msg: Message) => void;
  onConfirmReceiveRedPacket: (msg: Message) => void;
  onInputFocusChange?: (focused: boolean) => void;
};

export const renderChatSubView = (params: ChatSubViewParams) => {
  if (!params.currentChat || !params.selectedContactId) return null;
  const currentChat = params.currentChat;
  const chatMessages = params.messages[params.selectedContactId] || [];

  return (
    <>
      <ChatRoom
        contact={currentChat}
        me={params.user}
        messages={chatMessages}
        settings={{ ...params.settings, chatBg: currentChat.chatBg || params.settings.chatBg }}
        vibrationEnabled={params.soundVibrationSettings.vibrationEnabled}
        inputValue={params.inputValue}
        setInputValue={params.setInputValue}
        inputMode={params.inputMode}
        setInputMode={params.setInputMode}
        showPanel={params.showPanel}
        setShowPanel={params.setShowPanel}
        onSend={params.onSend}
        onSendWithOptions={params.onSendWithOptions}
        isTyping={params.typingContactIds.includes(currentChat.id)}
        onGenerateReplies={params.onGenerateReplies}
        onTempSend={params.onTempSend}
        enableSentenceSend={params.enableSentenceSend}
        onBack={params.onBack}
        onMore={params.onMore}
        onVoiceCallStateChange={params.onVoiceCallStateChange}
        hideHeaderAvatar={params.hideHeaderAvatar}
        quotedMessage={params.quotedMessage}
        onCancelQuote={params.onCancelQuote}
        onAvatarClick={params.onAvatarClick}
        onSub={params.onSub}
        allContacts={params.contacts}
        onAction={params.onAction}
        onPaymentClick={params.onPaymentClick}
        onAppendMessage={params.onAppendMessage}
        onPat={params.onPat}
        onInputFocusChange={params.onInputFocusChange}
        useVisionModelForImages={params.aiSettings.provider !== 'builtin' && !!params.aiSettings.customModelSupportsImageRecognition}
        aiSettings={params.aiSettings}
        buildRuntimePromptWithMemory={params.buildRuntimePromptWithMemory}
      />
      {params.activePaymentMessage && params.activePaymentMessage.chatId === params.selectedContactId && (() => {
        const paymentMsg = (params.messages[params.selectedContactId] || []).find(message => message.id === params.activePaymentMessage!.msgId);
        if (!paymentMsg || paymentMsg.senderId === 'me') return null;
        const isPaymentReceived = resolvePaymentStatus(paymentMsg) === 'received';

        if (params.activePaymentMessage.type === 'transfer') {
          return (
            <ReceiveTransferView
              contact={currentChat}
              amount={String(paymentMsg.amount || '0')}
              isOpened={isPaymentReceived}
              onBack={() => params.setActivePaymentMessage(null)}
              onConfirm={() => params.onConfirmReceiveTransfer(paymentMsg)}
            />
          );
        }

        return (
          <>
            {params.showRedPacketPreview ? (
              <React.Suspense fallback={null}>
                <ChatRedPacketPreviewOverlay
                  contact={currentChat}
                  paymentMsg={paymentMsg}
                  previewBg={params.settings.redPacketPreviewBg}
                  onClose={() => {
                    params.setActivePaymentMessage(null);
                    params.setShowRedPacketPreview(false);
                  }}
                  onConfirm={() => params.onConfirmReceiveRedPacket(paymentMsg)}
                />
              </React.Suspense>
            ) : (
              <ReceiveRedPacketView
                contact={currentChat}
                amount={String(paymentMsg.amount || '0')}
                content={paymentMsg.content}
                isOpened={isPaymentReceived}
                showResultOnly
                receiverName={params.user.name || '我'}
                receiverAvatar={params.user.avatar || '/assets/image/user.png'}
                receivedTime={new Date(Number(paymentMsg.openedAt || paymentMsg.timestamp || Date.now())).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                onBack={() => {
                  params.setActivePaymentMessage(null);
                  params.setShowRedPacketPreview(false);
                }}
                onConfirm={() => {}}
              />
            )}
          </>
        );
      })()}
    </>
  );
};
