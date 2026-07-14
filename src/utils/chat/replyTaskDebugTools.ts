import { isDevelopmentEnvironment } from '../runtimeEnvironment.ts';
import {
  getFilteredRecentReplyTaskEvents,
  type ReplyTaskEventFilter
} from './replyTaskDebugRuntime.ts';
import type { ReplyTaskLifecycleEvent } from './replyTaskState.ts';

export const REPLY_TASK_DEBUG_PANEL_VISIBLE_LIMIT = 40;
export const REPLY_TASK_DEBUG_PANEL_REFRESH_MS = 800;
export const REPLY_TASK_DEBUG_CHANNEL_OPTIONS = [
  { value: '', label: '全部链路' },
  { value: 'single_send', label: '单聊首发' },
  { value: 'group_send', label: '群聊首发' },
  { value: 'resend', label: '重发' },
  { value: 'anonymous', label: '匿名' },
  { value: 'proactive', label: '主动聊天' }
] as const;

export const isReplyTaskDebugToolingAvailable = (): boolean => isDevelopmentEnvironment();

export const buildReplyTaskEventFilter = (
  channel: string,
  chatId: string
): ReplyTaskEventFilter | undefined => {
  const normalizedChannel = String(channel || '').trim();
  const normalizedChatId = String(chatId || '').trim();
  if (!normalizedChannel && !normalizedChatId) return undefined;
  return {
    channel: normalizedChannel || undefined,
    chatId: normalizedChatId || undefined
  };
};

export const loadVisibleReplyTaskEvents = (
  channel: string,
  chatId: string
): ReplyTaskLifecycleEvent[] => {
  const filter = buildReplyTaskEventFilter(channel, chatId);
  return getFilteredRecentReplyTaskEvents(filter)
    .slice(-REPLY_TASK_DEBUG_PANEL_VISIBLE_LIMIT)
    .reverse();
};
