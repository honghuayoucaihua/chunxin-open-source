import type { Contact, Message, ProactiveChatDraft } from '../types';
import { buildProactiveReply } from './proactiveChatHelpers';
import { normalizeProactiveReplyPayloadForContact, type ProactiveReplyPayload } from './proactiveReplyPayload.ts';
import { appendChatMessagesAndRefreshPreview } from '../app/chatMessageFlowUtils';
import { createReplyTaskLifecycleTracker, type ReplyTaskLifecycleTracker } from '../utils/chat/replyTaskState.ts';
import { captureRuntimeResetEpoch, isRuntimeResetEpochStale } from '../services/runtimeResetGuard.ts';
import { getAppendedMessageMemoryRecord } from '../utils/chat/appendedMessageMemory.ts';
import {
  PROACTIVE_DRAFT_BATCH_LIMIT,
  PROACTIVE_DRAFT_MAX_STOCK,
  PROACTIVE_DRAFT_TARGET_STOCK,
  PROACTIVE_DRAFT_TRIGGER_TEXT,
  PROACTIVE_DRAFT_TTL_MS,
  PROACTIVE_TRIGGER_TEXT,
  MAX_DRAFT_WARMUP_CONTACTS_PER_ROUND,
  getLastUserMessageAt,
  getWindowMs
} from './proactiveChatConfig';
import { getDraftContextKey, getValidDrafts } from './proactiveDraftContext';
import { canWarmupProactiveDraft, selectDueProactiveContacts } from './proactiveChatBudgetGuard.ts';
import type { ProactiveChatRuntimeArgs } from './proactiveChatTypes';

const getValidDraftsForContact = (
  args: ProactiveChatRuntimeArgs,
  contact: Contact,
  now: number
): ProactiveChatDraft[] => (
  getValidDrafts(contact, now, args.aiSettings, args.extraSystemPrompt, {
    user: args.user,
    masks: args.masks,
    contactMemories: args.contactMemories,
    worldBooks: args.worldBooks
  })
);

const appendProactiveMessage = (
  args: ProactiveChatRuntimeArgs,
  contact: Contact,
  replyPayload: ProactiveReplyPayload,
  proactiveAt: number,
  replyTaskTracker?: ReplyTaskLifecycleTracker
): boolean => {
  const normalizedPayload = normalizeProactiveReplyPayloadForContact(replyPayload, contact);
  if (!normalizedPayload) return false;
  const messageTimestamp = Date.now();
  const aiMsg: Message = {
    id: `${messageTimestamp}-auto-${contact.id}`,
    senderId: contact.id,
    content: normalizedPayload.text,
    timestamp: messageTimestamp,
    type: 'text',
    innerVoice: normalizedPayload.innerVoice,
    actionDesc: normalizedPayload.actionDesc,
    translatedContentZhCN: normalizedPayload.translatedContentZhCN
  };
  const isViewingCurrentChat = args.activeSubView === 'chat' && args.selectedContactId === contact.id;

  appendChatMessagesAndRefreshPreview(args, contact.id, [aiMsg], {
    updateContact: (item) => {
      const validDrafts = getValidDraftsForContact(args, item, messageTimestamp).filter((draft) => {
        const draftPayload = normalizeProactiveReplyPayloadForContact({
          text: draft.content,
          innerVoice: draft.innerVoice,
          actionDesc: draft.actionDesc,
          translatedContentZhCN: draft.translatedContentZhCN
        }, item);
        return draftPayload?.text !== normalizedPayload.text;
      });
      return {
        ...item,
        lastProactiveChatAt: proactiveAt,
        unreadCount: isViewingCurrentChat ? 0 : (item.unreadCount || 0) + 1,
        proactiveDrafts: validDrafts
      };
    }
  });
  args.playReceiveSignal?.();
  replyTaskTracker?.markMainDelivered('proactive_message_appended');

  const memorySummaryThreshold = args.resolveMemorySummaryThreshold(contact);
  const memoryRecord = getAppendedMessageMemoryRecord(aiMsg);
  if (memoryRecord) {
    args.updateMemoryWithAutoSummary(contact.id, memoryRecord.text, memoryRecord.source, contact.name, memorySummaryThreshold);
  }
  return true;
};

const cleanupExpiredDraftsRuntime = (args: ProactiveChatRuntimeArgs) => {
  const now = Date.now();
  args.setContacts((prev) => {
    let changed = false;
    const next = prev.map((contact) => {
      if (!contact.isAi || contact.isGroup) return contact;
      const validDrafts = getValidDraftsForContact(args, contact, now);
      const oldLen = Array.isArray(contact.proactiveDrafts) ? contact.proactiveDrafts.length : 0;
      if (oldLen === validDrafts.length) return contact;
      changed = true;
      return { ...contact, proactiveDrafts: validDrafts };
    });
    return changed ? next : prev;
  });
};

export const warmupDraftForContactRuntime = async (
  args: ProactiveChatRuntimeArgs,
  contact: Contact
): Promise<void> => {
  if (!contact.isAi || contact.isGroup || !contact.proactiveChatEnabled) return;
  if (args.draftRunningRef.current.has(contact.id)) return;
  const runtimeResetEpoch = captureRuntimeResetEpoch();
  args.draftRunningRef.current.add(contact.id);

  try {
    const now = Date.now();
    const validDrafts = getValidDraftsForContact(args, contact, now);
    const missing = Math.max(0, PROACTIVE_DRAFT_TARGET_STOCK - validDrafts.length);
    const planCount = Math.min(PROACTIVE_DRAFT_BATCH_LIMIT, missing);
    if (planCount <= 0) return;

    for (let index = 0; index < planCount; index++) {
      const replyPayload = await buildProactiveReply({
        contact,
        triggerText: PROACTIVE_DRAFT_TRIGGER_TEXT,
        useTypingIndicator: false,
        messages: args.messages,
        worldBooks: args.worldBooks,
        masks: args.masks,
        user: args.user,
        aiSettings: args.aiSettings,
        extraSystemPrompt: args.extraSystemPrompt,
        contactMemories: args.contactMemories,
        resolveContextLimit: args.resolveContextLimit,
        setTypingContactIds: args.setTypingContactIds
      });
      if (isRuntimeResetEpochStale(runtimeResetEpoch)) return;
      if (!replyPayload?.text) break;

      const generatedAt = Date.now();
      const draft: ProactiveChatDraft = {
        id: `${generatedAt}-draft-${contact.id}-${index}`,
        content: replyPayload.text,
        innerVoice: replyPayload.innerVoice,
        actionDesc: replyPayload.actionDesc,
        translatedContentZhCN: replyPayload.translatedContentZhCN,
        generatedAt,
        expiresAt: generatedAt + PROACTIVE_DRAFT_TTL_MS,
        contextKey: getDraftContextKey(contact, args.aiSettings, args.extraSystemPrompt, {
          user: args.user,
          masks: args.masks,
          contactMemories: args.contactMemories,
          worldBooks: args.worldBooks,
          now: generatedAt
        })
      };
      if (isRuntimeResetEpochStale(runtimeResetEpoch)) return;

      args.setContacts((prev) => prev.map((item) => {
        if (item.id !== contact.id) return item;
        const cleaned = getValidDraftsForContact(args, item, generatedAt);
        const merged = [...cleaned, draft]
          .sort((a, b) => Number(a.generatedAt || 0) - Number(b.generatedAt || 0))
          .slice(-PROACTIVE_DRAFT_MAX_STOCK);
        return { ...item, proactiveDrafts: merged };
      }));
    }
  } finally {
    args.draftRunningRef.current.delete(contact.id);
  }
};

const warmupDraftsRuntime = (args: ProactiveChatRuntimeArgs) => {
  const now = Date.now();
  const candidates = args.contacts
    .filter((contact) => contact.isAi && !contact.isGroup && !!contact.proactiveChatEnabled)
    .map((contact) => {
      const validDrafts = getValidDraftsForContact(args, contact, now);
      const shortage = Math.max(0, PROACTIVE_DRAFT_TARGET_STOCK - validDrafts.length);
      const dueAt = Math.max(
        getLastUserMessageAt(args.messages[contact.id] || []),
        Number(contact.lastProactiveChatAt || 0)
      ) + getWindowMs(contact);
      return { contact, shortage, dueAt };
    })
    .filter((item) => item.shortage > 0)
    .sort((a, b) => a.dueAt - b.dueAt)
    .slice(0, MAX_DRAFT_WARMUP_CONTACTS_PER_ROUND);

  candidates.forEach((item) => {
    if (!canWarmupProactiveDraft(args.draftWarmupAtRef.current, item.contact.id, now)) return;
    args.draftWarmupAtRef.current[item.contact.id] = now;
    void warmupDraftForContactRuntime(args, item.contact);
  });
};

export const triggerProactiveChatRuntime = async (
  args: ProactiveChatRuntimeArgs,
  contact: Contact
): Promise<void> => {
  if (!contact.isAi || contact.isGroup) return;
  if (args.proactiveRunningRef.current.has(contact.id)) return;
  const runtimeResetEpoch = captureRuntimeResetEpoch();
  args.proactiveRunningRef.current.add(contact.id);

  const proactiveAt = Date.now();
  const replyTaskTracker = createReplyTaskLifecycleTracker(proactiveAt, {
    chatId: contact.id,
    channel: 'proactive'
  });
  replyTaskTracker.markRunning('proactive_trigger_started');
  args.setContacts((prev) => prev.map((item) => (
    item.id === contact.id ? { ...item, lastProactiveChatAt: proactiveAt } : item
  )));

  try {
    const validDrafts = getValidDraftsForContact(args, contact, proactiveAt);
    const cachedDraft = validDrafts[0];
    if (isRuntimeResetEpochStale(runtimeResetEpoch)) {
      replyTaskTracker.markDroppedStale('proactive_after_runtime_reset');
      return;
    }
    if (cachedDraft?.content) {
      const cachedPayload = normalizeProactiveReplyPayloadForContact({
        text: cachedDraft.content,
        innerVoice: cachedDraft.innerVoice,
        actionDesc: cachedDraft.actionDesc,
        translatedContentZhCN: cachedDraft.translatedContentZhCN
      }, contact);
      if (cachedPayload) {
        appendProactiveMessage(args, contact, cachedPayload, proactiveAt, replyTaskTracker);
        replyTaskTracker.markCompleted('proactive_cached_draft_delivered');
        void warmupDraftForContactRuntime(args, contact);
        return;
      }
      args.setContacts((prev) => prev.map((item) => (
        item.id === contact.id
          ? { ...item, proactiveDrafts: (item.proactiveDrafts || []).filter((draft) => draft.id !== cachedDraft.id) }
          : item
      )));
    }

    const replyPayload = await buildProactiveReply({
      contact,
      triggerText: PROACTIVE_TRIGGER_TEXT,
      useTypingIndicator: true,
      messages: args.messages,
      worldBooks: args.worldBooks,
      masks: args.masks,
      user: args.user,
      aiSettings: args.aiSettings,
      extraSystemPrompt: args.extraSystemPrompt,
      contactMemories: args.contactMemories,
      resolveContextLimit: args.resolveContextLimit,
      setTypingContactIds: args.setTypingContactIds
    });
    if (isRuntimeResetEpochStale(runtimeResetEpoch)) {
      replyTaskTracker.markDroppedStale('proactive_after_runtime_reset');
      return;
    }
    if (!replyPayload?.text) {
      replyTaskTracker.markCancelled('proactive_empty_reply');
      args.showToast('主动联系失败，请检查网络或 AI 设置');
      return;
    }

    if (!appendProactiveMessage(args, contact, replyPayload, proactiveAt, replyTaskTracker)) {
      replyTaskTracker.markCancelled('proactive_empty_reply_after_normalize');
      return;
    }
    replyTaskTracker.markCompleted('proactive_ai_reply_delivered');
    void warmupDraftForContactRuntime(args, contact);
  } catch (error) {
    replyTaskTracker.markCancelled('proactive_runtime_error');
    console.error('[ProactiveChat] 主动联系出错:', error);
  } finally {
    args.proactiveRunningRef.current.delete(contact.id);
  }
};

export const runProactiveCheckRuntime = async (
  args: ProactiveChatRuntimeArgs
): Promise<void> => {
  const now = Date.now();
  cleanupExpiredDraftsRuntime(args);

  selectDueProactiveContacts(args, now).forEach((contact) => {
    void triggerProactiveChatRuntime(args, contact);
  });

  warmupDraftsRuntime(args);
};

export const pauseProactiveWarmupRuntime = async (
  args: ProactiveChatRuntimeArgs
): Promise<void> => {
  warmupDraftsRuntime(args);
};
