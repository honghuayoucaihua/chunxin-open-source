import React, { useMemo, useRef, useState } from 'react';

export interface TrendPoint {
  date: string;
  value: number;
}

type ColorKey = 'indigo' | 'emerald' | 'sky' | 'amber';

const COLOR_MAP: Record<ColorKey, { stroke: string; dot: string; fillTop: string; fillBottom: string; chip: string }> = {
  indigo: {
    stroke: '#a5b4fc',
    dot: '#818cf8',
    fillTop: 'rgba(129,140,248,0.32)',
    fillBottom: 'rgba(129,140,248,0)',
    chip: 'bg-indigo-500/20 text-indigo-300'
  },
  emerald: {
    stroke: '#6ee7b7',
    dot: '#34d399',
    fillTop: 'rgba(52,211,153,0.32)',
    fillBottom: 'rgba(52,211,153,0)',
    chip: 'bg-emerald-500/20 text-emerald-300'
  },
  sky: {
    stroke: '#7dd3fc',
    dot: '#38bdf8',
    fillTop: 'rgba(56,189,248,0.32)',
    fillBottom: 'rgba(56,189,248,0)',
    chip: 'bg-sky-500/20 text-sky-300'
  },
  amber: {
    stroke: '#fcd34d',
    dot: '#fbbf24',
    fillTop: 'rgba(251,191,36,0.32)',
    fillBottom: 'rgba(251,191,36,0)',
    chip: 'bg-amber-500/20 text-amber-300'
  }
};

const VIEW_W = 600;
const VIEW_H = 140;
const PAD_T = 14;
const PAD_B = 22;
const INNER_H = VIEW_H - PAD_T - PAD_B;

const isoToday = (() => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
})();

const formatMD = (date: string): string => {
  const [, m, d] = date.split('-').map((p) => parseInt(p, 10));
  if (!m || !d) return date;
  return `${m}/${d}`;
};

const formatNum = (n: number): string => {
  if (n >= 10000) return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}w`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return Math.round(n).toString();
};

const formatAvg = (n: number): string => {
  if (n >= 100) return Math.round(n).toString();
  return n.toFixed(1);
};

interface TrendCardProps {
  title: string;
  data: TrendPoint[];
  loading: boolean;
  error?: string;
  unit?: string;
  color?: ColorKey;
  emptyHint?: string;
}

export const TrendCard: React.FC<TrendCardProps> = ({
  title,
  data,
  loading,
  error,
  unit = '',
  color = 'indigo',
  emptyHint
}) => {
  const palette = COLOR_MAP[color];
  const [selected, setSelected] = useState<number | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const values = data.map((p) => p.value);
    const peak = Math.max(...values);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const today = data[data.length - 1]?.value ?? 0;
    let change: number | null = null;
    if (data.length >= 4) {
      const half = Math.floor(data.length / 2);
      const earlier = values.slice(0, half).reduce((a, b) => a + b, 0);
      const later = values.slice(half).reduce((a, b) => a + b, 0);
      if (earlier > 0) change = ((later - earlier) / earlier) * 100;
      else if (later > 0) change = Number.POSITIVE_INFINITY;
      else change = 0;
    }
    return { peak, sum, avg, today, change };
  }, [data]);

  const { points, baseY, max } = useMemo(() => {
    if (data.length === 0) return { points: [], baseY: PAD_T + INNER_H, max: 1 };
    const m = Math.max(1, ...data.map((p) => p.value));
    const denom = Math.max(1, data.length - 1);
    const pts = data.map((p, i) => ({
      idx: i,
      x: data.length === 1 ? VIEW_W / 2 : (i / denom) * VIEW_W,
      y: PAD_T + INNER_H - (p.value / m) * INNER_H,
      value: p.value,
      date: p.date
    }));
    return { points: pts, baseY: PAD_T + INNER_H, max: m };
  }, [data]);

  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    if (points.length === 1) {
      const p = points[0];
      return `M0,${p.y.toFixed(1)} L${VIEW_W},${p.y.toFixed(1)}`;
    }
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join('');
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const first = points[0];
    const last = points[points.length - 1];
    return `${linePath} L${last.x.toFixed(1)},${baseY} L${first.x.toFixed(1)},${baseY} Z`;
  }, [linePath, points, baseY]);

  const avgY = useMemo(() => {
    if (!stats) return null;
    return PAD_T + INNER_H - (stats.avg / max) * INNER_H;
  }, [stats, max]);

  const handlePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!overlayRef.current || data.length === 0) return;
    const rect = overlayRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const idx = Math.round(ratio * (data.length - 1));
    setSelected(Math.max(0, Math.min(data.length - 1, idx)));
  };

  const clearSelection = () => setSelected(null);

  const renderSummary = () => {
    if (!stats) return null;
    const items: Array<{ label: string; value: React.ReactNode; tone?: 'up' | 'down' }> = [
      { label: '今', value: `${formatNum(stats.today)}${unit}` },
      { label: '峰', value: `${formatNum(stats.peak)}${unit}` },
      { label: '均', value: `${formatAvg(stats.avg)}${unit}` }
    ];
    if (stats.change !== null) {
      const inf = !Number.isFinite(stats.change);
      const tone = stats.change >= 0 ? 'up' : 'down';
      const text = inf
        ? '↑∞'
        : `${stats.change >= 0 ? '+' : ''}${stats.change.toFixed(stats.change <= -10 || stats.change >= 10 ? 0 : 1)}%`;
      items.push({ label: '前段比', value: text, tone });
    }
    return (
      <div className="flex items-center gap-3 text-[11px] text-white/60 flex-wrap">
        {items.map((it) => (
          <span key={it.label} className="inline-flex items-center gap-1">
            <span className="text-white/35">{it.label}</span>
            <span
              className={
                it.tone === 'up'
                  ? 'text-emerald-300 font-medium'
                  : it.tone === 'down'
                  ? 'text-red-300 font-medium'
                  : 'text-white font-medium'
              }
            >
              {it.value}
            </span>
          </span>
        ))}
      </div>
    );
  };

  const renderTicks = () => {
    if (data.length === 0) return null;
    const last = data.length - 1;
    const mid = Math.floor(last / 2);
    const showSet = new Set<number>([0, mid, last]);
    return (
      <div className="relative w-full h-4 mt-1">
        {data.map((p, i) => {
          if (!showSet.has(i)) return null;
          const left = data.length === 1 ? 50 : (i / (data.length - 1)) * 100;
          const align = i === 0 ? 'left-0' : i === last ? 'right-0' : '-translate-x-1/2';
          const labelText = p.date === isoToday && i === last ? '今' : formatMD(p.date);
          return (
            <span
              key={i}
              className={`absolute top-0 text-[10px] text-white/35 ${i === 0 || i === last ? '' : 'transform'}`}
              style={
                i === 0
                  ? { left: 0 }
                  : i === last
                  ? { right: 0 }
                  : { left: `${left}%`, transform: 'translateX(-50%)' }
              }
            >
              {labelText}
            </span>
          );
        })}
      </div>
    );
  };

  const renderHeader = (right: React.ReactNode = null) => (
    <div className="flex items-center justify-between mb-2 gap-3">
      <div className="text-white/80 text-sm font-medium">{title}</div>
      {right}
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        {renderHeader(<span className="text-white/40 text-xs">加载中...</span>)}
        <div className="h-[140px] flex items-center justify-center text-white/30 text-sm">
          <i className="fa-solid fa-circle-notch fa-spin mr-2"></i>加载中
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        {renderHeader(<span className="text-red-300/80 text-xs">出错</span>)}
        <div className="h-[140px] flex flex-col items-center justify-center gap-1 text-center">
          <div className="text-red-300 text-sm">{error}</div>
          <div className="text-white/40 text-xs">切换时间范围或刷新页面后会重新请求</div>
        </div>
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        {renderHeader()}
        <div className="h-[140px] flex items-center justify-center text-white/35 text-sm">
          {emptyHint || '暂无历史数据，数据将从今天开始记录'}
        </div>
      </div>
    );
  }

  const allZero = stats !== null && stats.peak === 0;
  const selectedPoint = selected !== null ? points[selected] : null;
  const selectedRaw = selected !== null ? data[selected] : null;
  const selectedPct = selected !== null && data.length > 1 ? (selected / (data.length - 1)) * 100 : 50;

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-2 gap-3">
        <div className="text-white/80 text-sm font-medium">{title}</div>
        {renderSummary()}
      </div>

      <div
        ref={overlayRef}
        className="relative w-full select-none"
        style={{ height: `${VIEW_H}px` }}
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={clearSelection}
        onPointerCancel={clearSelection}
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          <defs>
            <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={palette.fillTop} />
              <stop offset="100%" stopColor={palette.fillBottom} />
            </linearGradient>
          </defs>

          <line
            x1={0}
            x2={VIEW_W}
            y1={baseY}
            y2={baseY}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />

          {avgY !== null && stats && stats.avg > 0 && (
            <line
              x1={0}
              x2={VIEW_W}
              y1={avgY}
              y2={avgY}
              stroke="rgba(255,255,255,0.18)"
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {!allZero && (
            <>
              <path d={areaPath} fill={`url(#grad-${color})`} />
              <path
                d={linePath}
                fill="none"
                stroke={palette.stroke}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}

          {selectedPoint && !allZero && (
            <>
              <line
                x1={selectedPoint.x}
                x2={selectedPoint.x}
                y1={PAD_T - 2}
                y2={baseY}
                stroke="rgba(255,255,255,0.35)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={selectedPoint.x}
                cy={selectedPoint.y}
                r={3.2}
                fill={palette.dot}
                stroke="#fff"
                strokeWidth={1.4}
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </svg>

        {selectedRaw && (
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 px-2 py-1 rounded-lg bg-black/70 border border-white/10 text-[10px] text-white whitespace-nowrap shadow-lg"
            style={{ left: `${selectedPct}%` }}
          >
            <div className="text-white/60">
              {selectedRaw.date}
              {selectedRaw.date === isoToday ? ' · 今' : ''}
            </div>
            <div>
              <span className={palette.chip + ' inline-block px-1.5 py-px rounded text-[10px] font-medium'}>
                {selectedRaw.value}
                {unit}
              </span>
            </div>
          </div>
        )}

        {allZero && (
          <div className="absolute inset-0 flex items-center justify-center text-white/30 text-xs">
            暂无数据，趋势图已按日期补齐
          </div>
        )}
      </div>

      {renderTicks()}
    </div>
  );
};
