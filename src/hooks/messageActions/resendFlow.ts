import { Contact, Message } from '../../types';
import { getGeminiChatReply } from '../../services/geminiServiceLoader';
import { getLastDisplayMessage, getMessagePreview, parseAIReply } from '../../utils/chatHelpers';
import { UseMessageActionsParams } from './types';
import { buildSpecialMessages, hasBlockedPaymentSpecialIntent, hasLandableSpecialMessageIntent } from '../../app/sendMessage/specialMessages';
import {
  applyChatModePolicy,
  filterOrderedSegmentsForPolicy,
  getChatModePolicy,
  getMessageTextForPolicy
} from '../../utils/chat/chatModePolicy';
import { refreshConversationPreviewFromMessages } from '../../app/chatMessageFlowUtils';
import { getMessagePaymentAmount, isPaymentMessageType } from '../../app/walletFlowUtils';
import {
  clampOrderedTextSegmentCountWithinSentenceRange,
  collectReplySentenceCandidates,
  normalizeSentenceRange,
  selectReplySentencePiecesWithinRange
} from '../../utils/sentenceRange';
import {
  clipActionDescForContact,
  clipInnerVoiceForContact
} from '../../utils/chat/contactReplyLimits';
import { parseGroupReplyMessages } from '../../utils/chat/groupReplyParser';
import { createReplyTaskGuard } from '../../utils/chat/replyTaskVersion';
import { createReplyTaskLifecycleTracker } from '../../utils/chat/replyTaskState.ts';
import { getGroupReplyMemoryText, getGroupReplyPreviewText } from '../../utils/chat/replyMessageScheduler';
import { appendReplySpecialMessages } from '../../utils/chat/replySpecialMessageFlow';
import { captureRuntimeResetEpoch, isRuntimeResetEpochStale } from '../../services/runtimeResetGuard.ts';
import {
  getReplyMemoryText,
  scheduleMainReplyCompletion,
  withTypingContact
} from '../../utils/chat/replyLifecycle';
import { appendDeliveredReplyMessages, scheduleDeliveredReplyMessages } from '../../utils/chat/replyDelivery';
import { scheduleSequentialReplyItems } from '../../utils/chat/replyMessageScheduler';
import { appendMemoryEntriesWithAutoSummary } from '../../utils/chat/replyMemory';
import { buildSingleReplyRequestContext } from '../../utils/chat/singleReplyRequest';
import { buildGroupReplyRequestContext } from '../../utils/chat/groupReplyRequest';
import { buildReplyFormatRetryRuntimePrompt } from '../../utils/chat/replyFormatRetry';
import { normalizeGeneratedStrictNonSystemEventText } from '../../utils/generatedVisibleText.ts';
import { rollbackPendingPaymentEffects } from './paymentRollback';
import {
  buildDialogueTurnMessages,
  hasLandableSingleReplyContent,
  buildMetaOnlyReplyMessage,
  buildOrderedSequenceMessages,
  buildPlainReplyMessages,
  normalizeSingleReplyStructures
} from '../../utils/chat/singleReplyMessageBuilder';
import type { AISpecial, AIQuote } from '../../utils/chat/aiReplyParser';

type ParsedResendReply = {
  text: string;
  innerVoice?: string;
  actionDesc?: string;
  statusUpdate?: string;
  patDescUpdate?: string;
  sentences: string[];
  specials?: AISpecial[];
  quote?: AIQuote | null;
  translatedContentZhCN?: string;
  translatedSentencesZhCN?: string[];
  dialogueTurns?: unknown;
  orderedSegments?: unknown;
};

const parseSingleResendReply = (
  rawReply: string,
  modePolicy: ReturnType<typeof getChatModePolicy>,
  effectiveChatMode: string,
  contact: Contact
): ParsedResendReply => {
  const parsed = parseAIReply(
    String(rawReply || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
    modePolicy.innerEnabled,
    modePolicy.actionEnabled,
    { allowSocial: !contact.isGroup, requireStructured: true, allowStoryTags: effectiveChatMode === 'story', acceptPlainText: true }
  ) as ParsedResendReply;
  parsed.text = normalizeGeneratedStrictNonSystemEventText(parsed.text, { collapseWhitespace: true });
  parsed.sentences = (parsed.sentences || [])
    .map((item) => normalizeGeneratedStrictNonSystemEventText(item, { collapseWhitespace: true }))
    .filter(Boolean);
  return parsed;
};

const buildResendTruncatedMessages = (chatMsgs: Message[], index: number): Message[] =>
  chatMsgs.slice(0, index + 1);

export const handleResendFrom = (
  params: UseMessageActionsParams,
  selectedContactId: string,
  msgId: string
) => {
  const replyTaskGuard = createReplyTaskGuard(params.replyTaskVersionRef, selectedContactId, { bump: true });
  const runtimeResetEpoch = captureRuntimeResetEpoch();
  const isReplyTaskCurrent = () => !isRuntimeResetEpochStale(runtimeResetEpoch) && replyTaskGuard.isCurrent();
  const replyTaskTracker = createReplyTaskLifecycleTracker(replyTaskGuard.version, {
    chatId: selectedContactId,
    channel: 'resend'
  });
  const chatMsgs = params.messages[selectedContactId] || [];
  const idx = chatMsgs.findIndex(m => m.id === msgId);
  if (idx === -1) return;
  const removedMessages = chatMsgs.slice(idx + 1);
  const truncated = buildResendTruncatedMessages(chatMsgs, idx);
  rollbackPendingPaymentEffects(params, selectedContactId, removedMessages);
  params.setMessages(prev => ({ ...prev, [selectedContactId]: truncated }));
  refreshConversationPreviewFromMessages(params, selectedContactId, truncated);
  const contact = params.contacts.find(c => c.id === selectedContactId);
  if (!contact?.isAi) return;

  setTimeout(async () => {
    try {
      if (!isReplyTaskCurrent()) {
        replyTaskTracker.markDroppedStale('resend_before_restart');
        return;
      }
      replyTaskTracker.markRunning('resend_restart_started');

      if (contact.isGroup) {
        handleGroupResend(params, selectedContactId, contact, truncated, isReplyTaskCurrent, replyTaskTracker);
        return;
      }

      handleSingleResend(params, selectedContactId, contact, truncated, isReplyTaskCurrent, replyTaskTracker);
    } catch (error: unknown) {
      if (!isReplyTaskCurrent()) return;
      console.error('[useMessageActions] AI resend failed:', error);
      params.showToast(error instanceof Error ? error.message || 'AI 回复失败' : 'AI 回复失败');
    }
  }, 0);
};

const handleGroupResend = async (
  params: UseMessageActionsParams,
  selectedContactId: string,
  contact: Contact,
  truncated: Message[],
  isReplyTaskCurrent: () => boolean,
  replyTaskTracker: ReturnType<typeof createReplyTaskLifecycleTracker>
) => {
  const requestContext = await buildGroupReplyRequestContext({
    contact,
    historyMessages: truncated,
    contacts: params.contacts,
    contactMemories: params.contactMemories,
    worldBooks: params.worldBooks,
    masks: params.masks,
    user: params.user,
    aiSettings: params.aiSettings,
    extraSystemPrompt: params.extraSystemPrompt,
    usePolicyHistory: true,
    maxMessages: 4
  });
  if (!isReplyTaskCurrent()) {
    replyTaskTracker.markDroppedStale('group_resend_before_request');
    return;
  }
  if (requestContext.members.length === 0) return;
  await params.warnAiContextRiskIfNeeded?.({
    personality: requestContext.systemPrompt,
    runtimeUserPrompt: requestContext.runtimeUserPrompt,
    history: requestContext.history
  });
  if (!isReplyTaskCurrent()) {
    replyTaskTracker.markDroppedStale('group_resend_before_request');
    return;
  }

  let groupReply = '';
  groupReply = await withTypingContact(params.setTypingContactIds, contact.id, () => getGeminiChatReply(
    requestContext.history,
    requestContext.systemPrompt,
    params.aiSettings,
    requestContext.runtimeUserPrompt
  ));
  if (!isReplyTaskCurrent()) {
    replyTaskTracker.markDroppedStale('group_resend_after_reply');
    return;
  }

  const aiMsgs = parseGroupReplyMessages(groupReply, {
    memberIds: requestContext.memberIds,
    maxMessages: 4,
    idPrefix: 'gr',
    allowInner: requestContext.modePolicy.innerEnabled,
    allowAction: requestContext.modePolicy.actionEnabled,
    memberBalances: requestContext.memberBalances,
    memberVoiceEnabled: requestContext.memberVoiceEnabled,
    memberVoiceIds: requestContext.memberVoiceIds,
    allowSystemAbilities: requestContext.effectiveChatMode !== 'story'
  });
  if (aiMsgs.length > 0) {
    const mainQueueDelayMs = scheduleSequentialReplyItems(aiMsgs, {
      getDelayMs: (msg) => 450 + Math.min(msg.content.length * 25, 1000),
      shouldRun: isReplyTaskCurrent,
      onSkipped: () => {
        replyTaskTracker.markDroppedStale('group_resend_delayed_delivery');
      },
      run: (msg) => {
        const sender = params.contacts.find(c => c.id === msg.senderId);
        const senderName = sender?.remark?.trim() || sender?.name?.trim() || '群成员（未提供姓名）';
        appendDeliveredReplyMessages(params, selectedContactId, [msg], {
          previewText: `${senderName}：${getGroupReplyPreviewText(msg)}`,
          previewTimestamp: Date.now(),
          refreshTimestamp: true
        });
        if (msg.senderId !== 'me' && isPaymentMessageType(msg.type) && typeof params.applyContactBalanceDelta === 'function') {
          const amount = getMessagePaymentAmount(msg);
          if (amount !== null) params.applyContactBalanceDelta(msg.senderId, -amount);
        }
      }
    });
    scheduleMainReplyCompletion(mainQueueDelayMs, () => {
      replyTaskTracker.markCompleted('group_resend_memory_flushed');
      const contactName = contact.remark?.trim() || contact.name;
      const memoryText = aiMsgs
        .map(item => getGroupReplyMemoryText(item))
        .filter(Boolean)
        .join('；');
      appendMemoryEntriesWithAutoSummary({
        contactId: contact.id,
        texts: [memoryText],
        source: 'model',
        contactName,
        threshold: contact.memorySummaryThreshold,
        contactMemories: params.contactMemories,
        aiSettings: params.aiSettings,
        setContactMemories: params.setContactMemories,
        errorLogScope: '[useMessageActions]'
      });
    }, isReplyTaskCurrent, () => {
      replyTaskTracker.markDroppedStale('group_resend_main_completion');
    });
  }
};

const handleSingleResend = async (
  params: UseMessageActionsParams,
  selectedContactId: string,
  contact: Contact,
  truncated: Message[],
  isReplyTaskCurrent: () => boolean,
  replyTaskTracker: ReturnType<typeof createReplyTaskLifecycleTracker>
) => {
  const history = truncated.filter(Boolean);
  const requestContext = await buildSingleReplyRequestContext({
    contact,
    historyMessages: history,
    contactMemories: params.contactMemories,
    worldBooks: params.worldBooks,
    masks: params.masks,
    user: params.user,
    aiSettings: params.aiSettings,
    extraSystemPrompt: params.extraSystemPrompt
  });
  if (!isReplyTaskCurrent()) {
    replyTaskTracker.markDroppedStale('single_resend_before_request');
    return;
  }
  const modePolicy = requestContext.modePolicy;
  const effectiveChatMode = requestContext.effectiveChatMode;
  await params.warnAiContextRiskIfNeeded?.({
    personality: requestContext.systemPrompt,
    runtimeUserPrompt: requestContext.runtimeUserPrompt,
    history: requestContext.history
  });
  if (!isReplyTaskCurrent()) {
    replyTaskTracker.markDroppedStale('single_resend_before_request');
    return;
  }
  let reply = '';
  reply = await withTypingContact(params.setTypingContactIds, contact.id, () => getGeminiChatReply(
    requestContext.history,
    requestContext.systemPrompt,
    params.aiSettings,
    requestContext.runtimeUserPrompt
  ));
  if (!isReplyTaskCurrent()) {
    replyTaskTracker.markDroppedStale('single_resend_after_reply');
    return;
  }
  const userTexts = truncated
    .filter(m => m.senderId === 'me')
    .slice(-6)
    .map(m => getMessageTextForPolicy(m, modePolicy))
    .filter(Boolean);
  const contactName = contact.remark?.trim() || contact.name;
  appendMemoryEntriesWithAutoSummary({
    contactId: contact.id,
    texts: userTexts,
    source: 'user',
    contactName,
    threshold: contact.memorySummaryThreshold,
    contactMemories: params.contactMemories,
    aiSettings: params.aiSettings,
    setContactMemories: params.setContactMemories,
    errorLogScope: '[useMessageActions]'
  });
  const specialRuntimeParams = {
    user: params.user,
    aiSettings: params.aiSettings,
    htmlTemplates: params.htmlTemplates || [],
    setMoments: params.setMoments as unknown as (updater: (prev: import('../../types').Moment[]) => import('../../types').Moment[]) => void,
    setOfficialArticles: params.setOfficialArticles as unknown as (updater: (prev: Array<{ id: string; title: string; desc: string; thumb: string; author: string; avatar: string; time: number }>) => Array<{ id: string; title: string; desc: string; thumb: string; author: string; avatar: string; time: number }>) => void
  };
  let parsed = parseSingleResendReply(reply, modePolicy, effectiveChatMode, contact);
  let normalizedStructures = normalizeSingleReplyStructures(parsed);
  if (hasBlockedPaymentSpecialIntent(parsed.specials || [], contact, specialRuntimeParams)) {
    replyTaskTracker.markCancelled('single_resend_blocked_payment_special');
    console.warn('[resendFlow] AI payment special was blocked before main text delivery.');
    return;
  }
  let hasLandableSpecialMessages = hasLandableSpecialMessageIntent(parsed.specials || [], contact, specialRuntimeParams, selectedContactId);
  let hasStructuredReplyContent = hasLandableSingleReplyContent(parsed, normalizedStructures, hasLandableSpecialMessages);
  if (!hasStructuredReplyContent) {
    console.warn('[resendFlow] AI reply format invalid, retrying once with a format repair prompt.');
    const retriedReply = await withTypingContact(params.setTypingContactIds, contact.id, () => getGeminiChatReply(
      requestContext.history,
      requestContext.systemPrompt,
      params.aiSettings,
      buildReplyFormatRetryRuntimePrompt(requestContext.runtimeUserPrompt)
    ));
    if (!isReplyTaskCurrent()) {
      replyTaskTracker.markDroppedStale('single_resend_after_format_retry');
      return;
    }
    parsed = parseSingleResendReply(retriedReply, modePolicy, effectiveChatMode, contact);
    normalizedStructures = normalizeSingleReplyStructures(parsed);
    if (hasBlockedPaymentSpecialIntent(parsed.specials || [], contact, specialRuntimeParams)) {
      replyTaskTracker.markCancelled('single_resend_retry_blocked_payment_special');
      console.warn('[resendFlow] Retried AI payment special was blocked before main text delivery.');
      return;
    }
    hasLandableSpecialMessages = hasLandableSpecialMessageIntent(parsed.specials || [], contact, specialRuntimeParams, selectedContactId);
    hasStructuredReplyContent = hasLandableSingleReplyContent(parsed, normalizedStructures, hasLandableSpecialMessages);
  }
  if (!hasStructuredReplyContent) {
    replyTaskTracker.markCancelled('single_resend_invalid_structured_reply');
    params.showToast('AI 回复格式无效，请重试');
    return;
  }
  if ((parsed.statusUpdate?.trim() || parsed.patDescUpdate?.trim()) && effectiveChatMode !== 'story') {
    const status = parsed.statusUpdate?.trim();
    const patDesc = parsed.patDescUpdate?.trim();
    params.setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, status: status ?? c.status, patDesc: patDesc ?? c.patDesc } : c));
  }
  const modeResult = applyChatModePolicy(parsed.text || parsed.sentences.join(' ').trim(), contact, modePolicy, {
    innerVoice: parsed.innerVoice,
    actionDesc: parsed.actionDesc
  });
  const clippedReply = contact.replyLimit ? modeResult.content.slice(0, contact.replyLimit) : modeResult.content;

  const shouldDelay = params.aiSettings.enableDelayReply && effectiveChatMode !== 'story';
  const sentenceRange = normalizeSentenceRange(contact.sentenceRange);
  const dialogueTurns = effectiveChatMode === 'story' ? normalizedStructures.dialogueTurns : [];
  const orderedSegmentsRaw = filterOrderedSegmentsForPolicy(
    normalizedStructures.orderedSegments.map((item) => ({
      type: item.type,
      value: item.type === 'inner'
        ? (clipInnerVoiceForContact(contact, item.value) || '')
        : item.type === 'action'
          ? (clipActionDescForContact(contact, item.value) || '')
          : item.value
    })),
    modePolicy
  );
  const orderedSegmentsForMode = effectiveChatMode === 'story'
    ? orderedSegmentsRaw.filter((item) => item.type === 'text')
    : orderedSegmentsRaw;
  const { segments: orderedSegments, truncated: orderedSegmentsTruncated } = clampOrderedTextSegmentCountWithinSentenceRange(
    orderedSegmentsForMode,
    sentenceRange
  );
  if (orderedSegmentsTruncated) {
    console.warn(`[resendFlow] 模型输出的有序正文段数超过上限 ${sentenceRange.max}，已自动截断。`);
  }
  const supportsOrderedSequence = true;
  const hasOrderedSequence = supportsOrderedSequence && orderedSegments.length > 0;
  const npcMeta = undefined;

  let aiMsgs: Message[] = [];
  let mainQueueDelay = 0;
  if (dialogueTurns.length > 0) {
    aiMsgs = buildDialogueTurnMessages({
      dialogueTurns,
      payload: parsed,
      modeMeta: modeResult,
      npcMeta,
      selectedContactId
    });
  } else if (hasOrderedSequence) {
    aiMsgs = buildOrderedSequenceMessages({
      orderedSegments,
      payload: parsed,
      modeMeta: modeResult,
      npcMeta,
      selectedContactId,
      effectiveChatMode
    });
  } else {
    const candidates = collectReplySentenceCandidates({
      sentences: parsed.sentences,
      parsedText: parsed.text,
      dedupe: false
    });
    const { pieces: splitPieces } = selectReplySentencePiecesWithinRange({
      candidates,
      range: sentenceRange
    });
    const used = shouldDelay ? splitPieces : (clippedReply.trim() ? [clippedReply.trim()] : []);
    aiMsgs = buildPlainReplyMessages({
      replyText: used.join(' '),
      payload: parsed,
      modeMeta: modeResult,
      npcMeta,
      selectedContactId
    });
  }

  if (aiMsgs.length === 0 && (modeResult.innerVoice || modeResult.actionDesc)) {
    aiMsgs.push(buildMetaOnlyReplyMessage({
      selectedContactId,
      modeMeta: modeResult,
      npcMeta,
      translatedContentZhCN: parsed.translatedContentZhCN
    }));
  }

  if (aiMsgs.length > 0) {
    if (shouldDelay) {
      mainQueueDelay = scheduleDeliveredReplyMessages(params, selectedContactId, aiMsgs, {
        getDelayMs: (aiMsg) => {
          const metric = aiMsg.type === 'image' ? 4 : Math.max(1, aiMsg.content.length);
          return 1500 + Math.min(metric * 30, 1500);
        },
        shouldRun: isReplyTaskCurrent,
        onSkippedMessage: () => {
          replyTaskTracker.markDroppedStale('single_resend_delayed_delivery');
        },
        getDeliveryOptions: () => ({ refreshTimestamp: false })
      });
    } else {
      const lastAiMsg = getLastDisplayMessage(aiMsgs);
      const defaultPreview = getMessagePreview(lastAiMsg);
      const fallbackPreview = [lastAiMsg?.innerVoice, lastAiMsg?.actionDesc, lastAiMsg?.narrationDesc].filter(Boolean).join(' · ');
      appendDeliveredReplyMessages(
        params,
        selectedContactId,
        aiMsgs,
        !defaultPreview && fallbackPreview ? { previewText: fallbackPreview } : undefined
      );
      replyTaskTracker.markMainDelivered('single_resend_immediate_delivery');
    }
  }

  const safeExtrasPromise = buildSpecialMessages({ specials: parsed.specials || [] }, contact, specialRuntimeParams, selectedContactId);
  await appendReplySpecialMessages({
    chatId: selectedContactId,
    params,
    specialMessagesPromise: safeExtrasPromise,
    mainQueueDelayMs: mainQueueDelay,
    shouldRun: isReplyTaskCurrent,
    onSkipped: () => {
      replyTaskTracker.markDroppedStale('single_resend_special_followup');
    },
    onError: (error) => {
      console.error('[useMessageActions] 重发特殊消息构建失败:', error);
    }
  });

  const memoryReply = getReplyMemoryText(clippedReply, [
    modeResult.innerVoice ? `心声：${modeResult.innerVoice}` : '',
    modeResult.actionDesc ? `动作：${modeResult.actionDesc}` : '',
    parsed.translatedContentZhCN ? `译文：${parsed.translatedContentZhCN}` : ''
  ]);
  scheduleMainReplyCompletion(mainQueueDelay, () => {
    replyTaskTracker.markCompleted('single_resend_memory_flushed');
    appendMemoryEntriesWithAutoSummary({
      contactId: contact.id,
      texts: [memoryReply],
      source: 'model',
      contactName: contact.remark?.trim() || contact.name,
      threshold: contact.memorySummaryThreshold,
      contactMemories: params.contactMemories,
      aiSettings: params.aiSettings,
      setContactMemories: params.setContactMemories,
      errorLogScope: '[useMessageActions]'
    });
  }, isReplyTaskCurrent, () => {
    replyTaskTracker.markDroppedStale('single_resend_main_completion');
  });
};
