export const CONTACT_CARD_PREFIX = 'WXCONTACTCARD:';

const PNG_SIGNATURE_BYTES = [137, 80, 78, 71, 13, 10, 26, 10] as const;

export const encodeBase64Unicode = (value: string): string => {
  try {
    return btoa(unescape(encodeURIComponent(value)));
  } catch {
    return '';
  }
};

export const decodeBase64Unicode = (value: string): string => {
  try {
    return decodeURIComponent(escape(atob(value)));
  } catch {
    return '';
  }
};

export const normalizeContactCardBase64 = (value: string): string => {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
};

const buildCrc32Table = (): Uint32Array => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
};

const CRC32_TABLE = buildCrc32Table();

const crc32 = (bytes: Uint8Array): number => {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const dataUrlToBytes = (dataUrl: string): Uint8Array | null => {
  const match = String(dataUrl || '').match(/^data:image\/png;base64,([\s\S]+)$/i);
  if (!match?.[1]) {
    return null;
  }
  try {
    const binary = atob(match[1]);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  } catch {
    return null;
  }
};

const bytesToPngDataUrl = (bytes: Uint8Array): string => {
  let binary = '';
  const CHUNK_SIZE = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }
  return `data:image/png;base64,${btoa(binary)}`;
};

const createPngTextChunk = (keyword: string, text: string): Uint8Array => {
  const safeKeyword = String(keyword || 'xushuo').slice(0, 79);
  const payload = `${safeKeyword}\u0000${String(text || '')}`;
  const data = new Uint8Array(payload.length);
  for (let i = 0; i < payload.length; i++) {
    data[i] = payload.charCodeAt(i) & 0xff;
  }

  const typeBytes = new Uint8Array([116, 69, 88, 116]);
  const chunk = new Uint8Array(4 + 4 + data.length + 4);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length, false);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  const crcInput = new Uint8Array(4 + data.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(data, 4);
  view.setUint32(8 + data.length, crc32(crcInput), false);
  return chunk;
};

export const injectTextChunkIntoPngDataUrl = (
  pngDataUrl: string,
  keyword: string,
  text: string
): string => {
  const bytes = dataUrlToBytes(pngDataUrl);
  if (!bytes || bytes.length < 12) {
    return pngDataUrl;
  }
  for (let i = 0; i < PNG_SIGNATURE_BYTES.length; i++) {
    if (bytes[i] !== PNG_SIGNATURE_BYTES[i]) {
      return pngDataUrl;
    }
  }

  let i = 8;
  let iendOffset = -1;
  while (i + 12 <= bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + i, bytes.length - i);
    const length = view.getUint32(0, false);
    const typeStart = i + 4;
    const typeEnd = typeStart + 4;
    if (typeEnd > bytes.length) {
      break;
    }
    const type = String.fromCharCode(bytes[typeStart], bytes[typeStart + 1], bytes[typeStart + 2], bytes[typeStart + 3]);
    const next = i + 12 + length;
    if (next > bytes.length) {
      break;
    }
    if (type === 'IEND') {
      iendOffset = i;
      break;
    }
    i = next;
  }
  if (iendOffset < 0) {
    return pngDataUrl;
  }

  const textChunk = createPngTextChunk(keyword, text);
  const out = new Uint8Array(bytes.length + textChunk.length);
  out.set(bytes.subarray(0, iendOffset), 0);
  out.set(textChunk, iendOffset);
  out.set(bytes.subarray(iendOffset), iendOffset + textChunk.length);
  return bytesToPngDataUrl(out);
};

export const extractContactCardPayloadFromBinary = (bytes: Uint8Array): string => {
  if (!bytes.length) {
    return '';
  }
  let ascii = '';
  const CHUNK_SIZE = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    ascii += String.fromCharCode(...chunk);
  }
  const start = ascii.indexOf(CONTACT_CARD_PREFIX);
  if (start < 0) {
    return '';
  }
  const base64Chars = /[A-Za-z0-9+/=_-]/;
  let end = start + CONTACT_CARD_PREFIX.length;
  while (end < ascii.length && base64Chars.test(ascii[end])) {
    end++;
  }
  const token = ascii.slice(start, end).trim();
  return token.startsWith(CONTACT_CARD_PREFIX) ? token : '';
};
