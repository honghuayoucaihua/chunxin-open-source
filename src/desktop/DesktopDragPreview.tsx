import React from 'react';
import type { AppearanceSettings, DesktopIcon, DesktopWidget } from '../types';
import { formatTime } from './DesktopWidgetContent';

type DesktopDragItem = { type: 'icon' | 'widget'; id: string } | null;
type DesktopThemeId = NonNullable<AppearanceSettings['desktopThemeId']>;

type DesktopDragPreviewTheme = {
  iconShape: string;
  widgetShape: string;
  widgetBg: string;
  isDark: boolean;
};

type DesktopDragPreviewProps = {
  dragItem: DesktopDragItem;
  dragPageTarget: number | null;
  dragGhostRef: React.RefObject<HTMLDivElement | null>;
  dragPosition: { x: number; y: number };
  icons: DesktopIcon[];
  widgets: DesktopWidget[];
  theme: DesktopDragPreviewTheme;
  iconSize: number;
  widgetContainerStyle: React.CSSProperties;
  currentTime: Date;
  desktop24Hour?: boolean;
  renderIconContent: (icon: DesktopIcon) => React.ReactNode;
  getIconStyle: (icon: DesktopIcon, themeId: DesktopThemeId) => React.CSSProperties;
  themeId: DesktopThemeId;
};

export const DesktopDragPreview: React.FC<DesktopDragPreviewProps> = ({
  dragItem,
  dragPageTarget,
  dragGhostRef,
  dragPosition,
  icons,
  widgets,
  theme,
  iconSize,
  widgetContainerStyle,
  currentTime,
  desktop24Hour,
  renderIconContent,
  getIconStyle,
  themeId,
}) => (
  <>
    {dragItem && (
      <div
        ref={dragGhostRef}
        className="fixed pointer-events-none z-[100] opacity-80"
        style={{ left: dragPosition.x - 30, top: dragPosition.y - 30 }}
      >
        {dragItem.type === 'icon' && (() => {
          const icon = icons.find((item) => item.id === dragItem.id);
          if (!icon) return null;
          return (
            <div className="flex flex-col items-center">
              <div
                className={`${theme.iconShape} flex items-center justify-center shadow-sm overflow-hidden`}
                style={{ ...getIconStyle(icon, themeId), width: iconSize, height: iconSize }}
              >
                {renderIconContent(icon)}
              </div>
              {iconSize >= 22 && (
                <span
                  className={`mt-1 ${theme.isDark ? 'text-white' : 'text-gray-700'}`}
                  style={{ fontSize: Math.max(iconSize * 0.22, 10) }}
                >
                  {icon.name}
                </span>
              )}
            </div>
          );
        })()}
        {dragItem.type === 'widget' && (() => {
          const widget = widgets.find((item) => item.id === dragItem.id);
          if (!widget) return null;
          return (
            <div
              className={`${theme.widgetShape} p-4 ${theme.widgetBg} ${theme.isDark ? 'text-white' : 'text-gray-800'}`}
              style={widgetContainerStyle}
            >
              {widget.type === 'clock' && <div className="text-2xl font-light">{formatTime(currentTime, desktop24Hour)}</div>}
              {widget.type === 'music' && <div className="text-sm">音乐</div>}
            </div>
          );
        })()}
      </div>
    )}

    {dragItem && dragPageTarget !== null && (
      <div className="pointer-events-none fixed left-1/2 top-6 z-[95] -translate-x-1/2 rounded-full bg-black/55 px-3 py-1.5 text-xs text-white shadow-lg backdrop-blur-sm">
        靠边停留可移到第 {dragPageTarget + 1} 页
      </div>
    )}
  </>
);

export default DesktopDragPreview;
