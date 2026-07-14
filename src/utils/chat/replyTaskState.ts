import { isDevelopmentEnvironment } from '../runtimeEnvironment.ts';

export type ReplyTaskLifecycleState =
  | 'pending'
  | 'running'
  | 'main_delivered'
  | 'completed'
  | 'dropped_stale'
  | 'cancelled';

export type ReplyTaskLifecycleSnapshot = {
  version: number;
  state: ReplyTaskLifecycleState;
  reason?: string;
};

export type ReplyTaskLifecycleTracker = {
  version: number;
  getState: () => ReplyTaskLifecycleState;
  getSnapshot: () => ReplyTaskLifecycleSnapshot;
  markRunning: (reason?: string) => ReplyTaskLifecycleSnapshot;
  markMainDelivered: (reason?: string) => ReplyTaskLifecycleSnapshot;
  markCompleted: (reason?: string) => ReplyTaskLifecycleSnapshot;
  markDroppedStale: (reason?: string) => ReplyTaskLifecycleSnapshot;
  markCancelled: (reason?: string) => ReplyTaskLifecycleSnapshot;
};

export type ReplyTaskLifecycleTrackerOptions = {
  chatId?: string;
  channel?: string;
  onTransition?: (
    nextSnapshot: ReplyTaskLifecycleSnapshot,
    previousSnapshot: ReplyTaskLifecycleSnapshot
  ) => void;
};

export type ReplyTaskLifecycleEvent = {
  timestamp: number;
  chatId?: string;
  channel?: string;
  version: number;
  from: ReplyTaskLifecycleState;
  to: ReplyTaskLifecycleState;
  reason?: string;
};

export const MAX_RECENT_REPLY_TASK_LIFECYCLE_EVENTS = 120;

const TERMINAL_STATES = new Set<ReplyTaskLifecycleState>([
  'completed',
  'dropped_stale',
  'cancelled'
]);
const recentReplyTaskLifecycleEvents: ReplyTaskLifecycleEvent[] = [];

const createSnapshot = (
  version: number,
  state: ReplyTaskLifecycleState,
  reason?: string
): ReplyTaskLifecycleSnapshot => (
  reason ? { version, state, reason } : { version, state }
);

export const isReplyTaskLifecycleDebugEnabled = (): boolean => {
  const globalFlag = (globalThis as typeof globalThis & {
    __CHAT_REPLY_TASK_DEBUG__?: boolean;
  }).__CHAT_REPLY_TASK_DEBUG__;
  if (typeof globalFlag === 'boolean') return globalFlag;
  return isDevelopmentEnvironment();
};

export const setReplyTaskLifecycleDebugEnabled = (enabled: boolean): void => {
  const globalWithDebugFlag = globalThis as typeof globalThis & {
    __CHAT_REPLY_TASK_DEBUG__?: boolean;
  };
  globalWithDebugFlag.__CHAT_REPLY_TASK_DEBUG__ = enabled;
};

const emitReplyTaskLifecycleDebugLog = (
  nextSnapshot: ReplyTaskLifecycleSnapshot,
  previousSnapshot: ReplyTaskLifecycleSnapshot,
  options: ReplyTaskLifecycleTrackerOptions
): void => {
  if (!isReplyTaskLifecycleDebugEnabled()) return;
  console.debug('[replyTask]', {
    chatId: options.chatId,
    channel: options.channel,
    version: nextSnapshot.version,
    from: previousSnapshot.state,
    to: nextSnapshot.state,
    reason: nextSnapshot.reason
  });
};

const appendRecentReplyTaskLifecycleEvent = (
  nextSnapshot: ReplyTaskLifecycleSnapshot,
  previousSnapshot: ReplyTaskLifecycleSnapshot,
  options: ReplyTaskLifecycleTrackerOptions
): void => {
  recentReplyTaskLifecycleEvents.push({
    timestamp: Date.now(),
    chatId: options.chatId,
    channel: options.channel,
    version: nextSnapshot.version,
    from: previousSnapshot.state,
    to: nextSnapshot.state,
    reason: nextSnapshot.reason
  });
  if (recentReplyTaskLifecycleEvents.length <= MAX_RECENT_REPLY_TASK_LIFECYCLE_EVENTS) return;
  recentReplyTaskLifecycleEvents.splice(
    0,
    recentReplyTaskLifecycleEvents.length - MAX_RECENT_REPLY_TASK_LIFECYCLE_EVENTS
  );
};

export const getRecentReplyTaskLifecycleEvents = (): ReplyTaskLifecycleEvent[] => (
  recentReplyTaskLifecycleEvents.map((event) => ({ ...event }))
);

export const clearRecentReplyTaskLifecycleEvents = (): void => {
  recentReplyTaskLifecycleEvents.splice(0, recentReplyTaskLifecycleEvents.length);
};

export const createReplyTaskLifecycleTracker = (
  version: number,
  options: ReplyTaskLifecycleTrackerOptions = {}
): ReplyTaskLifecycleTracker => {
  let snapshot = createSnapshot(version, 'pending');

  const updateState = (
    nextState: ReplyTaskLifecycleState,
    reason?: string
  ): ReplyTaskLifecycleSnapshot => {
    if (TERMINAL_STATES.has(snapshot.state) && snapshot.state !== nextState) {
      return snapshot;
    }
    const previousSnapshot = snapshot;
    snapshot = createSnapshot(version, nextState, reason);
    options.onTransition?.(snapshot, previousSnapshot);
    appendRecentReplyTaskLifecycleEvent(snapshot, previousSnapshot, options);
    emitReplyTaskLifecycleDebugLog(snapshot, previousSnapshot, options);
    return snapshot;
  };

  return {
    version,
    getState: () => snapshot.state,
    getSnapshot: () => snapshot,
    markRunning: (reason?: string) => updateState('running', reason),
    markMainDelivered: (reason?: string) => updateState('main_delivered', reason),
    markCompleted: (reason?: string) => updateState('completed', reason),
    markDroppedStale: (reason?: string) => updateState('dropped_stale', reason),
    markCancelled: (reason?: string) => updateState('cancelled', reason)
  };
};
