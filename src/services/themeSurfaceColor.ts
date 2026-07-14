const THEME_COLOR_FALLBACK = '#ffffff';
const OPAQUE_ALPHA_THRESHOLD = 0.995;
const DEFAULT_TOP_SAMPLE_Y = 1;
const MAX_SAFE_TOP_SAMPLE = 16;
const SAFE_TOP_CONTENT_OFFSET = 8;
const FALLBACK_SAMPLE_Y = 8;
const TOP_SAMPLE_X_RATIOS = [0.2, 0.5, 0.8] as const;
const THEME_HEADER_SELECTORS = [
  'header.wechat-header',
  '.render-chatroom-header',
  '.render-chats-header',
  '.render-contacts-header',
  '.render-discover-header',
  '.render-me-header',
  '.render-settings-header',
  '.render-profile-header',
  '.render-search-header',
  '.safe-area-container'
].join(', ');
const COLOR_TOKEN_PATTERN = /(rgba?\([^)]*\)|color\(srgb[^)]*\)|#[0-9a-fA-F]{3,8})/gi;

type RGBAColor = Readonly<{
  r: number;
  g: number;
  b: number;
  a: number;
}>;

type ThemeSurfaceColorOptions = Readonly<{
  preferTopBarSurface?: boolean;
}>;

const clampChannel = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));
const clampAlpha = (value: number): number => Math.max(0, Math.min(1, value));

const parseHexColor = (value: string): RGBAColor | null => {
  const normalized = value.slice(1);
  if (![3, 4, 6, 8].includes(normalized.length)) return null;
  const full = normalized.length <= 4
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized;
  const hasAlpha = full.length === 8;
  const base = hasAlpha ? full.slice(0, 6) : full;
  const alphaHex = hasAlpha ? full.slice(6, 8) : 'ff';
  return {
    r: parseInt(base.slice(0, 2), 16),
    g: parseInt(base.slice(2, 4), 16),
    b: parseInt(base.slice(4, 6), 16),
    a: clampAlpha(parseInt(alphaHex, 16) / 255)
  };
};

const parseRgbChannel = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed.endsWith('%')) {
    const percent = Number(trimmed.slice(0, -1));
    return Number.isFinite(percent) ? clampChannel((percent / 100) * 255) : null;
  }
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? clampChannel(numeric) : null;
};

const parseCssColor = (value: string): RGBAColor | null => {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === 'transparent') return null;
  if (normalized.startsWith('#')) return parseHexColor(normalized);

  const rgbMatch = normalized.match(/^rgba?\((.+)\)$/);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map((part) => part.trim());
    if (parts.length < 3) return null;
    const [r, g, b] = parts.slice(0, 3).map(parseRgbChannel);
    const alpha = parts[3] === undefined ? 1 : Number(parts[3]);
    if (r === null || g === null || b === null || !Number.isFinite(alpha)) return null;
    return { r, g, b, a: clampAlpha(alpha) };
  }

  const srgbMatch = normalized.match(/^color\(srgb\s+([^)]*)\)$/);
  if (!srgbMatch) return null;
  const [channelsPart, alphaPart] = srgbMatch[1].split('/').map((part) => part.trim());
  const channels = channelsPart.split(/\s+/).map(Number);
  if (channels.length < 3 || channels.slice(0, 3).some((channel) => !Number.isFinite(channel))) return null;
  const alpha = alphaPart === undefined ? 1 : Number(alphaPart.replace('%', '')) / (alphaPart.includes('%') ? 100 : 1);
  if (!Number.isFinite(alpha)) return null;
  return {
    r: clampChannel(channels[0] * 255),
    g: clampChannel(channels[1] * 255),
    b: clampChannel(channels[2] * 255),
    a: clampAlpha(alpha)
  };
};

const blendForegroundOverBackground = (foreground: RGBAColor, background: RGBAColor): RGBAColor => {
  const alpha = foreground.a + (background.a * (1 - foreground.a));
  if (alpha <= 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: clampChannel(((foreground.r * foreground.a) + (background.r * background.a * (1 - foreground.a))) / alpha),
    g: clampChannel(((foreground.g * foreground.a) + (background.g * background.a * (1 - foreground.a))) / alpha),
    b: clampChannel(((foreground.b * foreground.a) + (background.b * background.a * (1 - foreground.a))) / alpha),
    a: clampAlpha(alpha)
  };
};

const splitTopLevelItems = (value: string): string[] => {
  const items: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of value) {
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);
    if (char === ',' && depth === 0) {
      if (current.trim()) items.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) items.push(current.trim());
  return items;
};

const resolveGradientLayerColor = (layer: string): RGBAColor | null => {
  if (!layer.toLowerCase().includes('gradient(')) return null;
  const matches = layer.match(COLOR_TOKEN_PATTERN) || [];
  for (const match of matches) {
    const color = parseCssColor(match);
    if (color && color.a > 0) return color;
  }
  return null;
};

const resolveElementBackgroundColor = (style: CSSStyleDeclaration): RGBAColor | null => {
  const solidColor = parseCssColor(style.backgroundColor);
  const layerColors = splitTopLevelItems(style.backgroundImage)
    .map(resolveGradientLayerColor)
    .filter((color): color is RGBAColor => color !== null);

  let resolved = solidColor;
  for (let index = layerColors.length - 1; index >= 0; index -= 1) {
    resolved = resolved ? blendForegroundOverBackground(layerColors[index], resolved) : layerColors[index];
  }
  return resolved;
};

const isVisibleThemeElement = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0
    && rect.height > 0
    && rect.bottom > 0
    && rect.top < window.innerHeight
    && style.display !== 'none'
    && style.visibility !== 'hidden'
    && style.opacity !== '0';
};

const formatThemeColor = (color: RGBAColor): string => `rgb(${clampChannel(color.r)}, ${clampChannel(color.g)}, ${clampChannel(color.b)})`;

const resolveElementSurfaceColor = (element: HTMLElement): string | null => {
  let currentColor: RGBAColor | null = null;
  let currentElement: HTMLElement | null = element;
  while (currentElement) {
    const elementColor = resolveElementBackgroundColor(window.getComputedStyle(currentElement));
    if (elementColor) {
      currentColor = currentColor
        ? blendForegroundOverBackground(currentColor, elementColor)
        : elementColor;
      if (currentColor.a >= OPAQUE_ALPHA_THRESHOLD) return formatThemeColor(currentColor);
    }
    currentElement = currentElement.parentElement;
  }
  return currentColor ? formatThemeColor(currentColor) : null;
};

const resolveSafeTopInset = (): number | null => {
  const safeTopRaw = window.getComputedStyle(document.documentElement).getPropertyValue('--safe-padding-top');
  const safeTop = Number.parseFloat(safeTopRaw);
  return Number.isFinite(safeTop) ? safeTop : null;
};

const resolveTopSampleYs = (options: ThemeSurfaceColorOptions): number[] => {
  const safeTop = resolveSafeTopInset();
  const insetSampleY = safeTop === null
    ? DEFAULT_TOP_SAMPLE_Y
    : Math.max(DEFAULT_TOP_SAMPLE_Y, Math.round(Math.min(safeTop, MAX_SAFE_TOP_SAMPLE) / 2) + 1);
  const fallbackSampleY = Math.min(window.innerHeight - 1, FALLBACK_SAMPLE_Y);
  const sampleYs = [DEFAULT_TOP_SAMPLE_Y, insetSampleY, fallbackSampleY];

  if (options.preferTopBarSurface && safeTop !== null) {
    sampleYs.push(
      Math.min(window.innerHeight - 1, Math.max(DEFAULT_TOP_SAMPLE_Y, Math.round(safeTop + SAFE_TOP_CONTENT_OFFSET)))
    );
  }

  return Array.from(new Set(sampleYs.filter((value) => value >= DEFAULT_TOP_SAMPLE_Y)));
};

const appendThemeHeaderElements = (append: (element: HTMLElement | null) => void): void => {
  Array.from(document.querySelectorAll<HTMLElement>(THEME_HEADER_SELECTORS)).forEach(append);
};

const appendTopSampleElements = (
  append: (element: HTMLElement | null) => void,
  sampleYs: readonly number[]
): void => {
  for (const y of sampleYs) {
    for (const ratio of TOP_SAMPLE_X_RATIOS) {
      const sampleX = Math.min(window.innerWidth - 1, Math.max(1, Math.round(window.innerWidth * ratio)));
      append(document.elementFromPoint(sampleX, y) as HTMLElement | null);
    }
  }
};

const collectThemeSampleElements = (options: ThemeSurfaceColorOptions): HTMLElement[] => {
  const result: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();
  const append = (element: HTMLElement | null) => {
    if (!element || seen.has(element) || !isVisibleThemeElement(element)) return;
    seen.add(element);
    result.push(element);
  };

  if (options.preferTopBarSurface) {
    appendThemeHeaderElements(append);
  }

  appendTopSampleElements(append, resolveTopSampleYs(options));

  if (!options.preferTopBarSurface) {
    appendThemeHeaderElements(append);
  }

  append(document.body);
  append(document.documentElement as HTMLElement);
  return result;
};

const resolveFallbackColor = (): string => {
  const rootStyle = window.getComputedStyle(document.documentElement);
  const bodyStyle = window.getComputedStyle(document.body);
  const candidates = [
    rootStyle.getPropertyValue('--header-bg'),
    rootStyle.getPropertyValue('--app-header-bg'),
    rootStyle.getPropertyValue('--bg-primary'),
    rootStyle.getPropertyValue('--app-bg-primary'),
    bodyStyle.backgroundColor,
    rootStyle.backgroundColor,
    THEME_COLOR_FALLBACK
  ];

  for (const candidate of candidates) {
    const parsed = parseCssColor(candidate);
    if (parsed && parsed.a > 0) return formatThemeColor(parsed);
  }
  return THEME_COLOR_FALLBACK;
};

export const resolveThemeSurfaceColor = (options: ThemeSurfaceColorOptions = {}): string => {
  for (const element of collectThemeSampleElements(options)) {
    const resolvedColor = resolveElementSurfaceColor(element);
    if (resolvedColor) return resolvedColor;
  }
  return resolveFallbackColor();
};
