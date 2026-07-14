export const MAX_AI_CONTEXT_CHARS = 50000;
export const MAX_CONTEXT_MESSAGE_LIMIT = 200;

export const shouldApplyAiContextBudget = (provider: unknown): boolean =>
  String(provider || '').trim() === 'builtin';

type BudgetHistoryItem = {
  role: 'user' | 'model';
  text: string;
  imageUrl?: string;
};

export type AiContextUsageBreakdownItem = {
  key: 'systemPrompt' | 'runtimePrompt' | 'historyText';
  label: string;
  chars: number;
};

type BuildBudgetedChatRequestInput = {
  personality: string;
  runtimeUserPrompt?: string;
  history: BudgetHistoryItem[];
  maxChars?: number;
};

type BuildBudgetedChatRequestOutput = {
  personality: string;
  runtimeUserPrompt: string;
  history: BudgetHistoryItem[];
  totalChars: number;
  trimmed: boolean;
};

const TRUNCATE_MARKER = '\n...[内容已截断]...\n';
const MAX_BASE_PROMPT_CHARS_WITH_HISTORY = 70000;
const MAX_SINGLE_HISTORY_TEXT_CHARS = 12000;
const MIN_HISTORY_TEXT_CHARS = 120;

const normalizeText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'bigint') return String(value);
  return '';
};

const normalizeHistoryItem = (item: BudgetHistoryItem): BudgetHistoryItem => ({
  role: item.role,
  text: normalizeText(item.text)
});

export const clampContextMessageLimit = (
  value: unknown,
  min: number = 1,
  max: number = MAX_CONTEXT_MESSAGE_LIMIT
): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, Math.round(parsed)));
};

const truncateKeepingBothEnds = (value: string, maxChars: number): string => {
  const text = normalizeText(value);
  if (!text) return '';
  if (text.length <= maxChars) return text;
  if (maxChars <= TRUNCATE_MARKER.length + 16) {
    return text.slice(0, Math.max(0, maxChars));
  }
  const available = maxChars - TRUNCATE_MARKER.length;
  const headLength = Math.ceil(available * 0.6);
  const tailLength = Math.max(0, available - headLength);
  return `${text.slice(0, headLength)}${TRUNCATE_MARKER}${text.slice(-tailLength)}`;
};

const estimateHistoryItemChars = (item: BudgetHistoryItem): number =>
  normalizeText(item.text).length;

const getHistoryUsageLabel = (history: BudgetHistoryItem[]): string => {
  if (history.length === 0) return '最近聊天记录';
  const groupMemberItems = history.filter((item) => normalizeText(item.text).startsWith('【群成员列表】')).length;
  if (groupMemberItems === 0) return '最近聊天记录';
  const chatItems = Math.max(0, history.length - groupMemberItems);
  if (chatItems === 0) return '群成员资料和记忆';
  return '最近聊天记录 / 群成员资料';
};

export const estimateChatRequestChars = (
  personality: string,
  runtimeUserPrompt: string | undefined,
  history: BudgetHistoryItem[]
): number => {
  return normalizeText(personality).length
    + normalizeText(runtimeUserPrompt).length
    + history.reduce((sum, item) => sum + estimateHistoryItemChars(item), 0);
};

export const estimateChatRequestUsageBreakdown = (
  personality: string,
  runtimeUserPrompt: string | undefined,
  history: BudgetHistoryItem[]
): AiContextUsageBreakdownItem[] => {
  const safeHistory = Array.isArray(history) ? history : [];
  const historyTextChars = safeHistory.reduce((sum, item) => sum + normalizeText(item.text).length, 0);
  const items: AiContextUsageBreakdownItem[] = [
    {
      key: 'systemPrompt',
      label: '角色设定 / 世界书 / 模板',
      chars: normalizeText(personality).length
    },
    {
      key: 'runtimePrompt',
      label: '记忆 / 时间 / 本轮规则',
      chars: normalizeText(runtimeUserPrompt).length
    },
    {
      key: 'historyText',
      label: getHistoryUsageLabel(safeHistory),
      chars: historyTextChars
    }
  ];
  return items.filter((item) => item.chars > 0);
};

const fitBasePromptsToBudget = (
  personality: string,
  runtimeUserPrompt: string,
  budget: number
): { personality: string; runtimeUserPrompt: string; trimmed: boolean } => {
  let nextPersonality = normalizeText(personality);
  let nextRuntimePrompt = normalizeText(runtimeUserPrompt);
  const initialTotal = nextPersonality.length + nextRuntimePrompt.length;
  if (initialTotal <= budget) {
    return { personality: nextPersonality, runtimeUserPrompt: nextRuntimePrompt, trimmed: false };
  }

  const safeBudget = Math.max(0, budget);
  const total = Math.max(1, initialTotal);
  const minPersonalityBudget = nextPersonality
    ? Math.min(1000, safeBudget)
    : 0;
  const runtimeReserveBudget = nextRuntimePrompt
    ? Math.min(
        nextRuntimePrompt.length,
        Math.max(0, safeBudget - minPersonalityBudget),
        Math.min(6000, Math.max(1200, Math.round(safeBudget * 0.2)))
      )
    : 0;
  const proportionalRuntimeBudget = Math.round((nextRuntimePrompt.length / total) * safeBudget);
  let runtimeBudget = Math.max(proportionalRuntimeBudget, runtimeReserveBudget);
  runtimeBudget = Math.min(runtimeBudget, Math.max(0, safeBudget - minPersonalityBudget));
  let personalityBudget = Math.max(0, safeBudget - runtimeBudget);
  if (nextPersonality && personalityBudget < minPersonalityBudget) {
    personalityBudget = minPersonalityBudget;
    runtimeBudget = Math.max(0, safeBudget - personalityBudget);
  }

  nextPersonality = truncateKeepingBothEnds(nextPersonality, personalityBudget);
  nextRuntimePrompt = truncateKeepingBothEnds(nextRuntimePrompt, runtimeBudget);

  while (nextPersonality.length + nextRuntimePrompt.length > safeBudget) {
    if (nextPersonality.length >= nextRuntimePrompt.length && nextPersonality.length > 0) {
      nextPersonality = truncateKeepingBothEnds(nextPersonality, Math.max(0, nextPersonality.length - 256));
      continue;
    }
    if (nextRuntimePrompt.length > 0) {
      nextRuntimePrompt = truncateKeepingBothEnds(nextRuntimePrompt, Math.max(0, nextRuntimePrompt.length - 256));
      continue;
    }
    break;
  }

  return { personality: nextPersonality, runtimeUserPrompt: nextRuntimePrompt, trimmed: true };
};

const fitHistoryItemIntoBudget = (item: BudgetHistoryItem, budget: number): BudgetHistoryItem | null => {
  if (budget <= 0) return null;

  const nextText = truncateKeepingBothEnds(normalizeText(item.text), MAX_SINGLE_HISTORY_TEXT_CHARS);

  const fullItem: BudgetHistoryItem = {
    role: item.role,
    text: nextText
  };
  if (estimateHistoryItemChars(fullItem) <= budget) {
    return fullItem;
  }

  const textOnlyItem: BudgetHistoryItem = { role: item.role, text: nextText };
  if (estimateHistoryItemChars(textOnlyItem) <= budget) {
    return textOnlyItem;
  }

  if (budget < MIN_HISTORY_TEXT_CHARS) {
    return null;
  }

  const fittedText = truncateKeepingBothEnds(nextText, budget);
  if (!fittedText) return null;
  return { role: item.role, text: fittedText };
};

const fitHistoryToBudget = (
  history: BudgetHistoryItem[],
  budget: number
): { history: BudgetHistoryItem[]; trimmed: boolean } => {
  if (budget <= 0 || history.length === 0) {
    return { history: [], trimmed: history.length > 0 };
  }

  const selected: BudgetHistoryItem[] = [];
  let remaining = budget;
  let trimmed = false;

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const normalized = normalizeHistoryItem(history[index]);
    const fullItemCost = estimateHistoryItemChars(normalized);
    const allowPartialFit = selected.length === 0;
    const fitted = allowPartialFit || fullItemCost <= remaining
      ? fitHistoryItemIntoBudget(normalized, remaining)
      : null;
    if (!fitted) {
      trimmed = true;
      continue;
    }
    selected.push(fitted);
    remaining -= estimateHistoryItemChars(fitted);
    if (fitted.text !== normalized.text || normalizeText(history[index]?.imageUrl)) {
      trimmed = true;
    }
  }

  if (selected.length !== history.length) {
    trimmed = true;
  }

  return { history: selected.reverse(), trimmed };
};

export const buildBudgetedChatRequest = (
  input: BuildBudgetedChatRequestInput
): BuildBudgetedChatRequestOutput => {
  const history = Array.isArray(input.history)
    ? input.history.map(normalizeHistoryItem).filter((item) => item.text)
    : [];
  const maxChars = Math.max(1, Number(input.maxChars || MAX_AI_CONTEXT_CHARS));
  const historyBaseBudget = history.length > 0 ? Math.min(maxChars, MAX_BASE_PROMPT_CHARS_WITH_HISTORY) : maxChars;

  const basePrompts = fitBasePromptsToBudget(
    input.personality,
    input.runtimeUserPrompt || '',
    historyBaseBudget
  );

  const remainingBudget = Math.max(
    0,
    maxChars - normalizeText(basePrompts.personality).length - normalizeText(basePrompts.runtimeUserPrompt).length
  );

  const historyBudgetResult = fitHistoryToBudget(history, remainingBudget);
  const totalChars = estimateChatRequestChars(
    basePrompts.personality,
    basePrompts.runtimeUserPrompt,
    historyBudgetResult.history
  );

  return {
    personality: basePrompts.personality,
    runtimeUserPrompt: basePrompts.runtimeUserPrompt,
    history: historyBudgetResult.history,
    totalChars,
    trimmed: basePrompts.trimmed || historyBudgetResult.trimmed
  };
};
