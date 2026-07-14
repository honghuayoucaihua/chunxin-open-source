import { getGeminiChatReply } from '../../services/geminiServiceLoader';
import { parseGroupReplyMessages } from '../../utils/chat/groupReplyParser';
import { getGroupReplyMemoryText, getGroupReplyPreviewText } from '../../utils/chat/replyMessageScheduler';
import { scheduleSequentialReplyItems } from '../../utils/chat/replyMessageScheduler';
import { appendChatMessagesAndRefreshPreview } from '../../app/chatMessageFlowUtils';
import { scheduleMainReplyCompletion, withTypingContact } from '../../utils/chat/replyLifecycle';
import { buildGroupReplyRequestContext } from '../../utils/chat/groupReplyRequest';
import { createReplyTaskGuard } from '../../utils/chat/replyTaskVersion';
import { createReplyTaskLifecycleTracker } from '../../utils/chat/replyTaskState.ts';
import { captureRuntimeResetEpoch, isRuntimeResetEpochStale } from '../../services/runtimeResetGuard.ts';
import { getMessagePaymentAmount, isPaymentMessageType } from '../walletFlowUtils';
import type { ReplyTaskVersionRef } from '../../utils/chat/replyTaskVersion';
import type { Message } from '../../types';
import type { Contact, Mask, UserProfile, WorldBook, ContactMemories, AISettings } from '../../types';

type GroupChatFlowParams = {
  contacts: Contact[];
  messages: Record<string, Message[]>;
  aiSettings: AISettings;
  worldBooks: WorldBook[];
  masks: Mask[];
  user: UserProfile;
  contactMemories: ContactMemories;
  setTypingContactIds: React.Dispatch<React.SetStateAction<string[]>>;
  setMessages: React.Dispatch<React.SetStateAction<Record<string, Message[]>>>;
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  replyTaskVersionRef: ReplyTaskVersionRef;
  playReceiveSignal: () => void;
  updateMemoryWithAutoSummary: (
    contactId: string,
    text: string,
    source: 'user' | 'model' | 'system',
    contactName: string,
    threshold: number
  ) => void;
  warnAiContextRiskIfNeeded: (args: {
    personality: string;
    runtimeUserPrompt?: string;
    history: Array<{ role: 'user' | 'model'; text: string; imageUrl?: string }>;
  }) => Promise<void> | void;
  extraSystemPrompt?: string;
  applyContactBalanceDelta?: (contactId: string | null | undefined, delta?: string | number) => void;
};

const applyGroupPaymentDebit = (
  message: Message,
  applyContactBalanceDelta?: (contactId: string | null | undefined, delta?: string | number) => void
) => {
  if (message.senderId === 'me' || !isPaymentMessageType(message.type) || typeof applyContactBalanceDelta !== 'function') return;
  const amount = getMessagePaymentAmount(message);
  if (amount === null) return;
  applyContactBalanceDelta(message.senderId, -amount);
};

export async function handleGroupChatFlow(
  params: GroupChatFlowParams,
  contact: Contact,
  selectedContactId: string,
  text: string,
  historySeed: Message | null,
  contextLimit: number,
  memorySummaryThreshold: number,
  internalRuntimePrompt = ''
): Promise<void> {
  const replyTaskGuard = createReplyTaskGuard(params.replyTaskVersionRef, selectedContactId);
  const runtimeResetEpoch = captureRuntimeResetEpoch();
  const isReplyTaskCurrent = () => !isRuntimeResetEpochStale(runtimeResetEpoch) && replyTaskGuard.isCurrent();
  const replyTaskTracker = createReplyTaskLifecycleTracker(replyTaskGuard.version, {
    chatId: selectedContactId,
    channel: 'group_send'
  });
  const requestContext = await buildGroupReplyRequestContext({
    contact,
    historyMessages: (params.messages[selectedContactId] || [])
      .concat(historySeed || [])
      .slice(-contextLimit),
    contacts: params.contacts,
    contactMemories: params.contactMemories,
    worldBooks: params.worldBooks,
    masks: params.masks,
    user: params.user,
    aiSettings: params.aiSettings,
    extraSystemPrompt: params.extraSystemPrompt,
    internalRuntimePrompt,
    maxMessages: 4
  });
  if (!isReplyTaskCurrent()) {
    replyTaskTracker.markDroppedStale('group_send_before_request');
    return;
  }
  if (requestContext.members.length === 0) {
    replyTaskTracker.markCancelled('group_send_no_members');
    return;
  }
  await params.warnAiContextRiskIfNeeded({
    personality: requestContext.systemPrompt,
    runtimeUserPrompt: requestContext.runtimeUserPrompt,
    history: requestContext.history
  });
  if (!isReplyTaskCurrent()) {
    replyTaskTracker.markDroppedStale('group_send_before_request');
    return;
  }
  replyTaskTracker.markRunning('group_send_started');

  let groupReply = '';
  groupReply = await withTypingContact(params.setTypingContactIds, contact.id, () => getGeminiChatReply(
    requestContext.history,
    requestContext.systemPrompt,
    params.aiSettings,
    requestContext.runtimeUserPrompt
  ));
  if (!isReplyTaskCurrent()) {
    replyTaskTracker.markDroppedStale('group_send_after_reply');
    return;
  }

  if (historySeed) {
    params.updateMemoryWithAutoSummary(contact.id, text, 'user', contact.name, memorySummaryThreshold);
  }
  const aiMsgs = parseGroupReplyMessages(groupReply, {
    memberIds: requestContext.memberIds,
    maxMessages: 4,
    idPrefix: 'g',
    allowInner: requestContext.modePolicy.innerEnabled,
    allowAction: requestContext.modePolicy.actionEnabled,
    memberBalances: requestContext.memberBalances,
    memberVoiceEnabled: requestContext.memberVoiceEnabled,
    memberVoiceIds: requestContext.memberVoiceIds,
    allowSystemAbilities: requestContext.effectiveChatMode !== 'story'
  });
  if (aiMsgs.length > 0) {
    const mainQueueDelayMs = scheduleSequentialReplyItems(aiMsgs, {
      getDelayMs: (item) => 450 + Math.min(item.content.length * 25, 1000),
      shouldRun: isReplyTaskCurrent,
      onSkipped: () => {
        replyTaskTracker.markDroppedStale('group_send_delayed_delivery');
      },
      run: (item) => {
        const sender = params.contacts.find((x) => x.id === item.senderId);
        const senderName = sender?.remark?.trim() || sender?.name?.trim() || '群成员（未提供姓名）';
        appendChatMessagesAndRefreshPreview(params, selectedContactId, [item], {
          previewText: `${senderName}：${getGroupReplyPreviewText(item)}`,
          previewTimestamp: Date.now()
        });
        applyGroupPaymentDebit(item, params.applyContactBalanceDelta);
        params.playReceiveSignal?.();
      }
    });
    scheduleMainReplyCompletion(mainQueueDelayMs, () => {
      replyTaskTracker.markMainDelivered('group_send_delayed_delivery_complete');
      replyTaskTracker.markCompleted('group_send_memory_flushed');
      const memoryText = aiMsgs.map((msg) => getGroupReplyMemoryText(msg)).filter(Boolean).join('；').trim();
      if (memoryText) {
        params.updateMemoryWithAutoSummary(contact.id, memoryText, 'model', contact.name, memorySummaryThreshold);
      }
    }, isReplyTaskCurrent, () => {
      replyTaskTracker.markDroppedStale('group_send_main_completion');
    });
    return;
  }
  replyTaskTracker.markCompleted('group_send_empty_reply');
}
