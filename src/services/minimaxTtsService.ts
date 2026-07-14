import { redactSensitiveText } from './httpService.ts';

type MiniMaxRegion = 'official' | 'international' | 'china';

type MiniMaxSettingsInput = {
  minimaxTTS?: {
    enabled: boolean;
    region: MiniMaxRegion;
    apiKey: string;
    groupId: string;
    model: string;
  };
};

type SynthesizeOptions = {
  aiSettings?: MiniMaxSettingsInput;
  text: string;
  voiceId: string;
  speed?: number;
  language?: string;
  requestTimeoutMs?: number;
  audioFetchTimeoutMs?: number;
};

const REGION_ENDPOINT_MAP: Record<MiniMaxRegion, string> = {
  official: 'https://api.minimax.chat/v1/t2a_v2',
  international: 'https://api.minimaxi.chat/v1/t2a_v2',
  china: 'https://api.minimax.chat/v1/t2a_v2'
};

const DEFAULT_LANGUAGE = 'Chinese';
const DEFAULT_SPEED = 1;
const MAX_ERROR_BODY_LENGTH = 200;
export const MINIMAX_TTS_REQUEST_TIMEOUT_MS = 30000;
export const MINIMAX_AUDIO_FETCH_TIMEOUT_MS = 12000;
const audioUrlCache = new Map<string, string>();
const pendingRequestCache = new Map<string, Promise<string>>();

const AUDIO_MIME_BY_FORMAT: Record<string, string> = {
  mp3: 'audio/mpeg',
  mpeg: 'audio/mpeg',
  wav: 'audio/wav',
  wave: 'audio/wav',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  aac: 'audio/aac',
  flac: 'audio/flac',
  m4a: 'audio/mp4'
};
const HEX_AUDIO_PATTERN = /^[0-9a-fA-F]+$/;
const HEX_AUDIO_MIN_LENGTH = 512;
const HEX_CHUNK_SIZE = 0x8000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const toSafeSpeed = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_SPEED;
  return Math.max(0.5, Math.min(2, parsed));
};

const normalizeBase64Audio = (raw: unknown): string => {
  const value = String(raw || '').trim();
  if (!value) return '';
  return value.replace(/^data:audio\/[a-zA-Z0-9.+-]+;base64,/i, '').trim();
};

const normalizeHexAudio = (raw: unknown): string => {
  const value = String(raw || '').trim().replace(/^0x/i, '');
  if (!value) return '';
  if (value.length < HEX_AUDIO_MIN_LENGTH || value.length % 2 !== 0) return '';
  if (!HEX_AUDIO_PATTERN.test(value)) return '';
  return value;
};

const hexToBase64 = (hex: string): string => {
  const byteLength = Math.floor(hex.length / 2);
  const bytes = new Uint8Array(byteLength);
  for (let index = 0; index < byteLength; index += 1) {
    const start = index * 2;
    bytes[index] = Number.parseInt(hex.slice(start, start + 2), 16);
  }
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += HEX_CHUNK_SIZE) {
    const chunk = bytes.subarray(offset, offset + HEX_CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

export const resolveMiniMaxAudioMimeType = (data: unknown): string => {
  const payload = isRecord(data) ? data : {};
  const nestedData = isRecord(payload.data) ? payload.data : {};
  const extraInfo = isRecord(payload.extra_info) ? payload.extra_info : {};
  const rawFormat = String(
    payload.audio_format
    || payload.format
    || payload.audioFormat
    || nestedData.audio_format
    || nestedData.format
    || nestedData.audioFormat
    || extraInfo.audio_format
    || extraInfo.format
    || ''
  ).toLowerCase().trim();
  return AUDIO_MIME_BY_FORMAT[rawFormat] || 'audio/mpeg';
};

const inferMimeFromUrl = (url: string): string | null => {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.mp3')) return 'audio/mpeg';
  if (clean.endsWith('.wav')) return 'audio/wav';
  if (clean.endsWith('.ogg') || clean.endsWith('.opus')) return 'audio/ogg';
  if (clean.endsWith('.aac')) return 'audio/aac';
  if (clean.endsWith('.flac')) return 'audio/flac';
  if (clean.endsWith('.m4a')) return 'audio/mp4';
  return null;
};

const toDataAudioUrl = (base64: string, mimeType: string): string => `data:${mimeType};base64,${base64}`;

const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error || new Error('读取音频数据失败'));
  reader.readAsDataURL(blob);
});

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => {
    controller.abort(new Error(timeoutMessage));
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason || new Error(timeoutMessage);
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }
};

const toPositiveTimeout = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const tryFetchAudioAsDataUrl = async (url: string, timeoutMs = MINIMAX_AUDIO_FETCH_TIMEOUT_MS): Promise<string | null> => {
  try {
    const response = await fetchWithTimeout(
      url,
      { method: 'GET' },
      toPositiveTimeout(timeoutMs, MINIMAX_AUDIO_FETCH_TIMEOUT_MS),
      'MiniMax audio fetch timeout'
    );
    if (!response.ok) return null;
    const blob = await response.blob();
    const type = String(blob.type || '').toLowerCase();
    const fromUrl = inferMimeFromUrl(url);
    const mimeType = type.startsWith('audio/') ? type : (fromUrl || 'audio/mpeg');
    const normalizedBlob = type.startsWith('audio/') ? blob : new Blob([blob], { type: mimeType });
    return await blobToDataUrl(normalizedBlob);
  } catch {
    return null;
  }
};

export const extractMiniMaxAudioUrl = (data: unknown): string => {
  const payload = isRecord(data) ? data : {};
  const nestedData = isRecord(payload.data) ? payload.data : {};
  const mimeType = resolveMiniMaxAudioMimeType(payload);
  const directUrl = String(payload.audio_url || payload.audioUrl || payload.url || '').trim();
  if (directUrl) return directUrl;
  const nestedUrl = String(nestedData.audio_url || nestedData.audioUrl || nestedData.url || '').trim();
  if (nestedUrl) return nestedUrl;

  const directHex = normalizeHexAudio(payload.audio || payload.audio_hex);
  if (directHex) return toDataAudioUrl(hexToBase64(directHex), mimeType);
  const nestedHex = normalizeHexAudio(nestedData.audio || nestedData.audio_hex);
  if (nestedHex) return toDataAudioUrl(hexToBase64(nestedHex), mimeType);

  const directBase64 = normalizeBase64Audio(payload.audio || payload.audio_base64 || payload.base64);
  if (directBase64) return toDataAudioUrl(directBase64, mimeType);
  const nestedBase64 = normalizeBase64Audio(nestedData.audio || nestedData.audio_base64 || nestedData.base64);
  if (nestedBase64) return toDataAudioUrl(nestedBase64, mimeType);

  throw new Error('MiniMax 返回中未找到可播放音频数据');
};

const getConfig = (aiSettings?: MiniMaxSettingsInput) => {
  const minimax = aiSettings?.minimaxTTS;
  if (!minimax?.enabled) throw new Error('MiniMax TTS 未启用');
  const apiKey = String(minimax.apiKey || '').trim();
  const groupId = String(minimax.groupId || '').trim();
  const model = String(minimax.model || '').trim();
  if (!apiKey) throw new Error('MiniMax API Key 未配置');
  if (!groupId) throw new Error('MiniMax Group ID 未配置');
  if (!model) throw new Error('MiniMax 模型未配置');
  const region = minimax.region || 'official';
  const endpoint = REGION_ENDPOINT_MAP[region];
  if (!endpoint) throw new Error(`不支持的 MiniMax 区域: ${region}`);
  return { apiKey, groupId, model, endpoint };
};

const createCacheKey = (options: {
  endpoint: string;
  groupId: string;
  model: string;
  voiceId: string;
  speed: number;
  language: string;
  text: string;
}) => [
  options.endpoint,
  options.groupId,
  options.model,
  options.voiceId,
  String(options.speed),
  options.language,
  options.text
].join('|');

const buildRequestBody = (params: {
  model: string;
  text: string;
  voiceId: string;
  speed: number;
  language: string;
}) => ({
  model: params.model,
  text: params.text,
  stream: false,
  voice_setting: {
    voice_id: params.voiceId,
    speed: params.speed,
    language_boost: params.language
  },
  audio_setting: {
    sample_rate: 32000,
    bitrate: 128000,
    format: 'mp3',
    channel: 1
  }
});

export async function synthesizeMiniMaxAudio(options: SynthesizeOptions): Promise<string> {
  const text = String(options.text || '').trim();
  if (!text) throw new Error('语音文本为空，无法生成');
  const voiceId = String(options.voiceId || '').trim();
  if (!voiceId) throw new Error('voice_id 为空，无法生成语音');

  const { apiKey, groupId, model, endpoint } = getConfig(options.aiSettings);
  const speed = toSafeSpeed(options.speed);
  const language = String(options.language || DEFAULT_LANGUAGE).trim() || DEFAULT_LANGUAGE;
  const requestTimeoutMs = toPositiveTimeout(options.requestTimeoutMs, MINIMAX_TTS_REQUEST_TIMEOUT_MS);
  const audioFetchTimeoutMs = toPositiveTimeout(options.audioFetchTimeoutMs, MINIMAX_AUDIO_FETCH_TIMEOUT_MS);
  const requestBody = buildRequestBody({ model, text, voiceId, speed, language });
  const cacheKey = createCacheKey({ endpoint, groupId, model, voiceId, speed, language, text });

  const cached = audioUrlCache.get(cacheKey);
  if (cached) return cached;

  const pending = pendingRequestCache.get(cacheKey);
  if (pending) return pending;

  const request = (async () => {
    const url = `${endpoint}?GroupId=${encodeURIComponent(groupId)}`;
    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      },
      requestTimeoutMs,
      'MiniMax TTS request timeout'
    );

    if (!response.ok) {
      const raw = await response.text().catch(() => '');
      const compact = redactSensitiveText(String(raw || '')).replace(/\s+/g, ' ').trim();
      const errBody = compact.slice(0, MAX_ERROR_BODY_LENGTH);
      throw new Error(`MiniMax TTS 请求失败(${response.status}) ${errBody}`.trim());
    }

    const data: unknown = await response.json();
    const audioUrl = extractMiniMaxAudioUrl(data);
    const isHttpAudioUrl = /^https?:\/\//i.test(audioUrl);
    const stableAudioUrl = isHttpAudioUrl
      ? (await tryFetchAudioAsDataUrl(audioUrl, audioFetchTimeoutMs)) || audioUrl
      : audioUrl;
    audioUrlCache.set(cacheKey, stableAudioUrl);
    return stableAudioUrl;
  })();

  pendingRequestCache.set(cacheKey, request);
  try {
    return await request;
  } finally {
    pendingRequestCache.delete(cacheKey);
  }
}
