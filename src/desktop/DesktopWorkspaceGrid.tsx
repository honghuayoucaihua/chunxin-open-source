import React from 'react';
import type { MusicState } from '../music/musicCommon';
import type { DesktopIcon, DesktopWidget } from '../types';
import DesktopWidgetContent, { type DesktopWidgetWeatherData } from './DesktopWidgetContent';

type DesktopGridItemType = 'icon' | 'widget';
type DesktopDragItem = { type: DesktopGridItemType; id: string } | null;
type DesktopWorkspaceWidgetItem = DesktopWidget & { itemType: 'widget'; width: number; height: number };
type DesktopWorkspaceIconItem = DesktopIcon & { itemType: 'icon'; width: 1; height: 1 };
type DesktopWorkspaceItem = DesktopWorkspaceWidgetItem | DesktopWorkspaceIconItem;

type DesktopWorkspaceGridProps = {
  gridRef: React.Ref<HTMLDivElement>;
  gridCols: number;
  gridRows: number;
  cellHeight: number;
  gap: number;
  isEditMode: boolean;
  editingItemId: string | null;
  dragItem: DesktopDragItem;
  icons: DesktopIcon[];
  widgets: DesktopWidget[];
  dockIconIds: string[];
  currentTime: Date;
  desktop24Hour?: boolean;
  iconSize: number;
  showIconLabels: boolean;
  safeWidgetOpacity: number;
  widgetContainerStyle: React.CSSProperties;
  widgetShapeClassName: string;
  widgetBackgroundClassName: string;
  iconShapeClassName: string;
  ringColorClassName: string;
  accentColor: string;
  isDark: boolean;
  labelShadow: boolean;
  weatherData?: DesktopWidgetWeatherData | null;
  musicState?: MusicState;
  batteryLevel: number | null;
  showBatteryPercent: boolean;
  isCellOccupied: (row: number, col: number) => boolean;
  renderIconContent: (icon: DesktopIcon) => React.ReactNode;
  getIconStyle: (icon: DesktopIcon) => React.CSSProperties;
  onWidgetClick: (widget: DesktopWidget) => void;
  onWidgetConfigClick: (widgetId: string) => void;
  onWidgetDelete: (widgetId: string) => void;
  onIconClick: (icon: DesktopIcon) => void;
  onIconDelete: (icon: DesktopIcon) => void;
  onIconContextMenu: (icon: DesktopIcon, target: HTMLElement) => void;
  onItemMouseDown: (type: DesktopGridItemType, id: string, event: React.MouseEvent) => void;
  onItemTouchStart: (type: DesktopGridItemType, id: string, event: React.TouchEvent) => void;
  onItemTouchMove: (event: React.TouchEvent) => void;
  onItemTouchEnd: (event: React.TouchEvent) => void;
  onOpenSubView?: (subView: string) => void;
  onSaveWidgetConfig: (widgetId: string, config: Record<string, any>) => void;
};

const getWorkspaceItems = (
  widgets: DesktopWidget[],
  icons: DesktopIcon[],
  dockIconIds: string[],
  gridCols: number,
  gridRows: number
): DesktopWorkspaceItem[] => [
  ...widgets.map((widget): DesktopWorkspaceWidgetItem => ({
    ...widget,
    itemType: 'widget',
    width: widget.width,
    height: widget.height,
  })),
  ...icons
    .filter((icon) => !dockIconIds.includes(icon.id))
    .map((icon): DesktopWorkspaceIconItem => ({
      ...icon,
      itemType: 'icon',
      width: 1,
      height: 1,
    })),
].filter((item) =>
  item.col >= 0 &&
  item.row >= 0 &&
  item.col < gridCols &&
  item.row < gridRows &&
  item.col + item.width <= gridCols &&
  item.row + item.height <= gridRows
);

export const DesktopWorkspaceGrid: React.FC<DesktopWorkspaceGridProps> = ({
  gridRef,
  gridCols,
  gridRows,
  cellHeight,
  gap,
  isEditMode,
  editingItemId,
  dragItem,
  icons,
  widgets,
  dockIconIds,
  currentTime,
  desktop24Hour,
  iconSize,
  showIconLabels,
  safeWidgetOpacity,
  widgetContainerStyle,
  widgetShapeClassName,
  widgetBackgroundClassName,
  iconShapeClassName,
  ringColorClassName,
  accentColor,
  isDark,
  labelShadow,
  weatherData,
  musicState,
  batteryLevel,
  showBatteryPercent,
  isCellOccupied,
  renderIconContent,
  getIconStyle,
  onWidgetClick,
  onWidgetConfigClick,
  onWidgetDelete,
  onIconClick,
  onIconDelete,
  onIconContextMenu,
  onItemMouseDown,
  onItemTouchStart,
  onItemTouchMove,
  onItemTouchEnd,
  onOpenSubView,
  onSaveWidgetConfig,
}) => {
  const items = getWorkspaceItems(widgets, icons, dockIconIds, gridCols, gridRows);

  return (
    <div
      ref={gridRef}
      className={`relative ${isEditMode ? `ring-1 ${isDark ? 'ring-white/20' : 'ring-black/10'} rounded-xl` : ''}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gridAutoRows: `${cellHeight}px`,
        gridAutoColumns: '0px',
        gap: `${gap}px`,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        touchAction: isEditMode ? 'none' : 'pan-y',
        animation: 'desktopPageSlideIn 0.25s ease-out',
      }}
    >
      {isEditMode && Array.from({ length: gridCols * gridRows }).map((_, idx) => {
        const row = Math.floor(idx / gridCols);
        const col = idx % gridCols;
        if (isCellOccupied(row, col)) return null;
        return (
          <div
            key={`grid-cell-${idx}`}
            className={`border border-dashed rounded-lg pointer-events-none ${isDark ? 'border-white/10' : 'border-gray-400/30'}`}
            style={{
              gridRow: `${row + 1}`,
              gridColumn: `${col + 1}`,
            }}
          />
        );
      })}
      {items.map((item) => {
        const isEditing = isEditMode && editingItemId === item.id;
        const isDragging = dragItem?.id === item.id;

        if (item.itemType === 'widget') {
          const widget = item;
          return (
            <div
              key={widget.id}
              className={`relative ${widgetShapeClassName} p-3 ${widgetBackgroundClassName} ${isDark ? 'text-white' : 'text-gray-800'} cursor-pointer
                ${isEditing ? `ring-2 ${ringColorClassName}` : ''}
                ${isDragging ? 'opacity-50 scale-95' : ''}
                ${isEditMode ? `hover:ring-1 ${ringColorClassName}` : ''}`}
              style={{
                gridRow: `${widget.row + 1} / span ${widget.height}`,
                gridColumn: `${widget.col + 1} / span ${widget.width}`,
                transitionProperty: 'transform, opacity',
                opacity: safeWidgetOpacity,
                ...widgetContainerStyle,
              }}
              onClick={() => onWidgetClick(widget)}
              onMouseDown={(event) => onItemMouseDown('widget', widget.id, event)}
              onTouchStart={(event) => onItemTouchStart('widget', widget.id, event)}
              onTouchMove={onItemTouchMove}
              onTouchEnd={onItemTouchEnd}
            >
              <DesktopWidgetContent
                widget={widget}
                currentTime={currentTime}
                desktop24Hour={desktop24Hour}
                accentColor={accentColor}
                isDark={isDark}
                weatherData={weatherData}
                musicState={musicState}
                batteryLevel={batteryLevel}
                showBatteryPercent={showBatteryPercent}
                onOpenSubView={onOpenSubView}
                onSaveWidgetConfig={onSaveWidgetConfig}
              />
              {isEditing && (
                <>
                  {(['countdown', 'image', 'notes', 'todo'] as DesktopWidget['type'][]).includes(widget.type) && (
                    <button
                      className="absolute -top-3 -left-3 w-7 h-7 rounded-full text-white text-xs flex items-center justify-center z-20 shadow-lg ring-2 ring-white/40"
                      style={{ backgroundColor: accentColor }}
                      onClick={(event) => {
                        event.stopPropagation();
                        onWidgetConfigClick(widget.id);
                      }}
                    >
                      <i className="fa-solid fa-gear" />
                    </button>
                  )}
                  <button
                    className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-red-500 text-white text-xs flex items-center justify-center z-20 shadow-lg ring-2 ring-white/40"
                    onClick={(event) => {
                      event.stopPropagation();
                      onWidgetDelete(widget.id);
                    }}
                  >
                    <i className="fa-solid fa-times" />
                  </button>
                </>
              )}
            </div>
          );
        }

        const icon = item;
        return (
          <button
            key={icon.id}
            className={`relative flex flex-col items-center justify-center gap-1 p-2 rounded-xl overflow-hidden
              ${isEditMode ? `ring-2 ${ringColorClassName}` : 'active:scale-95'}
              ${isDragging ? 'opacity-30' : ''}`}
            style={{
              gridRow: `${icon.row + 1} / span 1`,
              gridColumn: `${icon.col + 1} / span 1`,
              minWidth: 0,
              minHeight: 0,
              transitionProperty: 'transform, opacity',
              animation: isEditMode ? 'desktopShake 0.3s ease-in-out infinite alternate' : undefined,
            }}
            onClick={() => onIconClick(icon)}
            onMouseDown={(event) => onItemMouseDown('icon', icon.id, event)}
            onTouchStart={(event) => onItemTouchStart('icon', icon.id, event)}
            onTouchMove={onItemTouchMove}
            onTouchEnd={onItemTouchEnd}
            onContextMenu={(event) => {
              event.preventDefault();
              onIconContextMenu(icon, event.currentTarget as HTMLElement);
            }}
          >
            {isEditMode && (
              <div
                role="button"
                tabIndex={0}
                className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center z-20 shadow-md cursor-pointer"
                onClick={(event) => {
                  event.stopPropagation();
                  onIconDelete(icon);
                }}
              >
                <i className="fa-solid fa-times" />
              </div>
            )}
            <div className={`${iconShapeClassName} flex items-center justify-center shadow-sm overflow-hidden`} style={{ ...getIconStyle(icon), width: iconSize, height: iconSize }}>
              {renderIconContent(icon)}
            </div>
            {showIconLabels && iconSize >= 22 && (
              <span
                className={`text-center leading-tight max-w-full truncate px-1 ${isDark ? 'text-white' : 'text-gray-700'}`}
                style={{
                  fontSize: Math.max(iconSize * 0.22, 10),
                  textShadow: labelShadow ? '0 1px 2px rgba(0,0,0,0.5)' : undefined,
                }}
              >
                {icon.name}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default DesktopWorkspaceGrid;
