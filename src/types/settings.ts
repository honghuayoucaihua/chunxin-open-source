import type { BuiltInSkinId, AppRenderConfig } from '../render-schema';

export interface DIYThemePreset {
  id: string;
  name: string;
  baseSkinId: BuiltInSkinId;
  renderConfig: AppRenderConfig;
  customCSS?: string;
  headerImage?: string;
  footerImage?: string;
  iconImageMap?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface DesktopIcon {
  id: string;
  name: string;
  icon: string;  // 图标 URL 或预设名称
  type: 'app' | 'folder' | 'decorative';
  subView?: string;  // 点击后打开的子视图
  row: number;  // 网格行位置（0-indexed）
  col: number;  // 网格列位置（0-indexed）
  customIconUrl?: string; // 用户上传的自定义图标图片（Data URL）
  pageIndex?: number; // 所在桌面页面（默认0）
}

export interface DesktopWidget {
  id: string;
  type: 'clock' | 'date' | 'music' | 'notes' | 'countdown' | 'image' | 'todo' | 'calendar' | 'battery';
  row: number;  // 网格行位置（0-indexed）
  col: number;  // 网格列位置（0-indexed）
  width: number;  // 宽度（网格单元数）
  height: number;  // 高度（网格单元数）
  config?: Record<string, any>;  // 小组件配置
  pageIndex?: number; // 所在桌面页面（默认0）
}

export type DesktopSystemNavigationMode = 'gesture' | 'buttons' | 'assistiveTouch';
export type DesktopSystemNavigationAction = 'none' | 'home' | 'back' | 'settings' | 'lock';
export type DesktopSystemNavigationAssistiveTouchShape = 'circle' | 'rounded' | 'square';

export interface AppearanceSettings {
  themeMode: 'auto' | 'light' | 'dark';
  renderSkinId: BuiltInSkinId;
  renderConfig?: AppRenderConfig;
  // 基础全局外观（独立于 renderConfig 的全局能力）
  uiScale: number;
  interfaceDensity: 'compact' | 'default' | 'comfortable';
  contentWidth: 'full' | 'wide' | 'narrow';
  chatBg?: string;
  redPacketPreviewBg?: string;
  enableLandscape: boolean;
  enableFontBold: boolean;
  enableRainEffect?: boolean;
  enableSnowEffect?: boolean;
  enableThunderEffect?: boolean;
  surfaceStyle: 'flat' | 'glass' | 'neumorphism';
  glassOpacity?: number;          // 毛玻璃透明度 (0-100, 默认 72)
  glassBlur?: number;             // 毛玻璃模糊度 (0-30, 默认 16)
  darkContrast: 'soft' | 'standard' | 'high';
  fontFamily: 'system' | 'pingfang' | 'noto' | 'serif' | 'mono' | 'custom';
  customFontName?: string;
  customFontDataUrl?: string;
  notificationTextSize?: number;

  // 桌面模式
  enableDesktopMode?: boolean;
  desktopThemeId?: 'ios' | 'android' | 'wp';
  desktopWallpaper?: string;
  desktopLockEnabled?: boolean;
  desktopLockWallpaper?: string;
  desktopLockPasscode?: string;
  desktopIcons?: DesktopIcon[];
  desktopWidgets?: DesktopWidget[];
  desktopShowDock?: boolean;
  desktopGridCols?: number;
  desktopGridRows?: number;
  desktopWallpaperOpacity?: number;
  desktopWallpaperBlur?: number;
  desktopWeatherCity?: string;
  desktop24Hour?: boolean;
  desktopBatteryPercent?: boolean;
  desktopShowStatusBar?: boolean;
  statusBarLayout?: 'default' | 'center' | 'minimal';
  desktopShowSignal?: boolean;
  desktopShowWifi?: boolean;
  statusBarShowDate?: boolean;
  desktopShowIconLabels?: boolean;
  desktopWidgetOpacity?: number;
  desktopWidgetColor?: string;
  desktopIconScale?: number;
  desktopDockOpacity?: number;
  desktopDockColor?: string;
  desktopIconShape?: 'default' | 'rounded' | 'circle' | 'square';
  desktopDockIconIds?: string[];
  desktopPageIndex?: number;
  desktopPageCount?: number;
  desktopSystemNavigationMode?: DesktopSystemNavigationMode;
  desktopSystemNavigationAssistiveTouchSingleTapAction?: DesktopSystemNavigationAction;
  desktopSystemNavigationAssistiveTouchDoubleTapAction?: DesktopSystemNavigationAction;
  desktopSystemNavigationAssistiveTouchOpacity?: number;
  desktopSystemNavigationAssistiveTouchSize?: number;
  desktopSystemNavigationAssistiveTouchColor?: string;
  desktopSystemNavigationAssistiveTouchBorderColor?: string;
  desktopSystemNavigationAssistiveTouchBorderWidth?: number;
  desktopSystemNavigationAssistiveTouchImage?: string;
  desktopSystemNavigationAssistiveTouchPositionX?: number;
  desktopSystemNavigationAssistiveTouchPositionY?: number;
  desktopSystemNavigationAssistiveTouchFreePosition?: boolean;
  desktopSystemNavigationAssistiveTouchShape?: DesktopSystemNavigationAssistiveTouchShape;

  // === 扩展DIY主题属性 ===
  // 背景颜色
  primaryBgColor?: string;        // 主背景色
  secondaryBgColor?: string;      // 次级背景色
  tertiaryBgColor?: string;       // 三级背景色

  // 文字颜色
  primaryTextColor?: string;      // 主文字色
  secondaryTextColor?: string;    // 次级文字色
  tertiaryTextColor?: string;     // 三级文字色

  // 边框相关
  borderColor?: string;           // 边框颜色
  borderWidth?: number;           // 边框宽度
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';  // 边框样式

  // 阴影相关
  bubbleShadow?: string;          // 气泡阴影
  cardShadow?: string;            // 卡片阴影
  headerShadow?: string;          // 头部阴影

  // 气泡高级设置
  bubblePadding?: number;         // 气泡内边距
  bubbleBorderWidth?: number;     // 气泡边框宽度
  bubbleBorderColorMe?: string;   // 我的气泡边框色
  bubbleBorderColorOther?: string; // 对方气泡边框色
  bubbleOpacity?: number;         // 气泡透明度 (0-1)
  bubbleBlur?: number;            // 气泡模糊强度 (px)
  pixelGridOpacity?: number;      // 像素格子透明度 (0-100)
  pixelCrtOpacity?: number;       // CRT透明度 (0-100)

  // 头部设置
  headerBgColor?: string;         // 头部背景色
  headerTextColor?: string;       // 头部文字色

  // 输入框设置
  inputBgColor?: string;          // 输入框背景色
  inputTextColor?: string;        // 输入框文字色
  inputBorderColor?: string;      // 输入框边框色

  // 联系人列表设置
  contactItemBgColor?: string;    // 联系人项背景色
  contactItemHoverColor?: string; // 联系人项悬停色
  contactItemActiveColor?: string; // 联系人项激活色

  // 动画设置
  enableAnimations?: boolean;     // 启用动画
  animationDuration?: number;     // 动画时长 (ms)
  animationTimingFunction?: string; // 动画缓动函数

  // 滚动条设置
  scrollbarWidth?: number;        // 滚动条宽度
  scrollbarColor?: string;        // 滚动条颜色
  scrollbarHoverColor?: string;   // 滚动条悬停色

  // 心声/动作文字样式与前缀
  innerNoticeTextColor?: string;
  actionNoticeTextColor?: string;
  narrationNoticeTextColor?: string;
  systemNoticeTextColor?: string;
  systemNoticeBackgroundStyle?: 'auto' | 'glass' | 'solid';
  systemNoticeBackgroundOpacity?: number;
  systemNoticeBlur?: number;
  systemNoticeBorderEnabled?: boolean;
  systemNoticeBorderColor?: string;
  systemNoticeBorderOpacity?: number;
  innerVoicePrefix?: string;
  actionDescPrefix?: string;
  narrationPrefix?: string;
  readStatusTextOverride?: string;

  // 全局自定义CSS
  customCSS?: string;
  customCSSEnabled?: boolean;

  // DIY 主题管理
  customThemes?: DIYThemePreset[];
  activeCustomThemeId?: string;

  // 图片替换
  headerImage?: string;
  footerImage?: string;
  globalBg?: string; // 全局背景图片
  globalBgOverlayOpacity?: number; // 全局背景覆盖层透明度 (0-1)
  globalBgBlur?: number; // 全局背景毛玻璃强度 (0-30)

  // 图标图片DIY（key: FontAwesome 图标类名，如 fa-comment）
  iconImageMap?: Record<string, string>;

  // HTML 气泡高级能力（高风险）
  enableHtmlBubbleScripts?: boolean;
  allowBubbleLineBreak?: boolean;
}

export interface SoundVibrationSettings {
  sendSoundEnabled: boolean;
  receiveSoundEnabled: boolean;
  sendSoundSrc: string;
  receiveSoundSrc: string;
  vibrationEnabled: boolean;
  notificationEnabled?: boolean;
  notificationTitleTemplate?: string;
  notificationBodyTemplate?: string;
  keepAliveInBackgroundEnabled?: boolean;
  keepAliveNotificationTitle?: string;
  keepAliveNotificationBody?: string;
}

export type MomentInteractionSource = 'none' | 'contacts' | 'random';

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
  responseFormat: AIResponseFormat;
  customModelSupportsImageRecognition?: boolean;
  enableAdvancedModelSettings?: boolean;
  modelTemperature?: number;
  modelTopP?: number;
  modelPresencePenalty?: number;
  modelFrequencyPenalty?: number;
  modelMaxTokens?: number;
  requestTimeout?: number;
  enableImageGeneration?: boolean;
  imageResponseFormat?: AIImageResponseFormat;
  imageModel?: string;
  imageBaseUrl?: string;
  imageApiKey?: string;
  enableDelayReply: boolean;
  enableSentenceSend: boolean;
  enableTimeAwareness: boolean;
  promptRuleTree?: PromptRuleTreeSettings;
  momentInteractionSource: MomentInteractionSource;
  minimaxTTS: MiniMaxGlobalTTSSettings;
}

export interface PromptRuleTreeSettings {
  enabled: boolean;
  enabledRuleIds?: string[];
  disabledRuleIds?: string[];
}

export type AIProvider = 'builtin' | 'siliconflow' | 'deepseek' | 'gemini' | 'zhipu' | 'iflow' | 'anthropic' | 'custom';

export type AIResponseFormat = 'openai' | 'response' | 'anthropic';

export type AIImageResponseFormat = 'openai' | 'google' | 'volcengine';

export interface MiniMaxGlobalTTSSettings {
  enabled: boolean;
  region: 'official' | 'international' | 'china';
  apiKey: string;
  groupId: string;
  model: string;
}
