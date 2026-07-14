import { isNative, hapticLight, hapticMedium, hapticHeavy } from '../services/nativeService';
import type { SoundVibrationSettings } from '../types';

const audioCache: Record<string, HTMLAudioElement> = {};

export function playAudioBySrc(src: string): void {
  const resolved = String(src || '').trim();
  if (!resolved) return;
  try {
    if (!audioCache[resolved]) {
      audioCache[resolved] = new Audio(resolved);
    }
    const audio = audioCache[resolved];
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // ignore autoplay restrictions
    });
  } catch {
    // ignore audio errors
  }
}

export function triggerVibration(
  pattern: number | number[] = [30],
  vibrationEnabled: boolean = true
): void {
  if (!vibrationEnabled) return;

  // 原生 App 使用 Capacitor Haptics
  if (isNative) {
    const patternArray = Array.isArray(pattern) ? pattern : [pattern];
    const totalDuration = patternArray.reduce((a, b) => a + b, 0);
    if (totalDuration < 50) {
      hapticLight();
    } else if (totalDuration < 100) {
      hapticMedium();
    } else {
      hapticHeavy();
    }
    return;
  }

  // Web 端使用 Vibration API
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // ignore vibration errors
  }
}

export function playSendSignal(svSettings: SoundVibrationSettings): void {
  if (svSettings.sendSoundEnabled) {
    playAudioBySrc(svSettings.sendSoundSrc);
  }
  triggerVibration([15], svSettings.vibrationEnabled);
}

export function playReceiveSignal(svSettings: SoundVibrationSettings): void {
  if (svSettings.receiveSoundEnabled) {
    playAudioBySrc(svSettings.receiveSoundSrc);
  }
  triggerVibration([30, 40, 30], svSettings.vibrationEnabled);
}
