import type { AppearanceSettings } from '../types/index.ts';
import { normalizeAppearanceSettings } from '../appBootstrapUtils.ts';

export const DESKTOP_APPEARANCE_SETTING_KEYS = [
  'enableDesktopMode',
  'desktopThemeId',
  'desktopWallpaper',
  'desktopLockEnabled',
  'desktopLockWallpaper',
  'desktopLockPasscode',
  'desktopIcons',
  'desktopWidgets',
  'desktopShowDock',
  'desktopGridCols',
  'desktopGridRows',
  'desktopWallpaperOpacity',
  'desktopWallpaperBlur',
  'desktopWeatherCity',
  'desktop24Hour',
  'desktopBatteryPercent',
  'desktopShowStatusBar',
  'desktopShowSignal',
  'desktopShowWifi',
  'desktopShowIconLabels',
  'desktopWidgetOpacity',
  'desktopWidgetColor',
  'desktopIconScale',
  'desktopDockOpacity',
  'desktopDockColor',
  'desktopIconShape',
  'desktopDockIconIds',
  'desktopPageIndex',
  'desktopPageCount',
  'desktopSystemNavigationMode',
  'desktopSystemNavigationAssistiveTouchSingleTapAction',
  'desktopSystemNavigationAssistiveTouchDoubleTapAction',
  'desktopSystemNavigationAssistiveTouchOpacity',
  'desktopSystemNavigationAssistiveTouchSize',
  'desktopSystemNavigationAssistiveTouchColor',
  'desktopSystemNavigationAssistiveTouchBorderColor',
  'desktopSystemNavigationAssistiveTouchBorderWidth',
  'desktopSystemNavigationAssistiveTouchImage'
] as const satisfies readonly (keyof AppearanceSettings)[];

type DesktopAppearanceKey = typeof DESKTOP_APPEARANCE_SETTING_KEYS[number];

export interface DesktopSettingsExportPayload {
  version: 'desktop-settings-export-v1';
  exportedAt: number;
  desktopSettings: Partial<AppearanceSettings>;
}

const hasOwn = (value: object, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const isRecord = (value: unknown): value is Record<PropertyKey, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export const pickDesktopAppearanceSettings = (
  value?: Partial<AppearanceSettings> | null
): Partial<AppearanceSettings> => {
  const source = isRecord(value) ? value : {};
  const picked: Partial<AppearanceSettings> = {};
  const target = picked as Record<DesktopAppearanceKey, unknown>;

  DESKTOP_APPEARANCE_SETTING_KEYS.forEach((key) => {
    if (!hasOwn(source, key)) return;
    target[key] = source[key];
  });

  return picked;
};

export const buildDesktopSettingsExportPayload = (
  settings?: Partial<AppearanceSettings> | null
): DesktopSettingsExportPayload => ({
  version: 'desktop-settings-export-v1',
  exportedAt: Date.now(),
  desktopSettings: pickDesktopAppearanceSettings(settings)
});

export const isDesktopSettingsExportPayload = (raw: unknown): raw is DesktopSettingsExportPayload => {
  if (!isRecord(raw)) return false;
  return raw.version === 'desktop-settings-export-v1' && isRecord(raw.desktopSettings);
};

export const extractDesktopSettingsRestoreData = (raw: unknown): Partial<AppearanceSettings> | null => {
  if (!isRecord(raw)) return null;

  const candidates = [
    raw.desktopSettings,
    raw.settings,
    raw.appearanceSettings,
    raw.appearanceConfig,
    raw
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const picked = pickDesktopAppearanceSettings(candidate);
    if (Object.keys(picked).length > 0) {
      return picked;
    }
  }

  return null;
};

export const mergeDesktopAppearanceSettings = (
  current?: Partial<AppearanceSettings> | null,
  incoming?: Partial<AppearanceSettings> | null
): AppearanceSettings => {
  return normalizeAppearanceSettings({
    ...(current || {}),
    ...pickDesktopAppearanceSettings(incoming)
  });
};
