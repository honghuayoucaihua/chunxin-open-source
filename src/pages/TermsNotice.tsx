import React, { useMemo, useState } from 'react';
import { TERMS_NOTICE_ITEMS } from './termsNoticeContent';
import { exitApp, isAndroid } from '../services/nativeService';

interface TermsNoticeProps {
  onAgree: () => void;
}

type ArithmeticQuestion = { question: string; answer: number };

const buildMultiplicationQuestion = (): ArithmeticQuestion => {
  const left = 2 + Math.floor(Math.random() * 11); // 2~12
  const maxRight = Math.max(2, Math.min(12, Math.floor(99 / left))); // 确保结果不超过两位数（<=99）
  const right = 2 + Math.floor(Math.random() * Math.max(1, maxRight - 1)); // 2~maxRight
  return {
    question: `${left} × ${right}`,
    answer: left * right
  };
};

const TermsNotice: React.FC<TermsNoticeProps> = ({ onAgree }) => {
  type TermsNoticePage = 'items' | 'finalConfirm';
  const [page, setPage] = useState<TermsNoticePage>('items');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [confirmedItemIds, setConfirmedItemIds] = useState<Set<string>>(() => new Set());
  const [hasFullCivilCapacity, setHasFullCivilCapacity] = useState(false);
  const [arithmetic, setArithmetic] = useState<ArithmeticQuestion>(() => buildMultiplicationQuestion());
  const [arithmeticInput, setArithmeticInput] = useState('');

  const activeItem = useMemo(() => {
    if (!activeItemId) return null;
    return TERMS_NOTICE_ITEMS.find((item) => item.id === activeItemId) ?? null;
  }, [activeItemId]);

  const confirmedCount = confirmedItemIds.size;
  const totalCount = TERMS_NOTICE_ITEMS.length;
  const isAllConfirmed = confirmedCount >= totalCount;

  const handleBypass = () => {
    onAgree();
  };

  const handleDisagreeExit = async () => {
    if (isAndroid.valueOf()) {
      await exitApp();
      window.setTimeout(() => {
        window.location.href = 'https://www.baidu.com/';
      }, 300);
      return;
    }
    window.location.href = 'https://www.baidu.com/';
  };

  const handleAgree = () => {
    if (!isAllConfirmed) return;
    setHasFullCivilCapacity(false);
    setArithmeticInput('');
    setArithmetic(buildMultiplicationQuestion());
    setPage('finalConfirm');
  };

  const arithmeticText = arithmeticInput.trim();
  const isArithmeticFormatValid = /^\d+$/.test(arithmeticText);
  const parsedArithmeticInput = isArithmeticFormatValid ? Number.parseInt(arithmeticText, 10) : Number.NaN;
  const isArithmeticCorrect = isArithmeticFormatValid && Number.isFinite(parsedArithmeticInput) && parsedArithmeticInput === arithmetic.answer;
  const canFinalAgree = hasFullCivilCapacity && isArithmeticCorrect;

  const handleConfirmActiveItem = () => {
    if (!activeItem) return;
    setConfirmedItemIds((prev) => {
      const next = new Set(prev);
      next.add(activeItem.id);
      return next;
    });
    setActiveItemId(null);
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[90%] max-w-[420px] render-bg-elevated rounded-xl shadow-2xl border render-border-subtle overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b render-border text-center relative">
          <h2 className="text-[17px] font-semibold render-text-primary">使用前须知</h2>
          <p className="text-[12px] render-text-secondary mt-1">
            {activeItem ? activeItem.title : page === 'finalConfirm' ? '请完成最终确认后进入' : '请逐条点击查看并确认'}
          </p>
          <button
            type="button"
            aria-label="隐藏关闭"
            tabIndex={-1}
            onClick={handleBypass}
            className="absolute right-4 top-4 w-7 h-7 opacity-0 focus:outline-none"
          />
        </div>

        {/* Content */}
        <div
          className="px-5 py-4 h-[280px] overflow-y-auto"
          style={{
            scrollBehavior: 'smooth'
          }}
        >
          {page === 'finalConfirm' ? (
            <div className="flex flex-col gap-4">
              <div className="text-[14px] render-text-primary font-semibold">最终确认</div>

              <label className="flex items-start gap-2 text-[13px] render-text-secondary leading-relaxed cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasFullCivilCapacity}
                  onChange={(e) => setHasFullCivilCapacity(e.target.checked)}
                  className="mt-1"
                />
                <span>我已具备完全民事行为能力</span>
              </label>

              <div className="border render-border-subtle rounded-lg p-4 render-bg-secondary">
                <div className="text-[13px] render-text-primary font-semibold">随机乘法题</div>
                <div className="mt-1 text-[12px] render-text-secondary">
                  请填写正确答案后才能进入：<span className="font-semibold render-text-primary">{arithmetic.question}</span>
                </div>
                <input
                  value={arithmeticInput}
                  onChange={(e) => setArithmeticInput(e.target.value)}
                  inputMode="numeric"
                  placeholder="请输入答案"
                  className="mt-3 w-full h-10 px-3 rounded-lg border render-border-subtle render-bg-elevated text-[14px] outline-none"
                />
                {arithmeticInput.trim().length > 0 && !isArithmeticCorrect ? (
                  <div className="mt-2 text-[11px] text-red-500">答案不正确</div>
                ) : null}
              </div>
            </div>
          ) : activeItem ? (
            <div className="text-[14px] render-text-secondary leading-relaxed whitespace-pre-line">
              {activeItem.content}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {TERMS_NOTICE_ITEMS.map((item) => {
                const isConfirmed = confirmedItemIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveItemId(item.id)}
                    className="w-full text-left p-4 rounded-lg border render-border-subtle render-bg-secondary transition-colors active:bg-[var(--bg-hover)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold render-text-primary">
                          {item.title}
                        </div>
                        <div className="mt-1 text-[12px] render-text-secondary leading-snug">
                          {item.summary}
                        </div>
                      </div>
                      <div className={`flex-shrink-0 text-[12px] ${isConfirmed ? 'text-green-600' : 'render-text-tertiary'}`}>
                        {isConfirmed ? '已确认 ✓' : '查看'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t render-border">
          {page === 'finalConfirm' ? (
            <>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPage('items')}
                  className="flex-1 py-3 rounded-lg text-[15px] font-semibold transition-all duration-200 border render-border-subtle render-bg-secondary render-text-primary active:scale-[0.98]"
                >
                  返回
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!canFinalAgree) return;
                    onAgree();
                  }}
                  disabled={!canFinalAgree}
                  className={`flex-1 py-3 rounded-lg text-[15px] font-semibold transition-all duration-200 ${
                    !canFinalAgree
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'text-white shadow-md active:scale-[0.98]'
                  }`}
                  style={canFinalAgree ? { backgroundColor: 'var(--app-accent-color)' } : {}}
                >
                  继续
                </button>
              </div>
              <button
                type="button"
                onClick={() => { void handleDisagreeExit(); }}
                className="mt-3 w-full py-3 rounded-lg text-[14px] font-semibold border render-border-subtle render-bg-secondary render-text-secondary active:scale-[0.98]"
              >
                我不同意并退出
              </button>
            </>
          ) : activeItem ? (
            <>
              <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setActiveItemId(null)}
                className="flex-1 py-3 rounded-lg text-[15px] font-semibold transition-all duration-200 border render-border-subtle render-bg-secondary render-text-primary active:scale-[0.98]"
              >
                返回
              </button>
              <button
                type="button"
                onClick={handleConfirmActiveItem}
                disabled={confirmedItemIds.has(activeItem.id)}
                className={`flex-1 py-3 rounded-lg text-[15px] font-semibold transition-all duration-200 ${
                  confirmedItemIds.has(activeItem.id)
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'text-white shadow-md active:scale-[0.98]'
                }`}
                style={!confirmedItemIds.has(activeItem.id) ? { backgroundColor: 'var(--app-accent-color)' } : {}}
              >
                {confirmedItemIds.has(activeItem.id) ? '已确认' : '我已阅读并确认'}
              </button>
              </div>
              <button
                type="button"
                onClick={() => { void handleDisagreeExit(); }}
                className="mt-3 w-full py-3 rounded-lg text-[14px] font-semibold border render-border-subtle render-bg-secondary render-text-secondary active:scale-[0.98]"
              >
                我不同意并退出
              </button>
            </>
          ) : (
            <>
              <p className="text-[11px] render-text-tertiary text-center mb-2">
                已确认 {confirmedCount}/{totalCount}
              </p>
              <button
                type="button"
                onClick={handleAgree}
                disabled={!isAllConfirmed}
                className={`w-full py-3 rounded-lg text-[15px] font-semibold transition-all duration-200 ${
                  !isAllConfirmed
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'text-white shadow-md active:scale-[0.98]'
                }`}
                style={isAllConfirmed ? { backgroundColor: 'var(--app-accent-color)' } : {}}
              >
                {isAllConfirmed ? '同意并继续' : '请逐条阅读并确认'}
              </button>
              <button
                type="button"
                onClick={() => { void handleDisagreeExit(); }}
                className="mt-3 w-full py-3 rounded-lg text-[14px] font-semibold border render-border-subtle render-bg-secondary render-text-secondary active:scale-[0.98]"
              >
                我不同意并退出
              </button>
              <p className="text-[11px] render-text-tertiary text-center mt-2">
                点击“同意并继续”即表示你已阅读、理解并同意遵守以上内容
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TermsNotice;
