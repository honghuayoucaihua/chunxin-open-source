import React from 'react';
import {
  clearRecentReplyTaskLifecycleEvents,
  isReplyTaskLifecycleDebugEnabled,
  setReplyTaskLifecycleDebugEnabled,
  type ReplyTaskLifecycleEvent
} from '../utils/chat/replyTaskState.ts';
import {
  printRecentReplyTaskEvents,
} from '../utils/chat/replyTaskDebugRuntime.ts';
import {
  buildReplyTaskEventFilter,
  isReplyTaskDebugToolingAvailable,
  loadVisibleReplyTaskEvents,
  REPLY_TASK_DEBUG_CHANNEL_OPTIONS,
  REPLY_TASK_DEBUG_PANEL_REFRESH_MS,
  REPLY_TASK_DEBUG_PANEL_VISIBLE_LIMIT
} from '../utils/chat/replyTaskDebugTools.ts';

const formatReplyTaskEventTime = (timestamp: number): string => {
  if (!Number.isFinite(timestamp)) return '--:--:--';
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const getEventToneClassName = (state: ReplyTaskLifecycleEvent['to']): string => {
  if (state === 'completed') return 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10';
  if (state === 'dropped_stale') return 'text-amber-200 border-amber-400/40 bg-amber-500/10';
  if (state === 'cancelled') return 'text-rose-200 border-rose-400/40 bg-rose-500/10';
  if (state === 'main_delivered') return 'text-sky-200 border-sky-400/40 bg-sky-500/10';
  return 'text-white/80 border-white/15 bg-white/5';
};

const ReplyTaskDebugPanel: React.FC = () => {
  const isDev = isReplyTaskDebugToolingAvailable();
  const [visible, setVisible] = React.useState(false);
  const [debugEnabled, setDebugEnabled] = React.useState(() => isReplyTaskLifecycleDebugEnabled());
  const [channelFilter, setChannelFilter] = React.useState('');
  const [chatIdFilter, setChatIdFilter] = React.useState('');
  const [events, setEvents] = React.useState<ReplyTaskLifecycleEvent[]>([]);

  const refreshEvents = React.useCallback(() => {
    setDebugEnabled(isReplyTaskLifecycleDebugEnabled());
    setEvents(loadVisibleReplyTaskEvents(channelFilter, chatIdFilter));
  }, [channelFilter, chatIdFilter]);

  React.useEffect(() => {
    if (!isDev || !visible) return;
    refreshEvents();
    const handler = window.setInterval(() => {
      refreshEvents();
    }, REPLY_TASK_DEBUG_PANEL_REFRESH_MS);
    return () => window.clearInterval(handler);
  }, [isDev, visible, refreshEvents]);

  const handleToggleVisible = React.useCallback(() => {
    setVisible((prev) => !prev);
  }, []);

  const handleToggleDebug = React.useCallback(() => {
    const nextEnabled = !isReplyTaskLifecycleDebugEnabled();
    setReplyTaskLifecycleDebugEnabled(nextEnabled);
    setDebugEnabled(nextEnabled);
    refreshEvents();
  }, [refreshEvents]);

  const handleClear = React.useCallback(() => {
    clearRecentReplyTaskLifecycleEvents();
    refreshEvents();
  }, [refreshEvents]);

  const handlePrint = React.useCallback(() => {
    const filter = buildReplyTaskEventFilter(channelFilter, chatIdFilter);
    printRecentReplyTaskEvents(filter);
    refreshEvents();
  }, [channelFilter, chatIdFilter, refreshEvents]);

  return isDev ? (
    <>
      <button
        type="button"
        onClick={handleToggleVisible}
        className="fixed right-3 bottom-20 z-[210] rounded-full border border-white/15 bg-black/70 px-3 py-2 text-[11px] font-medium tracking-[0.08em] text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur"
        aria-label={visible ? '关闭回复任务调试面板' : '打开回复任务调试面板'}
      >
        回复调试
      </button>
      {visible ? (
        <div className="fixed right-3 bottom-36 z-[210] flex w-[360px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(19,24,39,0.96),rgba(11,14,24,0.94))] text-white shadow-[0_24px_60px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <div className="text-[13px] font-semibold tracking-[0.08em] text-white">回复任务调试</div>
              <div className="mt-1 text-[11px] text-white/55">最近 {REPLY_TASK_DEBUG_PANEL_VISIBLE_LIMIT} 条事件，开发态自动刷新</div>
            </div>
            <button
              type="button"
              onClick={handleToggleVisible}
              className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/70 hover:bg-white/10"
            >
              收起
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-white/8 px-4 py-3">
            <label className="col-span-1 flex flex-col gap-1 text-[11px] text-white/65">
              链路
              <select
                value={channelFilter}
                onChange={(event) => setChannelFilter(event.target.value)}
                className="app-field-select rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-[12px] text-white outline-none"
              >
                {REPLY_TASK_DEBUG_CHANNEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-1 flex flex-col gap-1 text-[11px] text-white/65">
              会话 ID
              <input
                value={chatIdFilter}
                onChange={(event) => setChatIdFilter(event.target.value)}
                placeholder="留空不过滤"
                className="rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-[12px] text-white placeholder:text-white/30 outline-none"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-white/8 px-4 py-3">
            <button
              type="button"
              onClick={handleToggleDebug}
              className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${debugEnabled ? 'bg-emerald-500/18 text-emerald-200' : 'bg-white/8 text-white/75'}`}
            >
              {debugEnabled ? '已开启控制台日志' : '开启控制台日志'}
            </button>
            <button
              type="button"
              onClick={refreshEvents}
              className="rounded-full bg-white/8 px-3 py-1.5 text-[11px] text-white/75"
            >
              刷新
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-full bg-white/8 px-3 py-1.5 text-[11px] text-white/75"
            >
              打印到控制台
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full bg-rose-500/14 px-3 py-1.5 text-[11px] text-rose-200"
            >
              清空事件
            </button>
          </div>

          <div className="flex items-center justify-between px-4 py-2 text-[11px] text-white/45">
            <span>当前事件数：{events.length}</span>
            <span>按时间倒序</span>
          </div>

          <div className="max-h-[56vh] overflow-y-auto px-3 pb-3">
            {events.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-white/10 px-4 py-6 text-center text-[12px] text-white/45">
                还没有符合条件的回复任务事件
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((event, index) => (
                  <div
                    key={`${event.timestamp}-${event.channel || ''}-${event.chatId || ''}-${event.version}-${event.from}-${event.to}-${event.reason || ''}-${index}`}
                    className="rounded-[20px] border border-white/8 bg-white/[0.04] px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-mono text-[11px] text-white/55">{formatReplyTaskEventTime(event.timestamp)}</div>
                      <div className={`rounded-full border px-2 py-0.5 text-[10px] ${getEventToneClassName(event.to)}`}>
                        {event.to}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-white/55">
                      <span className="rounded-full bg-white/6 px-2 py-0.5">链路 {event.channel || 'unknown'}</span>
                      <span className="rounded-full bg-white/6 px-2 py-0.5">版本 {event.version}</span>
                      <span className="rounded-full bg-white/6 px-2 py-0.5">来源 {event.from}</span>
                    </div>
                    <div className="mt-2 break-all font-mono text-[11px] text-white/75">
                      会话：{event.chatId || 'unknown'}
                    </div>
                    <div className="mt-1 break-all text-[12px] text-white/88">
                      {event.reason || '无原因标签'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  ) : null;
};

export default ReplyTaskDebugPanel;
