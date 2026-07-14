import type { AppearanceSettings } from './types';
import { BUILT_IN_RENDER_SKINS, DEFAULT_RENDER_CONFIG, type AppRenderConfig, type BuiltInSkinId, type RenderColors } from './render-schema';

const upsertStyleTag = (id: string, cssText: string) => {
  let tag = document.getElementById(id) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement('style');
    tag.id = id;
    document.head.appendChild(tag);
  }
  tag.textContent = cssText;
};

const DARK_SKIN_COLORS: Record<BuiltInSkinId, RenderColors> = {
  wechat: {
    accent: '#07C160',
    bgPrimary: '#111111',
    bgSecondary: '#191919',
    bgTertiary: '#141414',
    textPrimary: '#E1E1E1',
    textSecondary: '#B0B0B0',
    textTertiary: '#888888',
    border: '#2A2A2A',
    bubbleMe: '#95EC69',
    bubbleOther: '#222222',
    bubbleTextMe: '#111111',
    bubbleTextOther: '#E1E1E1'
  },
  qq: {
    accent: '#4BC6FF',
    bgPrimary: '#0E1D2A',
    bgSecondary: '#142636',
    bgTertiary: '#10202E',
    textPrimary: '#E8F2FA',
    textSecondary: '#B5C7D6',
    textTertiary: '#8DA3B5',
    border: '#2B4153',
    bubbleMe: '#1D4965',
    bubbleOther: '#1C2D3E',
    bubbleTextMe: '#EAF5FF',
    bubbleTextOther: '#E8F2FA'
  },
  telegram: {
    accent: '#64A9E9',
    bgPrimary: '#0E1621',
    bgSecondary: '#17212B',
    bgTertiary: '#101923',
    textPrimary: '#E9EEF3',
    textSecondary: '#A9B8C7',
    textTertiary: '#8493A1',
    border: '#253341',
    bubbleMe: '#2B5278',
    bubbleOther: '#182533',
    bubbleTextMe: '#F2F7FB',
    bubbleTextOther: '#E9EEF3'
  },
  kakao: {
    accent: '#FEE500',
    bgPrimary: '#121212',
    bgSecondary: '#1B1B1B',
    bgTertiary: '#161616',
    textPrimary: '#F1F1F1',
    textSecondary: '#C6C6C6',
    textTertiary: '#969696',
    border: '#303030',
    bubbleMe: '#FEE500',
    bubbleOther: '#2A2A2A',
    bubbleTextMe: '#1E1E1E',
    bubbleTextOther: '#F1F1F1'
  },
  retro: {
    accent: '#7BB8FF',
    bgPrimary: '#0F1217',
    bgSecondary: '#171B22',
    bgTertiary: '#12161C',
    textPrimary: '#F2F5FA',
    textSecondary: '#D5DEEA',
    textTertiary: '#B2C0D4',
    border: '#2C3442',
    bubbleMe: '#3E7DCC',
    bubbleOther: '#242C38',
    bubbleTextMe: '#FFFFFF',
    bubbleTextOther: '#F2F5FA'
  },
  polkadot: {
    accent: '#D66055',
    bgPrimary: '#2A1815',
    bgSecondary: '#37211D',
    bgTertiary: '#311D1A',
    textPrimary: '#F7EBDD',
    textSecondary: '#E0C2AD',
    textTertiary: '#C79F88',
    border: '#6B4137',
    bubbleMe: '#A33933',
    bubbleOther: '#49302A',
    bubbleTextMe: '#FFF0E2',
    bubbleTextOther: '#F7EBDD'
  },
  pixel: {
    accent: '#86A4DC',
    bgPrimary: '#131A2B',
    bgSecondary: '#1A2336',
    bgTertiary: '#172032',
    textPrimary: '#EAF0FC',
    textSecondary: '#C5D0E6',
    textTertiary: '#97A7C6',
    border: '#445372',
    bubbleMe: '#2A3A58',
    bubbleOther: '#202C44',
    bubbleTextMe: '#ECF2FF',
    bubbleTextOther: '#EAF0FC'
  },
  rose: {
    accent: '#B58498',
    bgPrimary: '#21171C',
    bgSecondary: '#2A1E24',
    bgTertiary: '#251B20',
    textPrimary: '#F3E6EA',
    textSecondary: '#CDB5BE',
    textTertiary: '#A98D97',
    border: '#5D4750',
    bubbleMe: '#664C58',
    bubbleOther: '#34282E',
    bubbleTextMe: '#FAEEF2',
    bubbleTextOther: '#F3E6EA'
  },
  noir: {
    accent: '#C8B1E4',
    bgPrimary: '#06050A',
    bgSecondary: '#0E0B14',
    bgTertiary: '#151022',
    textPrimary: '#F0E9FA',
    textSecondary: '#C0B0D8',
    textTertiary: '#8F7EAB',
    border: '#433859',
    bubbleMe: '#1F1630',
    bubbleOther: '#151022',
    bubbleTextMe: '#F4EDFF',
    bubbleTextOther: '#E9E1FA'
  },
  y2k: {
    accent: '#5EA7FF',
    bgPrimary: '#0F1722',
    bgSecondary: '#162131',
    bgTertiary: '#121B2A',
    textPrimary: '#E6EEF8',
    textSecondary: '#B2C2D6',
    textTertiary: '#889BB2',
    border: '#2D425A',
    bubbleMe: '#2E5E8F',
    bubbleOther: '#1E2E42',
    bubbleTextMe: '#EAF3FF',
    bubbleTextOther: '#E6EEF8'
  },
  imessage: {
    accent: '#0A84FF',
    bgPrimary: '#000000',
    bgSecondary: '#1C1C1E',
    bgTertiary: '#2C2C2E',
    textPrimary: '#F2F2F7',
    textSecondary: '#D1D1D6',
    textTertiary: '#B4B4BC',
    border: '#3A3A3C',
    bubbleMe: '#0A84FF',
    bubbleOther: '#2C2C2E',
    bubbleTextMe: '#FFFFFF',
    bubbleTextOther: '#F2F2F7'
  },
  liquidglass: {
    accent: '#B28B74',
    bgPrimary: '#181311',
    bgSecondary: 'rgba(44, 35, 31, 0.52)',
    bgTertiary: 'rgba(37, 29, 26, 0.42)',
    textPrimary: '#F4ECE8',
    textSecondary: '#D7C4BA',
    textTertiary: '#B69F93',
    border: 'rgba(219, 191, 174, 0.34)',
    bubbleMe: 'rgba(134, 105, 89, 0.42)',
    bubbleOther: 'rgba(59, 45, 39, 0.5)',
    bubbleTextMe: '#FCF2ED',
    bubbleTextOther: '#F4ECE8'
  }
};

const shouldUseDarkColors = (settings: AppearanceSettings): boolean => {
  if (settings.themeMode === 'dark') return true;
  if (settings.themeMode === 'light') return false;
  return !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
};

const resolveThemeColors = (settings: AppearanceSettings, cfg: AppRenderConfig): RenderColors => {
  if (!shouldUseDarkColors(settings)) return cfg.colors;
  const fallback = DARK_SKIN_COLORS[cfg.skinId] || DARK_SKIN_COLORS.wechat;
  return { ...cfg.colors, ...fallback };
};

export const resolveRenderConfig = (settings: AppearanceSettings): AppRenderConfig => {
  const fromSkin = BUILT_IN_RENDER_SKINS[settings.renderSkinId] || DEFAULT_RENDER_CONFIG;
  const override = settings.renderConfig;
  if (!override) return fromSkin;

  return {
    ...fromSkin,
    ...override,
    colors: { ...fromSkin.colors, ...(override.colors || {}) },
    typography: { ...fromSkin.typography, ...(override.typography || {}) },
    radius: { ...fromSkin.radius, ...(override.radius || {}) },
    layout: { ...fromSkin.layout, ...(override.layout || {}) },
    header: { ...fromSkin.header, ...(override.header || {}) },
    tabs: { ...fromSkin.tabs, ...(override.tabs || {}) },
    list: { ...fromSkin.list, ...(override.list || {}) },
    input: { ...fromSkin.input, ...(override.input || {}) },
    desktopSidebar: { ...fromSkin.desktopSidebar, ...(override.desktopSidebar || {}) },
    chat: {
      ...fromSkin.chat,
      ...(override.chat || {}),
      bubble: { ...fromSkin.chat.bubble, ...(override.chat?.bubble || {}) },
      meta: { ...fromSkin.chat.meta, ...(override.chat?.meta || {}) }
    }
  };
};

export const applyRenderConfigToRoot = (settings: AppearanceSettings): AppRenderConfig => {
  const root = document.documentElement;
  const cfg = resolveRenderConfig(settings);

  root.setAttribute('data-render-skin', cfg.skinId);

  root.style.setProperty('--render-header-height', `${cfg.header.height}px`);
  root.style.setProperty('--header-height', `${cfg.header.height}px`);
  root.style.setProperty('--app-header-height', `${cfg.header.height}px`);
  root.style.setProperty('--render-tab-height', `${cfg.tabs.height}px`);
  root.style.setProperty('--tab-bar-height', `${cfg.tabs.height}px`);
  root.style.setProperty('--render-tab-icon-size', `${cfg.tabs.iconSize}px`);
  root.style.setProperty('--render-tab-label-size', `${cfg.tabs.labelSize}px`);
  root.style.setProperty('--render-list-item-min-height', `${cfg.list.itemMinHeight}px`);
  root.style.setProperty('--render-list-item-padding-y', `${cfg.list.itemPaddingY}px`);

  root.style.setProperty('--render-input-height', `${cfg.input.height}px`);
  root.style.setProperty('--render-input-radius', `${cfg.input.radius}px`);
  root.style.setProperty('--render-input-action-size', `${cfg.input.actionButtonSize}px`);
  root.style.setProperty('--render-desktop-sidebar-width', `${cfg.desktopSidebar.width}px`);
  root.style.setProperty('--render-desktop-avatar-size', `${cfg.desktopSidebar.avatarSize}px`);
  root.style.setProperty('--render-desktop-icon-size', `${cfg.desktopSidebar.iconSize}px`);

  const themeColors = resolveThemeColors(settings, cfg);

  root.style.setProperty('--app-accent-color', themeColors.accent);
  root.style.setProperty('--bg-primary', themeColors.bgPrimary);
  root.style.setProperty('--bg-secondary', themeColors.bgSecondary);
  root.style.setProperty('--bg-tertiary', themeColors.bgTertiary);
  root.style.setProperty('--text-primary', themeColors.textPrimary);
  root.style.setProperty('--text-secondary', themeColors.textSecondary);
  root.style.setProperty('--text-tertiary', themeColors.textTertiary);
  root.style.setProperty('--border-color', themeColors.border);
  root.style.setProperty('--border-subtle', themeColors.border);

  root.style.setProperty('--bubble-me', themeColors.bubbleMe);
  root.style.setProperty('--bubble-other', themeColors.bubbleOther);
  root.style.setProperty('--bubble-text-me', themeColors.bubbleTextMe);
  root.style.setProperty('--bubble-text-other', themeColors.bubbleTextOther);

  root.style.setProperty('--app-message-max-width', `${cfg.chat.bubble.maxWidthPercent}%`);
  root.style.setProperty('--app-bubble-radius', `${cfg.chat.bubble.radius}px`);
  root.style.setProperty('--app-bubble-padding-x', `${cfg.chat.bubble.paddingX}px`);
  root.style.setProperty('--app-bubble-padding-y', `${cfg.chat.bubble.paddingY}px`);
  root.style.setProperty('--app-bubble-shadow', cfg.chat.bubble.shadow);
  root.style.setProperty('--app-bubble-border-width', `${cfg.chat.bubble.borderWidth}px`);
  root.style.setProperty('--app-message-spacing', `${cfg.chat.messageSpacing}px`);
  root.style.setProperty('--app-composer-height', `${cfg.chat.composerHeight}px`);
  root.style.setProperty('--app-avatar-radius', `${cfg.chat.meta.avatarRadius}px`);

  root.style.setProperty('--app-font-size', `${cfg.typography.fontSize}px`);
  root.style.setProperty('--app-font-line-height', String(cfg.typography.lineHeight));
  root.style.setProperty('--app-letter-spacing', `${cfg.typography.letterSpacing}px`);
  root.style.setProperty('--app-font-family', cfg.typography.fontFamily);

  root.classList.toggle('render-layout-telegram-sidebar', cfg.layout.telegramSidebar);
  root.classList.toggle('render-layout-whatsapp-top-nav', cfg.layout.whatsappTopNav);
  root.classList.toggle('render-layout-settings-card-mode', cfg.layout.settingsCardMode);
  root.classList.toggle('render-layout-profile-hero-card', cfg.layout.profileHeroCard);
  root.classList.toggle('render-header-transparent', cfg.header.transparent);
  root.classList.toggle('render-input-show-border', cfg.input.showBorder);
  root.classList.toggle('render-input-hide-border', !cfg.input.showBorder);
  root.classList.toggle('render-header-show-avatar', cfg.header.showAvatar);
  root.classList.toggle('render-header-hide-subtitle', !cfg.header.showSubtitle);
  root.classList.toggle('render-header-show-back-button', cfg.header.showBackButton);
  root.classList.toggle('render-header-hide-back-button', !cfg.header.showBackButton);
  root.classList.toggle('render-chat-show-avatar', cfg.chat.meta.showAvatar);
  root.classList.toggle('render-chat-hide-avatar', !cfg.chat.meta.showAvatar);
  root.classList.toggle('render-chat-show-read-status', cfg.chat.meta.showReadStatus);
  root.classList.toggle('render-chat-hide-read-status', !cfg.chat.meta.showReadStatus);
  root.classList.toggle('render-chat-group-show-sender', cfg.chat.meta.groupShowSenderName);
  root.classList.toggle('render-chat-group-hide-sender', !cfg.chat.meta.groupShowSenderName);
  root.classList.toggle('render-chat-tail', cfg.chat.bubble.hasTail);
  root.classList.toggle('render-chat-no-tail', !cfg.chat.bubble.hasTail);
  root.classList.toggle('render-chat-time-in-bubble', cfg.chat.meta.timestampInBubble);
  root.classList.toggle('render-chat-time-timeline', cfg.chat.meta.timestampAsTimeline);
  root.classList.toggle('render-list-hide-divider', !cfg.list.showDivider);
  root.classList.toggle('render-tabs-top', cfg.tabs.position === 'top');
  root.classList.toggle('render-tabs-bottom', cfg.tabs.position === 'bottom');
  root.classList.toggle('render-tabs-show-label', cfg.tabs.showLabel);
  root.classList.toggle('render-tabs-hide-label', !cfg.tabs.showLabel);

  root.classList.remove('render-title-left', 'render-title-center', 'render-title-right');
  root.classList.add(`render-title-${cfg.header.titleAlign}`);
  root.classList.remove('render-avatar-left', 'render-avatar-center', 'render-avatar-right');
  root.classList.add(`render-avatar-${cfg.header.avatarAlign}`);

  root.classList.remove('render-avatar-shape-rounded', 'render-avatar-shape-circle', 'render-avatar-shape-square');
  root.classList.add(`render-avatar-shape-${cfg.chat.meta.avatarShape}`);

  root.classList.remove('render-search-style-rounded', 'render-search-style-capsule', 'render-search-style-system');
  root.classList.add(`render-search-style-${cfg.layout.searchBarStyle}`);

  root.classList.remove('render-chat-time-auto', 'render-chat-time-always', 'render-chat-time-hidden');
  root.classList.add(`render-chat-time-${cfg.chat.meta.showTimestamp}`);

  root.classList.remove('render-tail-top', 'render-tail-middle', 'render-tail-bottom');
  root.classList.add(`render-tail-${cfg.chat.bubble.tailPosition}`);

  root.style.setProperty('--app-tail-size', `${cfg.chat.bubble.tailSize}px`);
  root.style.setProperty('--app-tail-roundness', `${cfg.chat.bubble.tailRoundness}px`);

  upsertStyleTag(
    'render-engine-font-size-override',
    `
.text-xs { font-size: calc(var(--app-font-size) * 0.75) !important; }
.text-sm { font-size: calc(var(--app-font-size) * 0.875) !important; }
.text-base { font-size: var(--app-font-size) !important; }
.text-lg { font-size: calc(var(--app-font-size) * 1.125) !important; }
.text-xl { font-size: calc(var(--app-font-size) * 1.25) !important; }
.text-2xl { font-size: calc(var(--app-font-size) * 1.5) !important; }
.text-3xl { font-size: calc(var(--app-font-size) * 1.875) !important; }
.text-4xl { font-size: calc(var(--app-font-size) * 2.25) !important; }
.text-\\[10px\\] { font-size: calc(var(--app-font-size) * 0.625) !important; }
.text-\\[11px\\] { font-size: calc(var(--app-font-size) * 0.6875) !important; }
.text-\\[12px\\] { font-size: calc(var(--app-font-size) * 0.75) !important; }
.text-\\[13px\\] { font-size: calc(var(--app-font-size) * 0.8125) !important; }
.text-\\[14px\\] { font-size: calc(var(--app-font-size) * 0.875) !important; }
.text-\\[15px\\] { font-size: calc(var(--app-font-size) * 0.9375) !important; }
.text-\\[16px\\] { font-size: var(--app-font-size) !important; }
.text-\\[17px\\] { font-size: calc(var(--app-font-size) * 1.0625) !important; }
.text-\\[18px\\] { font-size: calc(var(--app-font-size) * 1.125) !important; }
.text-\\[20px\\] { font-size: calc(var(--app-font-size) * 1.25) !important; }
.text-\\[22px\\] { font-size: calc(var(--app-font-size) * 1.375) !important; }
.text-\\[24px\\] { font-size: calc(var(--app-font-size) * 1.5) !important; }
.text-\\[28px\\] { font-size: calc(var(--app-font-size) * 1.75) !important; }
.text-\\[32px\\] { font-size: calc(var(--app-font-size) * 2) !important; }
`
  );

  return cfg;
};
