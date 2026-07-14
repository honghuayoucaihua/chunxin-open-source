import {
  type AiContextUsageBreakdownItem,
  MAX_AI_CONTEXT_CHARS,
  clampContextMessageLimit
} from './aiRequestBudget.ts';

export const AI_CONTEXT_WARNING_MUTED_STORAGE_KEY = 'aiContextWarningMuted';
export const HIGH_CONTEXT_MESSAGE_WARNING_THRESHOLD = 60;

type BuildAiContextWarningMessageInput = {
  mode: 'highLimit' | 'overBudget';
  contextLimit?: number;
  totalChars?: number;
  limitChars?: number;
  breakdown?: AiContextUsageBreakdownItem[];
};

const formatChars = (value: number | undefined): string => {
  const safeValue = Math.max(0, Number(value || 0));
  return `${safeValue}`;
};

const formatUsagePercent = (chars: number, totalChars: number): string => {
  const total = Math.max(1, Number(totalChars || 0));
  const percent = Math.round((Math.max(0, Number(chars || 0)) / total) * 100);
  return `${percent}%`;
};

const buildBreakdownLines = (
  breakdown: AiContextUsageBreakdownItem[] | undefined,
  totalChars: number
): string[] => {
  const items = (Array.isArray(breakdown) ? breakdown : [])
    .filter((item) => item && Number(item.chars || 0) > 0)
    .sort((a, b) => Number(b.chars || 0) - Number(a.chars || 0));
  if (items.length === 0) return [];
  return [
    '',
    '本次上下文占用：',
    ...items.map((item, index) =>
      `${index + 1}. ${item.label}：${formatChars(item.chars)} 字符（约 ${formatUsagePercent(item.chars, totalChars)}）`
    )
  ];
};

export const getAiContextWarningMuted = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(AI_CONTEXT_WARNING_MUTED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

export const setAiContextWarningMuted = (muted: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    if (muted) {
      localStorage.setItem(AI_CONTEXT_WARNING_MUTED_STORAGE_KEY, '1');
      return;
    }
    localStorage.removeItem(AI_CONTEXT_WARNING_MUTED_STORAGE_KEY);
  } catch {
    // ignore
  }
};

export const isHighContextMessageLimit = (value: unknown): boolean =>
  clampContextMessageLimit(value) >= HIGH_CONTEXT_MESSAGE_WARNING_THRESHOLD;

export const shouldWarnOnContextLimitIncrease = (previousValue: unknown, nextValue: unknown): boolean =>
  !isHighContextMessageLimit(previousValue) && isHighContextMessageLimit(nextValue);

export const shouldWarnOnAiContextBudget = (
  totalChars: number,
  limitChars: number = MAX_AI_CONTEXT_CHARS
): boolean => Number(totalChars || 0) > Math.max(1, Number(limitChars || MAX_AI_CONTEXT_CHARS));

export const buildAiContextWarningMessage = (input: BuildAiContextWarningMessageInput): string => {
  const limitChars = Math.max(1, Number(input.limitChars || MAX_AI_CONTEXT_CHARS));
  const commonLines = [
    '你可以优先检查这些位置：',
    '1. 聊天详情 > 最大上下文条数',
    '2. 世界书',
    '3. HTML 模板',
    '4. 群聊成员资料和记忆',
    '',
    '该提醒仅针对内置AI：上下文过高可能导致内置AI变慢、请求失败，严重时可能无法工作并被系统禁用；自定义API不受此限制。'
  ];

  if (input.mode === 'overBudget') {
    const totalChars = Math.max(0, Number(input.totalChars || 0));
    return [
      `当前这次发送的上下文已经偏大（约 ${formatChars(totalChars)} / ${formatChars(limitChars)} 字符）。`,
      ...buildBreakdownLines(input.breakdown, totalChars),
      ...commonLines
    ].join('\n');
  }

  const contextLimit = clampContextMessageLimit(input.contextLimit);
  return [
    `你当前把“最大上下文条数”设置到了较高值（${contextLimit} 条）。`,
    ...commonLines
  ].join('\n');
};
