import React from 'react';
import type { AppearanceSettings, DesktopIcon } from '../types';
import { APP_LOGO_COMPACT_SRC } from '../services/staticAssetPaths';

type DesktopIconThemeId = NonNullable<AppearanceSettings['desktopThemeId']>;

export const DESKTOP_ICON_PALETTE: Record<string, string> = {
  'default-app': 'transparent',
  'fa-circle-nodes': '#007AFF',
  'fa-qrcode': '#5856D6',
  'fa-hand-point-up': '#FF9500',
  'fa-code-branch': '#AF52DE',
  'fa-dice': '#FF2D55',
  'fa-headphones': '#FF3B30',
  'fa-book-open-reader': '#FF9500',
  'fa-envelope-open-text': '#5AC8FA',
  'fa-user-secret': '#5856D6',
  'fa-comments': '#007AFF',
  'fa-globe': '#34C759',
  'fa-gear': '#8E8E93',
  'fa-lock': '#111827',
};

export const DESKTOP_WP_TILE_COLORS: Record<string, string> = {
  'default-app': 'transparent',
  'fa-circle-nodes': '#7FBA00',
  'fa-qrcode': '#00A4EF',
  'fa-hand-point-up': '#FFB900',
  'fa-code-branch': '#F25022',
  'fa-dice': '#7FBA00',
  'fa-headphones': '#00A4EF',
  'fa-book-open-reader': '#FFB900',
  'fa-envelope-open-text': '#F25022',
  'fa-user-secret': '#7FBA00',
  'fa-comments': '#00A4EF',
  'fa-globe': '#FFB900',
  'fa-gear': '#737373',
  'fa-lock': '#0078D4',
};

export const renderDesktopIconContent = (icon: DesktopIcon): React.ReactNode => {
  if (icon.customIconUrl) {
    return (
      <img
        src={icon.customIconUrl}
        alt={icon.name}
        className="w-full h-full object-cover"
      />
    );
  }
  if (icon.icon === 'default-app') {
    return (
      <img
        src={APP_LOGO_COMPACT_SRC}
        alt={icon.name}
        className="w-full h-full object-cover"
        width={72}
        height={72}
        loading="lazy"
        decoding="async"
      />
    );
  }
  if (icon.icon.startsWith('fa-')) {
    return <i className={`fa-solid ${icon.icon} text-white text-xl`} />;
  }
  return (
    <img
      src={icon.icon}
      alt={icon.name}
      className="w-full h-full object-cover"
    />
  );
};

export const getDesktopIconStyle = (
  icon: DesktopIcon,
  themeId: DesktopIconThemeId
): React.CSSProperties => {
  if (icon.customIconUrl || icon.icon === 'default-app') {
    return {};
  }
  const color = themeId === 'wp'
    ? DESKTOP_WP_TILE_COLORS[icon.icon] || '#8E8E93'
    : DESKTOP_ICON_PALETTE[icon.icon] || '#8E8E93';
  return { backgroundColor: color };
};
