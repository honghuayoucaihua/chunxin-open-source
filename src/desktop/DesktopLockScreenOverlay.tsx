import React from 'react';
import { formatTimeParts } from './DesktopWidgetContent';

export type DesktopThemeId = 'ios' | 'android' | 'wp';

type LockSlideThemeConfig = {
  trackClassName: string;
  promptClassName: string;
  idlePrompt: string;
  readyPrompt: string;
  handleClassName: string;
  handleIconClassName: string;
  handleIcon: string;
  handleSize: number;
  handleInset: number;
  trackHeight: number;
  unlockThreshold: number;
};
type LockActionThemeConfig = {
  panelWrapClassName: string;
  passcodeWrapClassName: string;
  passcodeTitleClassName: string;
  passcodeHintClassName: string;
  passcodeInputClassName: string;
  passcodeButtonClassName: string;
  errorClassName: string;
};
type LockMotionThemeConfig = {
  shellAnimation: string;
  heroAnimation: string;
  actionAnimation: string;
  sliderTrackTransition: string;
  sliderHandleTransition: string;
};

export const LOCK_SLIDE_THEME_CONFIG: Record<DesktopThemeId, LockSlideThemeConfig> = {
  ios: {
    trackClassName: 'relative h-[142px] w-full max-w-[180px]',
    promptClassName: 'text-[11px] font-medium tracking-[0.18em] text-white/58',
    idlePrompt: '向上轻扫以打开',
    readyPrompt: '松开打开',
    handleClassName: 'flex items-center justify-center rounded-full bg-white/8 text-white/78 shadow-[0_10px_26px_rgba(0,0,0,0.16)] backdrop-blur-xl',
    handleIconClassName: 'text-[10px]',
    handleIcon: 'fa-angle-up',
    handleSize: 30,
    handleInset: 8,
    trackHeight: 142,
    unlockThreshold: 0.82,
  },
  android: {
    trackClassName: 'relative h-[194px] w-full max-w-sm',
    promptClassName: 'text-[11px] font-medium tracking-[0.16em] text-white/52',
    idlePrompt: '向上滑动解锁',
    readyPrompt: '松开进入',
    handleClassName: 'flex items-center justify-center',
    handleIconClassName: 'text-base',
    handleIcon: 'fa-lock',
    handleSize: 72,
    handleInset: 10,
    trackHeight: 194,
    unlockThreshold: 0.78,
  },
  wp: {
    trackClassName: 'relative h-[98px] w-full overflow-hidden bg-black/82',
    promptClassName: 'text-[11px] font-medium uppercase tracking-[0.3em] text-white/62',
    idlePrompt: '向上滑动',
    readyPrompt: '松开进入',
    handleClassName: 'flex items-center justify-between border-t border-white/16 bg-black px-5 py-5 text-white',
    handleIconClassName: 'text-base',
    handleIcon: 'fa-angles-up',
    handleSize: 68,
    handleInset: 0,
    trackHeight: 98,
    unlockThreshold: 0.74,
  },
};

const LOCK_ACTION_THEME_CONFIG: Record<DesktopThemeId, LockActionThemeConfig> = {
  ios: {
    panelWrapClassName: 'w-full max-w-sm self-center',
    passcodeWrapClassName: 'space-y-4 text-center',
    passcodeTitleClassName: 'text-sm font-medium tracking-[0.18em] text-white/90',
    passcodeHintClassName: 'text-xs text-white/62',
    passcodeInputClassName: 'w-full rounded-[22px] border border-white/18 bg-white/14 px-4 py-3 text-center text-lg tracking-[0.45em] text-white outline-none backdrop-blur-2xl placeholder:text-white/30',
    passcodeButtonClassName: 'w-full rounded-[22px] bg-white/92 px-4 py-3 text-sm font-medium text-gray-900 transition-transform active:scale-[0.98]',
    errorClassName: 'mt-3 text-center text-sm text-red-200',
  },
  android: {
    panelWrapClassName: 'w-full self-stretch rounded-t-[36px] border-t border-white/8 bg-black/38 px-5 pb-3 pt-6 backdrop-blur-2xl shadow-[0_-18px_40px_rgba(0,0,0,0.22)]',
    passcodeWrapClassName: 'space-y-4',
    passcodeTitleClassName: 'text-xs font-medium uppercase tracking-[0.26em] text-white/66',
    passcodeHintClassName: 'text-xs text-white/52',
    passcodeInputClassName: 'w-full rounded-[26px] border border-white/10 bg-white/8 px-5 py-4 text-center text-[20px] tracking-[0.45em] text-white outline-none placeholder:text-white/26',
    passcodeButtonClassName: 'w-full rounded-[26px] px-4 py-3.5 text-sm font-medium text-white transition-transform active:scale-[0.98]',
    errorClassName: 'mt-3 text-center text-sm text-red-200',
  },
  wp: {
    panelWrapClassName: 'w-full self-stretch bg-black/82 px-0 py-0',
    passcodeWrapClassName: 'space-y-0 text-left',
    passcodeTitleClassName: 'text-[12px] font-medium uppercase tracking-[0.32em] text-white/62',
    passcodeHintClassName: 'text-xs text-white/48',
    passcodeInputClassName: 'mt-4 w-full border border-white/14 bg-transparent px-4 py-4 text-center text-[22px] tracking-[0.48em] text-white outline-none placeholder:text-white/24',
    passcodeButtonClassName: 'mt-3 w-full px-4 py-4 text-sm font-medium text-white transition-opacity active:opacity-85',
    errorClassName: 'mt-3 text-center text-sm text-[#ffb4b4]',
  },
};

const LOCK_MOTION_THEME_CONFIG: Record<DesktopThemeId, LockMotionThemeConfig> = {
  ios: {
    shellAnimation: 'lockScreenIosFade 420ms cubic-bezier(0.22, 1, 0.36, 1)',
    heroAnimation: 'lockScreenIosHero 520ms cubic-bezier(0.22, 1, 0.36, 1)',
    actionAnimation: 'lockScreenIosAction 560ms cubic-bezier(0.22, 1, 0.36, 1)',
    sliderTrackTransition: 'opacity 220ms ease, transform 220ms ease',
    sliderHandleTransition: 'transform 160ms ease-out, box-shadow 160ms ease-out',
  },
  android: {
    shellAnimation: 'lockScreenAndroidRise 260ms cubic-bezier(0.2, 0, 0, 1)',
    heroAnimation: 'lockScreenAndroidHero 300ms cubic-bezier(0.2, 0, 0, 1)',
    actionAnimation: 'lockScreenAndroidAction 240ms cubic-bezier(0.2, 0, 0, 1)',
    sliderTrackTransition: 'opacity 140ms linear, transform 140ms linear',
    sliderHandleTransition: 'transform 120ms cubic-bezier(0.2, 0, 0, 1), box-shadow 120ms linear',
  },
  wp: {
    shellAnimation: 'lockScreenWpReveal 180ms steps(6, end)',
    heroAnimation: 'lockScreenWpHero 220ms steps(5, end)',
    actionAnimation: 'lockScreenWpAction 200ms steps(4, end)',
    sliderTrackTransition: 'opacity 160ms steps(4, end), transform 160ms steps(4, end)',
    sliderHandleTransition: 'transform 160ms steps(4, end), box-shadow 120ms linear',
  },
};

type DesktopLockScreenOverlayProps = {
  isLocked: boolean;
  themeId: DesktopThemeId;
  defaultWallpaper: string;
  accentColor: string;
  lockWallpaper: string;
  isLockImageUrl: boolean;
  currentTime: Date;
  desktop24Hour?: boolean;
  batteryLevel: number | null;
  showDesktopStatusBar: boolean;
  iosHeroMarginTop: string;
  androidHeroMarginTop: string;
  needsLockPasscode: boolean;
  lockPasscodeInput: string;
  lockError: string;
  lockSliderProgress: number;
  lockSliderTrackRef: React.RefObject<HTMLDivElement | null>;
  onPasscodeInputChange: (value: string) => void;
  onUnlockAttempt: () => void;
  onBeginSlideUnlock: (clientY: number) => void;
};

export const DesktopLockScreenOverlay: React.FC<DesktopLockScreenOverlayProps> = ({
  isLocked,
  themeId,
  defaultWallpaper,
  accentColor,
  lockWallpaper,
  isLockImageUrl,
  currentTime,
  desktop24Hour,
  batteryLevel,
  showDesktopStatusBar,
  iosHeroMarginTop,
  androidHeroMarginTop,
  needsLockPasscode,
  lockPasscodeInput,
  lockError,
  lockSliderProgress,
  lockSliderTrackRef,
  onPasscodeInputChange,
  onUnlockAttempt,
  onBeginSlideUnlock,
}) => {
  if (!isLocked) return null;

  const lockSlideTheme = LOCK_SLIDE_THEME_CONFIG[themeId];
  const lockActionTheme = LOCK_ACTION_THEME_CONFIG[themeId];
  const lockMotionTheme = LOCK_MOTION_THEME_CONFIG[themeId];
  const lockTimeParts = formatTimeParts(currentTime, desktop24Hour);
  const lockWpTimeParts = formatTimeParts(currentTime, true);
  const lockWeekdayLong = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][currentTime.getDay()];
  const compactLockTime = `${lockTimeParts.hour}:${lockTimeParts.minute}`;
  const iosLockDateLine = `${currentTime.getMonth() + 1}月${currentTime.getDate()}日 ${lockWeekdayLong}`;
  const androidLockMetaLine = batteryLevel !== null
    ? `${lockWeekdayLong} ${currentTime.getMonth() + 1}月${currentTime.getDate()}日 · 电量 ${batteryLevel}%`
    : `${lockWeekdayLong} ${currentTime.getMonth() + 1}月${currentTime.getDate()}日`;
  const androidLockClockHour = currentTime.getHours().toString().padStart(2, '0');
  const androidLockClockMinute = currentTime.getMinutes().toString().padStart(2, '0');
  const wpLockDateLine = `${currentTime.getMonth() + 1}月${currentTime.getDate()}日 ${lockWeekdayLong}`;
  const lockSliderPrompt = lockSliderProgress >= lockSlideTheme.unlockThreshold
    ? lockSlideTheme.readyPrompt
    : lockSlideTheme.idlePrompt;
  const lockSliderTravel = Math.max(
    lockSlideTheme.trackHeight - lockSlideTheme.handleSize - lockSlideTheme.handleInset * 2,
    0
  );
  const lockSliderOffsetY = -lockSliderProgress * lockSliderTravel;
  const handlePasscodeInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onPasscodeInputChange(event.target.value.replace(/\D/g, '').slice(0, 6));
  };
  const handlePasscodeKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') onUnlockAttempt();
  };
  const handleSlidePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    event.preventDefault();
    onBeginSlideUnlock(event.clientY);
  };

  const lockPasscodePanel = themeId === 'ios' ? (
    <div className={lockActionTheme.passcodeWrapClassName}>
      <div className="text-center">
        <div className={lockActionTheme.passcodeTitleClassName}>输入密码</div>
        <p className={`mt-2 ${lockActionTheme.passcodeHintClassName}`}>4 到 6 位数字</p>
      </div>
      <div className="relative mx-auto w-full max-w-[280px]">
        <div className="flex items-center justify-center gap-3 rounded-full border border-white/16 bg-white/10 px-6 py-5 backdrop-blur-2xl">
          {Array.from({ length: 6 }).map((_, index) => (
            <span
              key={`lock-passcode-dot-${index}`}
              className={`h-3 w-3 rounded-full transition-all ${index < lockPasscodeInput.length ? 'scale-100 bg-white' : 'scale-90 bg-white/26'}`}
            />
          ))}
        </div>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          value={lockPasscodeInput}
          onChange={handlePasscodeInputChange}
          onKeyDown={handlePasscodeKeyDown}
          placeholder=""
          className="absolute inset-0 opacity-0"
          autoFocus={isLocked}
        />
      </div>
      <button
        className={lockActionTheme.passcodeButtonClassName}
        onClick={onUnlockAttempt}
      >
        解锁
      </button>
    </div>
  ) : themeId === 'android' ? (
    <div className={lockActionTheme.passcodeWrapClassName}>
      <div>
        <div className={`flex items-center gap-2 ${lockActionTheme.passcodeTitleClassName}`}>
          <span className="rounded-full border border-white/10 bg-white/8 px-2 py-1 text-[10px] tracking-[0.24em] text-white/58">PIN 验证</span>
          <span>输入密码解锁</span>
        </div>
        <p className={`mt-2 ${lockActionTheme.passcodeHintClassName}`}>这是普通本地密码校验，不提供安全保护。</p>
      </div>
      <input
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        value={lockPasscodeInput}
        onChange={handlePasscodeInputChange}
        onKeyDown={handlePasscodeKeyDown}
        placeholder="输入 4-6 位数字密码"
        className={lockActionTheme.passcodeInputClassName}
        autoFocus={isLocked}
      />
      <button
        className={lockActionTheme.passcodeButtonClassName}
        style={{ backgroundColor: accentColor }}
        onClick={onUnlockAttempt}
      >
        进入桌面
      </button>
    </div>
  ) : (
    <div className={lockActionTheme.passcodeWrapClassName}>
      <div>
        <div className={lockActionTheme.passcodeTitleClassName}>输入密码</div>
        <p className={`mt-2 ${lockActionTheme.passcodeHintClassName}`}>本地校验，不提供安全防护</p>
      </div>
      <input
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        value={lockPasscodeInput}
        onChange={handlePasscodeInputChange}
        onKeyDown={handlePasscodeKeyDown}
        placeholder="输入 4-6 位数字密码"
        className={lockActionTheme.passcodeInputClassName}
        autoFocus={isLocked}
      />
      <button
        className={lockActionTheme.passcodeButtonClassName}
        style={{ backgroundColor: accentColor }}
        onClick={onUnlockAttempt}
      >
        解锁进入桌面
      </button>
    </div>
  );

  const lockActionPanel = needsLockPasscode ? (
    lockPasscodePanel
  ) : themeId === 'ios' ? (
    <div className="relative flex w-full min-h-[116px] items-end justify-center">
      <button
        type="button"
        aria-label="手电筒"
        className="absolute bottom-1 left-1 flex h-[54px] w-[54px] items-center justify-center rounded-full bg-black/24 text-white/92 shadow-[0_14px_32px_rgba(0,0,0,0.2)] backdrop-blur-xl"
      >
        <i className="fa-solid fa-bolt text-[18px]" />
      </button>
      <button
        type="button"
        aria-label="相机"
        className="absolute bottom-1 right-1 flex h-[54px] w-[54px] items-center justify-center rounded-full bg-black/24 text-white/92 shadow-[0_14px_32px_rgba(0,0,0,0.2)] backdrop-blur-xl"
      >
        <i className="fa-solid fa-camera text-[18px]" />
      </button>
      <div
        ref={lockSliderTrackRef}
        className={lockSlideTheme.trackClassName}
        style={{ touchAction: 'none' }}
        onPointerDown={handleSlidePointerDown}
      >
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2.5"
          style={{
            opacity: Math.max(0.1, 1 - lockSliderProgress * 0.94),
            transition: lockMotionTheme.sliderTrackTransition,
            transform: `translateY(${lockSliderProgress * 8}px)`,
          }}
        >
          <div className={lockSlideTheme.promptClassName}>{lockSliderPrompt}</div>
          <div className="h-1 w-[118px] rounded-full bg-white/72 shadow-[0_2px_14px_rgba(255,255,255,0.32)]" />
        </div>
        <div
          className={`pointer-events-none absolute z-10 ${lockSlideTheme.handleClassName}`}
          style={{
            left: '50%',
            bottom: `${lockSlideTheme.handleInset + 10}px`,
            width: `${lockSlideTheme.handleSize}px`,
            height: `${lockSlideTheme.handleSize}px`,
            transform: `translate(-50%, ${lockSliderOffsetY}px)`,
            transition: lockMotionTheme.sliderHandleTransition,
            opacity: 0.56 + lockSliderProgress * 0.22,
          }}
        >
          <i className={`fa-solid ${lockSlideTheme.handleIcon} ${lockSlideTheme.handleIconClassName}`} />
        </div>
      </div>
    </div>
  ) : themeId === 'android' ? (
    <div className="relative flex w-full min-h-[236px] items-end justify-center">
      <button
        type="button"
        aria-label="快捷操作"
        className="absolute bottom-3 left-1 flex h-11 w-11 items-center justify-center rounded-full bg-black/24 text-white/68 backdrop-blur-xl"
      >
        <i className="fa-solid fa-wallet text-[15px]" />
      </button>
      <button
        type="button"
        aria-label="相机"
        className="absolute bottom-3 right-1 flex h-11 w-11 items-center justify-center rounded-full bg-black/24 text-white/68 backdrop-blur-xl"
      >
        <i className="fa-solid fa-camera text-[15px]" />
      </button>
      <div
        ref={lockSliderTrackRef}
        className={lockSlideTheme.trackClassName}
        style={{ touchAction: 'none' }}
        onPointerDown={handleSlidePointerDown}
      >
        <div
          className="absolute left-1/2 top-7 w-px rounded-full bg-white/10"
          style={{
            height: `${lockSlideTheme.trackHeight - 54}px`,
            opacity: 0.16 + lockSliderProgress * 0.44,
            transform: `translateX(-50%) scaleY(${0.82 + lockSliderProgress * 0.18})`,
            transition: lockMotionTheme.sliderTrackTransition,
          }}
        />
        <div
          className="absolute inset-x-0 bottom-2 flex flex-col items-center gap-3"
          style={{
            opacity: Math.max(0.12, 1 - lockSliderProgress * 0.88),
            transition: lockMotionTheme.sliderTrackTransition,
            transform: `translateY(${lockSliderProgress * 8}px)`,
          }}
        >
          <div className={lockSlideTheme.promptClassName}>{lockSliderPrompt}</div>
        </div>
        <div
          className={`pointer-events-none absolute z-10 ${lockSlideTheme.handleClassName}`}
          style={{
            left: '50%',
            bottom: `${lockSlideTheme.handleInset + 18}px`,
            width: `${lockSlideTheme.handleSize}px`,
            height: `${lockSlideTheme.handleSize}px`,
            transform: `translate(-50%, ${lockSliderOffsetY}px)`,
            transition: lockMotionTheme.sliderHandleTransition,
          }}
        >
          <div
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-white/22 bg-white/6 shadow-[0_0_0_8px_rgba(255,255,255,0.02)]"
            style={{
              boxShadow: lockSliderProgress > 0.04
                ? '0 20px 48px rgba(0,0,0,0.36), 0 0 0 8px rgba(255,255,255,0.02)'
                : '0 12px 28px rgba(0,0,0,0.28), 0 0 0 8px rgba(255,255,255,0.02)',
            }}
          >
            <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full border border-white/12 bg-black/28 text-white">
              <i className="fa-solid fa-lock text-[18px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="relative -mx-5 w-[calc(100%+2.5rem)]">
      <div
        ref={lockSliderTrackRef}
        className={lockSlideTheme.trackClassName}
        style={{ touchAction: 'none' }}
        onPointerDown={handleSlidePointerDown}
      >
        <div
          className="absolute inset-x-0 top-0 h-px bg-white/16"
          style={{
            boxShadow: `inset 62px 0 0 ${accentColor}`,
            opacity: 0.84 + lockSliderProgress * 0.16,
            transition: lockMotionTheme.sliderTrackTransition,
          }}
        />
        <div
          className="absolute inset-x-0 bottom-3 flex items-center justify-center"
          style={{
            opacity: Math.max(0.12, 1 - lockSliderProgress),
            transition: lockMotionTheme.sliderTrackTransition,
          }}
        >
          <div className="text-[11px] font-medium uppercase tracking-[0.34em] text-white/52">向上滑动</div>
        </div>
        <button
          type="button"
          className={`absolute inset-x-0 bottom-0 z-10 ${lockSlideTheme.handleClassName}`}
          style={{
            transform: `translateY(${lockSliderOffsetY}px)`,
            transition: lockMotionTheme.sliderHandleTransition,
          }}
          onPointerDown={handleSlidePointerDown}
        >
          <div className="flex items-center gap-4">
            <div className="h-9 w-[4px] rounded-none" style={{ backgroundColor: accentColor }} />
            <div className="flex flex-col items-start gap-1">
              <div className="text-[14px] font-light tracking-[0.04em] text-white">{lockSliderPrompt}</div>
              <div className="text-[11px] tracking-[0.22em] text-white/46">开始</div>
            </div>
          </div>
          <i className={`fa-solid ${lockSlideTheme.handleIcon} ${lockSlideTheme.handleIconClassName}`} />
        </button>
      </div>
    </div>
  );

  const lockActionContent = (
    <div
      className={needsLockPasscode ? lockActionTheme.panelWrapClassName : 'w-full self-stretch'}
      style={{ animation: lockMotionTheme.actionAnimation }}
    >
      {lockActionPanel}
      {!!lockError && <p className={lockActionTheme.errorClassName}>{lockError}</p>}
    </div>
  );
  const lockShellClassName = themeId === 'wp'
    ? 'fixed inset-0 z-[120] overflow-hidden bg-black text-white'
    : 'fixed inset-0 z-[120] overflow-hidden text-white';
  const lockOverlayTint = themeId === 'ios'
    ? 'linear-gradient(180deg, rgba(255,255,255,0.01) 0%, rgba(46,53,76,0.26) 34%, rgba(31,36,52,0.56) 100%)'
    : themeId === 'android'
      ? 'linear-gradient(180deg, rgba(18,20,26,0.06) 0%, rgba(27,32,45,0.32) 42%, rgba(18,20,28,0.68) 100%)'
      : 'linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.8) 100%)';

  return (
    <div className={lockShellClassName} style={{ animation: lockMotionTheme.shellAnimation }}>
      <div className="absolute inset-0" style={{ background: defaultWallpaper }} />
      <div
        className="absolute inset-0"
        style={{
          background: isLockImageUrl ? `url(${lockWallpaper}) center/cover no-repeat` : lockWallpaper,
          filter: themeId === 'ios'
            ? 'saturate(1.06) brightness(0.96)'
            : themeId === 'android'
              ? 'saturate(0.88) brightness(0.96)'
              : undefined,
        }}
      />
      <div className="absolute inset-0" style={{ background: lockOverlayTint }} />
      {themeId === 'ios' && (
        <div
          className="absolute inset-0 z-[1]"
          style={{ background: 'radial-gradient(circle at 50% 22%, rgba(24,28,42,0.08) 0%, rgba(24,28,42,0.16) 22%, rgba(24,28,42,0.08) 36%, rgba(24,28,42,0) 64%)' }}
        />
      )}
      {themeId === 'android' && (
        <div
          className="absolute inset-0 z-[1]"
          style={{ background: 'radial-gradient(circle at 28% 22%, rgba(18,20,27,0.04) 0%, rgba(18,20,27,0.16) 24%, rgba(18,20,27,0.08) 38%, rgba(18,20,27,0) 66%)' }}
        />
      )}

      {themeId === 'ios' && (
        <div
          className="relative z-10 flex h-full flex-col px-6 pb-[calc(18px+var(--safe-bottom,0px))] pt-[calc(14px+var(--safe-top,0px))]"
          style={{ fontFamily: '"SF Pro Display", "PingFang SC", sans-serif' }}
        >
          {showDesktopStatusBar && (
            <div className="flex items-center justify-between px-1 text-[15px] font-semibold tracking-[-0.01em] text-white/96">
              <span>{compactLockTime}</span>
              <div className="flex items-center gap-2 text-[11px] text-white/92">
                <i className="fa-solid fa-signal" />
                <i className="fa-solid fa-wifi" />
                <i className="fa-solid fa-battery-full" />
              </div>
            </div>
          )}
          <div
            className="text-center"
            style={{
              marginTop: iosHeroMarginTop,
              animation: lockMotionTheme.heroAnimation,
              textShadow: '0 10px 34px rgba(18,22,36,0.2)',
            }}
          >
            <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-black/12 text-white/82 backdrop-blur-md">
              <i className="fa-solid fa-lock text-[11px]" />
            </div>
            <div className="mt-6 text-[22px] font-medium tracking-[-0.02em] text-white/96">{iosLockDateLine}</div>
            <div className="mt-1 text-[108px] font-thin leading-none tracking-[-0.095em] text-white">
              {lockTimeParts.hour}
              <span className="px-[2px]">:</span>
              {lockTimeParts.minute}
            </div>
          </div>
          <div className="mt-auto">
            {lockActionContent}
          </div>
        </div>
      )}

      {themeId === 'android' && (
        <div
          className="relative z-10 flex h-full flex-col px-6 pb-[calc(22px+var(--safe-bottom,0px))] pt-[calc(16px+var(--safe-top,0px))]"
          style={{ fontFamily: 'Roboto, "Noto Sans SC", sans-serif' }}
        >
          {showDesktopStatusBar && (
            <div className="flex items-center justify-between text-[13px] font-medium text-white/82">
              <span>{compactLockTime}</span>
              <div className="flex items-center gap-2 text-[12px] text-white/72">
                <i className="fa-solid fa-signal" />
                <i className="fa-solid fa-wifi" />
                <i className="fa-solid fa-battery-full" />
              </div>
            </div>
          )}
          <div
            className="pl-0.5"
            style={{
              marginTop: androidHeroMarginTop,
              animation: lockMotionTheme.heroAnimation,
              textShadow: '0 10px 28px rgba(12,14,18,0.14)',
            }}
          >
            <div className="text-[96px] font-light leading-[0.82] tracking-[-0.075em] text-white">
              {androidLockClockHour}
            </div>
            <div className="-mt-3 text-[96px] font-light leading-[0.82] tracking-[-0.075em] text-white">
              {androidLockClockMinute}
            </div>
            {!desktop24Hour && (
              <div className="mt-1 text-[13px] font-medium tracking-[0.22em] text-white/42">{lockTimeParts.period}</div>
            )}
            <div className="mt-4 flex items-center gap-2 text-[14px] text-white/68">
              <i className="fa-solid fa-cloud-sun text-[12px]" />
              <span>{androidLockMetaLine}</span>
            </div>
          </div>
          <div className="mt-auto">{lockActionContent}</div>
        </div>
      )}

      {themeId === 'wp' && (
        <div
          className="relative z-10 flex h-full flex-col px-5 pb-0 pt-[calc(26px+var(--safe-top,0px))]"
          style={{ fontFamily: '"Segoe UI Light", "Segoe UI", "Microsoft YaHei UI", sans-serif' }}
        >
          <div className="max-w-sm" style={{ animation: lockMotionTheme.heroAnimation }}>
            <div className="text-[132px] font-extralight leading-[0.8] tracking-[-0.09em] text-white/96">{lockWpTimeParts.hour}</div>
            <div className="-mt-4 text-[132px] font-extralight leading-[0.8] tracking-[-0.09em] text-white/96">{lockWpTimeParts.minute}</div>
            <div className="mt-4 text-[28px] font-light text-white/84">{wpLockDateLine}</div>
            <div className="mt-14 flex items-center gap-3 text-[30px] font-light text-white/84">
              <div className="h-3 w-3 rounded-none" style={{ backgroundColor: accentColor }} />
              <span>1</span>
            </div>
            <div className="mt-2 text-[12px] uppercase tracking-[0.28em] text-white/46">短信</div>
            <div className="mt-10 h-px w-16 bg-white/14" />
            <div className="mt-4 text-[13px] tracking-[0.08em] text-white/38">
              轻扫可进入开始屏幕
            </div>
          </div>
          <div className="mt-auto">{lockActionContent}</div>
        </div>
      )}
    </div>
  );
};

export default DesktopLockScreenOverlay;
