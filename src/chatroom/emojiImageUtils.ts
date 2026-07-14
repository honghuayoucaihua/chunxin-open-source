export type EmojiAsset = {
  id: string;
  url: string;
  desc: string;
};

type CompactOptions = {
  unifiedSize: number;
  outputQuality: number;
};

const DATA_URL_REGEX = /^data:([^;,]+)((?:;[^;,=]+=[^;,]+|;charset=[^;,]+|;base64)*)?,([\s\S]*)$/i;
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const RIFF_SIGNATURE = 'RIFF';
const WEBP_SIGNATURE = 'WEBP';
const APNG_CHUNK = 'acTL';
const WEBP_ANIM_CHUNK = 'ANIM';
const WEBP_ANMF_CHUNK = 'ANMF';

const toDataUrl = (blob: Blob): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Read blob failed'));
    reader.readAsDataURL(blob);
  });

const toAsciiCodes = (value: string): number[] => Array.from(value).map((char) => char.charCodeAt(0));

const startsWithBytes = (bytes: Uint8Array, prefix: number[]): boolean => (
  prefix.every((value, index) => bytes[index] === value)
);

const indexOfAsciiSequence = (bytes: Uint8Array, text: string, startIndex = 0): number => {
  const pattern = toAsciiCodes(text);
  if (pattern.length === 0 || bytes.length < pattern.length) return -1;
  for (let index = Math.max(0, startIndex); index <= bytes.length - pattern.length; index += 1) {
    let matched = true;
    for (let offset = 0; offset < pattern.length; offset += 1) {
      if (bytes[index + offset] !== pattern[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return index;
    }
  }
  return -1;
};

const decodeBase64ToBytes = (value: string): Uint8Array | null => {
  try {
    if (typeof atob === 'function') {
      const binary = atob(value);
      return Uint8Array.from(binary, (char) => char.charCodeAt(0));
    }
    const bufferCtor = (globalThis as { Buffer?: { from: (input: string, encoding: string) => Uint8Array } }).Buffer;
    if (bufferCtor?.from) {
      return Uint8Array.from(bufferCtor.from(value, 'base64'));
    }
  } catch {
    return null;
  }
  return null;
};

const decodeDataUrlPayloadToBytes = (payload: string, isBase64: boolean): Uint8Array | null => {
  if (isBase64) {
    return decodeBase64ToBytes(payload);
  }
  try {
    const decoded = decodeURIComponent(payload);
    return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
};

const parseDataUrlMeta = (value: string): { mime: string; isBase64: boolean; payload: string } | null => {
  const match = String(value || '').trim().match(DATA_URL_REGEX);
  if (!match) return null;
  const mime = String(match[1] || '').trim().toLowerCase();
  const meta = String(match[2] || '').toLowerCase();
  const payload = String(match[3] || '');
  return {
    mime,
    isBase64: meta.includes(';base64'),
    payload
  };
};

const decodeImageDataUrlBytes = (value: string): { mime: string; bytes: Uint8Array } | null => {
  const parsed = parseDataUrlMeta(value);
  if (!parsed?.mime.startsWith('image/')) return null;
  const bytes = decodeDataUrlPayloadToBytes(parsed.payload, parsed.isBase64);
  if (!bytes) return null;
  return { mime: parsed.mime, bytes };
};

const isAnimatedPngBytes = (bytes: Uint8Array): boolean => {
  if (!startsWithBytes(bytes, PNG_SIGNATURE)) return false;
  return indexOfAsciiSequence(bytes, APNG_CHUNK, PNG_SIGNATURE.length) >= 0;
};

const isAnimatedWebpBytes = (bytes: Uint8Array): boolean => {
  if (indexOfAsciiSequence(bytes, RIFF_SIGNATURE, 0) !== 0) return false;
  if (indexOfAsciiSequence(bytes, WEBP_SIGNATURE, 8) !== 8) return false;
  return indexOfAsciiSequence(bytes, WEBP_ANIM_CHUNK, 12) >= 0
    || indexOfAsciiSequence(bytes, WEBP_ANMF_CHUNK, 12) >= 0;
};

const hasAnimatedImageExtension = (value: string): boolean => {
  try {
    const resolved = new URL(value, 'https://xushuo.local');
    const pathname = String(resolved.pathname || '').toLowerCase();
    return pathname.endsWith('.gif') || pathname.endsWith('.apng');
  } catch {
    return false;
  }
};

export const shouldPreserveAnimatedEmojiSource = (value: string): boolean => {
  const source = String(value || '').trim();
  if (!source) return false;

  const parsedDataUrl = parseDataUrlMeta(source);
  if (parsedDataUrl) {
    if (parsedDataUrl.mime === 'image/gif' || parsedDataUrl.mime === 'image/apng') {
      return true;
    }
    const decoded = decodeImageDataUrlBytes(source);
    if (!decoded) return false;
    if (decoded.mime === 'image/png') {
      return isAnimatedPngBytes(decoded.bytes);
    }
    if (decoded.mime === 'image/webp') {
      return isAnimatedWebpBytes(decoded.bytes);
    }
    return false;
  }

  return hasAnimatedImageExtension(source);
};

export const fetchImageAsDataUrl = async (url: string): Promise<string> => {
  if (url.startsWith('data:image')) return url;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) {
      throw new Error('Not an image');
    }
    return toDataUrl(blob);
  } finally {
    clearTimeout(timeoutId);
  }
};

export const compactEmojiUrl = async (
  url: string,
  options: CompactOptions
): Promise<string> => {
  if (!url) return url;
  const { unifiedSize, outputQuality } = options;
  try {
    const source = url.startsWith('data:image') ? url : await fetchImageAsDataUrl(url);
    if (shouldPreserveAnimatedEmojiSource(source)) {
      return source;
    }
    const compacted = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const width = Number(img.naturalWidth || img.width || 0);
          const height = Number(img.naturalHeight || img.height || 0);
          if (!width || !height) return resolve(source);
          const canvas = document.createElement('canvas');
          canvas.width = unifiedSize;
          canvas.height = unifiedSize;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(source);

          const scale = Math.min(unifiedSize / width, unifiedSize / height);
          const drawW = Math.max(1, Math.round(width * scale));
          const drawH = Math.max(1, Math.round(height * scale));
          const offsetX = Math.floor((unifiedSize - drawW) / 2);
          const offsetY = Math.floor((unifiedSize - drawH) / 2);

          ctx.clearRect(0, 0, unifiedSize, unifiedSize);
          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

          let next = canvas.toDataURL('image/webp', outputQuality);
          if (!next || next === 'data:,') {
            next = canvas.toDataURL('image/png');
          }
          if (source.startsWith('data:image') && next.length >= source.length) {
            return resolve(source);
          }
          resolve(next || source);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('Load image failed'));
      img.decoding = 'async';
      img.src = source;
    });
    return compacted || source;
  } catch (error) {
    console.warn('[Emoji] Failed to compact emoji image:', error);
    return url;
  }
};

export const compactEmojiList = async (
  list: EmojiAsset[],
  compactFn: (url: string) => Promise<string>
): Promise<EmojiAsset[]> =>
  Promise.all(
    list.map(async (item) => ({
      ...item,
      url: await compactFn(String(item?.url || ''))
    }))
  );
