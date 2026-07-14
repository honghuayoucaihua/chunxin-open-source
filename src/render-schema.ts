export type BuiltInSkinId = 'wechat' | 'qq' | 'telegram' | 'kakao' | 'retro' | 'polkadot' | 'pixel' | 'rose' | 'noir' | 'y2k' | 'imessage' | 'liquidglass';

export type HorizontalAlign = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'middle' | 'bottom';

export interface RenderColors {
  accent: string;
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  bubbleMe: string;
  bubbleOther: string;
  bubbleTextMe: string;
  bubbleTextOther: string;
}

export interface HeaderRenderConfig {
  height: number;
  showBackButton: boolean;
  titleAlign: HorizontalAlign;
  showSubtitle: boolean;
  showAvatar: boolean;
  avatarAlign: HorizontalAlign;
  transparent: boolean;
}

export interface MessageBubbleRenderConfig {
  maxWidthPercent: number;
  radius: number;
  paddingX: number;
  paddingY: number;
  hasTail: boolean;
  tailSize: number;
  tailPosition: VerticalAlign;
  tailRoundness: number;
  shadow: string;
  borderWidth: number;
}

export interface MessageMetaRenderConfig {
  showAvatar: boolean;
  avatarShape: 'rounded' | 'circle' | 'square';
  avatarRadius: number;
  showReadStatus: boolean;
  showTimestamp: 'auto' | 'always' | 'hidden';
  timestampInBubble: boolean;
  timestampAsTimeline: boolean;
  groupShowSenderName: boolean;
}

export interface ChatRenderConfig {
  messageSpacing: number;
  composerHeight: number;
  bubble: MessageBubbleRenderConfig;
  meta: MessageMetaRenderConfig;
}

export interface TabBarRenderConfig {
  position: 'bottom' | 'top';
  height: number;
  iconSize: number;
  labelSize: number;
  showLabel: boolean;
}

export interface ListRenderConfig {
  itemMinHeight: number;
  itemPaddingY: number;
  showDivider: boolean;
}

export interface InputRenderConfig {
  height: number;
  radius: number;
  showBorder: boolean;
  actionButtonSize: number;
}

export interface DesktopSidebarRenderConfig {
  width: number;
  avatarSize: number;
  iconSize: number;
}

export interface AppRenderConfig {
  skinId: BuiltInSkinId;
  skinName: string;
  colors: RenderColors;
  typography: {
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
    fontFamily: string;
  };
  radius: {
    card: number;
    input: number;
    button: number;
  };
  layout: {
    telegramSidebar: boolean;
    whatsappTopNav: boolean;
    settingsCardMode: boolean;
    profileHeroCard: boolean;
    searchBarStyle: 'rounded' | 'capsule' | 'system';
  };
  header: HeaderRenderConfig;
  tabs: TabBarRenderConfig;
  list: ListRenderConfig;
  input: InputRenderConfig;
  desktopSidebar: DesktopSidebarRenderConfig;
  chat: ChatRenderConfig;
}

const baseConfig: Omit<AppRenderConfig, 'skinId' | 'skinName' | 'colors'> = {
  typography: {
    fontSize: 16,
    lineHeight: 1.6,
    letterSpacing: 0,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  radius: {
    card: 8,
    input: 10,
    button: 10
  },
  layout: {
    telegramSidebar: false,
    whatsappTopNav: false,
    settingsCardMode: false,
    profileHeroCard: false,
    searchBarStyle: 'rounded'
  },
  header: {
    height: 48,
    showBackButton: true,
    titleAlign: 'center',
    showSubtitle: true,
    showAvatar: false,
    avatarAlign: 'left',
    transparent: false
  },
  tabs: {
    position: 'bottom',
    height: 56,
    iconSize: 20,
    labelSize: 10,
    showLabel: true
  },
  list: {
    itemMinHeight: 56,
    itemPaddingY: 10,
    showDivider: true
  },
  input: {
    height: 36,
    radius: 8,
    showBorder: true,
    actionButtonSize: 32
  },
  desktopSidebar: {
    width: 64,
    avatarSize: 40,
    iconSize: 24
  },
  chat: {
    messageSpacing: 20,
    composerHeight: 44,
    bubble: {
      maxWidthPercent: 85,
      radius: 12,
      paddingX: 12,
      paddingY: 10,
      hasTail: true,
      tailSize: 8,
      tailPosition: 'middle',
      tailRoundness: 2,
      shadow: 'none',
      borderWidth: 0
    },
    meta: {
      showAvatar: true,
      avatarShape: 'rounded',
      avatarRadius: 4,
      showReadStatus: true,
      showTimestamp: 'auto',
      timestampInBubble: false,
      timestampAsTimeline: true,
      groupShowSenderName: true
    }
  }
};

export const BUILT_IN_RENDER_SKINS: Record<BuiltInSkinId, AppRenderConfig> = {
  wechat: {
    ...baseConfig,
    skinId: 'wechat',
    skinName: '微信',
    colors: {
      accent: '#07C160',
      bgPrimary: '#EDEDED',
      bgSecondary: '#FFFFFF',
      bgTertiary: '#F7F7F7',
      textPrimary: '#111111',
      textSecondary: '#666666',
      textTertiary: '#888888',
      border: '#E5E5E5',
      bubbleMe: '#95EC69',
      bubbleOther: '#FFFFFF',
      bubbleTextMe: '#111111',
      bubbleTextOther: '#111111'
    },
    typography: {
      ...baseConfig.typography,
      fontSize: 16,
      lineHeight: 1.6,
      letterSpacing: 0
    },
    layout: {
      ...baseConfig.layout,
      telegramSidebar: false,
      whatsappTopNav: false,
      settingsCardMode: false,
      profileHeroCard: false,
      searchBarStyle: 'rounded'
    },
    header: {
      ...baseConfig.header,
      height: 44,
      titleAlign: 'center',
      showSubtitle: true,
      showAvatar: false,
      transparent: false
    },
    tabs: {
      ...baseConfig.tabs,
      position: 'bottom',
      height: 56,
      iconSize: 21,
      labelSize: 10,
      showLabel: true
    },
    list: {
      ...baseConfig.list,
      itemMinHeight: 60,
      itemPaddingY: 11,
      showDivider: true
    },
    input: {
      ...baseConfig.input,
      height: 38,
      radius: 18,
      showBorder: true,
      actionButtonSize: 32
    },
    desktopSidebar: {
      ...baseConfig.desktopSidebar,
      width: 68,
      avatarSize: 40,
      iconSize: 24
    },
    radius: { card: 8, input: 6, button: 6 },
    chat: {
      ...baseConfig.chat,
      messageSpacing: 14,
      composerHeight: 46,
      bubble: {
        ...baseConfig.chat.bubble,
        maxWidthPercent: 82,
        radius: 8,
        paddingX: 12,
        paddingY: 9,
        hasTail: true,
        tailSize: 8,
        tailPosition: 'middle',
        tailRoundness: 1,
        shadow: '0 1px 0 rgba(0,0,0,0.04)',
        borderWidth: 0
      },
      meta: {
        ...baseConfig.chat.meta,
        showAvatar: true,
        avatarShape: 'rounded',
        avatarRadius: 6,
        showReadStatus: true,
        showTimestamp: 'auto',
        timestampInBubble: false,
        timestampAsTimeline: true,
        groupShowSenderName: true
      }
    }
  },
  qq: {
    ...baseConfig,
    skinId: 'qq',
    skinName: 'QQ',
    colors: {
      accent: '#12B7F5',
      bgPrimary: '#F0F0F2',
      bgSecondary: '#FFFFFF',
      bgTertiary: '#F7F8FA',
      textPrimary: '#1F2329',
      textSecondary: '#626D7A',
      textTertiary: '#8B95A1',
      border: '#E5EAF0',
      bubbleMe: '#0099FF',
      bubbleOther: '#FFFFFF',
      bubbleTextMe: '#FFFFFF',
      bubbleTextOther: '#1F2329'
    },
    typography: {
      ...baseConfig.typography,
      fontFamily: '"Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif',
      fontSize: 16,
      lineHeight: 1.58,
      letterSpacing: 0
    },
    layout: {
      ...baseConfig.layout,
      telegramSidebar: false,
      whatsappTopNav: false,
      settingsCardMode: true,
      profileHeroCard: false,
      searchBarStyle: 'capsule'
    },
    header: {
      ...baseConfig.header,
      height: 46,
      titleAlign: 'left',
      showSubtitle: true,
      showAvatar: true,
      avatarAlign: 'left',
      transparent: false
    },
    tabs: {
      ...baseConfig.tabs,
      position: 'bottom',
      height: 54,
      iconSize: 20,
      labelSize: 10,
      showLabel: true
    },
    list: {
      ...baseConfig.list,
      itemMinHeight: 58,
      itemPaddingY: 10,
      showDivider: true
    },
    input: {
      ...baseConfig.input,
      height: 38,
      radius: 18,
      showBorder: true,
      actionButtonSize: 32
    },
    desktopSidebar: {
      ...baseConfig.desktopSidebar,
      width: 68,
      avatarSize: 40,
      iconSize: 23
    },
    radius: { card: 10, input: 10, button: 10 },
    chat: {
      ...baseConfig.chat,
      messageSpacing: 12,
      composerHeight: 46,
      bubble: {
        ...baseConfig.chat.bubble,
        maxWidthPercent: 78,
        radius: 16,
        paddingX: 12,
        paddingY: 9,
        hasTail: false,
        tailSize: 0,
        tailPosition: 'middle',
        tailRoundness: 0,
        shadow: 'none',
        borderWidth: 0
      },
      meta: {
        ...baseConfig.chat.meta,
        showAvatar: true,
        avatarShape: 'circle',
        avatarRadius: 999,
        showReadStatus: true,
        showTimestamp: 'auto',
        timestampInBubble: false,
        timestampAsTimeline: true,
        groupShowSenderName: true
      }
    }
  },
  telegram: {
    ...baseConfig,
    skinId: 'telegram',
    skinName: 'Telegram',
    colors: {
      accent: '#517DA2',
      bgPrimary: '#DDEAF3',
      bgSecondary: '#FFFFFF',
      bgTertiary: '#ECF3F9',
      textPrimary: '#1E2B36',
      textSecondary: '#5D6C79',
      textTertiary: '#8A98A5',
      border: '#D4E1EB',
      bubbleMe: '#D8F2FF',
      bubbleOther: '#FFFFFF',
      bubbleTextMe: '#173549',
      bubbleTextOther: '#1E2B36'
    },
    typography: {
      ...baseConfig.typography,
      fontFamily: 'Roboto, "Noto Sans SC", "Segoe UI", sans-serif',
      fontSize: 16,
      lineHeight: 1.55,
      letterSpacing: 0
    },
    layout: {
      ...baseConfig.layout,
      telegramSidebar: true,
      whatsappTopNav: false,
      settingsCardMode: true,
      profileHeroCard: true,
      searchBarStyle: 'capsule'
    },
    header: {
      ...baseConfig.header,
      height: 52,
      titleAlign: 'left',
      showSubtitle: true,
      showAvatar: true,
      avatarAlign: 'left'
    },
    tabs: {
      ...baseConfig.tabs,
      position: 'bottom',
      height: 54,
      iconSize: 21,
      labelSize: 10,
      showLabel: true
    },
    list: {
      ...baseConfig.list,
      itemMinHeight: 58,
      itemPaddingY: 10,
      showDivider: false
    },
    input: {
      ...baseConfig.input,
      height: 40,
      radius: 22,
      showBorder: false,
      actionButtonSize: 36
    },
    desktopSidebar: {
      ...baseConfig.desktopSidebar,
      width: 72,
      avatarSize: 42,
      iconSize: 24
    },
    chat: {
      ...baseConfig.chat,
      messageSpacing: 18,
      composerHeight: 46,
      bubble: {
        ...baseConfig.chat.bubble,
        maxWidthPercent: 76,
        radius: 16,
        paddingX: 12,
        paddingY: 8,
        hasTail: true,
        tailSize: 6,
        tailPosition: 'middle',
        tailRoundness: 4,
        shadow: '0 1px 1px rgba(0, 0, 0, 0.06)',
        borderWidth: 0
      },
      meta: {
        ...baseConfig.chat.meta,
        showAvatar: false,
        avatarShape: 'circle',
        avatarRadius: 999,
        showReadStatus: true,
        showTimestamp: 'always',
        timestampInBubble: true,
        timestampAsTimeline: false,
        groupShowSenderName: true
      }
    }
  },
  kakao: {
    ...baseConfig,
    skinId: 'kakao',
    skinName: 'KakaoTalk',
    colors: {
      accent: '#FEE500',
      bgPrimary: '#F7F7F8',
      bgSecondary: '#FFFFFF',
      bgTertiary: '#F3F4F6',
      textPrimary: '#202020',
      textSecondary: '#4C4C4C',
      textTertiary: '#727272',
      border: '#E5E7EB',
      bubbleMe: '#FEE500',
      bubbleOther: '#FFFFFF',
      bubbleTextMe: '#202020',
      bubbleTextOther: '#202020'
    },
    typography: {
      ...baseConfig.typography,
      fontSize: 16,
      lineHeight: 1.58,
      letterSpacing: 0
    },
    layout: {
      ...baseConfig.layout,
      telegramSidebar: false,
      whatsappTopNav: false,
      settingsCardMode: true,
      profileHeroCard: false,
      searchBarStyle: 'rounded'
    },
    header: {
      ...baseConfig.header,
      height: 46,
      titleAlign: 'left',
      showSubtitle: true,
      showAvatar: false,
      avatarAlign: 'left'
    },
    tabs: {
      ...baseConfig.tabs,
      position: 'bottom',
      height: 56,
      iconSize: 20,
      labelSize: 10,
      showLabel: true
    },
    list: {
      ...baseConfig.list,
      itemMinHeight: 62,
      itemPaddingY: 12,
      showDivider: false
    },
    input: {
      ...baseConfig.input,
      height: 40,
      radius: 20,
      showBorder: false,
      actionButtonSize: 34
    },
    desktopSidebar: {
      ...baseConfig.desktopSidebar,
      width: 66,
      avatarSize: 38,
      iconSize: 22
    },
    chat: {
      ...baseConfig.chat,
      messageSpacing: 10,
      composerHeight: 46,
      bubble: {
        ...baseConfig.chat.bubble,
        maxWidthPercent: 80,
        radius: 10,
        paddingX: 12,
        paddingY: 9,
        hasTail: true,
        tailSize: 8,
        tailPosition: 'top',
        tailRoundness: 3,
        shadow: '0 1px 0 rgba(0, 0, 0, 0.06)',
        borderWidth: 1
      },
      meta: {
        ...baseConfig.chat.meta,
        showAvatar: true,
        avatarShape: 'rounded',
        avatarRadius: 8,
        showReadStatus: true,
        showTimestamp: 'always',
        timestampInBubble: false,
        timestampAsTimeline: false,
        groupShowSenderName: true
      }
    }
  },
  retro: {
    ...baseConfig,
    skinId: 'retro',
    skinName: 'Retro',
    colors: {
      accent: '#5CA7F8',
      bgPrimary: '#E5E5E5',
      bgSecondary: '#F6F6F6',
      bgTertiary: '#EFEFEF',
      textPrimary: '#2F2F2F',
      textSecondary: '#5F5F5F',
      textTertiary: '#8A8A8A',
      border: '#C8C8C8',
      bubbleMe: '#5CA7F8',
      bubbleOther: '#FFFFFF',
      bubbleTextMe: '#FFFFFF',
      bubbleTextOther: '#2F2F2F'
    },
    typography: {
      ...baseConfig.typography,
      fontFamily: '"Trebuchet MS", "Helvetica Neue", Arial, sans-serif',
      fontSize: 16,
      lineHeight: 1.56,
      letterSpacing: 0
    },
    layout: {
      ...baseConfig.layout,
      telegramSidebar: false,
      whatsappTopNav: false,
      settingsCardMode: true,
      profileHeroCard: true,
      searchBarStyle: 'capsule'
    },
    header: {
      ...baseConfig.header,
      height: 50,
      titleAlign: 'center',
      showSubtitle: true,
      showAvatar: false,
      avatarAlign: 'left',
      transparent: false
    },
    tabs: {
      ...baseConfig.tabs,
      position: 'bottom',
      height: 56,
      iconSize: 20,
      labelSize: 10,
      showLabel: true
    },
    list: {
      ...baseConfig.list,
      itemMinHeight: 58,
      itemPaddingY: 10,
      showDivider: true
    },
    input: {
      ...baseConfig.input,
      height: 38,
      radius: 10,
      showBorder: true,
      actionButtonSize: 32
    },
    desktopSidebar: {
      ...baseConfig.desktopSidebar,
      width: 68,
      avatarSize: 40,
      iconSize: 23
    },
    radius: { card: 10, input: 10, button: 10 },
    chat: {
      ...baseConfig.chat,
      messageSpacing: 16,
      composerHeight: 46,
      bubble: {
        ...baseConfig.chat.bubble,
        maxWidthPercent: 80,
        radius: 14,
        paddingX: 12,
        paddingY: 9,
        hasTail: true,
        tailSize: 8,
        tailPosition: 'middle',
        tailRoundness: 2,
        shadow: '0 1px 0 rgba(0,0,0,0.08)',
        borderWidth: 1
      },
      meta: {
        ...baseConfig.chat.meta,
        showAvatar: true,
        avatarShape: 'rounded',
        avatarRadius: 6,
        showReadStatus: true,
        showTimestamp: 'always',
        timestampInBubble: false,
        timestampAsTimeline: true,
        groupShowSenderName: true
      }
    }
  },
  polkadot: {
    ...baseConfig,
    skinId: 'polkadot',
    skinName: '波点复古',
    colors: {
      accent: '#C4473E',
      bgPrimary: '#F5E6CF',
      bgSecondary: '#FFF7EA',
      bgTertiary: '#F2DFC1',
      textPrimary: '#4E2B21',
      textSecondary: '#7A5044',
      textTertiary: '#A27568',
      border: '#D9B69E',
      bubbleMe: '#D85A50',
      bubbleOther: '#FFF8EE',
      bubbleTextMe: '#FFF6E8',
      bubbleTextOther: '#4E2B21'
    },
    typography: {
      ...baseConfig.typography,
      fontFamily: '"Georgia", "Noto Serif SC", "Times New Roman", serif',
      fontSize: 16,
      lineHeight: 1.58,
      letterSpacing: 0
    },
    layout: {
      ...baseConfig.layout,
      telegramSidebar: false,
      whatsappTopNav: false,
      settingsCardMode: true,
      profileHeroCard: true,
      searchBarStyle: 'capsule'
    },
    header: {
      ...baseConfig.header,
      height: 50,
      titleAlign: 'center',
      showSubtitle: true,
      showAvatar: false,
      avatarAlign: 'left',
      transparent: false
    },
    tabs: {
      ...baseConfig.tabs,
      position: 'bottom',
      height: 56,
      iconSize: 20,
      labelSize: 10,
      showLabel: true
    },
    list: {
      ...baseConfig.list,
      itemMinHeight: 58,
      itemPaddingY: 10,
      showDivider: true
    },
    input: {
      ...baseConfig.input,
      height: 38,
      radius: 14,
      showBorder: true,
      actionButtonSize: 32
    },
    desktopSidebar: {
      ...baseConfig.desktopSidebar,
      width: 68,
      avatarSize: 40,
      iconSize: 23
    },
    radius: { card: 14, input: 14, button: 14 },
    chat: {
      ...baseConfig.chat,
      messageSpacing: 14,
      composerHeight: 46,
      bubble: {
        ...baseConfig.chat.bubble,
        maxWidthPercent: 80,
        radius: 16,
        paddingX: 12,
        paddingY: 9,
        hasTail: false,
        tailSize: 0,
        tailPosition: 'middle',
        tailRoundness: 4,
        shadow: '0 2px 0 rgba(126, 65, 54, 0.14)',
        borderWidth: 1
      },
      meta: {
        ...baseConfig.chat.meta,
        showAvatar: true,
        avatarShape: 'rounded',
        avatarRadius: 8,
        showReadStatus: true,
        showTimestamp: 'always',
        timestampInBubble: false,
        timestampAsTimeline: true,
        groupShowSenderName: true
      }
    }
  },
  pixel: {
    ...baseConfig,
    skinId: 'pixel',
    skinName: '复古像素',
    colors: {
      accent: '#5E78B0',
      bgPrimary: '#E7EBF4',
      bgSecondary: '#F7F9FF',
      bgTertiary: '#DEE5F4',
      textPrimary: '#2C3550',
      textSecondary: '#5D6B89',
      textTertiary: '#8894AF',
      border: '#97A5C3',
      bubbleMe: '#DCE4F8',
      bubbleOther: '#FFFFFF',
      bubbleTextMe: '#2C3550',
      bubbleTextOther: '#2C3550'
    },
    typography: {
      ...baseConfig.typography,
      fontFamily: '"MS UI Gothic", "SimSun", "Microsoft YaHei", monospace',
      fontSize: 15,
      lineHeight: 1.5,
      letterSpacing: 0
    },
    layout: {
      ...baseConfig.layout,
      telegramSidebar: false,
      whatsappTopNav: false,
      settingsCardMode: true,
      profileHeroCard: false,
      searchBarStyle: 'system'
    },
    header: {
      ...baseConfig.header,
      height: 52,
      titleAlign: 'center',
      showSubtitle: true,
      showAvatar: false,
      avatarAlign: 'left',
      transparent: false
    },
    tabs: {
      ...baseConfig.tabs,
      position: 'bottom',
      height: 58,
      iconSize: 18,
      labelSize: 10,
      showLabel: true
    },
    list: {
      ...baseConfig.list,
      itemMinHeight: 60,
      itemPaddingY: 10,
      showDivider: true
    },
    input: {
      ...baseConfig.input,
      height: 40,
      radius: 2,
      showBorder: true,
      actionButtonSize: 32
    },
    desktopSidebar: {
      ...baseConfig.desktopSidebar,
      width: 68,
      avatarSize: 40,
      iconSize: 22
    },
    radius: { card: 2, input: 2, button: 2 },
    chat: {
      ...baseConfig.chat,
      messageSpacing: 10,
      composerHeight: 48,
      bubble: {
        ...baseConfig.chat.bubble,
        maxWidthPercent: 78,
        radius: 10,
        paddingX: 12,
        paddingY: 9,
        hasTail: false,
        tailSize: 8,
        tailPosition: 'middle',
        tailRoundness: 0,
        shadow: 'none',
        borderWidth: 2
      },
      meta: {
        ...baseConfig.chat.meta,
        showAvatar: true,
        avatarShape: 'rounded',
        avatarRadius: 2,
        showReadStatus: true,
        showTimestamp: 'always',
        timestampInBubble: false,
        timestampAsTimeline: true,
        groupShowSenderName: true
      }
    }
  },
  rose: {
    ...baseConfig,
    skinId: 'rose',
    skinName: '美丽少女',
    colors: {
      accent: '#C7859F',
      bgPrimary: '#FDF7F9',
      bgSecondary: '#FFFFFF',
      bgTertiary: '#F8EDEE',
      textPrimary: '#573A45',
      textSecondary: '#7A5A66',
      textTertiary: '#9B7C87',
      border: '#DEC5CD',
      bubbleMe: '#F5DDE6',
      bubbleOther: '#FFFFFF',
      bubbleTextMe: '#50343F',
      bubbleTextOther: '#573A45'
    },
    typography: {
      ...baseConfig.typography,
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      fontSize: 15,
      lineHeight: 1.55,
      letterSpacing: 0
    },
    layout: {
      ...baseConfig.layout,
      telegramSidebar: false,
      whatsappTopNav: false,
      settingsCardMode: true,
      profileHeroCard: true,
      searchBarStyle: 'rounded'
    },
    header: {
      ...baseConfig.header,
      height: 52,
      titleAlign: 'left',
      showSubtitle: true,
      showAvatar: false,
      avatarAlign: 'left',
      transparent: false
    },
    tabs: {
      ...baseConfig.tabs,
      position: 'bottom',
      height: 58,
      iconSize: 19,
      labelSize: 11,
      showLabel: true
    },
    list: {
      ...baseConfig.list,
      itemMinHeight: 60,
      itemPaddingY: 10,
      showDivider: true
    },
    input: {
      ...baseConfig.input,
      height: 40,
      radius: 16,
      showBorder: true,
      actionButtonSize: 34
    },
    desktopSidebar: {
      ...baseConfig.desktopSidebar,
      width: 68,
      avatarSize: 40,
      iconSize: 22
    },
    radius: { card: 14, input: 16, button: 14 },
    chat: {
      ...baseConfig.chat,
      messageSpacing: 12,
      composerHeight: 48,
      bubble: {
        ...baseConfig.chat.bubble,
        maxWidthPercent: 80,
        radius: 18,
        paddingX: 13,
        paddingY: 9,
        hasTail: false,
        tailSize: 6,
        tailPosition: 'middle',
        tailRoundness: 2,
        shadow: '0 2px 6px rgba(233,106,163,0.14)',
        borderWidth: 1
      },
      meta: {
        ...baseConfig.chat.meta,
        showAvatar: true,
        avatarShape: 'rounded',
        avatarRadius: 8,
        showReadStatus: false,
        showTimestamp: 'auto',
        timestampInBubble: false,
        timestampAsTimeline: false,
        groupShowSenderName: true
      }
    }
  },
  noir: {
    ...baseConfig,
    skinId: 'noir',
    skinName: '哥特夜诗',
    colors: {
      accent: '#BFA7D9',
      bgPrimary: '#09070D',
      bgSecondary: '#110D18',
      bgTertiary: '#191226',
      textPrimary: '#E9E1F3',
      textSecondary: '#B8A9CC',
      textTertiary: '#8B7CA1',
      border: '#3C324E',
      bubbleMe: '#21172F',
      bubbleOther: '#171120',
      bubbleTextMe: '#F0E9FA',
      bubbleTextOther: '#E5DDF3'
    },
    typography: {
      ...baseConfig.typography,
      fontFamily: '"Cinzel", "Noto Serif SC", "Times New Roman", serif',
      fontSize: 15,
      lineHeight: 1.6,
      letterSpacing: 0.01
    },
    layout: {
      ...baseConfig.layout,
      telegramSidebar: false,
      whatsappTopNav: false,
      settingsCardMode: true,
      profileHeroCard: false,
      searchBarStyle: 'system'
    },
    header: {
      ...baseConfig.header,
      height: 50,
      titleAlign: 'center',
      showSubtitle: true,
      showAvatar: false,
      avatarAlign: 'left',
      transparent: false
    },
    tabs: {
      ...baseConfig.tabs,
      position: 'bottom',
      height: 56,
      iconSize: 18,
      labelSize: 10,
      showLabel: true
    },
    list: {
      ...baseConfig.list,
      itemMinHeight: 58,
      itemPaddingY: 10,
      showDivider: true
    },
    input: {
      ...baseConfig.input,
      height: 38,
      radius: 6,
      showBorder: true,
      actionButtonSize: 32
    },
    desktopSidebar: {
      ...baseConfig.desktopSidebar,
      width: 68,
      avatarSize: 40,
      iconSize: 22
    },
    radius: { card: 6, input: 6, button: 6 },
    chat: {
      ...baseConfig.chat,
      messageSpacing: 12,
      composerHeight: 46,
      bubble: {
        ...baseConfig.chat.bubble,
        maxWidthPercent: 79,
        radius: 8,
        paddingX: 12,
        paddingY: 9,
        hasTail: false,
        tailSize: 6,
        tailPosition: 'middle',
        tailRoundness: 0,
        shadow: 'none',
        borderWidth: 1
      },
      meta: {
        ...baseConfig.chat.meta,
        showAvatar: true,
        avatarShape: 'square',
        avatarRadius: 4,
        showReadStatus: true,
        showTimestamp: 'auto',
        timestampInBubble: false,
        timestampAsTimeline: false,
        groupShowSenderName: true
      }
    }
  },
  y2k: {
    ...baseConfig,
    skinId: 'y2k',
    skinName: 'Y2K',
    colors: {
      accent: '#3B83F3',
      bgPrimary: '#F0F4F8',
      bgSecondary: '#FFFFFF',
      bgTertiary: '#EAF1F9',
      textPrimary: '#1F2D3D',
      textSecondary: '#4C6075',
      textTertiary: '#7D8FA3',
      border: '#B8CDE2',
      bubbleMe: '#CCE4FF',
      bubbleOther: '#FFFFFF',
      bubbleTextMe: '#10263D',
      bubbleTextOther: '#1F2D3D'
    },
    typography: {
      ...baseConfig.typography,
      fontFamily: 'Verdana, "Tahoma", "Microsoft YaHei", sans-serif',
      fontSize: 16,
      lineHeight: 1.54,
      letterSpacing: 0
    },
    layout: {
      ...baseConfig.layout,
      telegramSidebar: false,
      whatsappTopNav: false,
      settingsCardMode: true,
      profileHeroCard: false,
      searchBarStyle: 'rounded'
    },
    header: {
      ...baseConfig.header,
      height: 50,
      titleAlign: 'left',
      showSubtitle: true,
      showAvatar: true,
      avatarAlign: 'left',
      transparent: false
    },
    tabs: {
      ...baseConfig.tabs,
      position: 'top',
      height: 54,
      iconSize: 18,
      labelSize: 10,
      showLabel: true
    },
    list: {
      ...baseConfig.list,
      itemMinHeight: 58,
      itemPaddingY: 10,
      showDivider: true
    },
    input: {
      ...baseConfig.input,
      height: 38,
      radius: 8,
      showBorder: true,
      actionButtonSize: 32
    },
    desktopSidebar: {
      ...baseConfig.desktopSidebar,
      width: 68,
      avatarSize: 40,
      iconSize: 23
    },
    radius: { card: 8, input: 8, button: 8 },
    chat: {
      ...baseConfig.chat,
      messageSpacing: 16,
      composerHeight: 46,
      bubble: {
        ...baseConfig.chat.bubble,
        maxWidthPercent: 82,
        radius: 6,
        paddingX: 12,
        paddingY: 9,
        hasTail: false,
        tailSize: 6,
        tailPosition: 'middle',
        tailRoundness: 1,
        shadow: 'none',
        borderWidth: 1
      },
      meta: {
        ...baseConfig.chat.meta,
        showAvatar: true,
        avatarShape: 'square',
        avatarRadius: 4,
        showReadStatus: true,
        showTimestamp: 'always',
        timestampInBubble: false,
        timestampAsTimeline: false,
        groupShowSenderName: true
      }
    }
  },
  imessage: {
    ...baseConfig,
    skinId: 'imessage',
    skinName: 'iMessage',
    colors: {
      accent: '#007AFF',
      bgPrimary: '#FFFFFF',
      bgSecondary: '#FFFFFF',
      bgTertiary: '#F2F2F7',
      textPrimary: '#1C1C1E',
      textSecondary: '#636366',
      textTertiary: '#8E8E93',
      border: '#E5E5EA',
      bubbleMe: '#0A84FF',
      bubbleOther: '#E5E5EA',
      bubbleTextMe: '#FFFFFF',
      bubbleTextOther: '#1C1C1E'
    },
    typography: {
      ...baseConfig.typography,
      fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: 17,
      lineHeight: 1.5,
      letterSpacing: 0.1
    },
    layout: {
      ...baseConfig.layout,
      telegramSidebar: false,
      whatsappTopNav: false,
      settingsCardMode: true,
      profileHeroCard: true,
      searchBarStyle: 'system'
    },
    header: { ...baseConfig.header, transparent: true, height: 56, titleAlign: 'center', showSubtitle: true, showAvatar: true, avatarAlign: 'center' },
    tabs: { ...baseConfig.tabs, position: 'bottom', height: 52, iconSize: 20, labelSize: 10, showLabel: false },
    list: { ...baseConfig.list, itemMinHeight: 56, itemPaddingY: 9, showDivider: false },
    radius: { card: 16, input: 18, button: 18 },
    input: { ...baseConfig.input, height: 42, radius: 24, showBorder: false, actionButtonSize: 34 },
    desktopSidebar: { ...baseConfig.desktopSidebar, width: 76, avatarSize: 44, iconSize: 24 },
    chat: {
      ...baseConfig.chat,
      messageSpacing: 11,
      composerHeight: 44,
      bubble: {
        ...baseConfig.chat.bubble,
        maxWidthPercent: 76,
        radius: 20,
        paddingX: 14,
        paddingY: 10,
        hasTail: false,
        tailSize: 8,
        tailPosition: 'bottom',
        tailRoundness: 8,
        shadow: 'none',
        borderWidth: 0
      },
      meta: {
        ...baseConfig.chat.meta,
        showAvatar: false,
        avatarShape: 'circle',
        avatarRadius: 999,
        showReadStatus: true,
        showTimestamp: 'always',
        timestampInBubble: false,
        timestampAsTimeline: true,
        groupShowSenderName: false
      }
    }
  },
  liquidglass: {
    ...baseConfig,
    skinId: 'liquidglass',
    skinName: '液态玻璃',
    colors: {
      accent: '#8F6A56',
      bgPrimary: '#F4F1EE',
      bgSecondary: 'rgba(255, 255, 255, 0.36)',
      bgTertiary: 'rgba(255, 255, 255, 0.24)',
      textPrimary: '#332B26',
      textSecondary: '#5B4E46',
      textTertiary: '#7E6F66',
      border: 'rgba(255, 255, 255, 0.55)',
      bubbleMe: 'rgba(176, 139, 119, 0.3)',
      bubbleOther: 'rgba(255, 255, 255, 0.44)',
      bubbleTextMe: '#312722',
      bubbleTextOther: '#3A2E29'
    },
    typography: {
      ...baseConfig.typography,
      fontFamily: '"SF Pro Display", "PingFang SC", "Segoe UI", sans-serif',
      fontSize: 16,
      lineHeight: 1.58,
      letterSpacing: 0.2
    },
    layout: {
      ...baseConfig.layout,
      telegramSidebar: false,
      whatsappTopNav: false,
      settingsCardMode: true,
      profileHeroCard: true,
      searchBarStyle: 'capsule'
    },
    header: {
      ...baseConfig.header,
      height: 52,
      titleAlign: 'center',
      showSubtitle: true,
      showAvatar: false,
      avatarAlign: 'left',
      transparent: true
    },
    tabs: {
      ...baseConfig.tabs,
      position: 'bottom',
      height: 56,
      iconSize: 20,
      labelSize: 10,
      showLabel: false
    },
    list: {
      ...baseConfig.list,
      itemMinHeight: 58,
      itemPaddingY: 10,
      showDivider: false
    },
    input: {
      ...baseConfig.input,
      height: 40,
      radius: 20,
      showBorder: true,
      actionButtonSize: 34
    },
    desktopSidebar: {
      ...baseConfig.desktopSidebar,
      width: 72,
      avatarSize: 42,
      iconSize: 24
    },
    radius: { card: 18, input: 20, button: 16 },
    chat: {
      ...baseConfig.chat,
      messageSpacing: 14,
      composerHeight: 46,
      bubble: {
        ...baseConfig.chat.bubble,
        maxWidthPercent: 78,
        radius: 18,
        paddingX: 14,
        paddingY: 10,
        hasTail: false,
        tailSize: 0,
        tailPosition: 'middle',
        tailRoundness: 8,
        shadow: '0 10px 26px rgba(64, 50, 43, 0.12), 0 1px 0 rgba(255, 255, 255, 0.5) inset',
        borderWidth: 1
      },
      meta: {
        ...baseConfig.chat.meta,
        showAvatar: true,
        avatarShape: 'circle',
        avatarRadius: 999,
        showReadStatus: false,
        showTimestamp: 'auto',
        timestampInBubble: true,
        timestampAsTimeline: false,
        groupShowSenderName: true
      }
    }
  }
};

export const DEFAULT_RENDER_CONFIG: AppRenderConfig = BUILT_IN_RENDER_SKINS.wechat;
