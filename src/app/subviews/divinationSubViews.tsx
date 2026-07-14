import React from 'react';
import { SharedEmptyState } from '../../settings/SharedPanelPrimitives';
import {
  DIVINATION_METHOD_OPTIONS,
  DIVINATION_TYPE_OPTIONS,
  TAROT_SPREAD_TYPE_OPTIONS,
  createDefaultDivinationDraft,
  getDivinationTypeLabel
} from '../../services/divinationService';
import { markdownToHtml } from '../../services/divinationMarkdown';
import type { DivinationDraft, DivinationHistoryItem, SubView } from '../../types';

export type DivinationSubView = Extract<SubView, 'divination' | 'divinationResult' | 'divinationHistory'>;

export type DivinationSubViewParams = {
  subView: DivinationSubView;
  goBackSubView: () => void;
  draft: DivinationDraft;
  onDraftChange: React.Dispatch<React.SetStateAction<DivinationDraft>>;
  history: DivinationHistoryItem[];
  currentRecord: DivinationHistoryItem | null;
  submitting: boolean;
  onSubmit: (draft: DivinationDraft) => Promise<void>;
  onOpenHistory: () => void;
  onSelectHistory: (item: DivinationHistoryItem) => void;
};

const THEME = {
  pageBg: '#090611',
  pageBg2: '#130b1f',
  pageBg3: '#1b1129',
  card: 'rgba(18, 13, 31, 0.78)',
  cardStrong: 'rgba(25, 18, 40, 0.9)',
  border: 'rgba(224, 184, 118, 0.26)',
  borderStrong: 'rgba(240, 198, 126, 0.42)',
  text: '#f4e9d2',
  textSoft: '#cdbda2',
  textMute: '#9f8b73',
  accent: '#d7a453',
  accentDeep: '#8f5c2d',
  accentGlow: 'rgba(215, 164, 83, 0.32)',
  input: 'rgba(11, 8, 20, 0.84)',
  inputBorder: 'rgba(203, 162, 100, 0.24)',
  chip: 'rgba(255, 238, 202, 0.08)',
  chipActive: 'linear-gradient(135deg, rgba(215, 164, 83, 0.3) 0%, rgba(120, 64, 43, 0.24) 100%)'
};

const pageStyle: React.CSSProperties = {
  minHeight: '100%',
  background: `
    radial-gradient(circle at 20% 0%, rgba(127, 74, 169, 0.22) 0%, transparent 32%),
    radial-gradient(circle at 80% 15%, rgba(221, 138, 72, 0.16) 0%, transparent 30%),
    radial-gradient(circle at 50% 100%, rgba(68, 30, 86, 0.38) 0%, transparent 45%),
    linear-gradient(180deg, ${THEME.pageBg} 0%, ${THEME.pageBg2} 48%, ${THEME.pageBg3} 100%)
  `,
  color: THEME.text
};

const shellStyle: React.CSSProperties = {
  background: 'rgba(7, 5, 15, 0.28)',
  backdropFilter: 'blur(18px)'
};

const cardStyle: React.CSSProperties = {
  background: THEME.card,
  border: `1px solid ${THEME.border}`,
  boxShadow: '0 18px 45px rgba(0, 0, 0, 0.36), inset 0 1px 0 rgba(255,255,255,0.04)'
};

const strongCardStyle: React.CSSProperties = {
  ...cardStyle,
  background: THEME.cardStrong,
  border: `1px solid ${THEME.borderStrong}`
};

const inputStyle: React.CSSProperties = {
  background: THEME.input,
  border: `1px solid ${THEME.inputBorder}`,
  color: THEME.text,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)'
};

const inputClassName = 'w-full rounded-2xl px-3 py-3 text-[14px] outline-none';
const labelClassName = 'text-[12px] font-semibold tracking-[0.12em] uppercase';
const helperClassName = 'text-[12px] leading-5';

const formatTime = (value: number): string => new Date(value).toLocaleString('zh-CN', { hour12: false });

const openFullDivinationSite = () => {
  try {
    globalThis.location.href = '';
  } catch {
    globalThis.open?.('', '_blank', 'noopener,noreferrer');
  }
};

const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  const html = React.useMemo(() => markdownToHtml(content), [content]);
  return (
    <div
      className="divination-markdown text-[14px] leading-7"
      style={{ color: THEME.text }}
      dangerouslySetInnerHTML={{ __html: html || '<p>暂无解读内容</p>' }}
    />
  );
};

const LoadingOracle: React.FC<{ text?: string }> = ({ text = '正在聆听牌面与天象，请稍候...' }) => (
  <div
    className="rounded-[22px] px-4 py-4 flex items-center gap-3"
    style={{
      background: 'rgba(7, 5, 14, 0.72)',
      border: `1px solid ${THEME.inputBorder}`,
      color: THEME.textSoft
    }}
  >
    <div className="relative w-10 h-10 flex items-center justify-center">
      <span className="absolute inset-0 rounded-full border" style={{ borderColor: 'rgba(215, 164, 83, 0.2)' }}></span>
      <span className="absolute inset-[5px] rounded-full border border-t-transparent animate-spin" style={{ borderColor: THEME.accent }}></span>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: THEME.accent, boxShadow: `0 0 14px ${THEME.accentGlow}` }}></span>
    </div>
    <div className="text-[13px] leading-6">{text}</div>
  </div>
);

const MysticBackground: React.FC = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div
      className="absolute inset-0 opacity-70"
      style={{
        backgroundImage: `
          radial-gradient(circle at 18% 24%, rgba(255,255,255,0.8) 0, rgba(255,255,255,0.8) 1px, transparent 1.4px),
          radial-gradient(circle at 72% 18%, rgba(255,255,255,0.65) 0, rgba(255,255,255,0.65) 1px, transparent 1.4px),
          radial-gradient(circle at 64% 68%, rgba(255,255,255,0.45) 0, rgba(255,255,255,0.45) 1px, transparent 1.6px),
          radial-gradient(circle at 28% 74%, rgba(255,255,255,0.5) 0, rgba(255,255,255,0.5) 1px, transparent 1.6px)
        `,
        backgroundSize: '220px 220px, 260px 260px, 320px 320px, 280px 280px'
      }}
    />
    <div
      className="absolute left-1/2 top-[14%] -translate-x-1/2 w-[420px] h-[420px] rounded-full"
      style={{
        border: `1px solid rgba(215, 164, 83, 0.08)`,
        boxShadow: '0 0 0 42px rgba(215, 164, 83, 0.03), 0 0 0 96px rgba(215, 164, 83, 0.02)'
      }}
    />
    <div
      className="absolute left-1/2 top-[14%] -translate-x-1/2 w-[240px] h-[240px] rounded-full"
      style={{ border: '1px dashed rgba(240, 198, 126, 0.1)' }}
    />
  </div>
);

const DivinationHeader: React.FC<{ title: string; subtitle?: string; onBack: () => void; rightSlot?: React.ReactNode }> = ({
  title,
  subtitle,
  onBack,
  rightSlot
}) => (
  <header
    className="sticky top-0 z-[20] px-4"
    style={{
      paddingTop: 'var(--safe-top)',
      background: 'linear-gradient(180deg, rgba(9, 6, 17, 0.94) 0%, rgba(9, 6, 17, 0.64) 100%)',
      backdropFilter: 'blur(14px)',
      borderBottom: `1px solid rgba(224, 184, 118, 0.12)`
    }}
  >
    <div className="h-[62px] flex items-center">
      <button
        type="button"
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${THEME.border}`,
          color: THEME.text
        }}
        onClick={onBack}
      >
        <i className="fa-solid fa-chevron-left text-[12px]"></i>
      </button>
      <div className="flex-1 px-3 text-center">
        <div className="text-[17px] font-semibold tracking-[0.14em]">{title}</div>
        {subtitle ? <div className="mt-0.5 text-[11px] tracking-[0.2em]" style={{ color: THEME.textMute }}>{subtitle}</div> : null}
      </div>
      <div className="min-w-[40px] flex justify-end">{rightSlot}</div>
    </div>
  </header>
);

const DraftField: React.FC<{ label: string; helper?: string; children: React.ReactNode }> = ({ label, helper, children }) => (
  <div className="space-y-2">
    <div className={labelClassName} style={{ color: THEME.textSoft }}>{label}</div>
    {children}
    {helper ? <div className={helperClassName} style={{ color: THEME.textMute }}>{helper}</div> : null}
  </div>
);

const SegmentedOptions: React.FC<{
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}> = ({ value, options, onChange }) => (
  <div className="grid grid-cols-3 gap-2">
    {options.map((option) => {
      const active = option.value === value;
      return (
        <button
          key={option.value}
          type="button"
          className="rounded-2xl border px-3 py-2 text-[13px] transition-colors"
          style={{
            background: active ? THEME.chipActive : THEME.chip,
            color: active ? THEME.text : THEME.textSoft,
            borderColor: active ? THEME.borderStrong : THEME.border
          }}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

const updateDraft = (
  setDraft: React.Dispatch<React.SetStateAction<DivinationDraft>>,
  patch: Partial<DivinationDraft>
) => {
  setDraft((prev) => ({ ...prev, ...patch }));
};

const updateSupplementary = (
  setDraft: React.Dispatch<React.SetStateAction<DivinationDraft>>,
  patch: Partial<DivinationDraft['supplementaryInfo']>
) => {
  setDraft((prev) => ({
    ...prev,
    supplementaryInfo: {
      ...prev.supplementaryInfo,
      ...patch
    }
  }));
};

const HeroPanel: React.FC<{ typeLabel: string }> = ({ typeLabel }) => (
  <div className="rounded-[28px] p-5 relative overflow-hidden" style={strongCardStyle}>
    <div
      className="absolute inset-0"
      style={{
        background: `
          radial-gradient(circle at 12% 18%, rgba(215, 164, 83, 0.18) 0%, transparent 30%),
          radial-gradient(circle at 82% 12%, rgba(126, 71, 153, 0.16) 0%, transparent 28%),
          linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)
        `
      }}
    />
    <div className="relative">
      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] tracking-[0.18em] uppercase" style={{ background: 'rgba(255,255,255,0.05)', color: THEME.textSoft, border: `1px solid ${THEME.border}` }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: THEME.accent, boxShadow: `0 0 12px ${THEME.accentGlow}` }} />
        命盘已启
      </div>
      <div className="mt-4 text-[28px] font-semibold tracking-[0.18em]">占卜</div>
      <div className="mt-2 text-[13px] leading-6 max-w-[280px]" style={{ color: THEME.textSoft }}>
        在静夜与微光之间，向未知提出你的问题。
      </div>
      <div className="mt-5 flex items-center justify-between">
        <div className="text-[12px] tracking-[0.16em] uppercase" style={{ color: THEME.textMute }}>当前方式</div>
        <div className="text-[13px] font-medium" style={{ color: THEME.accent }}>{typeLabel}</div>
      </div>
    </div>
  </div>
);

const MarkdownStyles: React.FC = () => (
  <style>{`
    .divination-markdown h1,
    .divination-markdown h2,
    .divination-markdown h3,
    .divination-markdown h4,
    .divination-markdown h5,
    .divination-markdown h6 {
      margin: 0 0 12px;
      color: ${THEME.accent};
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    .divination-markdown h1 { font-size: 18px; }
    .divination-markdown h2 { font-size: 16px; }
    .divination-markdown h3 { font-size: 15px; }
    .divination-markdown h4 { font-size: 14px; }
    .divination-markdown h5 { font-size: 13px; }
    .divination-markdown h6 { font-size: 12px; color: ${THEME.textSoft}; }
    .divination-markdown p { margin: 0 0 12px; }
    .divination-markdown ul { margin: 0 0 12px; padding-left: 18px; }
    .divination-markdown li { margin: 0 0 6px; }
    .divination-markdown strong { color: ${THEME.text}; font-weight: 700; }
    .divination-markdown em { color: ${THEME.textSoft}; font-style: italic; }
    .divination-markdown del { color: ${THEME.textMute}; text-decoration-color: ${THEME.textMute}; }
    .divination-markdown a { color: #f2c980; text-decoration: underline; text-underline-offset: 3px; }
    .divination-markdown code {
      padding: 1px 6px;
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      color: ${THEME.accent};
      font-size: 12px;
    }
    .divination-markdown hr {
      border: none;
      border-top: 1px solid ${THEME.border};
      margin: 16px 0;
    }
    .divination-markdown blockquote {
      margin: 0 0 12px;
      padding: 10px 14px;
      border-left: 2px solid ${THEME.accent};
      background: rgba(255,255,255,0.04);
      color: ${THEME.textSoft};
    }
    .divination-markdown ol {
      margin: 0 0 12px;
      padding-left: 20px;
    }
    .divination-markdown table {
      width: 100%;
      margin: 0 0 12px;
      border-collapse: collapse;
      overflow: hidden;
      border-radius: 16px;
      border: 1px solid ${THEME.border};
      background: rgba(255,255,255,0.03);
    }
    .divination-markdown th,
    .divination-markdown td {
      padding: 10px 12px;
      border: 1px solid ${THEME.border};
      text-align: left;
      vertical-align: top;
    }
    .divination-markdown th {
      color: ${THEME.accent};
      font-weight: 700;
      background: rgba(255,255,255,0.04);
    }
    .divination-markdown pre {
      margin: 0 0 12px;
      padding: 12px 14px;
      border-radius: 16px;
      overflow-x: auto;
      background: rgba(0,0,0,0.26);
      border: 1px solid ${THEME.border};
    }
    .divination-markdown pre code {
      display: block;
      padding: 0;
      background: transparent;
      font-size: 12px;
      color: ${THEME.textSoft};
    }
  `}</style>
);

const DivinationPage: React.FC<Omit<DivinationSubViewParams, 'subView' | 'currentRecord' | 'history' | 'onSelectHistory'>> = ({
  goBackSubView,
  draft,
  onDraftChange,
  submitting,
  onSubmit,
  onOpenHistory
}) => {
  const showMethod = draft.type === 'liuyao' || draft.type === 'meihua' || draft.type === 'qimen';
  const showDivinationNumber = showMethod && draft.method === 'number';
  const showSignNumber = draft.type === 'ssgw';
  const showSpreadType = draft.type === 'tarot';
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const questionHelper = '问题越清晰，解读越容易聚焦。';

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right duration-200 relative overflow-hidden" style={pageStyle}>
      <MarkdownStyles />
      <MysticBackground />
      <DivinationHeader
        title="神秘占卜"
        subtitle="MYSTIC DIVINATION"
        onBack={goBackSubView}
        rightSlot={(
          <button type="button" className="text-[12px] tracking-[0.14em]" style={{ color: THEME.accent }} onClick={onOpenHistory}>
            历史
          </button>
        )}
      />
      <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 space-y-3 relative" style={shellStyle}>
        <HeroPanel typeLabel={getDivinationTypeLabel(draft.type)} />

        <div className="rounded-[28px] p-4 space-y-4" style={cardStyle}>
          <DraftField label="占卜类型">
            <select
              className={`app-field-select ${inputClassName}`}
              style={inputStyle}
              value={draft.type}
              onChange={(event) => {
                const nextDraft = createDefaultDivinationDraft();
                const nextType = event.target.value as DivinationDraft['type'];
                onDraftChange({
                  ...nextDraft,
                  ...draft,
                  type: nextType,
                  spreadType: nextType === 'tarot' ? (draft.spreadType || 'three') : nextDraft.spreadType
                });
              }}
            >
              {DIVINATION_TYPE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </DraftField>

          <DraftField label="问题" helper={questionHelper}>
            <textarea
              className={`${inputClassName} min-h-[104px] resize-none`}
              style={inputStyle}
              placeholder="例如：我接下来三个月的工作调整是否顺利？"
              value={draft.question}
              onChange={(event) => updateDraft(onDraftChange, { question: event.target.value })}
            />
          </DraftField>

          {showMethod ? (
            <DraftField label="起卦方式">
              <SegmentedOptions
                value={draft.method}
                options={DIVINATION_METHOD_OPTIONS}
                onChange={(value) => updateDraft(onDraftChange, { method: value as DivinationDraft['method'], divinationNumber: value === 'number' ? draft.divinationNumber : '' })}
              />
            </DraftField>
          ) : null}

          {showSpreadType ? (
            <DraftField label="牌阵">
              <select
                className={`app-field-select ${inputClassName}`}
                style={inputStyle}
                value={draft.spreadType}
                onChange={(event) => updateDraft(onDraftChange, { spreadType: event.target.value })}
              >
                {TAROT_SPREAD_TYPE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </DraftField>
          ) : null}
        </div>

        <div className="rounded-[28px] overflow-hidden" style={cardStyle}>
          <button
            type="button"
            className="w-full px-4 py-3 flex items-center justify-between text-left"
            onClick={() => setShowAdvanced((prev) => !prev)}
          >
            <span className="text-[13px] font-semibold tracking-[0.12em] uppercase" style={{ color: THEME.textSoft }}>补充设置</span>
            <i className={`fa-solid text-[12px] ${showAdvanced ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ color: THEME.textMute }}></i>
          </button>
          {showAdvanced ? (
            <div className="px-4 py-4 space-y-3" style={{ borderTop: `1px solid ${THEME.border}` }}>
              {showDivinationNumber ? (
                <DraftField label="数字">
                  <input
                    className={inputClassName}
                    style={inputStyle}
                    inputMode="numeric"
                    placeholder="请输入数字"
                    value={draft.divinationNumber}
                    onChange={(event) => updateDraft(onDraftChange, { divinationNumber: event.target.value.replace(/[^\d]/g, '') })}
                  />
                </DraftField>
              ) : null}

              {showSignNumber ? (
                <DraftField label="签号" helper="留空则随机抽签。">
                  <input
                    className={inputClassName}
                    style={inputStyle}
                    inputMode="numeric"
                    placeholder="留空则随机"
                    value={draft.signNumber}
                    onChange={(event) => updateDraft(onDraftChange, { signNumber: event.target.value.replace(/[^\d]/g, '') })}
                  />
                </DraftField>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <DraftField label="性别">
                  <select
                    className={`app-field-select ${inputClassName}`}
                    style={inputStyle}
                    value={draft.supplementaryInfo.gender}
                    onChange={(event) => updateSupplementary(onDraftChange, { gender: event.target.value as DivinationDraft['supplementaryInfo']['gender'] })}
                  >
                    <option value="">不填写</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </DraftField>
                <DraftField label="出生年份">
                  <input
                    className={inputClassName}
                    style={inputStyle}
                    inputMode="numeric"
                    placeholder="例如 1996"
                    value={draft.supplementaryInfo.birthYear}
                    onChange={(event) => updateSupplementary(onDraftChange, { birthYear: event.target.value.replace(/[^\d]/g, '') })}
                  />
                </DraftField>
                <DraftField label="解读风格">
                  <select
                    className={`app-field-select ${inputClassName}`}
                    style={inputStyle}
                    value={draft.supplementaryInfo.interpretationStyle}
                    onChange={(event) => updateSupplementary(onDraftChange, { interpretationStyle: event.target.value as DivinationDraft['supplementaryInfo']['interpretationStyle'] })}
                  >
                    <option value="专业">专业</option>
                    <option value="温和">温和</option>
                    <option value="直接">直接</option>
                  </select>
                </DraftField>
                <DraftField label="输出长度">
                  <select
                    className={`app-field-select ${inputClassName}`}
                    style={inputStyle}
                    value={draft.supplementaryInfo.outputLength}
                    onChange={(event) => updateSupplementary(onDraftChange, { outputLength: event.target.value as DivinationDraft['supplementaryInfo']['outputLength'] })}
                  >
                    <option value="详细">详细</option>
                    <option value="简短">简短</option>
                  </select>
                </DraftField>
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="w-full rounded-[28px] py-4 text-[15px] font-semibold disabled:opacity-60"
          style={{
            color: '#2a1706',
            background: `linear-gradient(135deg, #f1c676 0%, ${THEME.accent} 52%, ${THEME.accentDeep} 100%)`,
            boxShadow: `0 0 0 1px rgba(255,255,255,0.05), 0 18px 44px ${THEME.accentGlow}`
          }}
          onClick={() => void onSubmit(draft)}
          disabled={submitting}
        >
          {submitting ? '占卜进行中...' : '开始占卜'}
        </button>

        <button
          type="button"
          className="w-full rounded-[24px] py-3 text-[14px] font-medium"
          style={{
            color: THEME.textSoft,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${THEME.border}`
          }}
          onClick={openFullDivinationSite}
        >
          访问完整版
        </button>
      </div>
    </div>
  );
};

const DivinationResultPage: React.FC<{ goBackSubView: () => void; currentRecord: DivinationHistoryItem | null; submitting: boolean }> = ({
  goBackSubView,
  currentRecord,
  submitting
}) => (
  <div className="flex flex-col h-full animate-in slide-in-from-right duration-200 relative overflow-hidden" style={pageStyle}>
    <MarkdownStyles />
    <MysticBackground />
    <DivinationHeader title="启示结果" subtitle="REVELATION" onBack={goBackSubView} />
    <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 relative" style={shellStyle}>
      {!currentRecord ? (
        <SharedEmptyState className="py-16">暂无结果</SharedEmptyState>
      ) : (
        <div className="space-y-3">
          <div className="rounded-[28px] p-5 space-y-2" style={strongCardStyle}>
            <div className="text-[18px] font-semibold tracking-[0.08em]">{currentRecord.title}</div>
            <div className="text-[12px]" style={{ color: THEME.textSoft }}>{formatTime(currentRecord.createdAt)}</div>
            <div className="text-[12px]" style={{ color: THEME.textMute }}>请求编号：{currentRecord.requestId}</div>
            {currentRecord.draft.question ? (
              <div
                className="rounded-2xl px-3 py-3 text-[13px] leading-6"
                style={{ background: 'rgba(8, 6, 17, 0.72)', border: `1px solid ${THEME.inputBorder}`, color: THEME.textSoft }}
              >
                {currentRecord.draft.question}
              </div>
            ) : null}
          </div>

          <div className="rounded-[28px] p-5 space-y-3" style={cardStyle}>
            <div className={labelClassName} style={{ color: THEME.accent }}>AI 解读</div>
            {submitting && !currentRecord.interpretation ? <LoadingOracle /> : null}
            {currentRecord.interpretation ? <MarkdownContent content={currentRecord.interpretation} /> : null}
            {submitting && currentRecord.interpretation ? <LoadingOracle text="解读仍在继续生成..." /> : null}
          </div>
        </div>
      )}
    </div>
  </div>
);

const DivinationHistoryPage: React.FC<{
  goBackSubView: () => void;
  history: DivinationHistoryItem[];
  onSelectHistory: (item: DivinationHistoryItem) => void;
}> = ({ goBackSubView, history, onSelectHistory }) => (
  <div className="flex flex-col h-full animate-in slide-in-from-right duration-200 relative overflow-hidden" style={pageStyle}>
    <MarkdownStyles />
    <MysticBackground />
    <DivinationHeader title="往昔记录" subtitle="ARCHIVE" onBack={goBackSubView} />
    <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 relative" style={shellStyle}>
      {history.length === 0 ? (
        <SharedEmptyState className="py-16">暂无历史记录</SharedEmptyState>
      ) : (
        <div className="space-y-2">
          {history.map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full text-left rounded-[26px] p-4 transition-transform active:scale-[0.99]"
              style={cardStyle}
              onClick={() => onSelectHistory(item)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[14px] font-medium truncate" style={{ color: THEME.text }}>{item.title}</div>
                  <div className="mt-1 text-[12px]" style={{ color: THEME.accent }}>{getDivinationTypeLabel(item.type)}</div>
                  {item.draft.question ? (
                    <div className="mt-2 text-[13px] leading-6 line-clamp-2" style={{ color: THEME.textSoft }}>{item.draft.question}</div>
                  ) : null}
                </div>
                <i className="fa-solid fa-chevron-right text-[12px] mt-1" style={{ color: THEME.textMute }}></i>
              </div>
              <div className="mt-3 text-[12px]" style={{ color: THEME.textMute }}>{formatTime(item.createdAt)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
);

export const renderDivinationSubView = (params: DivinationSubViewParams) => {
  if (params.subView === 'divination') {
    return (
      <DivinationPage
        goBackSubView={params.goBackSubView}
        draft={params.draft}
        onDraftChange={params.onDraftChange}
        submitting={params.submitting}
        onSubmit={params.onSubmit}
        onOpenHistory={params.onOpenHistory}
      />
    );
  }
  if (params.subView === 'divinationResult') {
    return <DivinationResultPage goBackSubView={params.goBackSubView} currentRecord={params.currentRecord} submitting={params.submitting} />;
  }
  if (params.subView === 'divinationHistory') {
    return <DivinationHistoryPage goBackSubView={params.goBackSubView} history={params.history} onSelectHistory={params.onSelectHistory} />;
  }
  return null;
};

export const DivinationSubViewRouter: React.FC<DivinationSubViewParams> = (params) => renderDivinationSubView(params);
