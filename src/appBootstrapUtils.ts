import type {
  AISettings,
  AppearanceSettings,
  Contact,
  DesktopSystemNavigationAssistiveTouchShape,
  DesktopSystemNavigationAction,
  DesktopSystemNavigationMode,
  SoundVibrationSettings
} from './types/index.ts';
import type { ApkUpdateInfo } from './services/apkUpdateService.ts';
import { DEFAULT_APPEARANCE_SETTINGS, DEFAULT_SOUND_VIBRATION_SETTINGS, INITIAL_CONTACTS } from './constants.ts';
import { BUILT_IN_RENDER_SKINS, type BuiltInSkinId } from './render-schema.ts';
import { normalizeDesktopPageCount } from './utils/desktopPageUtils.ts';
import { normalizeDesktopLockPasscode } from './utils/desktopLockUtils.ts';
import { normalizeGeneratedNonSystemEventText } from './utils/generatedVisibleText.ts';
import { normalizePromptRuleTreeSettings } from './utils/prompt/promptRuleTree.ts';

export const DEFAULT_MINIMAX_GLOBAL_TTS: AISettings['minimaxTTS'] = {
  enabled: false,
  region: 'official',
  apiKey: '',
  groupId: '',
  model: ''
};

const DEFAULT_IMAGE_BASE_URLS: Record<'openai' | 'google' | 'volcengine', string> = {
  openai: '',
  google: '',
  volcengine: 'https://ark.cn-beijing.volces.com/api/v3/images/generations'
};

const MODEL_TEMPERATURE_MIN = 0;
const MODEL_TEMPERATURE_MAX = 2;
const MODEL_TOP_P_MIN = 0;
const MODEL_TOP_P_MAX = 1;
const MODEL_PENALTY_MIN = -2;
const MODEL_PENALTY_MAX = 2;
const MODEL_MAX_TOKENS_MIN = 1;
const MODEL_MAX_TOKENS_MAX = 32768;

const toFiniteNumber = (value: unknown): number | null => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const clampNumber = (value: unknown, min: number, max: number): number | undefined => {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return undefined;
  return Math.min(max, Math.max(min, parsed));
};

const clampInteger = (value: unknown, min: number, max: number): number | undefined => {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return undefined;
  return Math.round(Math.min(max, Math.max(min, parsed)));
};

const DESKTOP_SYSTEM_NAVIGATION_MODES: DesktopSystemNavigationMode[] = ['gesture', 'buttons', 'assistiveTouch'];
const DESKTOP_SYSTEM_NAVIGATION_ACTIONS: DesktopSystemNavigationAction[] = ['none', 'home', 'back', 'settings', 'lock'];
const DESKTOP_SYSTEM_NAVIGATION_ASSISTIVE_TOUCH_SHAPES: DesktopSystemNavigationAssistiveTouchShape[] = ['circle', 'rounded', 'square'];

const LEGACY_DESKTOP_ICON_LAYOUT: Record<string, { row: number; col: number }> = {
  'main-app': { row: 2, col: 0 },
  'divination-app': { row: 2, col: 1 },
  'music-app': { row: 2, col: 2 },
  'novel-app': { row: 2, col: 3 },
  'mailbox-app': { row: 3, col: 0 },
  'anonymous-app': { row: 3, col: 1 },
  'forum-app': { row: 3, col: 2 },
  'community-app': { row: 3, col: 3 },
  'diy-app': { row: 4, col: 2 },
  'settings-app': { row: 4, col: 3 }
};

const COMPACT_DESKTOP_ICON_LAYOUT: Record<string, { row: number; col: number }> = {
  'main-app': { row: 4, col: 0 },
  'divination-app': { row: 2, col: 0 },
  'music-app': { row: 2, col: 1 },
  'novel-app': { row: 2, col: 2 },
  'mailbox-app': { row: 2, col: 3 },
  'anonymous-app': { row: 3, col: 0 },
  'forum-app': { row: 3, col: 1 },
  'community-app': { row: 3, col: 2 },
  'diy-app': { row: 4, col: 1 },
  'settings-app': { row: 4, col: 2 }
};

const LEGACY_DOCK_ICON_IDS = ['main-app', 'settings-app', 'diy-app'];

type DesktopPlacementItem = {
  id?: string;
  row?: number;
  col?: number;
  pageIndex?: number;
};

type DesktopWidgetPlacementItem = {
  row?: number;
  col?: number;
  width?: number;
  height?: number;
  pageIndex?: number;
};

const normalizeLegacyDesktopIconLayout = <T extends DesktopPlacementItem>(
  icons: T[],
  dockIconIds: string[],
  widgets: DesktopWidgetPlacementItem[]
): T[] => {
  const dockSet = new Set(dockIconIds);
  if (!LEGACY_DOCK_ICON_IDS.every(id => dockSet.has(id))) return icons;

  const pageZeroIcons = new Map<string, T>();
  for (const icon of icons) {
    if ((icon.pageIndex ?? 0) !== 0 || !icon.id) continue;
    pageZeroIcons.set(icon.id, icon);
  }

  const layoutIds = Object.keys(LEGACY_DESKTOP_ICON_LAYOUT);
  const isLegacyLayout = layoutIds.every((id) => {
    const icon = pageZeroIcons.get(id);
    const expected = LEGACY_DESKTOP_ICON_LAYOUT[id];
    return icon && icon.row === expected.row && icon.col === expected.col;
  });
  if (!isLegacyLayout) return icons;

  const targetCells = new Set(Object.values(COMPACT_DESKTOP_ICON_LAYOUT).map(pos => `${pos.row},${pos.col}`));
  const layoutIdSet = new Set(layoutIds);
  const hasIconConflict = icons.some((icon) => {
    if ((icon.pageIndex ?? 0) !== 0 || !Number.isFinite(icon.row) || !Number.isFinite(icon.col)) return false;
    return targetCells.has(`${icon.row},${icon.col}`) && !layoutIdSet.has(String(icon.id || ''));
  });
  if (hasIconConflict) return icons;

  const hasWidgetConflict = widgets.some((widget) => {
    if ((widget.pageIndex ?? 0) !== 0) return false;
    const width = Math.max(1, Number(widget.width) || 1);
    const height = Math.max(1, Number(widget.height) || 1);
    const row = Number(widget.row);
    const col = Number(widget.col);
    if (!Number.isFinite(row) || !Number.isFinite(col)) return false;
    for (let dr = 0; dr < height; dr++) {
      for (let dc = 0; dc < width; dc++) {
        if (targetCells.has(`${row + dr},${col + dc}`)) return true;
      }
    }
    return false;
  });
  if (hasWidgetConflict) return icons;

  return icons.map((icon) => {
    if ((icon.pageIndex ?? 0) !== 0 || !icon.id) return icon;
    const target = COMPACT_DESKTOP_ICON_LAYOUT[icon.id];
    return target ? { ...icon, row: target.row, col: target.col } : icon;
  });
};

export const DEFAULT_CONTACT_CONTEXT_MESSAGES = 30;
export const DEFAULT_MEMORY_SUMMARY_THRESHOLD = 30;
export const DEFAULT_ADD_FRIEND_GREETING = '你好呀，想加你为好友～';
export const APK_UPDATE_DISMISS_STORAGE_KEY = 'xushuo_apk_update_dismissed_v1';

export const buildApkUpdateIdentity = (info: Pick<ApkUpdateInfo, 'version' | 'versionCode' | 'forceUpdate' | 'minVersion'>): string => {
  const code = Number(info.versionCode || 0);
  const version = String(info.version || '').trim();
  const forceUpdate = info.forceUpdate === true ? '1' : '0';
  const minVersion = Number(info.minVersion || 0) > 0 ? Math.floor(Number(info.minVersion || 0)) : 0;
  if (code > 0) return `code:${code}|force:${forceUpdate}|min:${minVersion}`;
  if (version) return `version:${version}|force:${forceUpdate}|min:${minVersion}`;
  return '';
};

export const ensureStylesheetLink = (id: string, href: string) => {
  const existing = document.getElementById(id) as HTMLLinkElement | null;
  if (existing) {
    if (existing.href !== href) existing.href = href;
    return;
  }
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
};

const FONT_STYLESHEET_IDS = {
  noto: 'font-link-noto-sans-sc',
  serif: 'font-link-noto-serif-sc',
  mono: 'font-link-jetbrains-mono',
} as const;

const FONT_STYLESHEET_HREFS: Record<keyof typeof FONT_STYLESHEET_IDS, string> = {
  noto: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap',
  serif: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;700&display=swap',
  mono: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap',
};

const ensureSelectedFontStylesheet = (family: AppearanceSettings['fontFamily']) => {
  if (family !== 'noto' && family !== 'serif' && family !== 'mono') return;
  ensureStylesheetLink(FONT_STYLESHEET_IDS[family], FONT_STYLESHEET_HREFS[family]);
};

export const upsertCustomFontFace = (fontName: string, dataUrl: string) => {
  const styleId = 'app-custom-font-face-style';
  const prev = document.getElementById(styleId);
  if (prev) prev.remove();
  if (!fontName || !dataUrl) return;
  const style = document.createElement('style');
  style.id = styleId;
  const safeName = String(fontName).replace(/["'`]/g, '').trim() || 'CustomFont';
  style.textContent = `
    @font-face {
      font-family: "app-custom-font";
      src: url("${dataUrl}");
      font-display: swap;
    }
    @font-face {
      font-family: "${safeName}";
      src: url("${dataUrl}");
      font-display: swap;
    }
  `;
  document.head.appendChild(style);
};

export const waitForSelectedFontReady = async (settings: AppearanceSettings): Promise<void> => {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  const fontSet = document.fonts;
  const family = settings.fontFamily;
  ensureSelectedFontStylesheet(family);

  if (family === 'custom' && settings.customFontDataUrl) {
    await fontSet.load('14px "app-custom-font"');
    return;
  }
  if (family === 'noto') {
    await fontSet.load('14px "Noto Sans SC"');
    return;
  }
  if (family === 'serif') {
    await fontSet.load('14px "Noto Serif SC"');
    return;
  }
  if (family === 'mono') {
    await fontSet.load('14px "JetBrains Mono"');
  }
};

export const forceReloadApp = () => {
  const now = Date.now().toString();
  try {
    const url = new URL(globalThis.location.href);
    url.searchParams.set('_reset', now);
    globalThis.location.replace(url.toString());
    return true;
  } catch (error) {
    console.warn('[Storage] location.replace failed:', error);
  }

  try {
    const href = `${globalThis.location.pathname}?_reset=${now}${globalThis.location.hash || ''}`;
    globalThis.location.href = href;
    return true;
  } catch (error) {
    console.warn('[Storage] location.href fallback failed:', error);
  }

  try {
    globalThis.location.reload();
    return true;
  } catch (error) {
    console.error('[Storage] location.reload failed:', error);
  }
  return false;
};

export const cleanupResetQueryParam = () => {
  try {
    const url = new URL(globalThis.location.href);
    if (!url.searchParams.has('_reset')) return false;
    url.searchParams.delete('_reset');
    const query = url.searchParams.toString();
    const cleanedUrl = `${url.pathname}${query ? `?${query}` : ''}${url.hash}`;
    globalThis.history.replaceState(globalThis.history.state, '', cleanedUrl);
    return true;
  } catch (error) {
    console.warn('[Storage] cleanup _reset query failed:', error);
  }
  return false;
};

export const normalizeAiSettings = (value?: Partial<AISettings> | null): AISettings => {
  const source = value || {};
  const sourceTTS = {
    ...DEFAULT_MINIMAX_GLOBAL_TTS,
    ...(source.minimaxTTS || {})
  };
  const region = sourceTTS.region === 'international'
    ? 'international'
    : sourceTTS.region === 'china'
      ? 'china'
      : 'official';
  const responseFormat = source.responseFormat === 'response' || source.responseFormat === 'anthropic'
    ? source.responseFormat
    : 'openai';
  const imageResponseFormat = source.imageResponseFormat === 'google' || source.imageResponseFormat === 'volcengine'
    ? source.imageResponseFormat
    : 'openai';

  return {
    provider: (source.provider || 'builtin') as AISettings['provider'],
    apiKey: source.apiKey || '',
    model: source.model || '',
    baseUrl: source.baseUrl || '',
    responseFormat,
    customModelSupportsImageRecognition: !!source.customModelSupportsImageRecognition,
    enableAdvancedModelSettings: !!source.enableAdvancedModelSettings,
    modelTemperature: clampNumber(source.modelTemperature, MODEL_TEMPERATURE_MIN, MODEL_TEMPERATURE_MAX),
    modelTopP: clampNumber(source.modelTopP, MODEL_TOP_P_MIN, MODEL_TOP_P_MAX),
    modelPresencePenalty: clampNumber(source.modelPresencePenalty, MODEL_PENALTY_MIN, MODEL_PENALTY_MAX),
    modelFrequencyPenalty: clampNumber(source.modelFrequencyPenalty, MODEL_PENALTY_MIN, MODEL_PENALTY_MAX),
    modelMaxTokens: clampInteger(source.modelMaxTokens, MODEL_MAX_TOKENS_MIN, MODEL_MAX_TOKENS_MAX),
    enableImageGeneration: !!source.enableImageGeneration,
    imageResponseFormat,
    imageModel: source.imageModel || '',
    imageBaseUrl: source.imageBaseUrl || DEFAULT_IMAGE_BASE_URLS[imageResponseFormat],
    imageApiKey: source.imageApiKey || '',
    enableDelayReply: source.enableDelayReply !== false,
    enableSentenceSend: !!source.enableSentenceSend,
    enableTimeAwareness: !!source.enableTimeAwareness,
    promptRuleTree: normalizePromptRuleTreeSettings(source.promptRuleTree),
    momentInteractionSource: source.momentInteractionSource === 'none' || source.momentInteractionSource === 'contacts'
      ? source.momentInteractionSource
      : 'random',
    minimaxTTS: {
      enabled: !!sourceTTS.enabled,
      region,
      apiKey: sourceTTS.apiKey || '',
      groupId: sourceTTS.groupId || '',
      model: sourceTTS.model || ''
    }
  };
};

export const normalizeAppearanceSettings = (value?: Partial<AppearanceSettings> | null): AppearanceSettings => {
  const source = (value || {}) as Partial<AppearanceSettings>;
  const normalizedDockIconIds = Array.isArray(source.desktopDockIconIds)
    ? source.desktopDockIconIds.filter((id: any) => typeof id === 'string')
    : undefined;
  const safeSkinId = BUILT_IN_RENDER_SKINS[source.renderSkinId as BuiltInSkinId]
    ? (source.renderSkinId as BuiltInSkinId)
    : DEFAULT_APPEARANCE_SETTINGS.renderSkinId;

  const safeThemeMode = source.themeMode === 'light' || source.themeMode === 'dark' || source.themeMode === 'auto'
    ? source.themeMode
    : DEFAULT_APPEARANCE_SETTINGS.themeMode;

  const safeFontFamily = source.fontFamily === 'system' || source.fontFamily === 'pingfang' || source.fontFamily === 'noto' || source.fontFamily === 'serif' || source.fontFamily === 'mono' || source.fontFamily === 'custom'
    ? source.fontFamily
    : DEFAULT_APPEARANCE_SETTINGS.fontFamily;

  const safeDarkContrast = source.darkContrast === 'soft' || source.darkContrast === 'high' || source.darkContrast === 'standard'
    ? source.darkContrast
    : DEFAULT_APPEARANCE_SETTINGS.darkContrast;

  const safeDensity = source.interfaceDensity === 'compact' || source.interfaceDensity === 'comfortable' || source.interfaceDensity === 'default'
    ? source.interfaceDensity
    : DEFAULT_APPEARANCE_SETTINGS.interfaceDensity;

  const safeContentWidth = source.contentWidth === 'narrow' || source.contentWidth === 'wide' || source.contentWidth === 'full'
    ? source.contentWidth
    : DEFAULT_APPEARANCE_SETTINGS.contentWidth;

  const safeSystemNoticeBackgroundStyle = source.systemNoticeBackgroundStyle === 'glass' || source.systemNoticeBackgroundStyle === 'solid' || source.systemNoticeBackgroundStyle === 'auto'
    ? source.systemNoticeBackgroundStyle
    : DEFAULT_APPEARANCE_SETTINGS.systemNoticeBackgroundStyle;
  const assistiveTouchFreePosition = source.desktopSystemNavigationAssistiveTouchFreePosition === true;
  const assistiveTouchPositionX = Number.isFinite(Number(source.desktopSystemNavigationAssistiveTouchPositionX))
    ? Math.max(
      assistiveTouchFreePosition ? 0 : 0.08,
      Math.min(assistiveTouchFreePosition ? 1 : 0.92, Number(source.desktopSystemNavigationAssistiveTouchPositionX))
    )
    : DEFAULT_APPEARANCE_SETTINGS.desktopSystemNavigationAssistiveTouchPositionX;
  const assistiveTouchPositionY = Number.isFinite(Number(source.desktopSystemNavigationAssistiveTouchPositionY))
    ? Math.max(
      assistiveTouchFreePosition ? 0 : 0.12,
      Math.min(assistiveTouchFreePosition ? 1 : 0.9, Number(source.desktopSystemNavigationAssistiveTouchPositionY))
    )
    : DEFAULT_APPEARANCE_SETTINGS.desktopSystemNavigationAssistiveTouchPositionY;

  return {
    ...DEFAULT_APPEARANCE_SETTINGS,
    ...source,
    themeMode: safeThemeMode,
    renderSkinId: safeSkinId,
    fontFamily: safeFontFamily,
    darkContrast: safeDarkContrast,
    interfaceDensity: safeDensity,
    contentWidth: safeContentWidth,
    customThemes: Array.isArray(source.customThemes) ? source.customThemes : [],
    iconImageMap: source.iconImageMap && typeof source.iconImageMap === 'object' ? source.iconImageMap : {},
    activeCustomThemeId: typeof source.activeCustomThemeId === 'string' ? source.activeCustomThemeId : '',
    customCSS: typeof source.customCSS === 'string' ? source.customCSS : '',
    enableThunderEffect: source.enableThunderEffect === true,
    customFontName: typeof source.customFontName === 'string' ? source.customFontName : '',
    customFontDataUrl: typeof source.customFontDataUrl === 'string' ? source.customFontDataUrl : '',
    notificationTextSize: (() => {
      const parsed = Number(source.notificationTextSize);
      if (!Number.isFinite(parsed) || parsed < 10) return DEFAULT_APPEARANCE_SETTINGS.notificationTextSize;
      return Math.min(24, parsed);
    })(),
    enableRainEffect: source.enableRainEffect === true,
    enableSnowEffect: source.enableSnowEffect === true,
    enableHtmlBubbleScripts: source.enableHtmlBubbleScripts === true,
    allowBubbleLineBreak: source.allowBubbleLineBreak === true,
    bubbleOpacity: Number.isFinite(Number(source.bubbleOpacity)) ? Math.max(0, Math.min(1, Number(source.bubbleOpacity))) : DEFAULT_APPEARANCE_SETTINGS.bubbleOpacity,
    bubbleBlur: Number.isFinite(Number(source.bubbleBlur)) ? Math.max(0, Math.min(24, Number(source.bubbleBlur))) : DEFAULT_APPEARANCE_SETTINGS.bubbleBlur,
    pixelGridOpacity: Number.isFinite(Number(source.pixelGridOpacity)) ? Math.max(0, Math.min(100, Number(source.pixelGridOpacity))) : DEFAULT_APPEARANCE_SETTINGS.pixelGridOpacity,
    pixelCrtOpacity: Number.isFinite(Number(source.pixelCrtOpacity)) ? Math.max(0, Math.min(100, Number(source.pixelCrtOpacity))) : DEFAULT_APPEARANCE_SETTINGS.pixelCrtOpacity,
    innerNoticeTextColor: typeof source.innerNoticeTextColor === 'string' ? source.innerNoticeTextColor : undefined,
    actionNoticeTextColor: typeof source.actionNoticeTextColor === 'string' ? source.actionNoticeTextColor : undefined,
    narrationNoticeTextColor: typeof source.narrationNoticeTextColor === 'string' ? source.narrationNoticeTextColor : undefined,
    systemNoticeTextColor: typeof source.systemNoticeTextColor === 'string' ? source.systemNoticeTextColor : DEFAULT_APPEARANCE_SETTINGS.systemNoticeTextColor,
    systemNoticeBackgroundStyle: safeSystemNoticeBackgroundStyle,
    systemNoticeBackgroundOpacity: Number.isFinite(Number(source.systemNoticeBackgroundOpacity)) ? Math.max(0, Math.min(100, Number(source.systemNoticeBackgroundOpacity))) : DEFAULT_APPEARANCE_SETTINGS.systemNoticeBackgroundOpacity,
    systemNoticeBlur: Number.isFinite(Number(source.systemNoticeBlur)) ? Math.max(0, Math.min(20, Number(source.systemNoticeBlur))) : DEFAULT_APPEARANCE_SETTINGS.systemNoticeBlur,
    systemNoticeBorderEnabled: typeof source.systemNoticeBorderEnabled === 'boolean' ? source.systemNoticeBorderEnabled : DEFAULT_APPEARANCE_SETTINGS.systemNoticeBorderEnabled,
    systemNoticeBorderColor: typeof source.systemNoticeBorderColor === 'string' ? source.systemNoticeBorderColor : DEFAULT_APPEARANCE_SETTINGS.systemNoticeBorderColor,
    systemNoticeBorderOpacity: Number.isFinite(Number(source.systemNoticeBorderOpacity)) ? Math.max(0, Math.min(100, Number(source.systemNoticeBorderOpacity))) : DEFAULT_APPEARANCE_SETTINGS.systemNoticeBorderOpacity,
    innerVoicePrefix: typeof source.innerVoicePrefix === 'string' ? source.innerVoicePrefix : DEFAULT_APPEARANCE_SETTINGS.innerVoicePrefix,
    actionDescPrefix: typeof source.actionDescPrefix === 'string' ? source.actionDescPrefix : DEFAULT_APPEARANCE_SETTINGS.actionDescPrefix,
    narrationPrefix: typeof source.narrationPrefix === 'string' ? source.narrationPrefix : DEFAULT_APPEARANCE_SETTINGS.narrationPrefix,
    readStatusTextOverride: typeof source.readStatusTextOverride === 'string' ? source.readStatusTextOverride : DEFAULT_APPEARANCE_SETTINGS.readStatusTextOverride,
    enableDesktopMode: source.enableDesktopMode === true,
    desktopThemeId: typeof source.desktopThemeId === 'string' && ['ios', 'android', 'wp'].includes(source.desktopThemeId) ? source.desktopThemeId : DEFAULT_APPEARANCE_SETTINGS.desktopThemeId,
    desktopWallpaper: typeof source.desktopWallpaper === 'string' ? source.desktopWallpaper : DEFAULT_APPEARANCE_SETTINGS.desktopWallpaper,
    desktopLockEnabled: source.desktopLockEnabled === true,
    desktopLockWallpaper: typeof source.desktopLockWallpaper === 'string' ? source.desktopLockWallpaper : DEFAULT_APPEARANCE_SETTINGS.desktopLockWallpaper,
    desktopLockPasscode: normalizeDesktopLockPasscode(source.desktopLockPasscode),
    desktopWeatherCity: typeof source.desktopWeatherCity === 'string' ? source.desktopWeatherCity : DEFAULT_APPEARANCE_SETTINGS.desktopWeatherCity,
    desktop24Hour: source.desktop24Hour === true,
    desktopBatteryPercent: source.desktopBatteryPercent !== false,
    desktopShowStatusBar: source.desktopShowStatusBar !== false,
    statusBarLayout: typeof source.statusBarLayout === 'string' && ['default', 'center', 'minimal'].includes(source.statusBarLayout) ? source.statusBarLayout : DEFAULT_APPEARANCE_SETTINGS.statusBarLayout,
    desktopShowSignal: source.desktopShowSignal !== false,
    desktopShowWifi: source.desktopShowWifi !== false,
    statusBarShowDate: source.statusBarShowDate === true,
    desktopShowIconLabels: source.desktopShowIconLabels !== false,
    desktopWidgetOpacity: Number.isFinite(Number(source.desktopWidgetOpacity)) ? Math.max(0.1, Math.min(1, Number(source.desktopWidgetOpacity))) : DEFAULT_APPEARANCE_SETTINGS.desktopWidgetOpacity,
    desktopWidgetColor: typeof source.desktopWidgetColor === 'string' ? source.desktopWidgetColor : DEFAULT_APPEARANCE_SETTINGS.desktopWidgetColor,
    desktopIconScale: Number.isFinite(Number(source.desktopIconScale)) ? Math.max(0.5, Math.min(1.5, Number(source.desktopIconScale))) : DEFAULT_APPEARANCE_SETTINGS.desktopIconScale,
    desktopDockOpacity: Number.isFinite(Number(source.desktopDockOpacity)) ? Math.max(0.1, Math.min(1, Number(source.desktopDockOpacity))) : DEFAULT_APPEARANCE_SETTINGS.desktopDockOpacity,
    desktopDockColor: typeof source.desktopDockColor === 'string' ? source.desktopDockColor : DEFAULT_APPEARANCE_SETTINGS.desktopDockColor,
    desktopDockIconIds: normalizedDockIconIds,
    desktopPageIndex: Number.isFinite(Number(source.desktopPageIndex)) ? Math.max(0, Math.min(4, Number(source.desktopPageIndex))) : DEFAULT_APPEARANCE_SETTINGS.desktopPageIndex,
    desktopSystemNavigationMode: DESKTOP_SYSTEM_NAVIGATION_MODES.includes(source.desktopSystemNavigationMode as DesktopSystemNavigationMode)
      ? source.desktopSystemNavigationMode as DesktopSystemNavigationMode
      : DEFAULT_APPEARANCE_SETTINGS.desktopSystemNavigationMode,
    desktopSystemNavigationAssistiveTouchSingleTapAction: DESKTOP_SYSTEM_NAVIGATION_ACTIONS.includes(source.desktopSystemNavigationAssistiveTouchSingleTapAction as DesktopSystemNavigationAction)
      ? source.desktopSystemNavigationAssistiveTouchSingleTapAction as DesktopSystemNavigationAction
      : DEFAULT_APPEARANCE_SETTINGS.desktopSystemNavigationAssistiveTouchSingleTapAction,
    desktopSystemNavigationAssistiveTouchDoubleTapAction: DESKTOP_SYSTEM_NAVIGATION_ACTIONS.includes(source.desktopSystemNavigationAssistiveTouchDoubleTapAction as DesktopSystemNavigationAction)
      ? source.desktopSystemNavigationAssistiveTouchDoubleTapAction as DesktopSystemNavigationAction
      : DEFAULT_APPEARANCE_SETTINGS.desktopSystemNavigationAssistiveTouchDoubleTapAction,
    desktopSystemNavigationAssistiveTouchOpacity: Number.isFinite(Number(source.desktopSystemNavigationAssistiveTouchOpacity))
      ? Math.max(0.2, Math.min(1, Number(source.desktopSystemNavigationAssistiveTouchOpacity)))
      : DEFAULT_APPEARANCE_SETTINGS.desktopSystemNavigationAssistiveTouchOpacity,
    desktopSystemNavigationAssistiveTouchSize: Number.isFinite(Number(source.desktopSystemNavigationAssistiveTouchSize))
      ? Math.max(40, Math.min(88, Number(source.desktopSystemNavigationAssistiveTouchSize)))
      : DEFAULT_APPEARANCE_SETTINGS.desktopSystemNavigationAssistiveTouchSize,
    desktopSystemNavigationAssistiveTouchColor: typeof source.desktopSystemNavigationAssistiveTouchColor === 'string'
      ? source.desktopSystemNavigationAssistiveTouchColor
      : DEFAULT_APPEARANCE_SETTINGS.desktopSystemNavigationAssistiveTouchColor,
    desktopSystemNavigationAssistiveTouchBorderColor: typeof source.desktopSystemNavigationAssistiveTouchBorderColor === 'string'
      ? source.desktopSystemNavigationAssistiveTouchBorderColor
      : DEFAULT_APPEARANCE_SETTINGS.desktopSystemNavigationAssistiveTouchBorderColor,
    desktopSystemNavigationAssistiveTouchBorderWidth: Number.isFinite(Number(source.desktopSystemNavigationAssistiveTouchBorderWidth))
      ? Math.max(0, Math.min(6, Number(source.desktopSystemNavigationAssistiveTouchBorderWidth)))
      : DEFAULT_APPEARANCE_SETTINGS.desktopSystemNavigationAssistiveTouchBorderWidth,
    desktopSystemNavigationAssistiveTouchImage: typeof source.desktopSystemNavigationAssistiveTouchImage === 'string'
      ? source.desktopSystemNavigationAssistiveTouchImage
      : DEFAULT_APPEARANCE_SETTINGS.desktopSystemNavigationAssistiveTouchImage,
    desktopSystemNavigationAssistiveTouchPositionX: assistiveTouchPositionX,
    desktopSystemNavigationAssistiveTouchPositionY: assistiveTouchPositionY,
    desktopSystemNavigationAssistiveTouchFreePosition: assistiveTouchFreePosition,
    desktopSystemNavigationAssistiveTouchShape: DESKTOP_SYSTEM_NAVIGATION_ASSISTIVE_TOUCH_SHAPES.includes(source.desktopSystemNavigationAssistiveTouchShape as DesktopSystemNavigationAssistiveTouchShape)
      ? source.desktopSystemNavigationAssistiveTouchShape as DesktopSystemNavigationAssistiveTouchShape
      : DEFAULT_APPEARANCE_SETTINGS.desktopSystemNavigationAssistiveTouchShape,
    desktopIcons: (() => {
      const saved = Array.isArray(source.desktopIcons) ? source.desktopIcons : [];
      const savedWidgets = Array.isArray(source.desktopWidgets) ? source.desktopWidgets : [];
      const defaults = DEFAULT_APPEARANCE_SETTINGS.desktopIcons || [];
      if (saved.length === 0) return defaults;
      const gridCols = source.desktopGridCols || DEFAULT_APPEARANCE_SETTINGS.desktopGridCols || 4;
      const gridRows = source.desktopGridRows || DEFAULT_APPEARANCE_SETTINGS.desktopGridRows || 6;
      // 合并：保留用户已有的图标，把默认中新增但未保存的图标按空位追加
      const merged = [...saved];
      const existingIds = new Set(saved.map((i: any) => i.id));
      // 计算所有已被占用的格子（包括图标和小组件占用的区域）
      const usedCells = new Set<string>();
      for (const i of saved) {
        usedCells.add(`${i.row},${i.col}`);
      }
      for (const w of savedWidgets) {
        for (let dr = 0; dr < (w.height || 1); dr++) {
          for (let dc = 0; dc < (w.width || 1); dc++) {
            usedCells.add(`${w.row + dr},${w.col + dc}`);
          }
        }
      }
      // 辅助：检查某个格子是否在网格内且空闲
      const isFree = (r: number, c: number) =>
        r >= 0 && r < gridRows && c >= 0 && c < gridCols && !usedCells.has(`${r},${c}`);
      for (const def of defaults) {
        if (existingIds.has(def.id)) continue;
        // 先尝试放在默认位置
        if (isFree(def.row, def.col)) {
          merged.push({ ...def });
          usedCells.add(`${def.row},${def.col}`);
          continue;
        }
        // 默认位置被占用，按行优先找一个空位
        let placed = false;
        for (let r = 0; r < gridRows && !placed; r++) {
          for (let c = 0; c < gridCols && !placed; c++) {
            if (isFree(r, c)) {
              merged.push({ ...def, row: r, col: c });
              usedCells.add(`${r},${c}`);
              placed = true;
            }
          }
        }
        if (!placed) {
          // 实在没位置，仍然追加（渲染层会按重叠处理，用户可手动整理）
          merged.push({ ...def });
        }
      }
      return normalizeLegacyDesktopIconLayout(merged, normalizedDockIconIds || [], savedWidgets);
    })(),
    desktopWidgets: (() => {
      const saved = Array.isArray(source.desktopWidgets) ? source.desktopWidgets : [];
      const defaults = DEFAULT_APPEARANCE_SETTINGS.desktopWidgets || [];
      if (saved.length === 0) return defaults;
      const existingIds = new Set(saved.map((w: any) => w.id));
      return [...saved, ...defaults.filter((w: any) => !existingIds.has(w.id))];
    })(),
    desktopPageCount: normalizeDesktopPageCount(
      source.desktopPageCount,
      Array.isArray(source.desktopIcons) && source.desktopIcons.length > 0 ? source.desktopIcons : DEFAULT_APPEARANCE_SETTINGS.desktopIcons,
      Array.isArray(source.desktopWidgets) && source.desktopWidgets.length > 0 ? source.desktopWidgets : DEFAULT_APPEARANCE_SETTINGS.desktopWidgets
    )
  };
};

export const mergeBuiltInContacts = (importedContacts: Contact[] | null | undefined): Contact[] => {
  const imported = Array.isArray(importedContacts) ? importedContacts : [];
  if (imported.length === 0) return INITIAL_CONTACTS;

  const builtinById = new Map<string, Contact>();
  INITIAL_CONTACTS.forEach(builtin => {
    if (!builtin?.id) return;
    builtinById.set(String(builtin.id), builtin);
  });

  const merged: Contact[] = imported.map(contact => {
    if (!contact?.id) return contact;
    const builtin = builtinById.get(String(contact.id));
    // 内置联系人完全使用内置版本（人设、加密属性等均以内置为准）
    // 仅保留用户级别的运行时状态
    if (builtin) {
      return {
        ...builtin,
        unreadCount: contact.unreadCount,
        lastMessage: contact.lastMessage,
        lastTime: contact.lastTime,
        lastMessagePreviewMode: contact.lastMessagePreviewMode,
        lastMessageSourceId: contact.lastMessageSourceId,
        isPinned: contact.isPinned,
      };
    }
    return contact;
  });

  // 添加不存在于导入列表中的内置联系人
  const importedIds = new Set(imported.map(c => String(c?.id)));
  INITIAL_CONTACTS.forEach(builtin => {
    if (!importedIds.has(String(builtin.id))) {
      merged.push(builtin);
    }
  });

  return merged;
};

export const sanitizeGeneratedArticleText = (raw: string): string => {
  const text = String(raw || '');
  const normalized = text
    .replace(/\r\n?/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/```(?:markdown|md|text)?\s*([\s\S]*?)```/gi, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return normalizeGeneratedNonSystemEventText(normalized, { joinWith: '\n' });
};

export const sanitizeGeneratedArticleTitle = (raw: string): string => {
  const normalized = String(raw || '')
    .replace(/\r\n?/g, ' ')
    .replace(/\\n/g, ' ')
    .replace(/```(?:markdown|md|text)?\s*([\s\S]*?)```/gi, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return normalizeGeneratedNonSystemEventText(normalized, { collapseWhitespace: true });
};

export const normalizeSoundVibrationSettings = (value?: Partial<SoundVibrationSettings> | null): SoundVibrationSettings => {
  const source = value || {};
  return {
    sendSoundEnabled: source.sendSoundEnabled !== false,
    receiveSoundEnabled: source.receiveSoundEnabled !== false,
    sendSoundSrc: String(source.sendSoundSrc || DEFAULT_SOUND_VIBRATION_SETTINGS.sendSoundSrc),
    receiveSoundSrc: String(source.receiveSoundSrc || DEFAULT_SOUND_VIBRATION_SETTINGS.receiveSoundSrc),
    vibrationEnabled: source.vibrationEnabled !== false,
    notificationEnabled: source.notificationEnabled !== false,
    notificationTitleTemplate: String(source.notificationTitleTemplate || DEFAULT_SOUND_VIBRATION_SETTINGS.notificationTitleTemplate),
    notificationBodyTemplate: String(source.notificationBodyTemplate || DEFAULT_SOUND_VIBRATION_SETTINGS.notificationBodyTemplate),
    keepAliveInBackgroundEnabled: source.keepAliveInBackgroundEnabled === true,
    keepAliveNotificationTitle: String(source.keepAliveNotificationTitle || DEFAULT_SOUND_VIBRATION_SETTINGS.keepAliveNotificationTitle),
    keepAliveNotificationBody: String(source.keepAliveNotificationBody || DEFAULT_SOUND_VIBRATION_SETTINGS.keepAliveNotificationBody)
  };
};
