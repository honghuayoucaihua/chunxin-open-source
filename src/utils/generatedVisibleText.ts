const FORBIDDEN_GENERATED_FORMAT_LINE = /^\s*(?:【\s*(?:心声|动作|旁白|翻译|译文|系统说明)\s*】|\[\s*(?:心声|动作|旁白|翻译|译文|系统说明)\s*\]|(?:心声|动作|旁白|翻译|译文|系统说明)\s*[:：])/u;
const INLINE_FORBIDDEN_GENERATED_FORMAT = /(?:【\s*(?:心声|动作|旁白|翻译|译文|系统说明)\s*】|\[\s*(?:心声|动作|旁白|翻译|译文|系统说明)\s*\]|(?:心声|动作|旁白|翻译|译文|系统说明)\s*[:：])[\s\S]*$/u;
const FORBIDDEN_SYSTEM_EVENT_FORMAT_LINE = /^\s*(?:【\s*(?:系统|通话)\s*】|\[\s*(?:系统红包|系统转账)(?:·[^\]]+)?\s*\]|\[\s*(?:位置|语音|通话|红包|转账)\s*\])/u;
const INLINE_FORBIDDEN_SYSTEM_EVENT_FORMAT = /(?:【\s*(?:系统|通话)\s*】|\[\s*(?:系统红包|系统转账)(?:·[^\]]+)?\s*\]|\[\s*(?:位置|语音|通话|红包|转账)\s*\])[\s\S]*$/u;
type GeneratedFormatLabel = '心声' | '动作' | '旁白' | '翻译' | '译文' | '系统说明';

const LEADING_LABEL_PATTERNS: Record<GeneratedFormatLabel, RegExp> = {
  心声: /^\s*(?:【\s*心声\s*】|\[\s*心声\s*\]|心声\s*[:：])\s*/u,
  动作: /^\s*(?:【\s*动作\s*】|\[\s*动作\s*\]|动作\s*[:：])\s*/u,
  旁白: /^\s*(?:【\s*旁白\s*】|\[\s*旁白\s*\]|旁白\s*[:：])\s*/u,
  翻译: /^\s*(?:【\s*翻译\s*】|\[\s*翻译\s*\]|翻译\s*[:：])\s*/u,
  译文: /^\s*(?:【\s*译文\s*】|\[\s*译文\s*\]|译文\s*[:：])\s*/u,
  系统说明: /^\s*(?:【\s*系统说明\s*】|\[\s*系统说明\s*\]|系统说明\s*[:：])\s*/u
};

const stripAllowedLeadingLabels = (line: string, allowedLabels: ReadonlyArray<GeneratedFormatLabel>): string => {
  let next = line;
  let changed = true;
  while (changed) {
    changed = false;
    allowedLabels.forEach((label) => {
      const updated = next.replace(LEADING_LABEL_PATTERNS[label], '');
      if (updated !== next) {
        next = updated;
        changed = true;
      }
    });
  }
  return next.trim();
};

const getGeneratedTextSource = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

const hasForbiddenGeneratedFormat = (
  value: unknown,
  allowedLeadingLabels: ReadonlyArray<GeneratedFormatLabel>,
  extraOptions: { rejectSystemEventFormats?: boolean } = {}
): boolean => {
  return getGeneratedTextSource(value)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .some((rawLine) => {
      const line = stripAllowedLeadingLabels(rawLine.trim(), allowedLeadingLabels);
      if (!line) return false;
      return FORBIDDEN_GENERATED_FORMAT_LINE.test(line)
        || INLINE_FORBIDDEN_GENERATED_FORMAT.test(line)
        || (extraOptions.rejectSystemEventFormats
          && (FORBIDDEN_SYSTEM_EVENT_FORMAT_LINE.test(line) || INLINE_FORBIDDEN_SYSTEM_EVENT_FORMAT.test(line)));
    });
};

const normalizeGeneratedText = (
  value: unknown,
  options: { joinWith?: string; collapseWhitespace?: boolean },
  allowedLeadingLabels: ReadonlyArray<GeneratedFormatLabel>,
  extraOptions: { rejectSystemEventFormats?: boolean } = {}
): string => {
  if (hasForbiddenGeneratedFormat(value, allowedLeadingLabels, extraOptions)) return '';
  const joinWith = options.joinWith ?? ' ';
  return getGeneratedTextSource(value)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => stripAllowedLeadingLabels(line.trim(), allowedLeadingLabels))
    .filter(Boolean)
    .map((line) => options.collapseWhitespace ? line.replace(/\s+/g, ' ') : line)
    .filter(Boolean)
    .join(joinWith)
    .trim();
};

export const normalizeGeneratedVisibleText = (
  value: unknown,
  options: { joinWith?: string; collapseWhitespace?: boolean } = {}
): string => {
  return normalizeGeneratedText(value, options, []);
};

export const normalizeGeneratedNonSystemEventText = (
  value: unknown,
  options: { joinWith?: string; collapseWhitespace?: boolean } = {}
): string => normalizeGeneratedText(value, options, [], { rejectSystemEventFormats: true });

export const containsGeneratedSystemEventFormat = (value: unknown): boolean => {
  return hasForbiddenGeneratedFormat(value, [], { rejectSystemEventFormats: true });
};

export const normalizeGeneratedStrictNonSystemEventText = (
  value: unknown,
  options: { joinWith?: string; collapseWhitespace?: boolean } = {}
): string => {
  if (containsGeneratedSystemEventFormat(value)) return '';
  return normalizeGeneratedNonSystemEventText(value, options);
};

export const normalizeGeneratedTranslationText = (
  value: unknown,
  options: { joinWith?: string; collapseWhitespace?: boolean } = {}
): string => normalizeGeneratedText(value, options, ['翻译', '译文']);

export const normalizeGeneratedInnerVoiceText = (
  value: unknown,
  options: { joinWith?: string; collapseWhitespace?: boolean } = {}
): string => normalizeGeneratedText(value, options, ['心声']);

export const normalizeGeneratedActionText = (
  value: unknown,
  options: { joinWith?: string; collapseWhitespace?: boolean } = {}
): string => normalizeGeneratedText(value, options, ['动作']);
