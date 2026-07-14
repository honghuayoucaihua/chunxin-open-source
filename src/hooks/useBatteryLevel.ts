import { useState, useEffect } from 'react';

interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean): void;
}

interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryManager>;
}

/**
 * 获取设备真实电量百分比（0-100）。
 * 若浏览器不支持 Battery API，则返回 null。
 */
export function useBatteryLevel(): number | null {
  const [level, setLevel] = useState<number | null>(null);

  useEffect(() => {
    const nav = navigator as NavigatorWithBattery;
    if (typeof nav.getBattery !== 'function') {
      return;
    }

    let batteryRef: BatteryManager | null = null;
    let handleChangeRef: (() => void) | null = null;
    let cancelled = false;

    nav.getBattery().then((battery) => {
      if (cancelled) return;
      batteryRef = battery;
      setLevel(Math.round(battery.level * 100));

      const handleChange = () => {
        setLevel(Math.round(battery.level * 100));
      };
      handleChangeRef = handleChange;
      battery.addEventListener('levelchange', handleChange);
    }).catch(() => {
      // 忽略获取失败
    });

    return () => {
      cancelled = true;
      if (batteryRef && handleChangeRef) {
        batteryRef.removeEventListener('levelchange', handleChangeRef);
      }
    };
  }, []);

  return level;
}
