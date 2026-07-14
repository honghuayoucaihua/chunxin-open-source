import React from 'react';
import type { DesktopIcon } from '../types';

type DesktopDockProps = {
  icons: DesktopIcon[];
  isEditMode: boolean;
  dockDragId: string | null;
  dockDragOverIndex: number | null;
  iconSize: number;
  iconShapeClassName: string;
  dockStyleClassName: string;
  dockBackgroundClassName: string;
  paddingBottom: string;
  containerStyle: React.CSSProperties;
  containerRef: React.Ref<HTMLDivElement>;
  renderIconContent: (icon: DesktopIcon) => React.ReactNode;
  getIconStyle: (icon: DesktopIcon) => React.CSSProperties;
  onDragMove: (clientX: number) => void;
  onDragEnd: (clientX: number, clientY: number) => void;
  onDragStart: (iconId: string) => void;
  onIconClick: (icon: DesktopIcon) => void;
  onRemoveFromDock: (iconId: string) => void;
};

export const DesktopDock: React.FC<DesktopDockProps> = ({
  icons,
  isEditMode,
  dockDragId,
  dockDragOverIndex,
  iconSize,
  iconShapeClassName,
  dockStyleClassName,
  dockBackgroundClassName,
  paddingBottom,
  containerStyle,
  containerRef,
  renderIconContent,
  getIconStyle,
  onDragMove,
  onDragEnd,
  onDragStart,
  onIconClick,
  onRemoveFromDock,
}) => (
  <div
    className="relative z-10 shrink-0 flex justify-center items-end pb-4 px-4"
    style={{ paddingBottom }}
  >
    <div
      ref={containerRef}
      className={`flex gap-4 px-6 py-3 ${dockStyleClassName} ${dockBackgroundClassName} ${isEditMode ? 'relative' : ''}`}
      style={containerStyle}
      onMouseMove={(event) => {
        if (!dockDragId) return;
        onDragMove(event.clientX);
      }}
      onTouchMove={(event) => {
        if (!dockDragId || !event.touches[0]) return;
        onDragMove(event.touches[0].clientX);
      }}
      onMouseUp={(event) => {
        if (!dockDragId) return;
        onDragEnd(event.clientX, event.clientY);
      }}
      onTouchEnd={(event) => {
        if (!dockDragId || !event.changedTouches[0]) return;
        onDragEnd(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
      }}
    >
      {icons.map((icon, index) => (
        <div key={`dock-${icon.id}`} className="relative">
          {isEditMode && dockDragOverIndex !== null && dockDragOverIndex === index && dockDragId !== icon.id && (
            <div className="absolute -left-2 top-0 bottom-0 w-0.5 rounded-full bg-blue-400 z-10" />
          )}
          <button
            className={`${iconShapeClassName} flex items-center justify-center transition-transform active:scale-90 overflow-hidden ${isEditMode && dockDragId === icon.id ? 'opacity-40' : ''}`}
            style={{ ...getIconStyle(icon), width: iconSize, height: iconSize }}
            onClick={() => {
              if (isEditMode) return;
              onIconClick(icon);
            }}
            onMouseDown={(event) => {
              if (!isEditMode) return;
              event.preventDefault();
              onDragStart(icon.id);
            }}
            onTouchStart={() => {
              if (!isEditMode) return;
              onDragStart(icon.id);
            }}
          >
            {renderIconContent(icon)}
          </button>
          {isEditMode && (
            <div
              role="button"
              tabIndex={0}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center z-20 cursor-pointer shadow-lg"
              onClick={(event) => { event.stopPropagation(); onRemoveFromDock(icon.id); }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.stopPropagation();
                  onRemoveFromDock(icon.id);
                }
              }}
            >
              <i className="fa-solid fa-times" />
            </div>
          )}
        </div>
      ))}
      {isEditMode && dockDragOverIndex !== null && dockDragOverIndex === icons.length && (
        <div className="absolute right-4 top-3 bottom-3 w-0.5 rounded-full bg-blue-400 z-10" />
      )}
    </div>
  </div>
);

export default DesktopDock;
