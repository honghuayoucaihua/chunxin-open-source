import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useBatteryLevel } from './hooks/useBatteryLevel';
import type { AppearanceSettings, DesktopIcon, DesktopSystemNavigationAction, DesktopWidget } from './types';
import { DEFAULT_APPEARANCE_SETTINGS } from './constants';
import type { MusicState } from './music/musicCommon';
import {
  DESKTOP_PAGE_MAX,
  mergeDesktopItemsForPage,
  normalizeDesktopPageCount,
  shouldUseFloatingDesktopEditToolbar
} from './utils/desktopPageUtils';
import { hasDesktopLockPasscode, normalizeDesktopLockPasscode } from './utils/desktopLockUtils';
import DesktopSystemNavigation from './DesktopSystemNavigation';
import { DESKTOP_SYSTEM_NAV_BUTTONS_RESERVED_SPACE } from './desktopSystemNavigationConstants';
import {
  DesktopWidgetConfigDialog,
  DesktopWidgetPickerSheet,
  type DesktopWidgetPreset
} from './desktop/DesktopWidgetPanels';
import DesktopIconActionPanels, { type DesktopIconMenuState } from './desktop/DesktopIconActionPanels';
import DesktopThemeDiyPanel, { type DesktopThemeOption } from './desktop/DesktopThemeDiyPanel';
import DesktopWeatherCityDialog from './desktop/DesktopWeatherCityDialog';
import DesktopDock from './desktop/DesktopDock';
import DesktopDragPreview from './desktop/DesktopDragPreview';
import DesktopEditModeToolbar from './desktop/DesktopEditModeToolbar';
import { getDesktopIconStyle, renderDesktopIconContent } from './desktop/DesktopIconVisual';
import DesktopLockScreenOverlay, {
  LOCK_SLIDE_THEME_CONFIG,
  type DesktopThemeId
} from './desktop/DesktopLockScreenOverlay';
import DesktopPageIndicator from './desktop/DesktopPageIndicator';
import DesktopSettingsOverlay from './desktop/DesktopSettingsOverlay';
import DesktopStatusBar from './desktop/DesktopStatusBar';
import DesktopWorkspaceGrid from './desktop/DesktopWorkspaceGrid';
import { useDesktopDockDrag } from './desktop/useDesktopDockDrag';
import { useDesktopWorkspaceDrag } from './desktop/useDesktopWorkspaceDrag';

interface DesktopModeShellProps {
  settings: AppearanceSettings;
  onEnterApp: () => void;
  onOpenSubView?: (subView: string) => void;
  onSettingsChange?: (settings: Partial<AppearanceSettings>) => void;
  musicState?: MusicState;
  isLocked?: boolean;
  onUnlock?: () => void;
  onLock?: () => void;
  forcedOverlayPanel?: 'settings' | 'diy' | null;
  onConsumeForcedOverlayPanel?: () => void;
}

type RgbaColor = { r: number; g: number; b: number; a: number };

const DEFAULT_gridCols = 4;
const DEFAULT_gridRows = 6;
const CELL_HEIGHT = 90; // 网格单元格高度(px)
const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY || '';
const WEATHER_CACHE_HOURS = 24;
const WEATHER_REQUEST_TIMEOUT_MS = 10000;

interface WeatherData {
  city: string;
  temp: number;
  description: string;
  iconClass: string;
  updatedAt: number;
}

const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    globalThis.clearTimeout(timeout);
  }
};

const normalizeHexColor = (value: string): string => {
  const trimmed = value.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed.split('').map((char) => char + char).join('').toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed.toLowerCase()}`;
  }
  return '';
};

const parseHexColor = (value: string): RgbaColor | null => {
  const normalized = normalizeHexColor(value);
  if (!normalized) return null;
  const hex = normalized.slice(1);
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: 1,
  };
};

const resolveColorOverride = (value: string | undefined, fallback: RgbaColor): RgbaColor => {
  const parsed = value ? parseHexColor(value) : null;
  if (!parsed) return fallback;
  return { ...parsed, a: fallback.a };
};

const withOpacity = (color: RgbaColor, opacity: number): string => {
  const safeOpacity = Math.max(0, Math.min(1, opacity));
  const alpha = Math.max(0, Math.min(1, color.a * safeOpacity));
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
};

const WEATHER_ICON_MAP: Record<string, string> = {
  '01d': 'fa-sun',
  '01n': 'fa-moon',
  '02d': 'fa-cloud-sun',
  '02n': 'fa-cloud-moon',
  '03d': 'fa-cloud',
  '03n': 'fa-cloud',
  '04d': 'fa-cloud',
  '04n': 'fa-cloud',
  '09d': 'fa-cloud-rain',
  '09n': 'fa-cloud-rain',
  '10d': 'fa-cloud-showers-heavy',
  '10n': 'fa-cloud-showers-heavy',
  '11d': 'fa-bolt',
  '11n': 'fa-bolt',
  '13d': 'fa-snowflake',
  '13n': 'fa-snowflake',
  '50d': 'fa-smog',
  '50n': 'fa-smog',
};

const fetchGeo = async (city: string): Promise<{ lat: number; lon: number; name: string } | null> => {
  try {
    const res = await fetchWithTimeout(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${WEATHER_API_KEY}`,
      WEATHER_REQUEST_TIMEOUT_MS
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!Array.isArray(json) || json.length === 0) return null;
    return { lat: json[0].lat, lon: json[0].lon, name: json[0].name };
  } catch {
    return null;
  }
};

const fetchWeather = async (city: string): Promise<WeatherData | null> => {
  const cacheKey = `desktop_weather_${city}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const data = JSON.parse(cached) as WeatherData;
      if (Date.now() - data.updatedAt < WEATHER_CACHE_HOURS * 60 * 60 * 1000) {
        return data;
      }
    }
  } catch { /* ignore */ }

  try {
    // 先用 Geo API 把城市名解析为经纬度（支持中英文）
    const geo = await fetchGeo(city);
    const queryUrl = geo
      ? `https://api.openweathermap.org/data/2.5/weather?lat=${geo.lat}&lon=${geo.lon}&appid=${WEATHER_API_KEY}&lang=zh_cn&units=metric`
      : `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&lang=zh_cn&units=metric`;

    const res = await fetchWithTimeout(queryUrl, WEATHER_REQUEST_TIMEOUT_MS);
    if (!res.ok) return null;
    const json = await res.json();
    const data: WeatherData = {
      city: json.name || city,
      temp: Math.round(json.main?.temp ?? 0),
      description: json.weather?.[0]?.description || '未知',
      iconClass: WEATHER_ICON_MAP[json.weather?.[0]?.icon] || 'fa-cloud',
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch {
      // 缓存失败不影响本次天气展示。
    }
    return data;
  } catch {
    return null;
  }
};

const THEME_CONFIG: Record<DesktopThemeId, {
  name: string;
  defaultWallpaper: string;
  iconShape: string;
  widgetShape: string;
  widgetBg: string;
  widgetSurfaceColor: RgbaColor;
  widgetBorderColor: RgbaColor;
  dockStyle: string;
  dockBg: string;
  dockSurfaceColor: RgbaColor;
  dockBorderColor: RgbaColor;
  gap: number;
  isDark: boolean;
  accent: string;
  statusBarText: string;
  labelShadow: boolean;
  ringColor: string;
}> = {
  ios: {
    name: 'iOS',
    defaultWallpaper: 'radial-gradient(circle at 18% 12%, rgba(255,255,255,0.76) 0%, rgba(255,255,255,0.12) 24%, transparent 44%), radial-gradient(circle at 82% 18%, rgba(255,223,236,0.46) 0%, rgba(255,223,236,0.12) 24%, transparent 46%), linear-gradient(180deg, #c8d1f5 0%, #9aa4cb 46%, #727894 100%)',
    iconShape: 'rounded-[22%]',
    widgetShape: 'rounded-[24px]',
    widgetBg: 'backdrop-blur-xl border shadow-sm',
    widgetSurfaceColor: { r: 255, g: 255, b: 255, a: 0.3 },
    widgetBorderColor: { r: 255, g: 255, b: 255, a: 0.2 },
    dockStyle: 'rounded-[32px]',
    dockBg: 'bg-white/30 backdrop-blur-xl border border-white/20 shadow-lg',
    dockSurfaceColor: { r: 255, g: 255, b: 255, a: 0.3 },
    dockBorderColor: { r: 255, g: 255, b: 255, a: 0.2 },
    gap: 16,
    isDark: false,
    accent: '#007AFF',
    statusBarText: 'text-gray-800',
    labelShadow: false,
    ringColor: 'ring-blue-400/50',
  },
  android: {
    name: 'Android',
    defaultWallpaper: 'radial-gradient(circle at 16% 18%, rgba(255,255,255,0.52) 0%, rgba(255,255,255,0.12) 22%, transparent 42%), radial-gradient(circle at 84% 14%, rgba(201,255,244,0.34) 0%, rgba(201,255,244,0.08) 22%, transparent 40%), radial-gradient(circle at 72% 78%, rgba(84,95,132,0.34) 0%, rgba(84,95,132,0.1) 24%, transparent 46%), linear-gradient(180deg, #dbe5e0 0%, #adb6be 44%, #52596a 100%)',
    iconShape: 'rounded-2xl',
    widgetShape: 'rounded-2xl',
    widgetBg: 'border shadow-md',
    widgetSurfaceColor: { r: 255, g: 255, b: 255, a: 0.9 },
    widgetBorderColor: { r: 243, g: 244, b: 246, a: 1 },
    dockStyle: 'rounded-3xl',
    dockBg: 'bg-white/95 shadow-2xl border border-gray-100/50',
    dockSurfaceColor: { r: 255, g: 255, b: 255, a: 0.95 },
    dockBorderColor: { r: 243, g: 244, b: 246, a: 0.5 },
    gap: 14,
    isDark: false,
    accent: '#1a73e8',
    statusBarText: 'text-gray-800',
    labelShadow: false,
    ringColor: 'ring-blue-500/40',
  },
  wp: {
    name: 'Windows Phone',
    defaultWallpaper: 'radial-gradient(circle at 18% 18%, rgba(86,86,86,0.22) 0%, transparent 30%), linear-gradient(180deg, #151515 0%, #050505 100%)',
    iconShape: 'rounded-none',
    widgetShape: 'rounded-none',
    widgetBg: 'border backdrop-blur-sm',
    widgetSurfaceColor: { r: 255, g: 255, b: 255, a: 0.1 },
    widgetBorderColor: { r: 255, g: 255, b: 255, a: 0.08 },
    dockStyle: 'rounded-none',
    dockBg: 'bg-[#141414] border-t-2 border-white/10',
    dockSurfaceColor: { r: 20, g: 20, b: 20, a: 1 },
    dockBorderColor: { r: 255, g: 255, b: 255, a: 0.1 },
    gap: 10,
    isDark: true,
    accent: '#F25022',
    statusBarText: 'text-white',
    labelShadow: true,
    ringColor: 'ring-white/30',
  },
};

const WALLPAPER_PRESETS = [
  { name: '浅灰', value: 'linear-gradient(180deg, #e4e6ef 0%, #d4d6df 100%)' },
  { name: '暖白', value: 'linear-gradient(180deg, #f5f5f7 0%, #e8e8ed 100%)' },
  { name: '天蓝', value: 'linear-gradient(180deg, #bfdbfe 0%, #dbeafe 100%)' },
  { name: '粉霞', value: 'linear-gradient(180deg, #fbcfe8 0%, #fce7f3 100%)' },
  { name: '薄荷', value: 'linear-gradient(180deg, #a7f3d0 0%, #d1fae5 100%)' },
  { name: '暗夜', value: 'linear-gradient(180deg, #1f2937 0%, #111827 100%)' },
  { name: '深蓝', value: 'linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%)' },
  { name: '纯黑', value: '#000000' },
];

export const DesktopModeShell: React.FC<DesktopModeShellProps> = ({
  settings,
  onEnterApp,
  onOpenSubView,
  onSettingsChange,
  musicState,
  isLocked = false,
  onUnlock,
  onLock,
  forcedOverlayPanel,
  onConsumeForcedOverlayPanel
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingIconId, setEditingIconId] = useState<string | null>(null);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [showDesktopSettings, setShowDesktopSettings] = useState(false);
  const [showDIYPanel, setShowDIYPanel] = useState(false);
  const [showWidgetConfig, setShowWidgetConfig] = useState(false);
  const [configWidgetId, setConfigWidgetId] = useState<string | null>(null);
  const [iconMenu, setIconMenu] = useState<DesktopIconMenuState | null>(null);
  const [showRenameDialog, setShowRenameDialog] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showNotesEdit, setShowNotesEdit] = useState<string | null>(null);
  const [notesEditValue, setNotesEditValue] = useState('');
  const [lockPasscodeInput, setLockPasscodeInput] = useState('');
  const [lockError, setLockError] = useState('');
  const [lockSliderProgress, setLockSliderProgress] = useState(0);
  const [lockSliderActive, setLockSliderActive] = useState(false);
  const [cellHeight, setCellHeight] = useState(CELL_HEIGHT);
  const [cellWidth, setCellWidth] = useState(80);
  const gridRef = useRef<HTMLDivElement>(null);
  const desktopRef = useRef<HTMLDivElement>(null);
  const lockSliderTrackRef = useRef<HTMLDivElement>(null);
  const lockSliderDragRef = useRef<{ startY: number; startProgress: number } | null>(null);
  const currentPage = settings.desktopPageIndex ?? 0;
  const totalPages = normalizeDesktopPageCount(settings.desktopPageCount, settings.desktopIcons, settings.desktopWidgets);
  const settingsRef = useRef(settings);
  const currentPageRef = useRef(currentPage);
  const isEditModeRef = useRef(isEditMode);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    isEditModeRef.current = isEditMode;
  }, [isEditMode]);

  // 自动修正页面索引：如果当前页超出范围，回退到最后一页
  useEffect(() => {
    if (currentPage >= totalPages && onSettingsChange) {
      onSettingsChange({ desktopPageIndex: Math.max(0, totalPages - 1) });
    }
  }, [currentPage, totalPages, onSettingsChange]);

  const touchSwipeRef = useRef<{ startX: number; startY: number; startTime: number } | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const batteryLevel = useBatteryLevel();

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 根据屏幕宽度决定可用的网格行列数范围
  const maxGridCols = screenWidth >= 1024 ? 10 : screenWidth >= 640 ? 7 : 5;
  const maxGridRows = screenWidth >= 1024 ? 12 : screenWidth >= 640 ? 10 : 8;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isLocked) {
      setLockPasscodeInput('');
      setLockError('');
      setLockSliderProgress(0);
      setLockSliderActive(false);
      lockSliderDragRef.current = null;
      return;
    }
    setLockPasscodeInput('');
    setLockError('');
    setLockSliderProgress(0);
  }, [isLocked]);

  useEffect(() => {
    if (!forcedOverlayPanel) return;
    if (forcedOverlayPanel === 'settings') {
      setShowDIYPanel(false);
      setShowDesktopSettings(true);
    } else if (forcedOverlayPanel === 'diy') {
      setShowDesktopSettings(false);
      setShowDIYPanel(true);
    }
    onConsumeForcedOverlayPanel?.();
  }, [forcedOverlayPanel, onConsumeForcedOverlayPanel]);

  // 获取天气
  useEffect(() => {
    const city = settings.desktopWeatherCity || '北京';
    let cancelled = false;
    fetchWeather(city).then(data => {
      if (!cancelled) setWeatherData(data);
    }).catch((error) => {
      console.warn('[DesktopMode] 获取天气失败:', error);
    });
    return () => { cancelled = true; };
  }, [settings.desktopWeatherCity]);

  // 主题
  const themeId = (settings.desktopThemeId || 'ios') as DesktopThemeId;
  const baseTheme = THEME_CONFIG[themeId];
  const lockSlideTheme = LOCK_SLIDE_THEME_CONFIG[themeId];
  // 图标形状可由用户独立覆盖
  const iconShapeMap: Record<string, string> = {
    rounded: 'rounded-[22%]',
    circle: 'rounded-full',
    square: 'rounded-none',
  };
  const theme = {
    ...baseTheme,
    iconShape: settings.desktopIconShape && settings.desktopIconShape !== 'default'
      ? iconShapeMap[settings.desktopIconShape] ?? baseTheme.iconShape
      : baseTheme.iconShape,
  };
  const desktopThemeOptions = useMemo<DesktopThemeOption[]>(
    () => (Object.keys(THEME_CONFIG) as DesktopThemeId[]).map((id) => ({ id, name: THEME_CONFIG[id].name })),
    []
  );

  // 使用设置中的图标和小组件，如果为空则使用默认值；运行时自动合并缺失的默认图标
  const rawDesktopIcons = (() => {
    const saved = settings.desktopIcons || [];
    if (saved.length === 0) return DEFAULT_APPEARANCE_SETTINGS.desktopIcons || [];
    const defaults = DEFAULT_APPEARANCE_SETTINGS.desktopIcons || [];
    const existingIds = new Set(saved.map((i: any) => i.id));
    const merged = [...saved];
    for (const def of defaults) {
      if (!existingIds.has(def.id)) {
        merged.push({ ...def });
      }
    }
    return merged;
  })();
  const rawDesktopWidgets = (settings.desktopWidgets && settings.desktopWidgets.length > 0)
    ? settings.desktopWidgets
    : DEFAULT_APPEARANCE_SETTINGS.desktopWidgets;
  const resolvedDockIconIds = useMemo(
    () => {
      const ids = settings.desktopDockIconIds?.length
        ? settings.desktopDockIconIds
        : DEFAULT_APPEARANCE_SETTINGS.desktopDockIconIds || [];
      return [...new Set(ids)];
    },
    [settings.desktopDockIconIds]
  );
  const dockIcons = useMemo(
    () => resolvedDockIconIds
      .map(id => rawDesktopIcons.find(icon => icon.id === id))
      .filter((icon): icon is DesktopIcon => Boolean(icon)),
    [rawDesktopIcons, resolvedDockIconIds]
  );
  const wallpaper = settings.desktopWallpaper || theme.defaultWallpaper;
  const isImageUrl = wallpaper.startsWith('http') || wallpaper.startsWith('/') || wallpaper.startsWith('data:');
  const lockWallpaper = settings.desktopLockWallpaper || wallpaper;
  const isLockImageUrl = lockWallpaper.startsWith('http') || lockWallpaper.startsWith('/') || lockWallpaper.startsWith('data:');
  const normalizedLockPasscode = normalizeDesktopLockPasscode(settings.desktopLockPasscode);
  const needsLockPasscode = hasDesktopLockPasscode(normalizedLockPasscode);
  const showDock = settings.desktopShowDock !== false;
  const gridCols = settings.desktopGridCols || DEFAULT_gridCols;
  const gridRows = settings.desktopGridRows || DEFAULT_gridRows;
  const wallpaperOpacity = settings.desktopWallpaperOpacity ?? 1;
  const wallpaperBlur = settings.desktopWallpaperBlur ?? 0;
  const safeDockOpacity = settings.desktopDockOpacity ?? 1;
  const safeWidgetOpacity = settings.desktopWidgetOpacity ?? 1;
  const showDesktopStatusBar = settings.desktopShowStatusBar !== false;
  const desktopSystemNavigationMode = settings.desktopSystemNavigationMode ?? 'gesture';
  const shouldShowDesktopOverlayNavigation = desktopSystemNavigationMode === 'buttons' && (showDesktopSettings || showDIYPanel);
  const shouldHideDesktopSystemNavigation = (
    (desktopSystemNavigationMode === 'buttons' && !shouldShowDesktopOverlayNavigation)
    || showWidgetPicker
    || showWidgetConfig
    || showCityPicker
    || !!iconMenu
    || !!showRenameDialog
    || !!showNotesEdit
  );
  const desktopDockPaddingBottom = 'calc(16px + var(--safe-bottom, 0px))';
  const desktopOverlayContentPaddingBottom = desktopSystemNavigationMode === 'buttons'
    ? DESKTOP_SYSTEM_NAV_BUTTONS_RESERVED_SPACE
    : 'calc(24px + var(--safe-bottom, 0px))';
  const useFloatingEditToolbar = isEditMode && shouldUseFloatingDesktopEditToolbar(showDesktopStatusBar, settings.statusBarLayout);
  const desktopContentPaddingTop = showDesktopStatusBar ? '16px' : 'calc(16px + var(--safe-top, 0px))';
  const iosLockHeroMarginTop = showDesktopStatusBar ? '54px' : '28px';
  const androidLockHeroMarginTop = showDesktopStatusBar ? '74px' : '38px';

  // 将超出当前网格范围的图标自动调整到网格内最近的空位，防止产生隐式列导致截断
  const desktopIcons = useMemo(() => {
    const result = [...rawDesktopIcons];
    const occupied = new Set<string>();
    for (const icon of result) {
      if (icon.col < gridCols && icon.row < gridRows && (icon.pageIndex ?? 0) === currentPage) {
        occupied.add(`${icon.row},${icon.col}`);
      }
    }
    for (let i = 0; i < result.length; i++) {
      if ((result[i].pageIndex ?? 0) !== currentPage) continue;
      if (result[i].col < gridCols && result[i].row < gridRows) continue;
      let placed = false;
      for (let r = 0; r < gridRows && !placed; r++) {
        for (let c = 0; c < gridCols && !placed; c++) {
          if (!occupied.has(`${r},${c}`)) {
            result[i] = { ...result[i], row: r, col: c };
            occupied.add(`${r},${c}`);
            placed = true;
          }
        }
      }
      // 实在没有空位，强制放到右下角（避免留在隐式列）
      if (!placed) {
        result[i] = { ...result[i], row: Math.max(0, gridRows - 1), col: Math.max(0, gridCols - 1) };
      }
    }
    return result.filter(icon => (icon.pageIndex ?? 0) === currentPage);
  }, [rawDesktopIcons, gridCols, gridRows, currentPage]);

  // 过滤掉超出当前网格范围的小组件，并限制当前页面
  const desktopWidgets = useMemo(() => {
    return (rawDesktopWidgets || []).filter(w =>
      w.col >= 0 && w.row >= 0 &&
      w.col + w.width <= gridCols &&
      w.row + w.height <= gridRows &&
      (w.pageIndex ?? 0) === currentPage
    );
  }, [rawDesktopWidgets, gridCols, gridRows, currentPage]);
  const configWidget = useMemo(
    () => configWidgetId ? desktopWidgets.find((widget) => widget.id === configWidgetId) || null : null,
    [configWidgetId, desktopWidgets]
  );

  const {
    dockDragId,
    dockDragOverIndex,
    dockContainerRef,
    handleDockDragMove,
    handleDockDragEnd,
    handleDockDragStart,
    handleRemoveFromDock,
  } = useDesktopDockDrag({
    dockIconIds: resolvedDockIconIds,
    onSettingsChange,
  });

  const handleEnterEditModeFromDrag = useCallback((itemId: string) => {
    setIsEditMode(true);
    setEditingIconId(itemId);
  }, []);

  const {
    dragItem,
    dragItemRef,
    dragPageTarget,
    dragGhostRef,
    dragPosition,
    handleItemMouseDown,
    handleItemTouchStart,
    handleItemTouchMove,
    handleItemTouchEnd,
  } = useDesktopWorkspaceDrag({
    isEditMode,
    currentPage,
    totalPages,
    gridRef,
    dockContainerRef,
    gridCols,
    gridRows,
    cellHeight,
    gridGap: theme.gap,
    icons: rawDesktopIcons,
    widgets: rawDesktopWidgets || [],
    dockIconIds: resolvedDockIconIds,
    onEnterEditMode: handleEnterEditModeFromDrag,
    onSettingsChange,
  });

  // 动态计算单元格高度与宽度，适配不同屏幕
  // 注意：只依赖 raw 数据和网格尺寸，不依赖 useMemo 后的 desktopIcons/desktopWidgets，避免频繁重建
  useEffect(() => {
    const calc = () => {
      if (!desktopRef.current) return;
      const rect = desktopRef.current.getBoundingClientRect();
      const desktopStyle = window.getComputedStyle(desktopRef.current);
      const paddingTop = parseFloat(desktopStyle.paddingTop) || 0;
      const paddingRight = parseFloat(desktopStyle.paddingRight) || 0;
      const paddingBottom = parseFloat(desktopStyle.paddingBottom) || 0;
      const paddingLeft = parseFloat(desktopStyle.paddingLeft) || 0;
      const availableHeight = rect.height - paddingTop - paddingBottom;
      const availableWidth = rect.width - paddingLeft - paddingRight;
      const hintHeight = isEditMode ? 28 : 0;
      const floatingToolbarHeight = useFloatingEditToolbar ? 44 : 0;
      const effectiveHeight = Math.max(availableHeight - hintHeight - floatingToolbarHeight, 1);
      // 以用户设置的网格行数为准
      const rows = Math.max(gridRows, 1);
      const gapTotal = Math.max(0, rows - 1) * theme.gap;
      const h = Math.floor((effectiveHeight - gapTotal) / rows);
      setCellHeight(Math.max(Math.min(h, 120), 28));
      // 单元格宽度要减去 gap 才准确
      const cellW = Math.floor((availableWidth - Math.max(0, gridCols - 1) * theme.gap) / gridCols);
      setCellWidth(Math.max(cellW, 1));
    };
    calc();
    const ro = new ResizeObserver(calc);
    if (desktopRef.current) ro.observe(desktopRef.current);
    return () => ro.disconnect();
  }, [isEditMode, theme.gap, gridRows, gridCols, useFloatingEditToolbar]);

  // 原生触摸事件监听：支持空白区域左右滑动切换页面
  const swipeStateRef = useRef<{ startX: number; startY: number } | null>(null);
  useEffect(() => {
    const el = desktopRef.current;
    if (!el) return;
    const getSettings = () => settingsRef.current;
    const getCurrentPage = () => currentPageRef.current;
    const getEditMode = () => isEditModeRef.current;
    const getDragItem = () => dragItemRef.current;
    const handleTouchStart = (e: TouchEvent) => {
      if (getEditMode() || getDragItem()) return;
      const touch = e.touches[0];
      swipeStateRef.current = { startX: touch.clientX, startY: touch.clientY };
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!swipeStateRef.current || getEditMode() || getDragItem()) return;
      const touch = e.touches[0];
      const dx = touch.clientX - swipeStateRef.current.startX;
      const dy = touch.clientY - swipeStateRef.current.startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        e.preventDefault();
      }
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (!swipeStateRef.current || getEditMode() || getDragItem()) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - swipeStateRef.current.startX;
      const dy = touch.clientY - swipeStateRef.current.startY;
      swipeStateRef.current = null;
      const isHorizontal = Math.abs(dx) > Math.abs(dy);
      if (Math.abs(dx) > 25 && isHorizontal) {
        const s = getSettings();
        const page = getCurrentPage();
        const pageCount = normalizeDesktopPageCount(s.desktopPageCount, s.desktopIcons, s.desktopWidgets);
        if (dx < 0 && page < pageCount - 1) {
          onSettingsChange?.({ desktopPageIndex: page + 1 });
        } else if (dx > 0 && page > 0) {
          onSettingsChange?.({ desktopPageIndex: page - 1 });
        }
      }
    };
    const handleTouchCancel = () => {
      swipeStateRef.current = null;
    };
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('touchcancel', handleTouchCancel);
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchCancel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 图标尺寸随单元格动态缩放（高度/宽度双重约束）
  // scale 放大后仍需受限于单元格内容区域，防止溢出
  const iconSize = useMemo(() => {
    const scale = settings.desktopIconScale ?? 1;
    const hBased = Math.max(cellHeight - 28, 20); // 留出文字与间距空间
    const contentW = Math.max(cellWidth - 16, 20); // 减去按钮左右 padding (p-2 = 8px*2)
    const base = Math.min(hBased, contentW, 56);
    const scaled = Math.round(base * scale);
    // 放大后仍不能超过内容区域，否则会溢出单元格
    return Math.min(scaled, contentW, cellHeight - 28);
  }, [cellHeight, cellWidth, settings.desktopIconScale]);

  const resolvedDockSurfaceColor = useMemo(
    () => resolveColorOverride(settings.desktopDockColor, theme.dockSurfaceColor),
    [settings.desktopDockColor, theme.dockSurfaceColor]
  );
  const resolvedDockBorderColor = useMemo(
    () => resolveColorOverride(settings.desktopDockColor, theme.dockBorderColor),
    [settings.desktopDockColor, theme.dockBorderColor]
  );
  const resolvedWidgetSurfaceColor = useMemo(
    () => resolveColorOverride(settings.desktopWidgetColor, theme.widgetSurfaceColor),
    [settings.desktopWidgetColor, theme.widgetSurfaceColor]
  );
  const resolvedWidgetBorderColor = useMemo(
    () => resolveColorOverride(settings.desktopWidgetColor, theme.widgetBorderColor),
    [settings.desktopWidgetColor, theme.widgetBorderColor]
  );
  const dockContainerStyle = useMemo<React.CSSProperties>(() => {
    return {
      backgroundColor: withOpacity(resolvedDockSurfaceColor, safeDockOpacity),
      borderColor: withOpacity(resolvedDockBorderColor, safeDockOpacity),
    };
  }, [resolvedDockBorderColor, resolvedDockSurfaceColor, safeDockOpacity]);

  const widgetContainerStyle = useMemo<React.CSSProperties>(() => {
    return {
      backgroundColor: withOpacity(resolvedWidgetSurfaceColor, 1),
      borderColor: withOpacity(resolvedWidgetBorderColor, 1),
    };
  }, [resolvedWidgetBorderColor, resolvedWidgetSurfaceColor]);

  const handleReturnToDesktopHomeState = useCallback(() => {
    setShowDesktopSettings(false);
    setShowDIYPanel(false);
    setShowWidgetPicker(false);
    setShowWidgetConfig(false);
    setConfigWidgetId(null);
    setShowCityPicker(false);
    setIconMenu(null);
    setShowRenameDialog(null);
    setShowNotesEdit(null);
    setEditingIconId(null);
    setIsEditMode(false);
    onSettingsChange?.({ desktopPageIndex: 0 });
  }, [onSettingsChange]);

  const handleDesktopBackAction = useCallback(() => {
    if (showDesktopSettings) {
      setShowDesktopSettings(false);
      return;
    }
    if (showDIYPanel) {
      setShowDIYPanel(false);
      return;
    }
    if (showWidgetConfig) {
      setShowWidgetConfig(false);
      setConfigWidgetId(null);
      return;
    }
    if (showWidgetPicker) {
      setShowWidgetPicker(false);
      return;
    }
    if (showCityPicker) {
      setShowCityPicker(false);
      return;
    }
    if (iconMenu) {
      setIconMenu(null);
      return;
    }
    if (showRenameDialog) {
      setShowRenameDialog(null);
      return;
    }
    if (showNotesEdit) {
      setShowNotesEdit(null);
      return;
    }
    if (isEditMode) {
      setEditingIconId(null);
      setIsEditMode(false);
      return;
    }
    if (currentPage > 0) {
      onSettingsChange?.({ desktopPageIndex: currentPage - 1 });
    }
  }, [
    currentPage,
    iconMenu,
    isEditMode,
    onSettingsChange,
    showCityPicker,
    showDIYPanel,
    showDesktopSettings,
    showNotesEdit,
    showRenameDialog,
    showWidgetConfig,
    showWidgetPicker,
  ]);

  const handleDesktopSystemNavigationAction = useCallback((action: DesktopSystemNavigationAction) => {
    if (action === 'back') {
      handleDesktopBackAction();
      return;
    }
    if (action === 'home') {
      handleReturnToDesktopHomeState();
      return;
    }
    if (action === 'settings') {
      setShowDIYPanel(false);
      setShowDesktopSettings(true);
      return;
    }
    if (action === 'lock') {
      onLock?.();
    }
  }, [handleDesktopBackAction, handleReturnToDesktopHomeState, onLock]);

  const handleSaveWeatherCity = useCallback((rawCity: string) => {
    const city = rawCity.trim() || '北京';
    onSettingsChange?.({ desktopWeatherCity: city });
    setShowCityPicker(false);
    void fetchWeather(city).then(data => setWeatherData(data));
  }, [onSettingsChange]);

  // 检测单元格是否被占用
  const isCellOccupied = (row: number, col: number, excludeId?: string): boolean => {
    // 检查图标（占用 1x1）
    if (desktopIcons.some(i => i.row === row && i.col === col && i.id !== excludeId)) {
      return true;
    }
    // 检查小组件（可能占用多格）
    for (const w of desktopWidgets) {
      if (w.id === excludeId) continue;
      if (row >= w.row && row < w.row + w.height &&
          col >= w.col && col < w.col + w.width) {
        return true;
      }
    }
    return false;
  };

  // 找到第一个空格子
  const findEmptyCell = (width: number = 1, height: number = 1): { row: number; col: number } | null => {
    // 从第0行开始，找到能容纳指定尺寸的第一个位置
    const maxRow = gridRows; // 最大行数限制
    for (let r = 0; r < maxRow; r++) {
      for (let c = 0; c <= gridCols - width; c++) {
        // 检查从 开始的 width x height 区域是否全部空闲
        let canPlace = true;
        for (let dr = 0; dr < height && canPlace; dr++) {
          for (let dc = 0; dc < width && canPlace; dc++) {
            if (isCellOccupied(r + dr, c + dc)) {
              canPlace = false;
            }
          }
        }
        if (canPlace) return { row: r, col: c };
      }
    }
    return null;
  };

  // 保存设置（合并其他页面的数据）
  const saveIcons = useCallback((icons: DesktopIcon[]) => {
    onSettingsChange?.({ desktopIcons: mergeDesktopItemsForPage(settings.desktopIcons, currentPage, icons) });
  }, [onSettingsChange, settings.desktopIcons, currentPage]);

  const saveWidgets = useCallback((widgets: DesktopWidget[]) => {
    onSettingsChange?.({ desktopWidgets: mergeDesktopItemsForPage(settings.desktopWidgets, currentPage, widgets) });
  }, [onSettingsChange, settings.desktopWidgets, currentPage]);

  const handleUnlockAttempt = useCallback(() => {
    if (!needsLockPasscode) {
      setLockError('');
      onUnlock?.();
      return;
    }
    if (lockPasscodeInput === normalizedLockPasscode) {
      setLockError('');
      setLockPasscodeInput('');
      onUnlock?.();
      return;
    }
    setLockError('密码不对，请重新输入');
  }, [lockPasscodeInput, needsLockPasscode, normalizedLockPasscode, onUnlock]);

  const beginSlideUnlock = useCallback((clientY: number) => {
    if (needsLockPasscode || !isLocked) return;
    lockSliderDragRef.current = { startY: clientY, startProgress: lockSliderProgress };
    setLockSliderActive(true);
    setLockError('');
  }, [isLocked, lockSliderProgress, needsLockPasscode]);

  useEffect(() => {
    if (!lockSliderActive || needsLockPasscode || !isLocked) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (!lockSliderTrackRef.current || !lockSliderDragRef.current) return;
      const rect = lockSliderTrackRef.current.getBoundingClientRect();
      const deltaY = lockSliderDragRef.current.startY - event.clientY;
      const movableDistance = Math.max(rect.height - lockSlideTheme.handleSize - lockSlideTheme.handleInset * 2, 1);
      const nextProgress = Math.max(0, Math.min(1, lockSliderDragRef.current.startProgress + deltaY / movableDistance));
      setLockSliderProgress(nextProgress);
      if (nextProgress >= lockSlideTheme.unlockThreshold) {
        setLockSliderProgress(1);
        setLockSliderActive(false);
        lockSliderDragRef.current = null;
        onUnlock?.();
      }
    };

    const handlePointerUp = () => {
      setLockSliderActive(false);
      lockSliderDragRef.current = null;
      setLockSliderProgress((prev) => (prev >= lockSlideTheme.unlockThreshold ? 1 : 0));
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isLocked, lockSliderActive, needsLockPasscode, onUnlock, lockSlideTheme.handleInset, lockSlideTheme.handleSize, lockSlideTheme.unlockThreshold]);

  const handleOpenDesktopIcon = useCallback((icon: DesktopIcon) => {
    if (icon.subView === 'desktopLock') {
      onLock?.();
    } else if (icon.subView === 'desktopSettings') {
      setShowDesktopSettings(true);
    } else if (icon.subView === 'desktopDIY') {
      setShowDIYPanel(true);
    } else if (icon.icon === 'default-app') {
      onEnterApp();
    } else if (icon.subView && onOpenSubView) {
      onOpenSubView(icon.subView);
    } else if (icon.subView) {
      onEnterApp();
    }
  }, [onEnterApp, onLock, onOpenSubView]);

  const handleAddPage = useCallback(() => {
    const nextPageCount = Math.min(DESKTOP_PAGE_MAX, totalPages + 1);
    onSettingsChange?.({
      desktopPageCount: nextPageCount,
      desktopPageIndex: nextPageCount - 1
    });
  }, [onSettingsChange, totalPages]);

  const handleChangeDesktopPage = useCallback((pageIndex: number) => {
    onSettingsChange?.({ desktopPageIndex: pageIndex });
  }, [onSettingsChange]);

  const handleExitEditMode = useCallback(() => {
    setIsEditMode(false);
    setEditingIconId(null);
  }, []);

  const handleOpenWidgetPicker = useCallback(() => {
    setShowWidgetPicker(true);
  }, []);

  const handleOpenWidgetConfig = useCallback((widgetId: string) => {
    setConfigWidgetId(widgetId);
    setShowWidgetConfig(true);
  }, []);

  // 添加小组件
  const handleAddWidget = (preset: DesktopWidgetPreset) => {
    const emptyCell = findEmptyCell(preset.width, preset.height);
    if (!emptyCell) return; // 没有空位
    const newWidget: DesktopWidget = {
      id: `widget-${Date.now()}`,
      type: preset.type,
      row: emptyCell.row,
      col: emptyCell.col,
      width: preset.width,
      height: preset.height,
      pageIndex: currentPage,
    };
    saveWidgets([...desktopWidgets, newWidget]);
    setShowWidgetPicker(false);
  };

  // 删除小组件
  const handleDeleteWidget = (widgetId: string) => {
    saveWidgets(desktopWidgets.filter(w => w.id !== widgetId));
  };

  const handleSaveWidgetConfig = (widgetId: string, config: Record<string, any>) => {
    const updatedWidgets = desktopWidgets.map(w =>
      w.id === widgetId ? { ...w, config: { ...w.config, ...config } } : w
    );
    saveWidgets(updatedWidgets);
    setShowWidgetConfig(false);
    setConfigWidgetId(null);
  };

  const handleWorkspaceWidgetClick = useCallback((widget: DesktopWidget) => {
    if (isEditMode) {
      setEditingIconId(widget.id);
    } else if (widget.type === 'clock' && widget.width >= 4) {
      setCityInput(settings.desktopWeatherCity || '北京');
      setShowCityPicker(true);
    } else if (widget.type === 'notes') {
      setShowNotesEdit(widget.id);
      setNotesEditValue(widget.config?.content || '');
    }
  }, [isEditMode, settings.desktopWeatherCity]);

  const handleWorkspaceIconClick = useCallback((icon: DesktopIcon) => {
    if (isEditMode) {
      setEditingIconId(editingIconId === icon.id ? null : icon.id);
    } else {
      handleOpenDesktopIcon(icon);
    }
  }, [editingIconId, handleOpenDesktopIcon, isEditMode]);

  const handleOpenIconContextMenu = useCallback((icon: DesktopIcon, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    setIconMenu({ id: icon.id, x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const handleDeleteDesktopIcon = useCallback((icon: DesktopIcon) => {
    if (!confirm(`确定要删除「${icon.name}」吗？`)) return;
    saveIcons(desktopIcons.filter(i => i.id !== icon.id));
    if ((settings.desktopDockIconIds || []).includes(icon.id)) {
      onSettingsChange?.({ desktopDockIconIds: (settings.desktopDockIconIds || []).filter(id => id !== icon.id) });
    }
  }, [desktopIcons, onSettingsChange, saveIcons, settings.desktopDockIconIds]);

  const handleDeletePage = useCallback((pageIndex: number) => {
    if (totalPages <= 1) return;
    const newIcons = (settings.desktopIcons || []).map(i =>
      (i.pageIndex ?? 0) === pageIndex ? { ...i, pageIndex: 0 } : i
    );
    const newWidgets = (settings.desktopWidgets || []).map(w =>
      (w.pageIndex ?? 0) === pageIndex ? { ...w, pageIndex: 0 } : w
    );
    const adjustedIcons = newIcons.map(i =>
      (i.pageIndex ?? 0) > pageIndex ? { ...i, pageIndex: (i.pageIndex ?? 0) - 1 } : i
    );
    const adjustedWidgets = newWidgets.map(w =>
      (w.pageIndex ?? 0) > pageIndex ? { ...w, pageIndex: (w.pageIndex ?? 0) - 1 } : w
    );
    onSettingsChange?.({
      desktopIcons: adjustedIcons,
      desktopWidgets: adjustedWidgets,
      desktopPageCount: Math.max(1, totalPages - 1),
      desktopPageIndex: Math.min(pageIndex, totalPages - 2)
    });
  }, [currentPage, onSettingsChange, settings.desktopIcons, settings.desktopWidgets, totalPages]);

  const handleDeleteCurrentPage = useCallback(() => {
    handleDeletePage(currentPage);
  }, [currentPage, handleDeletePage]);

  const getIconStyle = useCallback(
    (icon: DesktopIcon): React.CSSProperties => getDesktopIconStyle(icon, themeId),
    [themeId]
  );

  const handleResetDesktopSettingsLayout = useCallback(() => {
    if (!confirm('确定要重置桌面布局吗？所有自定义图标和小组件将被恢复为默认。')) return;
    onSettingsChange?.({
      desktopIcons: DEFAULT_APPEARANCE_SETTINGS.desktopIcons,
      desktopWidgets: DEFAULT_APPEARANCE_SETTINGS.desktopWidgets,
      desktopWallpaper: '',
      desktopGridCols: undefined,
      desktopGridRows: undefined,
      desktopShowDock: undefined,
      desktopDockOpacity: undefined,
      desktopDockColor: undefined,
      desktopWidgetColor: undefined,
      desktopPageIndex: undefined,
      desktopPageCount: undefined,
    });
    setShowDesktopSettings(false);
  }, [onSettingsChange]);

  const editModeActionButtons = (
    <DesktopEditModeToolbar
      isDark={theme.isDark}
      canDeletePage={totalPages > 1}
      onAddWidget={handleOpenWidgetPicker}
      onAddPage={handleAddPage}
      onDeleteCurrentPage={handleDeleteCurrentPage}
      onDone={handleExitEditMode}
    />
  );

  const lockScreenOverlay = (
    <DesktopLockScreenOverlay
      isLocked={!!isLocked}
      themeId={themeId}
      defaultWallpaper={theme.defaultWallpaper}
      accentColor={theme.accent}
      lockWallpaper={lockWallpaper}
      isLockImageUrl={isLockImageUrl}
      currentTime={currentTime}
      desktop24Hour={settings.desktop24Hour}
      batteryLevel={batteryLevel}
      showDesktopStatusBar={showDesktopStatusBar}
      iosHeroMarginTop={iosLockHeroMarginTop}
      androidHeroMarginTop={androidLockHeroMarginTop}
      needsLockPasscode={needsLockPasscode}
      lockPasscodeInput={lockPasscodeInput}
      lockError={lockError}
      lockSliderProgress={lockSliderProgress}
      lockSliderTrackRef={lockSliderTrackRef}
      onPasscodeInputChange={(value) => {
        setLockPasscodeInput(value);
        setLockError('');
      }}
      onUnlockAttempt={handleUnlockAttempt}
      onBeginSlideUnlock={beginSlideUnlock}
    />
  );

  return (
    <div className="fixed inset-0 flex flex-col select-none overflow-hidden" style={{ height: '100dvh', fontFamily: 'var(--app-font-family, system-ui, sans-serif)' }}>
      <style>{`
        @keyframes desktopPageSlideIn {
          from { opacity: 0.4; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes desktopShake {
          0% { transform: rotate(-1.5deg); }
          100% { transform: rotate(1.5deg); }
        }
        @keyframes lockScreenIosFade {
          from { opacity: 0; filter: blur(10px); }
          to { opacity: 1; filter: blur(0); }
        }
        @keyframes lockScreenIosHero {
          from { opacity: 0; transform: translateY(18px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes lockScreenIosAction {
          from { opacity: 0; transform: translateY(26px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lockScreenAndroidRise {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lockScreenAndroidHero {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lockScreenAndroidAction {
          from { opacity: 0; transform: translateY(34px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lockScreenWpReveal {
          from { opacity: 0; clip-path: inset(0 0 100% 0); }
          to { opacity: 1; clip-path: inset(0 0 0 0); }
        }
        @keyframes lockScreenWpHero {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes lockScreenWpAction {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* 默认背景层 */}
      <div className="absolute inset-0" style={{ background: theme.defaultWallpaper, pointerEvents: 'none' }} />
      {/* 用户自定义壁纸层 */}
      <div
        className="absolute inset-0"
        style={{
          background: isImageUrl ? `url(${wallpaper}) center/cover no-repeat` : wallpaper,
          pointerEvents: 'none',
          opacity: wallpaperOpacity,
          filter: wallpaperBlur > 0 ? `blur(${wallpaperBlur}px)` : undefined,
        }}
      />
      {/* 状态栏 */}
      {showDesktopStatusBar && (
        <DesktopStatusBar
          settings={settings}
          currentTime={currentTime}
          batteryLevel={batteryLevel}
          isDark={theme.isDark}
          statusBarTextClassName={theme.statusBarText}
          showEditModeActions={!useFloatingEditToolbar && isEditMode}
          editModeActions={editModeActionButtons}
        />
      )}

      {/* 桌面区域 */}
      <div
        ref={desktopRef}
        className="flex-1 overflow-hidden px-4 pb-4"
        style={{ width: '100%', boxSizing: 'border-box', touchAction: 'pan-y', paddingTop: desktopContentPaddingTop }}
      >
        {useFloatingEditToolbar && (
          <div className="relative z-10 mb-4 flex flex-wrap items-center justify-end gap-2">
            {editModeActionButtons}
          </div>
        )}
        {/* 统一网格区域 */}
        <DesktopWorkspaceGrid
          key={`page-${currentPage}`}
          gridRef={gridRef}
          gridCols={gridCols}
          gridRows={gridRows}
          cellHeight={cellHeight}
          gap={theme.gap}
          isEditMode={isEditMode}
          editingItemId={editingIconId}
          dragItem={dragItem}
          icons={desktopIcons}
          widgets={desktopWidgets}
          dockIconIds={settings.desktopDockIconIds || []}
          currentTime={currentTime}
          desktop24Hour={settings.desktop24Hour}
          iconSize={iconSize}
          showIconLabels={settings.desktopShowIconLabels !== false}
          safeWidgetOpacity={safeWidgetOpacity}
          widgetContainerStyle={widgetContainerStyle}
          widgetShapeClassName={theme.widgetShape}
          widgetBackgroundClassName={theme.widgetBg}
          iconShapeClassName={theme.iconShape}
          ringColorClassName={theme.ringColor}
          accentColor={theme.accent}
          isDark={theme.isDark}
          labelShadow={theme.labelShadow}
          weatherData={weatherData}
          musicState={musicState}
          batteryLevel={batteryLevel}
          showBatteryPercent={settings.desktopBatteryPercent !== false}
          isCellOccupied={isCellOccupied}
          renderIconContent={renderDesktopIconContent}
          getIconStyle={getIconStyle}
          onWidgetClick={handleWorkspaceWidgetClick}
          onWidgetConfigClick={handleOpenWidgetConfig}
          onWidgetDelete={handleDeleteWidget}
          onIconClick={handleWorkspaceIconClick}
          onIconDelete={handleDeleteDesktopIcon}
          onIconContextMenu={handleOpenIconContextMenu}
          onItemMouseDown={handleItemMouseDown}
          onItemTouchStart={handleItemTouchStart}
          onItemTouchMove={handleItemTouchMove}
          onItemTouchEnd={handleItemTouchEnd}
          onOpenSubView={onOpenSubView}
          onSaveWidgetConfig={handleSaveWidgetConfig}
        />

        {/* 编辑模式提示 */}
        {isEditMode && (
          <div className={`mt-4 text-center text-xs ${theme.isDark ? 'text-white/60' : 'text-gray-500/60'}`}>
            拖拽排列，点击显示设置按钮
          </div>
        )}
      </div>

      {/* 页面指示器 */}
      <DesktopPageIndicator
        currentPage={currentPage}
        totalPages={totalPages}
        isEditMode={isEditMode}
        accentColor={theme.accent}
        isDark={theme.isDark}
        onPageChange={handleChangeDesktopPage}
      />

      {/* 底部 Dock */}
      {showDock && (
        <DesktopDock
          icons={dockIcons}
          isEditMode={isEditMode}
          dockDragId={dockDragId}
          dockDragOverIndex={dockDragOverIndex}
          iconSize={Math.round(48 * (settings.desktopIconScale ?? 1))}
          iconShapeClassName={theme.iconShape}
          dockStyleClassName={theme.dockStyle}
          dockBackgroundClassName={theme.dockBg}
          paddingBottom={desktopDockPaddingBottom}
          containerStyle={dockContainerStyle}
          containerRef={dockContainerRef}
          renderIconContent={renderDesktopIconContent}
          getIconStyle={getIconStyle}
          onDragMove={handleDockDragMove}
          onDragEnd={handleDockDragEnd}
          onDragStart={handleDockDragStart}
          onIconClick={handleOpenDesktopIcon}
          onRemoveFromDock={handleRemoveFromDock}
        />
      )}

      {showWidgetPicker && (
        <DesktopWidgetPickerSheet
          accentColor={theme.accent}
          onClose={() => setShowWidgetPicker(false)}
          onSelect={handleAddWidget}
        />
      )}

      {showWidgetConfig && configWidget && (
        <DesktopWidgetConfigDialog
          widget={configWidget}
          accentColor={theme.accent}
          onClose={() => {
            setShowWidgetConfig(false);
            setConfigWidgetId(null);
          }}
          onSave={handleSaveWidgetConfig}
        />
      )}

      {!isLocked && !shouldHideDesktopSystemNavigation && (
        <DesktopSystemNavigation
          settings={settings}
          context="desktop"
          onAction={handleDesktopSystemNavigationAction}
          onSettingsChange={onSettingsChange}
        />
      )}

      {showDesktopSettings && (
        <DesktopSettingsOverlay
          settings={settings}
          showDock={showDock}
          safeDockOpacity={safeDockOpacity}
          safeWidgetOpacity={safeWidgetOpacity}
          showDesktopStatusBar={showDesktopStatusBar}
          normalizedLockPasscode={normalizedLockPasscode}
          accentColor={theme.accent}
          dockSurfaceColor={theme.dockSurfaceColor}
          widgetSurfaceColor={theme.widgetSurfaceColor}
          wallpaperPresets={WALLPAPER_PRESETS}
          contentPaddingBottom={desktopOverlayContentPaddingBottom}
          onClose={() => setShowDesktopSettings(false)}
          onResetLayout={handleResetDesktopSettingsLayout}
          onSettingsChange={onSettingsChange}
        />
      )}

      {showDIYPanel && (
        <DesktopThemeDiyPanel
          settings={settings}
          wallpaper={wallpaper}
          wallpaperPresets={WALLPAPER_PRESETS}
          wallpaperOpacity={wallpaperOpacity}
          wallpaperBlur={wallpaperBlur}
          themeId={themeId}
          themeOptions={desktopThemeOptions}
          accentColor={theme.accent}
          iconShape={theme.iconShape}
          gridCols={gridCols}
          gridRows={gridRows}
          maxGridCols={maxGridCols}
          maxGridRows={maxGridRows}
          desktopIcons={desktopIcons}
          contentPaddingBottom={desktopOverlayContentPaddingBottom}
          onClose={() => setShowDIYPanel(false)}
          onSettingsChange={onSettingsChange}
          onSaveIcons={saveIcons}
          getIconStyle={getIconStyle}
          renderIconContent={renderDesktopIconContent}
        />
      )}

      {showCityPicker && (
        <DesktopWeatherCityDialog
          cityInput={cityInput}
          accentColor={theme.accent}
          onCityInputChange={setCityInput}
          onClose={() => setShowCityPicker(false)}
          onSave={handleSaveWeatherCity}
        />
      )}

      <DesktopIconActionPanels
        iconMenu={iconMenu}
        icons={desktopIcons}
        dockIconIds={settings.desktopDockIconIds}
        renameIconId={showRenameDialog}
        renameValue={renameValue}
        notesEditWidgetId={showNotesEdit}
        notesEditValue={notesEditValue}
        widgets={desktopWidgets}
        accentColor={theme.accent}
        onCloseIconMenu={() => setIconMenu(null)}
        onOpenRename={(iconId, name) => {
          setShowRenameDialog(iconId);
          setRenameValue(name);
          setIconMenu(null);
        }}
        onRenameValueChange={setRenameValue}
        onCloseRename={() => setShowRenameDialog(null)}
        onSaveIcons={saveIcons}
        onDockIconIdsChange={(ids) => onSettingsChange?.({ desktopDockIconIds: ids })}
        onStartEditIcon={(iconId) => {
          setIsEditMode(true);
          setEditingIconId(iconId);
          setIconMenu(null);
        }}
        onCloseNotesEdit={() => setShowNotesEdit(null)}
        onNotesEditValueChange={setNotesEditValue}
        onSaveWidgetConfig={handleSaveWidgetConfig}
      />

      <DesktopDragPreview
        dragItem={dragItem}
        dragPageTarget={dragPageTarget}
        dragGhostRef={dragGhostRef}
        dragPosition={dragPosition}
        icons={rawDesktopIcons}
        widgets={rawDesktopWidgets || []}
        theme={theme}
        iconSize={iconSize}
        widgetContainerStyle={widgetContainerStyle}
        currentTime={currentTime}
        desktop24Hour={settings.desktop24Hour}
        renderIconContent={renderDesktopIconContent}
        getIconStyle={getDesktopIconStyle}
        themeId={themeId}
      />

      {lockScreenOverlay}
    </div>
  );
};

export default DesktopModeShell;
