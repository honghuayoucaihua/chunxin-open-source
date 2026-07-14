import React from 'react';
import type { MusicState } from '../music/musicCommon';
import type { DesktopWidget } from '../types';

export type DesktopWidgetWeatherData = {
  temp: number;
  description: string;
  iconClass: string;
};

export const formatTime = (date: Date, use24Hour = false): string => {
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  if (!use24Hour) {
    const ampm = hours >= 12 ? '下午' : '上午';
    hours = hours % 12 || 12;
    return `${ampm} ${hours}:${minutes}`;
  }
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
};

export const formatTimeParts = (date: Date, use24Hour = false): { period: string; hour: string; minute: string } => {
  const rawHours = date.getHours();
  if (use24Hour) {
    return {
      period: '',
      hour: rawHours.toString().padStart(2, '0'),
      minute: date.getMinutes().toString().padStart(2, '0'),
    };
  }
  return {
    period: rawHours >= 12 ? '下午' : '上午',
    hour: (rawHours % 12 || 12).toString(),
    minute: date.getMinutes().toString().padStart(2, '0'),
  };
};

export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${year}年${month}月${day}日 ${weekdays[date.getDay()]}`;
};

export const formatLockDateMeta = (date: Date): { monthDay: string; weekday: string; dayNumber: string } => {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return {
    monthDay: `${month}月${day}日`,
    weekday: weekdays[date.getDay()],
    dayNumber: day,
  };
};

export const CountdownDisplay: React.FC<{ config?: Record<string, any> }> = ({ config }) => {
  const target = config?.targetDate ? new Date(config.targetDate) : null;
  const mode = config?.mode || 'countdown';
  const repeat = config?.repeat || 'none';
  const displayMode = config?.displayMode || 'auto';
  const now = new Date();

  if (!target) {
    return <div className="text-xs opacity-70">尚未设置</div>;
  }

  let diffMs = 0;
  let label = '';
  let subLabel = '';

  if (mode === 'anniversary') {
    diffMs = now.getTime() - target.getTime();

    if (repeat === 'yearly') {
      let years = now.getFullYear() - target.getFullYear();
      const thisYearDate = new Date(target);
      thisYearDate.setFullYear(now.getFullYear());
      if (now < thisYearDate) years--;
      label = years > 0 ? `第 ${years} 年` : '第一年';
      const nextDate = new Date(target);
      nextDate.setFullYear(now.getFullYear());
      if (nextDate <= now) nextDate.setFullYear(now.getFullYear() + 1);
      const nextDiff = nextDate.getTime() - now.getTime();
      const nextDays = Math.floor(nextDiff / (1000 * 60 * 60 * 24));
      subLabel = nextDays > 0 ? `还有 ${nextDays} 天` : '今天就是纪念日';
    } else if (repeat === 'monthly') {
      const months = (now.getFullYear() - target.getFullYear()) * 12 + (now.getMonth() - target.getMonth());
      label = `第 ${Math.max(1, months)} 个月`;
      const nextDate = new Date(target);
      nextDate.setMonth(now.getMonth() + 1);
      const nextDiff = nextDate.getTime() - now.getTime();
      const nextDays = Math.floor(nextDiff / (1000 * 60 * 60 * 24));
      subLabel = nextDays > 0 ? `还有 ${nextDays} 天` : '今天就是纪念日';
    } else {
      label = '已过去';
    }
  } else {
    let effectiveTarget = new Date(target);
    if (repeat !== 'none' && effectiveTarget <= now) {
      while (effectiveTarget <= now) {
        if (repeat === 'yearly') effectiveTarget.setFullYear(effectiveTarget.getFullYear() + 1);
        else if (repeat === 'monthly') effectiveTarget.setMonth(effectiveTarget.getMonth() + 1);
        else if (repeat === 'weekly') effectiveTarget.setDate(effectiveTarget.getDate() + 7);
        else break;
      }
    }
    diffMs = effectiveTarget.getTime() - now.getTime();
    if (diffMs < 0) {
      diffMs = -diffMs;
      label = '已过去';
    } else {
      label = '还有';
    }
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  if (mode === 'anniversary' && repeat !== 'none') {
    return (
      <div className="flex flex-col">
        <span className="text-2xl font-light">{label}</span>
        {displayMode !== 'days' && subLabel && (
          <span className="text-xs opacity-70 mt-0.5">{subLabel}</span>
        )}
      </div>
    );
  }

  const showFull = displayMode === 'full' || (displayMode === 'auto' && days < 1);

  return (
    <div className="flex items-baseline gap-1">
      {days > 0 && (
        <>
          <span className="text-2xl font-light">{days}</span>
          <span className="text-xs opacity-70">天</span>
        </>
      )}
      {showFull && (
        <>
          <span className="text-lg font-light">{hours}</span>
          <span className="text-xs opacity-70">时</span>
          <span className="text-lg font-light">{minutes}</span>
          <span className="text-xs opacity-70">分</span>
          {displayMode === 'full' && (
            <>
              <span className="text-lg font-light">{seconds}</span>
              <span className="text-xs opacity-70">秒</span>
            </>
          )}
        </>
      )}
      {days === 0 && !showFull && (
        <span className="text-xs opacity-70">小于1天</span>
      )}
    </div>
  );
};

export const CalendarGrid: React.FC<{ year: number; month: number; accent?: string }> = ({ year, month, accent }) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().getDate();
  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return (
    <div className="grid grid-cols-7 gap-0.5 text-center">
      {['日', '一', '二', '三', '四', '五', '六'].map(d => (
        <div key={d} className="text-[10px] opacity-50">{d}</div>
      ))}
      {cells.map((d, idx) => {
        const isToday = d === today && isCurrentMonth;
        return (
          <div
            key={idx}
            className={`text-[10px] leading-4 rounded-full w-4 h-4 flex items-center justify-center mx-auto ${isToday ? 'font-bold text-white' : 'opacity-80'}`}
            style={isToday && accent ? { backgroundColor: accent } : undefined}
          >
            {d || ''}
          </div>
        );
      })}
    </div>
  );
};

type DesktopWidgetContentProps = {
  widget: DesktopWidget;
  currentTime: Date;
  desktop24Hour?: boolean;
  accentColor: string;
  isDark: boolean;
  weatherData?: DesktopWidgetWeatherData | null;
  musicState?: MusicState;
  batteryLevel: number | null;
  showBatteryPercent: boolean;
  onOpenSubView?: (subView: string) => void;
  onSaveWidgetConfig: (widgetId: string, config: Record<string, any>) => void;
};

export const DesktopWidgetContent: React.FC<DesktopWidgetContentProps> = ({
  widget,
  currentTime,
  desktop24Hour,
  accentColor,
  isDark,
  weatherData,
  musicState,
  batteryLevel,
  showBatteryPercent,
  onOpenSubView,
  onSaveWidgetConfig,
}) => {
  const { width: w, height: h } = widget;

  if (widget.type === 'clock') {
    return (
      <div className={`flex h-full ${w >= 4 ? 'items-center justify-between' : 'flex-col justify-center'}`}>
        <div className={w >= 4 ? 'flex flex-col justify-center' : ''}>
          <div className={`tabular-nums tracking-tight leading-none ${h >= 2 ? 'text-5xl font-extralight' : w >= 4 ? 'text-4xl font-extralight' : 'text-3xl font-light'}`}>
            {formatTime(currentTime, desktop24Hour)}
          </div>
          {(h >= 2 || w >= 4) && <div className="text-sm opacity-60 mt-1">{formatDate(currentTime)}</div>}
        </div>
        {w >= 4 && (
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <i className={`fa-solid ${weatherData?.iconClass || 'fa-sun'} text-3xl`} style={{ color: '#fbbf24', filter: 'drop-shadow(0 2px 4px rgba(251,191,36,0.3))' }} />
            <div className="flex flex-col items-end">
              <div className="text-2xl font-light leading-none">{weatherData ? `${weatherData.temp}°` : '--°'}</div>
              <div className="text-xs opacity-60 mt-0.5">{weatherData?.description || '点击设置城市'}</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (widget.type === 'date') {
    return (
      <div className="flex flex-col justify-center h-full">
        <div className={`font-medium tabular-nums leading-none ${h >= 2 ? 'text-4xl' : 'text-2xl'}`}>{currentTime.getDate()}</div>
        <div className={`opacity-60 mt-1 ${h >= 2 ? 'text-sm' : 'text-xs'}`}>{currentTime.getMonth() + 1}月 {['周日','周一','周二','周三','周四','周五','周六'][currentTime.getDay()]}</div>
      </div>
    );
  }

  if (widget.type === 'music') {
    return (
      <div className="flex items-center gap-3 h-full">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden" style={{ background: musicState?.queue[musicState?.currentIndex ?? 0]?.cover ? 'transparent' : `linear-gradient(135deg, ${accentColor}, ${accentColor}88)` }}>
          {musicState?.queue[musicState?.currentIndex ?? 0]?.cover ? (
            <img src={musicState.queue[musicState.currentIndex].cover} alt="cover" className="w-full h-full object-cover" />
          ) : (
            <i className="fa-solid fa-music text-white text-lg" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {musicState?.queue.length ? (musicState.queue[musicState.currentIndex]?.name || '正在播放') : '音乐'}
          </div>
          <div className="text-xs opacity-50 truncate">
            {musicState?.queue.length ? (musicState.queue[musicState.currentIndex]?.artist || '未知歌手') : '点击打开音乐'}
          </div>
        </div>
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90"
          style={{ backgroundColor: `${accentColor}22` }}
          onClick={(e) => { e.stopPropagation(); onOpenSubView?.('listenMusic'); }}
        >
          <i className={`fa-solid text-sm ${musicState?.isPlaying ? 'fa-pause' : 'fa-play'}`} style={{ color: accentColor }} />
        </button>
      </div>
    );
  }

  if (widget.type === 'notes') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-1.5 opacity-60 mb-1.5">
          <i className="fa-solid fa-note-sticky text-[10px]" />
          <span className="text-[10px] uppercase tracking-wider">便签</span>
        </div>
        <div className={`opacity-90 leading-relaxed ${h >= 2 ? 'text-sm' : 'text-xs'} ${!widget.config?.content ? 'opacity-50 italic' : ''}`} style={{ display: '-webkit-box', WebkitLineClamp: h >= 2 ? 4 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {widget.config?.content || '点击编辑便签内容...'}
        </div>
      </div>
    );
  }

  if (widget.type === 'countdown') {
    return (
      <div className="flex flex-col justify-center h-full">
        <div className="flex items-center gap-1.5 opacity-60 mb-1.5">
          <i className={`fa-solid text-[10px] ${widget.config?.mode === 'anniversary' ? 'fa-heart' : 'fa-hourglass-half'}`} />
          <span className="text-[10px] uppercase tracking-wider">{widget.config?.title || (widget.config?.mode === 'anniversary' ? '纪念日' : '倒计时')}</span>
        </div>
        <CountdownDisplay config={widget.config} />
      </div>
    );
  }

  if (widget.type === 'image') {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: 'inherit' }}>
        {widget.config?.url ? (
          <img src={widget.config.url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full flex flex-col items-center justify-center ${isDark ? 'text-white/40' : 'text-gray-400/50'}`}>
            <i className="fa-solid fa-image text-3xl mb-2 opacity-50" />
            <span className="text-xs">图片</span>
          </div>
        )}
      </div>
    );
  }

  if (widget.type === 'todo') {
    const rawItems = widget.config?.items || ['整理房间', '阅读30分钟'];
    const items = rawItems.map((item: any, i: number) =>
      typeof item === 'string' ? { text: item, done: i === 0 } : { text: String(item.text || ''), done: !!item.done }
    );
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-1.5 opacity-60 mb-1.5">
          <i className="fa-solid fa-list-check text-[10px]" />
          <span className="text-[10px] uppercase tracking-wider">待办</span>
        </div>
        <div className="flex-1 overflow-hidden">
          {items.slice(0, h >= 2 ? 4 : 2).map((todo: { text: string; done: boolean }, idx: number) => (
            <button
              key={idx}
              className="flex items-center gap-1.5 text-xs opacity-80 truncate w-full text-left"
              onClick={(e) => {
                e.stopPropagation();
                const newItems = items.map((t: { text: string; done: boolean }, i: number) => i === idx ? { ...t, done: !t.done } : t);
                onSaveWidgetConfig(widget.id, { items: newItems });
              }}
            >
              <div className="w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0" style={{ borderColor: `${accentColor}66` }}>
                <div className={`w-2 h-2 rounded-sm transition-colors ${todo.done ? '' : 'bg-transparent'}`} style={{ backgroundColor: todo.done ? accentColor : 'transparent' }} />
              </div>
              <span className={`truncate ${todo.done ? 'line-through opacity-50' : ''}`}>{todo.text}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (widget.type === 'calendar') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between opacity-60 mb-2">
          <span className="text-[10px] uppercase tracking-wider">{currentTime.getFullYear()}年{currentTime.getMonth() + 1}月</span>
          <i className="fa-solid fa-calendar text-[10px]" />
        </div>
        <CalendarGrid year={currentTime.getFullYear()} month={currentTime.getMonth()} accent={accentColor} />
      </div>
    );
  }

  if (widget.type === 'battery') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-1">
        <div className="relative w-7 h-4 border-2 rounded-sm flex items-center px-0.5" style={{ borderColor: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)' }}>
          <div className="h-2.5 rounded-sm" style={{ width: `${batteryLevel ?? 80}%`, backgroundColor: batteryLevel !== null && batteryLevel <= 20 ? '#FF3B30' : batteryLevel !== null && batteryLevel <= 50 ? '#FFCC00' : '#34C759' }} />
          <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-0.5 h-1.5 rounded-r-sm" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)' }} />
        </div>
        {showBatteryPercent && (
          <span className="text-[10px] opacity-70 tabular-nums">{batteryLevel ?? 80}%</span>
        )}
      </div>
    );
  }

  return null;
};

export default DesktopWidgetContent;
