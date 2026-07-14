import { getGeminiChatReply } from '../../services/geminiServiceLoader';
import { parseAIReply } from '../../utils/chatHelpers';
import {
  applyChatModePolicy,
  filterOrderedSegmentsForPolicy,
  getChatModePolicy
} from '../../utils/chat/chatModePolicy';
import type { Message } from '../../types';
import { buildSpecialMessages, hasBlockedPaymentSpecialIntent, hasLandableSpecialMessageIntent } from './specialMessages';
import {
  clampOrderedTextSegmentCountWithinSentenceRange,
  collectReplySentenceCandidates,
  isSentenceTagEnabled,
  normalizeSentenceRange,
  selectReplySentencePiecesWithinRange
} from '../../utils/sentenceRange';
import { scheduleDeliveredReplyMessages, appendDeliveredReplyMessages } from '../../utils/chat/replyDelivery';
import { appendChatMessagesAndRefreshPreview } from '../../app/chatMessageFlowUtils';
import { appendReplySpecialMessages } from '../../utils/chat/replySpecialMessageFlow';
import {
  getReplyMemoryText,
  scheduleMainReplyCompletion,
  withTypingContact
} from '../../utils/chat/replyLifecycle';
import { createReplyTaskGuard } from '../../utils/chat/replyTaskVersion';
import { createReplyTaskLifecycleTracker } from '../../utils/chat/replyTaskState.ts';
import { captureRuntimeResetEpoch, isRuntimeResetEpochStale } from '../../services/runtimeResetGuard.ts';
import { buildSingleReplyRequestContext } from '../../utils/chat/singleReplyRequest';
import { buildReplyFormatRetryRuntimePrompt } from '../../utils/chat/replyFormatRetry';
import { normalizeGeneratedStrictNonSystemEventText } from '../../utils/generatedVisibleText.ts';
import {
  buildDialogueTurnMessages,
  hasLandableSingleReplyContent,
  buildMetaOnlyReplyMessage,
  buildOrderedSequenceMessages,
  buildPlainReplyMessages,
  buildQuotedMessageFromAIQuote,
  buildSplitSentenceReplyMessages,
  normalizeSingleReplyStructures
} from '../../utils/chat/singleReplyMessageBuilder';
import {
  clipActionDescForContact,
  clipInnerVoiceForContact
} from '../../utils/chat/contactReplyLimits';
import type { Contact } from '../../types';
import type { AISpecial, AIQuote } from '../../utils/chat/aiReplyParser';
import type { SendMessageFlowParams } from './types';

type ParsedSingleChatReply = {
  text: string;
  innerVoice?: string;
  actionDesc?: string;
  statusUpdate?: string;
  patDescUpdate?: string;
  sentences: string[];
  specials: AISpecial[];
  quote: AIQuote | null;
  translatedContentZhCN?: string;
  translatedSentencesZhCN?: string[];
  dialogueTurns?: unknown;
  orderedSegments?: unknown;
};

const parseSingleChatReply = (
  rawReply: string,
  modePolicy: ReturnType<typeof getChatModePolicy>,
  effectiveChatMode: string,
  contact: Contact
): ParsedSingleChatReply => {
  const normalizedReply = String(rawReply || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const parsed = parseAIReply(
    normalizedReply,
    modePolicy.innerEnabled,
    modePolicy.actionEnabled,
    { allowSocial: !contact.isGroup, requireStructured: true, allowStoryTags: effectiveChatMode === 'story', acceptPlainText: true }
  ) as ParsedSingleChatReply;
  parsed.text = normalizeGeneratedStrictNonSystemEventText(parsed.text, { collapseWhitespace: true });
  parsed.sentences = parsed.sentences
    .map((item) => normalizeGeneratedStrictNonSystemEventText(item, { collapseWhitespace: true }))
    .filter(Boolean);
  return parsed;
};

export async function handleSingleChatFlow(
  params: SendMessageFlowParams,
  contact: Contact,
  selectedContactId: string,
  text: string,
  historySeed: Message | null,
  contextLimit: number,
  memorySummaryThreshold: number,
  shouldAppend: boolean,
  toVoiceCallMessage: (msg: Message) => Message,
  resolveQuoteSenderId: (target?: string) => string,
  internalRuntimePrompt = ''
): Promise<void> {
  const replyTaskGuard = createReplyTaskGuard(params.replyTaskVersionRef, selectedContactId);
  const runtimeResetEpoch = captureRuntimeResetEpoch();
  const isReplyTaskCurrent = () => !isRuntimeResetEpochStale(runtimeResetEpoch) && replyTaskGuard.isCurrent();
  const replyTaskTracker = createReplyTaskLifecycleTracker(replyTaskGuard.version, {
    chatId: selectedContactId,
    channel: 'single_send'
  });
  const replyAuditHistory = (params.messages[selectedContactId] || []).concat(historySeed || []).filter(Boolean);
  const requestContext = await buildSingleReplyRequestContext({
    contact,
    historyMessages: replyAuditHistory.slice(-contextLimit),
    contactMemories: params.contactMemories,
    worldBooks: params.worldBooks,
    masks: params.masks,
    user: params.user,
    aiSettings: params.aiSettings,
    extraSystemPrompt: params.extraSystemPrompt,
    internalRuntimePrompt,
    htmlTemplates: Array.isArray(params.htmlTemplates) ? params.htmlTemplates : []
  });
  if (!isReplyTaskCurrent()) {
    replyTaskTracker.markDroppedStale('single_send_before_request');
    return;
  }
  const modePolicy = requestContext.modePolicy;
  const effectiveChatMode = requestContext.effectiveChatMode;
  await params.warnAiContextRiskIfNeeded({
    personality: requestContext.systemPrompt,
    runtimeUserPrompt: requestContext.runtimeUserPrompt,
    history: requestContext.history
  });
  if (!isReplyTaskCurrent()) {
    replyTaskTracker.markDroppedStale('single_send_before_request');
    return;
  }
  replyTaskTracker.markRunning('single_send_started');
  const reply = await withTypingContact(params.setTypingContactIds, contact.id, () => getGeminiChatReply(
    requestContext.history,
    requestContext.systemPrompt,
    params.aiSettings,
    requestContext.runtimeUserPrompt
  ));
  if (!isReplyTaskCurrent()) {
    replyTaskTracker.markDroppedStale('single_send_after_reply');
    return;
  }
  if (shouldAppend) {
    params.updateMemoryWithAutoSummary(contact.id, text, 'user', contact.name, memorySummaryThreshold);
  }
  const specialRuntimeParams = {
    user: params.user,
    aiSettings: params.aiSettings,
    htmlTemplates: Array.isArray(params.htmlTemplates) ? params.htmlTemplates : [],
    setMoments: params.setMoments as unknown as (updater: (prev: import('../../types').Moment[]) => import('../../types').Moment[]) => void,
    setOfficialArticles: params.setOfficialArticles as unknown as (updater: (prev: Array<{ id: string; title: string; desc: string; thumb: string; author: string; avatar: string; time: number }>) => Array<{ id: string; title: string; desc: string; thumb: string; author: string; avatar: string; time: number }>) => void
  };
  let parsed = parseSingleChatReply(reply, modePolicy, effectiveChatMode, contact);
  let normalizedStructures = normalizeSingleReplyStructures(parsed);
  if (hasBlockedPaymentSpecialIntent(parsed.specials, contact, specialRuntimeParams)) {
    replyTaskTracker.markCancelled('single_send_blocked_payment_special');
    console.warn('[singleChatFlow] AI payment special was blocked before main text delivery.');
    return;
  }
  let hasLandableSpecialMessages = hasLandableSpecialMessageIntent(parsed.specials, contact, specialRuntimeParams, selectedContactId);
  let hasStructuredReplyContent = hasLandableSingleReplyContent(parsed, normalizedStructures, hasLandableSpecialMessages);
  if (!hasStructuredReplyContent) {
    console.warn('[singleChatFlow] AI reply format invalid, retrying once with a format repair prompt.');
    const retriedReply = await withTypingContact(params.setTypingContactIds, contact.id, () => getGeminiChatReply(
      requestContext.history,
      requestContext.systemPrompt,
      params.aiSettings,
      buildReplyFormatRetryRuntimePrompt(requestContext.runtimeUserPrompt)
    ));
    if (!isReplyTaskCurrent()) {
      replyTaskTracker.markDroppedStale('single_send_after_format_retry');
      return;
    }
    parsed = parseSingleChatReply(retriedReply, modePolicy, effectiveChatMode, contact);
    normalizedStructures = normalizeSingleReplyStructures(parsed);
    if (hasBlockedPaymentSpecialIntent(parsed.specials, contact, specialRuntimeParams)) {
      replyTaskTracker.markCancelled('single_send_retry_blocked_payment_special');
      console.warn('[singleChatFlow] Retried AI payment special was blocked before main text delivery.');
      return;
    }
    hasLandableSpecialMessages = hasLandableSpecialMessageIntent(parsed.specials, contact, specialRuntimeParams, selectedContactId);
    hasStructuredReplyContent = hasLandableSingleReplyContent(parsed, normalizedStructures, hasLandableSpecialMessages);
  }
  if (!hasStructuredReplyContent) {
    replyTaskTracker.markCancelled('single_send_invalid_structured_reply');
    params.showToast?.('AI 回复格式无效，请重试');
    return;
  }
  if ((parsed.statusUpdate?.trim() || parsed.patDescUpdate?.trim()) && effectiveChatMode !== 'story') {
    const status = parsed.statusUpdate?.trim();
    const patDesc = parsed.patDescUpdate?.trim();
    params.setContacts((prev) => prev.map((item) => (
    item.id === contact.id
      ? { ...item, status: status ?? item.status, patDesc: patDesc ?? item.patDesc }
      : item
    )));
  }
  const parsedPrimaryText = parsed.text || parsed.sentences.join(' ').trim();
  const modeResult = applyChatModePolicy(parsedPrimaryText, contact, modePolicy, {
    innerVoice: parsed.innerVoice,
    actionDesc: parsed.actionDesc
  });
  const clippedReply = contact.replyLimit ? modeResult.content.slice(0, contact.replyLimit) : modeResult.content;
  const aiQuotedMsg = buildQuotedMessageFromAIQuote(parsed.quote, resolveQuoteSenderId);

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
    console.warn(`[singleChatFlow] 模型输出的有序正文段数超过上限 ${sentenceRange.max}，已自动截断。`);
  }
  const supportsOrderedSequence = true;
  const hasOrderedSequence = supportsOrderedSequence && orderedSegments.length > 0;
  const hasDialogueTurns = dialogueTurns.length > 0;
  const shouldSplitSentence = hasDialogueTurns ? false : (hasOrderedSequence ? false : (effectiveChatMode === 'story' ? false : isSentenceTagEnabled(sentenceRange)));
  const npcMeta = undefined;
  let baseMsgs: Message[] = [];
  let metaOnlyQueue: Message[] = [];
  let mainQueueDelay = 0;
  let hasMainQueuedMessages = false;
  let mainDeliveredImmediately = false;

  if (shouldSplitSentence) {
    const result = handleSplitSentence(
      params, parsed, clippedReply, modeResult, npcMeta, aiQuotedMsg,
      selectedContactId, sentenceRange, toVoiceCallMessage, isReplyTaskCurrent, replyTaskTracker
    );
    metaOnlyQueue = result.metaOnlyQueue;
    mainQueueDelay = result.mainQueueDelay;
    hasMainQueuedMessages = result.hasMainQueuedMessages;
    mainDeliveredImmediately = result.deliveredImmediately;
  }

  if (hasDialogueTurns) {
    baseMsgs = buildDialogueTurnMessages({
      dialogueTurns,
      payload: parsed,
      modeMeta: modeResult,
      npcMeta,
      aiQuotedMsg,
      selectedContactId,
      useNpcFallbackName: true
    });
  } else if (hasOrderedSequence) {
    baseMsgs = buildOrderedSequenceMessages({
      orderedSegments,
      payload: parsed,
      modeMeta: modeResult,
      npcMeta,
      aiQuotedMsg,
      selectedContactId,
      effectiveChatMode
    });
  } else {
    const baseReplyText = clippedReply.trim() || parsed.sentences.join(' ').trim();
    baseMsgs = buildPlainReplyMessages({
      replyText: baseReplyText,
      payload: parsed,
      modeMeta: modeResult,
      npcMeta,
      aiQuotedMsg,
      selectedContactId
    });
  }

  const safeExtrasPromise = buildSpecialMessages(parsed, contact, specialRuntimeParams, selectedContactId);
  if (!shouldSplitSentence) {
    metaOnlyQueue = (!baseMsgs.length && (modeResult.innerVoice || modeResult.actionDesc))
      ? [buildMetaOnlyReplyMessage({
        selectedContactId,
        modeMeta: modeResult,
        npcMeta
      })]
      : [];
  }
  const voiceBaseMsgs = baseMsgs.map(toVoiceCallMessage);
  const immediateQueue = shouldSplitSentence
    ? [...metaOnlyQueue]
    : [...voiceBaseMsgs, ...metaOnlyQueue];
  if (!hasDialogueTurns && hasOrderedSequence && params.aiSettings.enableDelayReply) {
    const orderedMainQueue = [...voiceBaseMsgs, ...metaOnlyQueue];
    hasMainQueuedMessages = orderedMainQueue.length > 0;
    mainQueueDelay = scheduleDeliveredReplyMessages(params, selectedContactId, orderedMainQueue, {
      getDelayMs: (item) => {
        const metric = item.content ? Math.max(1, item.content.length) : 1;
        return 1200 + Math.min(metric * 28, 1200);
      },
      shouldRun: isReplyTaskCurrent,
      onSkippedMessage: () => {
        replyTaskTracker.markDroppedStale('single_send_delayed_delivery');
      },
      getDeliveryOptions: () => ({ refreshTimestamp: true })
    });
  } else if (immediateQueue.length > 0) {
    if (!isReplyTaskCurrent()) {
      replyTaskTracker.markDroppedStale('single_send_before_immediate_delivery');
    } else {
      appendChatMessagesAndRefreshPreview(params, selectedContactId, immediateQueue);
      params.playReceiveSignal?.();
      hasMainQueuedMessages = true;
      mainDeliveredImmediately = true;
      replyTaskTracker.markMainDelivered('single_send_immediate_delivery');
    }
  }

  const memoryText = getReplyMemoryText(clippedReply, [
    modeResult.innerVoice ? `心声：${modeResult.innerVoice}` : '',
    modeResult.actionDesc ? `动作：${modeResult.actionDesc}` : '',
    parsed.translatedContentZhCN ? `译文：${parsed.translatedContentZhCN}` : ''
  ]);
  scheduleMainReplyCompletion(mainQueueDelay, () => {
    if (hasMainQueuedMessages && !mainDeliveredImmediately) {
      replyTaskTracker.markMainDelivered('single_send_delayed_delivery_complete');
    }
    replyTaskTracker.markCompleted('single_send_memory_flushed');
    if (memoryText) {
      params.updateMemoryWithAutoSummary(contact.id, memoryText, 'model', contact.name, memorySummaryThreshold);
    }
  }, isReplyTaskCurrent, () => {
    replyTaskTracker.markDroppedStale('single_send_main_completion');
  });

  await appendReplySpecialMessages({
    chatId: selectedContactId,
    params,
    specialMessagesPromise: safeExtrasPromise,
    mainQueueDelayMs: mainQueueDelay,
    shouldRun: isReplyTaskCurrent,
    onSkipped: () => {
      replyTaskTracker.markDroppedStale('single_send_special_followup');
    },
    onError: (error) => {
      console.error('Build special messages error:', error);
    }
  });
}

function handleSplitSentence(
  params: SendMessageFlowParams,
  parsed: ParsedSingleChatReply,
  clippedReply: string,
  modeResult: { innerVoice?: string; actionDesc?: string },
  npcMeta: { isNpc?: boolean; npcName?: string } | undefined,
  aiQuotedMsg: Message | null,
  selectedContactId: string,
  sentenceRange: { min: number; max: number },
  toVoiceCallMessage: (msg: Message) => Message,
  shouldRun: () => boolean,
  replyTaskTracker: ReturnType<typeof createReplyTaskLifecycleTracker>
): {
  metaOnlyQueue: Message[];
  mainQueueDelay: number;
  hasMainQueuedMessages: boolean;
  deliveredImmediately: boolean;
} {
  const candidates = collectReplySentenceCandidates({
    sentences: parsed.sentences,
    parsedText: parsed.text,
    dedupe: true
  });
  const { pieces: used } = selectReplySentencePiecesWithinRange({
    candidates,
    range: sentenceRange
  });
  let metaOnlyQueue: Message[] = [];
  let mainQueueDelay = 0;
  let hasMainQueuedMessages = false;
  let deliveredImmediately = false;
  if (used.length === 0 && (modeResult.innerVoice || modeResult.actionDesc)) {
    metaOnlyQueue = [buildMetaOnlyReplyMessage({
      selectedContactId,
      modeMeta: modeResult,
      npcMeta
    })];
  }

  if (params.aiSettings.enableDelayReply) {
    const scheduledMsgs = buildSplitSentenceReplyMessages({
      pieces: used,
      payload: parsed,
      modeMeta: modeResult,
      npcMeta,
      aiQuotedMsg,
      selectedContactId
    }).map(toVoiceCallMessage);
    hasMainQueuedMessages = scheduledMsgs.length > 0;
    mainQueueDelay = scheduleDeliveredReplyMessages(params, selectedContactId, scheduledMsgs, {
      getDelayMs: (chunk) => {
        const metric = chunk.type === 'image' ? 4 : Math.max(1, chunk.content.length);
        return 1500 + Math.min(metric * 30, 1500);
      },
      shouldRun,
      onSkippedMessage: () => {
        replyTaskTracker.markDroppedStale('single_send_split_delayed_delivery');
      }
    });
  } else {
    const immediateMsgs = buildSplitSentenceReplyMessages({
      pieces: used,
      payload: parsed,
      modeMeta: modeResult,
      npcMeta,
      aiQuotedMsg,
      selectedContactId
    });
    for (const chunk of immediateMsgs) {
      if (!shouldRun()) {
        replyTaskTracker.markDroppedStale('single_send_split_immediate_delivery');
        break;
      }
      const aiMsg: Message = toVoiceCallMessage(chunk);
      appendDeliveredReplyMessages(params, selectedContactId, [aiMsg], { refreshTimestamp: true });
      hasMainQueuedMessages = true;
      if (!deliveredImmediately) {
        replyTaskTracker.markMainDelivered('single_send_split_immediate_delivery');
      }
      deliveredImmediately = true;
    }
  }

  return {
    metaOnlyQueue,
    mainQueueDelay,
    hasMainQueuedMessages,
    deliveredImmediately
  };
}
