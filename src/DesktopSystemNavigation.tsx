import React, { useEffect, useMemo, useRef } from 'react';
import type { AppearanceSettings, DesktopSystemNavigationAction } from './types';

export { DESKTOP_SYSTEM_NAV_BUTTONS_RESERVED_SPACE } from './desktopSystemNavigationConstants';

interface DesktopSystemNavigationProps {
  settings: AppearanceSettings;
  context: 'desktop' | 'app';
  onAction: (action: DesktopSystemNavigationAction) => void;
  onSettingsChange?: (patch: Partial<AppearanceSettings>) => void;
}

const BUTTONS: Array<{ action: DesktopSystemNavigationAction; label: string; iconClassName: string }> = [
  { action: 'back', label: '返回', iconClassName: 'fa-solid fa-chevron-left text-[16px]' },
  { action: 'home', label: '主屏幕', iconClassName: 'fa-regular fa-circle text-[16px]' },
  { action: 'settings', label: '桌面设置', iconClassName: 'fa-regular fa-square text-[15px]' },
];

const getAssistiveTouchShadow = (themeId: AppearanceSettings['desktopThemeId']): string => {
  if (themeId === 'android') return '0 16px 34px rgba(0, 0, 0, 0.24)';
  if (themeId === 'wp') return '0 0 0 1px rgba(255,255,255,0.08), 0 18px 38px rgba(0, 0, 0, 0.36)';
  return '0 18px 38px rgba(15, 15, 20, 0.26)';
};

const ASSISTIVE_TOUCH_EDGE_PADDING = 8;

const clampNumber = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const getAssistiveTouchBorderRadius = (
  shape: NonNullable<AppearanceSettings['desktopSystemNavigationAssistiveTouchShape']>,
  size: number
): number => {
  if (shape === 'square') return 0;
  if (shape === 'rounded') return Math.max(Math.round(size * 0.32), 14);
  return size / 2;
};

const resolveAssistiveTouchPlacement = ({
  positionX,
  positionY,
  size,
  freePosition,
}: {
  positionX: number;
  positionY: number;
  size: number;
  freePosition: boolean;
}) => {
  const viewportWidth = typeof window === 'undefined' ? size : Math.max(window.innerWidth, size);
  const viewportHeight = typeof window === 'undefined' ? size : Math.max(window.innerHeight, size);
  const maxLeft = Math.max(viewportWidth - size, 0);
  const maxTop = Math.max(viewportHeight - size, 0);
  const desiredLeft = positionX * viewportWidth - size / 2;
  const desiredTop = positionY * viewportHeight - size / 2;
  const left = freePosition
    ? clampNumber(desiredLeft, 0, maxLeft)
    : desiredLeft + size / 2 < viewportWidth / 2
      ? ASSISTIVE_TOUCH_EDGE_PADDING
      : Math.max(maxLeft - ASSISTIVE_TOUCH_EDGE_PADDING, 0);
  const minTop = freePosition ? 0 : ASSISTIVE_TOUCH_EDGE_PADDING;
  const maxSafeTop = freePosition ? maxTop : Math.max(maxTop - ASSISTIVE_TOUCH_EDGE_PADDING, minTop);
  const top = clampNumber(desiredTop, minTop, maxSafeTop);

  return {
    left,
    top,
    viewportWidth,
    viewportHeight,
    maxLeft,
    maxTop,
    positionX: clampNumber((left + size / 2) / Math.max(viewportWidth, 1), 0, 1),
    positionY: clampNumber((top + size / 2) / Math.max(viewportHeight, 1), 0, 1),
  };
};

const DesktopSystemNavigation: React.FC<DesktopSystemNavigationProps> = ({
  settings,
  context,
  onAction,
  onSettingsChange
}) => {
  const mode = settings.desktopSystemNavigationMode ?? 'gesture';
  const singleTapAction = settings.desktopSystemNavigationAssistiveTouchSingleTapAction ?? 'home';
  const doubleTapAction = settings.desktopSystemNavigationAssistiveTouchDoubleTapAction ?? 'back';
  const assistiveTouchOpacity = settings.desktopSystemNavigationAssistiveTouchOpacity ?? 0.72;
  const assistiveTouchSize = settings.desktopSystemNavigationAssistiveTouchSize ?? 56;
  const assistiveTouchColor = settings.desktopSystemNavigationAssistiveTouchColor || 'rgba(24, 24, 28, 0.82)';
  const assistiveTouchBorderColor = settings.desktopSystemNavigationAssistiveTouchBorderColor || 'rgba(255, 255, 255, 0.28)';
  const assistiveTouchBorderWidth = settings.desktopSystemNavigationAssistiveTouchBorderWidth ?? 1;
  const assistiveTouchImage = settings.desktopSystemNavigationAssistiveTouchImage || '';
  const assistiveTouchPositionX = settings.desktopSystemNavigationAssistiveTouchPositionX ?? 0.92;
  const assistiveTouchPositionY = settings.desktopSystemNavigationAssistiveTouchPositionY ?? 0.72;
  const assistiveTouchFreePosition = settings.desktopSystemNavigationAssistiveTouchFreePosition === true;
  const assistiveTouchShape = settings.desktopSystemNavigationAssistiveTouchShape ?? 'circle';
  const clickTimerRef = useRef<number | null>(null);
  const recentlyDraggedRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    moved: boolean;
    left: number;
    top: number;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current !== null) {
        window.clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  const bottomInset = 'var(--safe-bottom, 0px)';
  const assistiveTouchPlacement = useMemo(
    () => resolveAssistiveTouchPlacement({
      positionX: assistiveTouchPositionX,
      positionY: assistiveTouchPositionY,
      size: assistiveTouchSize,
      freePosition: assistiveTouchFreePosition,
    }),
    [assistiveTouchFreePosition, assistiveTouchPositionX, assistiveTouchPositionY, assistiveTouchSize]
  );
  const assistiveTouchBorderRadius = useMemo(
    () => getAssistiveTouchBorderRadius(assistiveTouchShape, assistiveTouchSize),
    [assistiveTouchShape, assistiveTouchSize]
  );

  const assistiveTouchStyle = useMemo<React.CSSProperties>(() => {
    return {
      width: assistiveTouchSize,
      height: assistiveTouchSize,
      left: `${assistiveTouchPlacement.left}px`,
      top: `${assistiveTouchPlacement.top}px`,
      opacity: assistiveTouchOpacity,
      background: assistiveTouchImage ? 'rgba(17, 17, 19, 0.22)' : assistiveTouchColor,
      borderColor: assistiveTouchBorderColor,
      borderWidth: assistiveTouchBorderWidth,
      boxShadow: getAssistiveTouchShadow(settings.desktopThemeId),
      borderRadius: assistiveTouchBorderRadius,
      touchAction: 'none',
    };
  }, [
    assistiveTouchBorderRadius,
    assistiveTouchBorderColor,
    assistiveTouchBorderWidth,
    assistiveTouchColor,
    assistiveTouchImage,
    assistiveTouchOpacity,
    assistiveTouchPlacement.left,
    assistiveTouchPlacement.top,
    assistiveTouchSize,
    settings.desktopThemeId,
  ]);

  const triggerAction = (action: DesktopSystemNavigationAction) => {
    if (action === 'none') return;
    onAction(action);
  };

  const handleAssistiveTouchTap = () => {
    if (recentlyDraggedRef.current || dragStateRef.current?.moved) return;
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      triggerAction(doubleTapAction);
      return;
    }
    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = null;
      triggerAction(singleTapAction);
    }, 220);
  };

  useEffect(() => {
    if (mode !== 'assistiveTouch') return;

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      const button = buttonRef.current;
      if (!button) return;
      const maxLeft = Math.max(window.innerWidth - assistiveTouchSize, 0);
      const maxTop = Math.max(window.innerHeight - assistiveTouchSize, 0);
      const nextLeft = Math.max(0, Math.min(maxLeft, event.clientX - dragState.offsetX));
      const nextTop = Math.max(0, Math.min(maxTop, event.clientY - dragState.offsetY));
      dragState.left = nextLeft;
      dragState.top = nextTop;
      dragState.moved = dragState.moved
        || Math.abs(nextLeft - assistiveTouchPlacement.left) > 6
        || Math.abs(nextTop - assistiveTouchPlacement.top) > 6;
      button.style.left = `${nextLeft}px`;
      button.style.top = `${nextTop}px`;
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      const button = buttonRef.current;
      if (button && button.hasPointerCapture(event.pointerId)) {
        button.releasePointerCapture(event.pointerId);
      }
      if (dragState.moved) {
        recentlyDraggedRef.current = true;
        const viewportWidth = Math.max(window.innerWidth, assistiveTouchSize);
        const viewportHeight = Math.max(window.innerHeight, assistiveTouchSize);
        const maxLeft = Math.max(viewportWidth - assistiveTouchSize, 1);
        const maxTop = Math.max(viewportHeight - assistiveTouchSize, 1);
        const snappedLeft = assistiveTouchFreePosition
          ? clampNumber(dragState.left, 0, maxLeft)
          : dragState.left + assistiveTouchSize / 2 < viewportWidth / 2
            ? ASSISTIVE_TOUCH_EDGE_PADDING
            : Math.max(viewportWidth - assistiveTouchSize - ASSISTIVE_TOUCH_EDGE_PADDING, 0);
        const safeTop = assistiveTouchFreePosition
          ? clampNumber(dragState.top, 0, maxTop)
          : clampNumber(
            dragState.top,
            ASSISTIVE_TOUCH_EDGE_PADDING,
            Math.max(viewportHeight - assistiveTouchSize - ASSISTIVE_TOUCH_EDGE_PADDING, ASSISTIVE_TOUCH_EDGE_PADDING)
          );
        const nextPositionX = Math.max(0.08, Math.min(0.92, (snappedLeft + assistiveTouchSize / 2) / Math.max(window.innerWidth, 1)));
        const nextPositionY = Math.max(0.12, Math.min(0.9, (safeTop + assistiveTouchSize / 2) / Math.max(window.innerHeight, 1)));
        const normalizedPositionX = assistiveTouchFreePosition
          ? clampNumber((snappedLeft + assistiveTouchSize / 2) / Math.max(viewportWidth, 1), 0, 1)
          : nextPositionX;
        const normalizedPositionY = assistiveTouchFreePosition
          ? clampNumber((safeTop + assistiveTouchSize / 2) / Math.max(viewportHeight, 1), 0, 1)
          : nextPositionY;
        onSettingsChange?.({
          desktopSystemNavigationAssistiveTouchPositionX: normalizedPositionX,
          desktopSystemNavigationAssistiveTouchPositionY: normalizedPositionY,
        });
        if (button) {
          button.style.left = `${Math.max(0, Math.min(maxLeft, snappedLeft))}px`;
          button.style.top = `${Math.max(0, Math.min(maxTop, safeTop))}px`;
        }
      }
      window.setTimeout(() => {
        if (dragStateRef.current) {
          dragStateRef.current = null;
        }
      }, 0);
      if (dragState.moved) {
        window.setTimeout(() => {
          recentlyDraggedRef.current = false;
        }, 260);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [
    assistiveTouchFreePosition,
    assistiveTouchPlacement.left,
    assistiveTouchPlacement.top,
    assistiveTouchSize,
    mode,
    onSettingsChange,
  ]);

  if (mode === 'gesture') return null;

  if (mode === 'buttons') {
    return (
      <div className="pointer-events-none fixed inset-x-0 z-[95]" style={{ bottom: 0 }}>
        <div
          className="pointer-events-auto flex items-center justify-between px-11 text-white/72"
          style={{
            minHeight: '40px',
            width: '100%',
            paddingBottom: bottomInset,
            background: context === 'desktop'
              ? 'linear-gradient(to top, rgba(0,0,0,0.08), rgba(0,0,0,0))'
              : 'linear-gradient(to top, rgba(0,0,0,0.04), rgba(0,0,0,0))'
          }}
        >
            {BUTTONS.map((button) => (
              <button
                key={button.action}
                type="button"
                aria-label={button.label}
                className="flex h-6 w-9 items-center justify-center rounded-full transition-colors active:bg-white/6"
                onClick={() => onAction(button.action)}
              >
                <i
                  className={
                    button.action === 'back'
                      ? 'fa-solid fa-chevron-left text-[11px]'
                      : button.action === 'home'
                        ? 'fa-regular fa-circle text-[11px]'
                        : 'fa-regular fa-square text-[10px]'
                  }
                />
              </button>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[95]">
      <button
        ref={buttonRef}
        type="button"
        aria-label="小白点"
        className="pointer-events-auto fixed flex items-center justify-center overflow-hidden backdrop-blur-2xl transition-transform active:scale-95"
        style={assistiveTouchStyle}
        onClick={handleAssistiveTouchTap}
        onPointerDown={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          dragStateRef.current = {
            pointerId: event.pointerId,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            moved: false,
            left: rect.left,
            top: rect.top,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
      >
        {assistiveTouchImage ? (
          <img
            src={assistiveTouchImage}
            alt="小白点"
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="shrink-0"
            style={{
              width: Math.max(assistiveTouchSize * 0.32, 14),
              height: Math.max(assistiveTouchSize * 0.32, 14),
              background: 'rgba(255, 255, 255, 0.94)',
              boxShadow: '0 0 18px rgba(255,255,255,0.2)',
              borderRadius: getAssistiveTouchBorderRadius(assistiveTouchShape, Math.max(assistiveTouchSize * 0.32, 14)),
            }}
          />
        )}
      </button>
    </div>
  );
};

export default DesktopSystemNavigation;
