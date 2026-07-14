const toHex = (value: number): string => value.toString(16).padStart(2, '0');

const decodeUtf8Bytes = (bytes: Uint8Array): string => {
  let encoded = '';
  for (let index = 0; index < bytes.length; index += 1) {
    encoded += `%${toHex(bytes[index])}`;
  }
  try {
    return decodeURIComponent(encoded);
  } catch {
    let fallback = '';
    for (let index = 0; index < bytes.length; index += 1) {
      fallback += String.fromCharCode(bytes[index]);
    }
    return fallback;
  }
};

const installPromiseAllSettledPolyfill = (): void => {
  if (typeof Promise === 'undefined' || typeof Promise.allSettled === 'function') return;
  Promise.allSettled = function allSettled<T>(iterable: Iterable<T | PromiseLike<T>>) {
    const mapped = Array.from(iterable).map((item) => Promise.resolve(item)
      .then((value) => ({ status: 'fulfilled' as const, value }))
      .catch((reason) => ({ status: 'rejected' as const, reason })));
    return Promise.all(mapped);
  };
};

const installTextEncoderPolyfill = (): void => {
  if (typeof globalThis.TextEncoder === 'undefined') {
    class MiniTextEncoder {
      encode(input = ''): Uint8Array {
        const escaped = encodeURIComponent(String(input));
        const bytes: number[] = [];
        for (let index = 0; index < escaped.length; index += 1) {
          const char = escaped[index];
          if (char === '%') {
            bytes.push(parseInt(escaped.slice(index + 1, index + 3), 16));
            index += 2;
          } else {
            bytes.push(char.charCodeAt(0));
          }
        }
        return new Uint8Array(bytes);
      }
    }
    (globalThis as any).TextEncoder = MiniTextEncoder;
  }
  if (typeof globalThis.TextDecoder === 'undefined') {
    class MiniTextDecoder {
      decode(input?: BufferSource): string {
        if (!input) return '';
        const bytes = input instanceof Uint8Array ? input : new Uint8Array(input as ArrayBufferLike);
        return decodeUtf8Bytes(bytes);
      }
    }
    (globalThis as any).TextDecoder = MiniTextDecoder;
  }
};

const installRequestIdleCallbackPolyfill = (): void => {
  if (typeof window === 'undefined') return;
  const view = window as any;
  if (typeof view.requestIdleCallback !== 'function') {
    view.requestIdleCallback = (callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void) => {
      const start = Date.now();
      return window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => Math.max(0, 50 - (Date.now() - start)) }), 16);
    };
  }
  if (typeof view.cancelIdleCallback !== 'function') {
    view.cancelIdleCallback = (id: number) => window.clearTimeout(id);
  }
};

const applyLegacyAndroidLiteMode = (): void => {
  const ua = navigator.userAgent || '';
  const major = Number((ua.match(/Android\s+(\d+)/i)?.[1] || '0'));
  const lowCpu = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4;
  const lowMemory = typeof (navigator as any).deviceMemory === 'number' && (navigator as any).deviceMemory > 0 && (navigator as any).deviceMemory <= 3;
  if (!(major > 0 && major <= 8) && !lowCpu && !lowMemory) return;
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--app-animation-duration', '140ms');
  rootStyle.setProperty('--app-transition-normal', '140ms');
  rootStyle.setProperty('--app-transition-slow', '220ms');
};

export const initRuntimeCompat = (): void => {
  installPromiseAllSettledPolyfill();
  installTextEncoderPolyfill();
  installRequestIdleCallbackPolyfill();
  applyLegacyAndroidLiteMode();
};

initRuntimeCompat();
