interface ParsedColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

const DEFAULT_COLOR: ParsedColor = Object.freeze({ r: 0, g: 0, b: 0, a: 1 });
const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB_COLOR_RE = /^rgba?\(\s*([+-]?\d{1,3}(?:\.\d+)?)\s*,\s*([+-]?\d{1,3}(?:\.\d+)?)\s*,\s*([+-]?\d{1,3}(?:\.\d+)?)\s*(?:,\s*([+-]?\d*\.?\d+)\s*)?\)$/i;

const clampByte = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));
const clampAlpha = (value: number): number => Math.max(0, Math.min(1, value));

const expandShortHex = (value: string): string => {
  const short = value.slice(1);
  return `#${short[0]}${short[0]}${short[1]}${short[1]}${short[2]}${short[2]}`;
};

const parseHexColor = (value: string): ParsedColor | null => {
  const text = String(value || '').trim();
  if (!HEX_COLOR_RE.test(text)) return null;

  const normalized = text.length === 4 ? expandShortHex(text) : text;
  const hex = normalized.slice(1);
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
    a: 1
  };
};

const parseRgbColor = (value: string): ParsedColor | null => {
  const match = String(value || '').trim().match(RGB_COLOR_RE);
  if (!match) return null;

  return {
    r: clampByte(Number(match[1])),
    g: clampByte(Number(match[2])),
    b: clampByte(Number(match[3])),
    a: clampAlpha(match[4] === undefined ? 1 : Number(match[4]))
  };
};

const parseColorValue = (value: string): ParsedColor | null => parseHexColor(value) || parseRgbColor(value);

const parseColor = (value: string, fallback: string): ParsedColor => {
  return parseColorValue(value) || parseColorValue(fallback) || DEFAULT_COLOR;
};

const formatAlpha = (value: number): string => {
  const safeValue = clampAlpha(value);
  return safeValue.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
};

const formatHex = (value: number): string => clampByte(value).toString(16).padStart(2, '0');

const formatColor = (color: ParsedColor): string => {
  if (color.a >= 0.999) return `#${formatHex(color.r)}${formatHex(color.g)}${formatHex(color.b)}`;
  return `rgba(${clampByte(color.r)}, ${clampByte(color.g)}, ${clampByte(color.b)}, ${formatAlpha(color.a)})`;
};

const mixParsedColors = (base: ParsedColor, target: ParsedColor, weight: number, preserveBaseAlpha: boolean): ParsedColor => {
  const ratio = Math.max(0, Math.min(1, Number(weight)));
  const inverseRatio = 1 - ratio;
  return {
    r: base.r * inverseRatio + target.r * ratio,
    g: base.g * inverseRatio + target.g * ratio,
    b: base.b * inverseRatio + target.b * ratio,
    a: preserveBaseAlpha ? base.a : base.a * inverseRatio + target.a * ratio
  };
};

export const normalizeHexColor = (value: string, fallback: string): string => {
  const parsed = parseHexColor(value) || parseHexColor(fallback);
  return parsed ? formatColor(parsed) : '#000000';
};

export const hasTransparency = (value: string): boolean => {
  const parsed = parseColorValue(value);
  return !!parsed && parsed.a < 0.999;
};

export const mixColor = (base: string, target: string, weight: number, fallbackBase = '#000000', fallbackTarget = '#000000'): string => {
  const mixed = mixParsedColors(parseColor(base, fallbackBase), parseColor(target, fallbackTarget), weight, false);
  return formatColor(mixed);
};

export const mixColorKeepingAlpha = (base: string, target: string, weight: number, fallbackBase = '#000000', fallbackTarget = '#000000'): string => {
  const mixed = mixParsedColors(parseColor(base, fallbackBase), parseColor(target, fallbackTarget), weight, true);
  return formatColor(mixed);
};
