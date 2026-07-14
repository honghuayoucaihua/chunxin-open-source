import type { SentenceRange } from '../types';

const DEFAULT_SENTENCE_RANGE: SentenceRange = {
  min: 0,
  max: 3
};

const toNonNegativeInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
};

export const normalizeSentenceRange = (range?: SentenceRange | null): SentenceRange => {
  const min = toNonNegativeInt(range?.min, DEFAULT_SENTENCE_RANGE.min);
  const rawMax = toNonNegativeInt(range?.max, DEFAULT_SENTENCE_RANGE.max);
  return {
    min,
    max: rawMax < min ? min : rawMax
  };
};

export const isSentenceTagEnabled = (range?: SentenceRange | null) =>
  normalizeSentenceRange(range).max > 1;

export const buildSentenceRangeRuleLines = (range?: SentenceRange | null) => {
  const normalized = normalizeSentenceRange(range);
  if (normalized.max <= 0) {
    return ['- **分句规则**：不要使用 sentence 标签，正文只放在 text 中。'];
  }
  if (normalized.max === 1) {
    return ['- **分句规则**：正文最多 1 段，只输出 text，不要额外使用 sentence 标签。'];
  }
  const lines = [
    `- **分句规则**：首段放在 text，后续段落使用 sentence 标签；正文总段数（text + sentence）不要超过 ${normalized.max} 段。`
  ];
  if (normalized.min > 1) {
    lines.push(`- **分句规则**：当你决定分成多段时，优先控制在 ${normalized.min}-${normalized.max} 段；没有必要时可只输出 1 段 text。`);
  }
  return lines;
};

export const assertOrderedTextSegmentCountWithinSentenceRange = (
  segments: ReadonlyArray<{ type: string }>,
  range?: SentenceRange | null
) => {
  const normalized = normalizeSentenceRange(range);
  const textSegmentCount = segments.filter((segment) => segment.type === 'text').length;
  if (textSegmentCount <= 1) return;
  if (normalized.max <= 1) {
    throw new Error(`当前分句设置不允许多段正文，但模型输出了 ${textSegmentCount} 段。`);
  }
  if (textSegmentCount > normalized.max) {
    throw new Error(`模型输出了 ${textSegmentCount} 段正文，超过分句上限 ${normalized.max} 段。`);
  }
};

export const clampOrderedTextSegmentCountWithinSentenceRange = <T extends { type: string }>(
  segments: ReadonlyArray<T>,
  range?: SentenceRange | null
): { segments: T[]; truncated: boolean } => {
  const normalized = normalizeSentenceRange(range);
  if (segments.length === 0) return { segments: [], truncated: false };

  const allowedTextCount = normalized.max <= 1 ? 1 : normalized.max;
  let textCount = 0;
  let truncated = false;
  const nextSegments: T[] = [];

  segments.forEach((segment) => {
    if (segment.type !== 'text') {
      nextSegments.push(segment);
      return;
    }
    if (textCount < allowedTextCount) {
      nextSegments.push(segment);
      textCount += 1;
      return;
    }
    truncated = true;
  });

  return { segments: nextSegments, truncated };
};

const splitReplyTextToSentenceParts = (text: string): string[] => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return [];
  return (trimmed.match(/[^。！？?!]+[。！？?!]?/g) || [trimmed])
    .map((item) => String(item || '').trim())
    .filter(Boolean);
};

export const collectReplySentenceCandidates = (input: {
  sentences?: ReadonlyArray<string> | null;
  parsedText?: string | null;
  dedupe?: boolean;
}): string[] => {
  const parsedText = String(input.parsedText || '').trim();
  const baseParts = Array.isArray(input.sentences) && input.sentences.length > 0
    ? input.sentences
    : splitReplyTextToSentenceParts(parsedText);
  const normalized = baseParts
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  if (input.dedupe === false) return normalized;
  return normalized.filter((item, idx, arr) => arr.indexOf(item) === idx);
};

export const selectReplySentencePiecesWithinRange = (input: {
  candidates: ReadonlyArray<string>;
  range?: SentenceRange | null;
}): { pieces: string[]; truncated: boolean } => {
  const normalizedRange = normalizeSentenceRange(input.range);
  const candidates = input.candidates
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  const sliceCount = Math.min(candidates.length, Math.max(normalizedRange.max, normalizedRange.min));
  const count = Math.max(normalizedRange.min, Math.min(normalizedRange.max, sliceCount));
  const pieces = candidates.slice(0, count);
  return {
    pieces,
    truncated: candidates.length > pieces.length
  };
};
