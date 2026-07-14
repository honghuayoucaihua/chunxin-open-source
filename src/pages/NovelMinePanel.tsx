import React from 'react';
import type { NovelReaderAppearance } from './novelDiscoverHelpers';

export type NovelMineStats = {
  totalBooks: number;
  readBooks: number;
  cachedChapters: number;
};

const READER_BACKGROUND_OPTIONS: Array<{
  key: NovelReaderAppearance['background'];
  label: string;
  bg: string;
}> = [
  { key: 'paper', label: '纸张', bg: '#f8f6ef' },
  { key: 'green', label: '护眼', bg: '#e7f0e6' },
  { key: 'dark', label: '夜间', bg: '#1b1b1b' },
];

type NovelMinePanelProps = {
  mineStats: NovelMineStats;
  readerAppearance: NovelReaderAppearance;
  onReaderAppearanceChange: React.Dispatch<React.SetStateAction<NovelReaderAppearance>>;
  onContinueLatest: () => void;
  onOpenBookshelf: () => void;
  onClearGenreCache: () => void;
  onClearCommentCache: () => void;
  onResetGuide: () => void;
  onResetReaderAppearance: () => void;
  onRefreshCurrentGenre: () => void;
};

const StatCell: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="rounded-lg bg-[#f7f7f7] py-2">
    <div className="text-[16px] font-semibold text-[#222]">{value}</div>
    <div className="mt-1 text-[11px] text-[#888]">{label}</div>
  </div>
);

const ActionButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}> = ({ children, onClick, primary = false }) => (
  <button
    type="button"
    className={`rounded-lg py-2 text-[13px] ${primary ? 'bg-[#ff7a30] text-white' : 'bg-[#f4f4f4] text-[#666]'}`}
    onClick={onClick}
  >
    {children}
  </button>
);

export const NovelMinePanel: React.FC<NovelMinePanelProps> = ({
  mineStats,
  readerAppearance,
  onReaderAppearanceChange,
  onContinueLatest,
  onOpenBookshelf,
  onClearGenreCache,
  onClearCommentCache,
  onResetGuide,
  onResetReaderAppearance,
  onRefreshCurrentGenre,
}) => {
  return (
    <div className="space-y-3 px-3 pb-4 pt-3">
      <section className="rounded-2xl bg-white p-4">
        <div className="text-[15px] font-semibold text-[#222]">阅读数据</div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <StatCell value={mineStats.totalBooks} label="书架小说" />
          <StatCell value={mineStats.readBooks} label="阅读中" />
          <StatCell value={mineStats.cachedChapters} label="缓存章节" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ActionButton primary onClick={onContinueLatest}>继续最近阅读</ActionButton>
          <ActionButton onClick={onOpenBookshelf}>打开书架</ActionButton>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4">
        <div className="text-[15px] font-semibold text-[#222]">阅读设置</div>
        <div className="mt-3 text-[12px] text-[#888]">阅读背景</div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {READER_BACKGROUND_OPTIONS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onReaderAppearanceChange((prev) => ({ ...prev, background: item.key }))}
              className={`rounded-lg border px-2 py-2 text-[12px] ${readerAppearance.background === item.key ? 'border-[#ff7a30] text-[#ff7a30]' : 'border-[#e9e9e9] text-[#666]'}`}
            >
              <div className="mx-auto h-6 w-10 rounded" style={{ backgroundColor: item.bg }} />
              <div className="mt-1">{item.label}</div>
            </button>
          ))}
        </div>

        <div className="mt-3 text-[12px] text-[#888]">字体大小：{readerAppearance.fontSize}px</div>
        <input
          type="range"
          min={14}
          max={22}
          step={1}
          value={readerAppearance.fontSize}
          onChange={(event) => onReaderAppearanceChange((prev) => ({ ...prev, fontSize: Number(event.target.value) }))}
          className="mt-2 w-full"
        />

        <div className="mt-3 text-[12px] text-[#888]">行间距：{readerAppearance.lineHeight.toFixed(1)}</div>
        <input
          type="range"
          min={1.6}
          max={2.6}
          step={0.1}
          value={readerAppearance.lineHeight}
          onChange={(event) => onReaderAppearanceChange((prev) => ({ ...prev, lineHeight: Number(event.target.value) }))}
          className="mt-2 w-full"
        />

        <button
          type="button"
          className="mt-3 w-full rounded-lg bg-[#f4f4f4] py-2 text-[13px] text-[#666]"
          onClick={onResetReaderAppearance}
        >
          恢复默认阅读样式
        </button>
      </section>

      <section className="rounded-2xl bg-white p-4">
        <div className="text-[15px] font-semibold text-[#222]">内容管理</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ActionButton onClick={onClearGenreCache}>清空书城缓存</ActionButton>
          <ActionButton onClick={onClearCommentCache}>清空章评缓存</ActionButton>
          <ActionButton onClick={onResetGuide}>重置类型引导</ActionButton>
          <ActionButton onClick={onRefreshCurrentGenre}>刷新当前类型</ActionButton>
        </div>
      </section>
    </div>
  );
};
