import { getGeminiChatReply } from '../services/geminiServiceLoader';
import { buildAnonymousRuntimeUserPrompt, buildAnonymousSystemPrompt } from './anonymousChatUtils';
import { buildAnonymousModelHistory } from './anonymousModelHistory';
import {
  buildAnonymousHistoryItem,
  buildAnonymousIntroMessages,
  buildAnonymousLeaveTip,
  buildAnonymousMatchSystemPrompt,
  buildAnonymousResumePayload,
  normalizeAnonymousMatchResult
} from './anonymousFlowUtils';
import { buildAnonymousReplyChunks } from './anonymousReplyParsing.ts';
import { extractStrictJsonObjectLazy } from '../utils/chatParserLoader';
import {
  appendDeliveredReplyMessages,
  scheduleDeliveredReplyMessages
} from '../utils/chat/replyDelivery';
import { withTypingContact } from '../utils/chat/replyLifecycle';
import { createNumericVersionGuard } from '../utils/chat/taskGuard';
import { createReplyTaskLifecycleTracker } from '../utils/chat/replyTaskState.ts';
import { formatSafeLogError } from '../utils/logRedaction.ts';
import {
  captureAnonymousRuntimeResetEpoch,
  isAnonymousRuntimeResetEpochStale
} from '../services/anonymousRuntimeResetGuard.ts';
import type { AnonymousChatHistoryItem, AnonymousChatPartner, AnonymousChatSettings } from './anonymousChatUtils';
import type { AISettings, Mask, Message, UserProfile } from '../types';
import type { Dispatch, SetStateAction } from 'react';

type LeaveReason = 'leftByMe' | 'leftByPeer';
type AnonymousSessionVersionGetter = () => number;
type RoleHistoryItem = { role: 'user' | 'model'; text: string };
type SetMessages = Dispatch<SetStateAction<Record<string, Message[]>>>;
type SetTypingContactIds = Dispatch<SetStateAction<string[]>>;
type SetAnonymousHistory = Dispatch<SetStateAction<AnonymousChatHistoryItem[]>>;

type AnonymousSessionIdentity = {
  anonymousChatId: string;
  getAnonymousSessionVersion: AnonymousSessionVersionGetter;
};

type AnonymousStartMatchParams = AnonymousSessionIdentity & {
  anonymousIsMatching: boolean;
  anonymousSessionVersion: number;
  anonymousChatSettings: AnonymousChatSettings;
  user: UserProfile;
  aiSettings: AISettings;
  runtimeUserPromptBase: string;
  setAnonymousIsMatching: Dispatch<SetStateAction<boolean>>;
  setAnonymousViewingHistoryId: Dispatch<SetStateAction<string | null>>;
  setAnonymousPartner: Dispatch<SetStateAction<AnonymousChatPartner | null>>;
  setAnonymousSessionStartedAt: Dispatch<SetStateAction<number | null>>;
  setAnonymousSessionActive: Dispatch<SetStateAction<boolean>>;
  setAnonymousPeerLeft: Dispatch<SetStateAction<boolean>>;
  setAnonymousHasUnfinishedSession: Dispatch<SetStateAction<boolean>>;
  setAnonymousUnfinishedSession: Dispatch<SetStateAction<{ partner: AnonymousChatPartner; messages: Message[]; startedAt: number } | null>>;
  setAnonymousInputValue: Dispatch<SetStateAction<string>>;
  setMessages: SetMessages;
  showToast: (message: string) => void;
};

type AnonymousPushHistoryParams = {
  anonymousPartner: AnonymousChatPartner | null;
  anonymousSessionStartedAt: number | null;
  setAnonymousHistory: SetAnonymousHistory;
};

type AnonymousLeaveParams = {
  anonymousSessionActive: boolean;
  anonymousChatId: string;
  messages: Record<string, Message[]>;
  pushAnonymousHistory: (reason: LeaveReason, sessionMessages: Message[]) => void;
  setMessages: SetMessages;
  setAnonymousSessionActive: Dispatch<SetStateAction<boolean>>;
  setAnonymousPeerLeft: Dispatch<SetStateAction<boolean>>;
  setAnonymousHasUnfinishedSession: Dispatch<SetStateAction<boolean>>;
  setAnonymousUnfinishedSession: Dispatch<SetStateAction<{ partner: AnonymousChatPartner; messages: Message[]; startedAt: number } | null>>;
  setShowPanel: Dispatch<SetStateAction<'emoji' | 'more' | 'none'>>;
};

type AnonymousResumeParams = {
  anonymousUnfinishedSession: { partner: AnonymousChatPartner; messages: Message[]; startedAt: number } | null;
  anonymousSessionVersion: number;
  anonymousChatId: string;
  setAnonymousViewingHistoryId: Dispatch<SetStateAction<string | null>>;
  setAnonymousPartner: Dispatch<SetStateAction<AnonymousChatPartner | null>>;
  setAnonymousSessionStartedAt: Dispatch<SetStateAction<number | null>>;
  setAnonymousSessionActive: Dispatch<SetStateAction<boolean>>;
  setAnonymousPeerLeft: Dispatch<SetStateAction<boolean>>;
  setAnonymousInputValue: Dispatch<SetStateAction<string>>;
  setMessages: SetMessages;
  setAnonymousHasUnfinishedSession: Dispatch<SetStateAction<boolean>>;
  setAnonymousUnfinishedSession: Dispatch<SetStateAction<{ partner: AnonymousChatPartner; messages: Message[]; startedAt: number } | null>>;
};

type AnonymousSendParams = AnonymousSessionIdentity & {
  anonymousSessionActive: boolean;
  anonymousPartner: AnonymousChatPartner | null;
  anonymousInputValue: string;
  messages: Record<string, Message[]>;
  worldBooks: unknown[];
  masks: Mask[];
  user: UserProfile;
  extraSystemPrompt: string;
  aiSettings: AISettings;
  runtimeUserPromptBase: string;
  setMessages: SetMessages;
  setAnonymousInputValue: Dispatch<SetStateAction<string>>;
  playSendSignal: () => void;
  playReceiveSignal: () => void;
  setTypingContactIds: SetTypingContactIds;
  showToast: (message: string) => void;
  warnAiContextRiskIfNeeded: (input: {
    personality: string;
    runtimeUserPrompt?: string;
    history: Array<{ role: 'user' | 'model'; text: string; imageUrl?: string }>;
  }) => Promise<void>;
};

const ANONYMOUS_REPLY_DELAY_BASE_MS = 1200;
const ANONYMOUS_REPLY_DELAY_PER_CHAR_MS = 28;
const ANONYMOUS_REPLY_DELAY_CAP_MS = 1200;

const readVisibleScalarText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return Number.isFinite(value) ? String(value).trim() : '';
  if (typeof value === 'bigint') return String(value).trim();
  return '';
};

const formatAnonymousAiLogError = (error: unknown): { name: string; message: string } => (
  formatSafeLogError(error, 240)
);

const buildAnonymousAiMessages = (chatId: string, chunks: ReadonlyArray<string>): Message[] => (
  chunks.map((content, idx) => ({
    id: `${Date.now()}-anonymous-ai-${idx}`,
    senderId: chatId,
    content,
    timestamp: Date.now() + idx,
    type: 'text'
  }))
);

const isAnonymousSessionCurrent = (
  params: AnonymousSessionIdentity,
  expectedVersion: number
): boolean => {
  return createNumericVersionGuard(
    () => Number(params.getAnonymousSessionVersion?.() || 0),
    expectedVersion
  ).isCurrent();
};

const isAnonymousSessionRequestCurrent = (
  params: AnonymousSessionIdentity,
  expectedVersion: number,
  anonymousRuntimeResetEpoch: number
): boolean => {
  if (isAnonymousRuntimeResetEpochStale(anonymousRuntimeResetEpoch)) return false;
  return isAnonymousSessionCurrent(params, expectedVersion);
};

const pushAnonymousAiMessages = (
  params: AnonymousSendParams,
  aiMessages: ReadonlyArray<Message>,
  expectedVersion: number,
  anonymousRuntimeResetEpoch: number
): void => {
  if (aiMessages.length === 0) return;
  if (!isAnonymousSessionCurrent(params, expectedVersion)) return;
  const sessionGuard = createNumericVersionGuard(
    () => Number(params.getAnonymousSessionVersion?.() || 0),
    expectedVersion
  );
  const isSessionCurrent = () => (
    !isAnonymousRuntimeResetEpochStale(anonymousRuntimeResetEpoch)
    && sessionGuard.isCurrent()
  );
  const replyTaskTracker = createReplyTaskLifecycleTracker(sessionGuard.version, {
    chatId: params.anonymousChatId,
    channel: 'anonymous'
  });
  replyTaskTracker.markRunning('anonymous_reply_ready');
  if (params.aiSettings.enableDelayReply) {
    scheduleDeliveredReplyMessages({
      setMessages: params.setMessages,
      playReceiveSignal: params.playReceiveSignal
    }, params.anonymousChatId, [...aiMessages], {
      getDelayMs: (message) => {
        const metric = Math.max(1, String(message.content || '').length);
        return ANONYMOUS_REPLY_DELAY_BASE_MS + Math.min(metric * ANONYMOUS_REPLY_DELAY_PER_CHAR_MS, ANONYMOUS_REPLY_DELAY_CAP_MS);
      },
      shouldRun: sessionGuard.isCurrent,
      onSkippedMessage: () => {
        replyTaskTracker.markDroppedStale('anonymous_delayed_delivery');
      }
    });
    return;
  }
  if (!isSessionCurrent()) {
    replyTaskTracker.markDroppedStale('anonymous_before_immediate_delivery');
    return;
  }
  appendDeliveredReplyMessages({
    setMessages: params.setMessages,
    playReceiveSignal: params.playReceiveSignal
  }, params.anonymousChatId, [...aiMessages]);
  replyTaskTracker.markMainDelivered('anonymous_immediate_delivery');
};

const requestAnonymousReply = async (
  params: Pick<AnonymousSendParams, 'anonymousChatId' | 'aiSettings' | 'setTypingContactIds'>,
  history: RoleHistoryItem[],
  systemPrompt: string,
  runtimeUserPrompt: string
): Promise<string> => {
  return withTypingContact(params.setTypingContactIds, params.anonymousChatId, () => getGeminiChatReply(
      history,
      systemPrompt,
      params.aiSettings,
      runtimeUserPrompt
    ));
};

export const runStartAnonymousMatch = async (params: AnonymousStartMatchParams): Promise<void> => {
  if (params.anonymousIsMatching) return;
  const startedAt = Date.now();
  params.setAnonymousIsMatching(true);
  try {
    const systemPrompt = buildAnonymousMatchSystemPrompt(params.anonymousChatSettings, params.user.gender);
    const runtimeUserPrompt = buildAnonymousRuntimeUserPrompt(params.runtimeUserPromptBase, params.user);
    const raw = await getGeminiChatReply(
      [{ role: 'user', text: '生成匿名匹配对象与开场白' }],
      systemPrompt,
      params.aiSettings,
      runtimeUserPrompt
    );
    const parsed = await extractStrictJsonObjectLazy(readVisibleScalarText(raw));
    if (!parsed) throw new Error('AI 未返回有效 JSON');
    const normalized = normalizeAnonymousMatchResult(parsed, params.anonymousChatSettings, params.user.gender);
    const partner = normalized.partner;
    if (!isAnonymousSessionCurrent(params, Number(params.anonymousSessionVersion || 0))) return;

    params.setAnonymousViewingHistoryId(null);
    params.setAnonymousPartner(partner);
    params.setAnonymousSessionStartedAt(startedAt);
    params.setAnonymousSessionActive(true);
    params.setAnonymousPeerLeft(false);
    params.setAnonymousHasUnfinishedSession(false);
    params.setAnonymousUnfinishedSession(null);
    params.setAnonymousInputValue('');

    const introMessageList = buildAnonymousIntroMessages(params.anonymousChatId, normalized.opening, startedAt);
    params.setMessages((prev) => ({ ...prev, [params.anonymousChatId]: introMessageList }));
  } catch (error: unknown) {
    if (!isAnonymousSessionCurrent(params, Number(params.anonymousSessionVersion || 0))) return;
    console.error('[AnonymousMatch] AI match failed:', formatAnonymousAiLogError(error));
    params.showToast(error instanceof Error ? error.message || '匿名匹配失败' : '匿名匹配失败');
  } finally {
    if (isAnonymousSessionCurrent(params, Number(params.anonymousSessionVersion || 0))) {
      params.setAnonymousIsMatching(false);
    }
  }
};

export const runPushAnonymousHistory = (params: AnonymousPushHistoryParams, reason: LeaveReason, sessionMessages: Message[]): void => {
  if (!params.anonymousPartner || !params.anonymousSessionStartedAt) return;
  const item = buildAnonymousHistoryItem(params.anonymousPartner, params.anonymousSessionStartedAt, reason, sessionMessages);
  params.setAnonymousHistory((prev) => [item, ...prev].slice(0, 30));
};

export const runAnonymousLeave = (params: AnonymousLeaveParams, reason: LeaveReason): void => {
  if (!params.anonymousSessionActive) return;
  const tip = buildAnonymousLeaveTip(params.anonymousChatId, reason);
  const currentSessionMessages = params.messages[params.anonymousChatId] || [];
  const nextSessionMessages = [...currentSessionMessages, tip];
  params.setMessages((prev) => ({ ...prev, [params.anonymousChatId]: nextSessionMessages }));
  params.pushAnonymousHistory(reason, nextSessionMessages);
  params.setAnonymousSessionActive(false);
  params.setAnonymousPeerLeft(reason === 'leftByPeer');
  params.setAnonymousHasUnfinishedSession(false);
  params.setAnonymousUnfinishedSession(null);
  params.setShowPanel('none');
};

export const runResumeAnonymousSession = (params: AnonymousResumeParams): void => {
  if (!params.anonymousUnfinishedSession) return;
  const payload = buildAnonymousResumePayload(params.anonymousUnfinishedSession, params.anonymousChatId);
  params.setAnonymousViewingHistoryId(payload.viewingHistoryId);
  params.setAnonymousPartner(payload.partner);
  params.setAnonymousSessionStartedAt(payload.startedAt);
  params.setAnonymousSessionActive(payload.sessionActive);
  params.setAnonymousPeerLeft(payload.peerLeft);
  params.setAnonymousInputValue(payload.inputValue);
  params.setMessages((prev) => ({ ...prev, ...payload.messagesPatch }));
  params.setAnonymousHasUnfinishedSession(false);
  params.setAnonymousUnfinishedSession(null);
};

export const runAnonymousSend = async (params: AnonymousSendParams): Promise<void> => {
  if (!params.anonymousSessionActive || !params.anonymousPartner) return;
  const text = readVisibleScalarText(params.anonymousInputValue);
  if (!text) return;
  const expectedVersion = Number(params.getAnonymousSessionVersion?.() || 0);
  const anonymousRuntimeResetEpoch = captureAnonymousRuntimeResetEpoch();
  const isCurrentRequest = () => isAnonymousSessionRequestCurrent(
    params,
    expectedVersion,
    anonymousRuntimeResetEpoch
  );

  const userMsg: Message = {
    id: `${Date.now()}-anonymous-me`,
    senderId: 'me',
    content: text,
    timestamp: Date.now(),
    type: 'text'
  };
  params.setMessages((prev) => ({
    ...prev,
    [params.anonymousChatId]: [...(prev[params.anonymousChatId] || []), userMsg]
  }));
  params.setAnonymousInputValue('');
  params.playSendSignal();

  const history = buildAnonymousModelHistory([...(params.messages[params.anonymousChatId] || []), userMsg]);
  const systemPrompt = buildAnonymousSystemPrompt(
    params.anonymousPartner,
    params.worldBooks,
    params.masks,
    params.user,
    params.extraSystemPrompt
  );
  const runtimeUserPrompt = buildAnonymousRuntimeUserPrompt(params.runtimeUserPromptBase, params.user);

  let reply = '';
  try {
    await params.warnAiContextRiskIfNeeded({
      personality: systemPrompt,
      runtimeUserPrompt,
      history
    });
    reply = await requestAnonymousReply(params, history, systemPrompt, runtimeUserPrompt);
    if (!isCurrentRequest()) return;
    const replyChunks = await buildAnonymousReplyChunks(reply);
    const aiMessages = buildAnonymousAiMessages(params.anonymousChatId, replyChunks);
    if (!isCurrentRequest()) return;
    pushAnonymousAiMessages(params, aiMessages, expectedVersion, anonymousRuntimeResetEpoch);
  } catch (error: unknown) {
    if (!isCurrentRequest()) return;
    console.error('[AnonymousChat] AI reply failed:', {
      error: formatAnonymousAiLogError(error),
      replyLength: readVisibleScalarText(reply).length
    });
    params.showToast(error instanceof Error ? error.message || '匿名聊天回复失败' : '匿名聊天回复失败');
  }
};
