import { useCallback } from 'react';
import type { AISettings } from '../types/index.ts';
import {
  estimateChatRequestUsageBreakdown,
  estimateChatRequestChars,
  MAX_AI_CONTEXT_CHARS,
  shouldApplyAiContextBudget
} from '../services/aiRequestBudget';
import {
  buildAiContextWarningMessage,
  getAiContextWarningMuted,
  setAiContextWarningMuted,
  shouldWarnOnAiContextBudget
} from '../services/aiContextWarning';

type OpenConfirm = (
  message: string,
  onConfirm: () => void,
  title?: string,
  options?: {
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    dismissOnBackdrop?: boolean;
  }
) => void;

export type AiContextRiskInput = {
  personality: string;
  runtimeUserPrompt?: string;
  history: Array<{ role: 'user' | 'model'; text: string; imageUrl?: string }>;
};

export const useAiContextRiskWarning = (
  provider: AISettings['provider'],
  openConfirm: OpenConfirm
) => {
  const openAiContextWarningDialog = useCallback((message: string) => {
    if (!shouldApplyAiContextBudget(provider)) return Promise.resolve();
    if (getAiContextWarningMuted()) return Promise.resolve();
    return new Promise<void>((resolve) => {
      openConfirm(
        message,
        () => resolve(),
        '上下文提醒',
        {
          confirmText: '我知道了',
          cancelText: '不再提醒',
          dismissOnBackdrop: false,
          onCancel: () => {
            setAiContextWarningMuted(true);
            resolve();
          }
        }
      );
    });
  }, [openConfirm, provider]);

  const warnAiContextRiskIfNeeded = useCallback(async (input: AiContextRiskInput) => {
    if (!shouldApplyAiContextBudget(provider)) return;
    if (getAiContextWarningMuted()) return;
    const totalChars = estimateChatRequestChars(input.personality, input.runtimeUserPrompt, input.history);
    if (!shouldWarnOnAiContextBudget(totalChars, MAX_AI_CONTEXT_CHARS)) return;
    const breakdown = estimateChatRequestUsageBreakdown(input.personality, input.runtimeUserPrompt, input.history);
    await openAiContextWarningDialog(buildAiContextWarningMessage({
      mode: 'overBudget',
      totalChars,
      limitChars: MAX_AI_CONTEXT_CHARS,
      breakdown
    }));
  }, [openAiContextWarningDialog, provider]);

  const handleHighContextLimitWarning = useCallback((contextLimit: number) => {
    if (!shouldApplyAiContextBudget(provider)) return;
    if (getAiContextWarningMuted()) return;
    void openAiContextWarningDialog(buildAiContextWarningMessage({
      mode: 'highLimit',
      contextLimit,
      limitChars: MAX_AI_CONTEXT_CHARS
    }));
  }, [openAiContextWarningDialog, provider]);

  return {
    warnAiContextRiskIfNeeded,
    handleHighContextLimitWarning
  };
};
