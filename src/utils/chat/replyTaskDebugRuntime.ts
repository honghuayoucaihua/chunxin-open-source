import {
  clearRecentReplyTaskLifecycleEvents,
  getRecentReplyTaskLifecycleEvents,
  isReplyTaskLifecycleDebugEnabled,
  setReplyTaskLifecycleDebugEnabled,
  type ReplyTaskLifecycleEvent,
  type ReplyTaskLifecycleState
} from './replyTaskState.ts';

export type ReplyTaskEventFilter = {
  chatId?: string;
  channel?: string;
  from?: ReplyTaskLifecycleState;
  to?: ReplyTaskLifecycleState;
};

export type ReplyTaskDebugBridge = {
  enable: () => boolean;
  disable: () => boolean;
  isEnabled: () => boolean;
  getRecentEvents: (filter?: ReplyTaskEventFilter) => ReplyTaskLifecycleEvent[];
  clear: () => void;
  print: (filter?: ReplyTaskEventFilter) => ReplyTaskLifecycleEvent[];
};

export type ReplyTaskDebugWindow = Window & {
  replyTaskDebug?: ReplyTaskDebugBridge;
};

const matchesReplyTaskEventFilter = (
  event: ReplyTaskLifecycleEvent,
  filter?: ReplyTaskEventFilter
): boolean => {
  if (!filter) return true;
  if (filter.chatId && event.chatId !== filter.chatId) return false;
  if (filter.channel && event.channel !== filter.channel) return false;
  if (filter.from && event.from !== filter.from) return false;
  if (filter.to && event.to !== filter.to) return false;
  return true;
};

export const getFilteredRecentReplyTaskEvents = (
  filter?: ReplyTaskEventFilter
): ReplyTaskLifecycleEvent[] => (
  getRecentReplyTaskLifecycleEvents().filter((event) => matchesReplyTaskEventFilter(event, filter))
);

export const printRecentReplyTaskEvents = (
  filter?: ReplyTaskEventFilter
): ReplyTaskLifecycleEvent[] => {
  const events = getFilteredRecentReplyTaskEvents(filter);
  if (typeof console.table === 'function') {
    console.table(events);
  } else {
    console.log('[replyTask] recent events', events);
  }
  return events;
};

export const createReplyTaskDebugBridge = (): ReplyTaskDebugBridge => ({
  enable: () => {
    setReplyTaskLifecycleDebugEnabled(true);
    return true;
  },
  disable: () => {
    setReplyTaskLifecycleDebugEnabled(false);
    return false;
  },
  isEnabled: () => isReplyTaskLifecycleDebugEnabled(),
  getRecentEvents: (filter?: ReplyTaskEventFilter) => getFilteredRecentReplyTaskEvents(filter),
  clear: () => {
    clearRecentReplyTaskLifecycleEvents();
  },
  print: (filter?: ReplyTaskEventFilter) => printRecentReplyTaskEvents(filter)
});

export const installReplyTaskDebugBridge = (runtimeWindow: ReplyTaskDebugWindow): void => {
  runtimeWindow.replyTaskDebug = createReplyTaskDebugBridge();
};

export const uninstallReplyTaskDebugBridge = (runtimeWindow: ReplyTaskDebugWindow): void => {
  delete runtimeWindow.replyTaskDebug;
};
