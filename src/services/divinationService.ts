import type {
  DivinationApiResponse,
  DivinationDraft,
  DivinationHistoryItem,
  DivinationMethod,
  DivinationType
} from '../types/index.ts';
import { getApiBaseUrl } from './httpService.ts';

const DIVINATION_API_URL = `${getApiBaseUrl()}/divination`;
export const DIVINATION_REQUEST_TIMEOUT_MS = 90000;
const MAX_HISTORY_SIZE = 30;
let fallbackClientId = '';

const getClientId = (): string => {
  try {
    let clientId = localStorage.getItem('clientId');
    if (!clientId) {
      clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('clientId', clientId);
    }
    return clientId;
  } catch {
    if (!fallbackClientId) {
      fallbackClientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return fallbackClientId;
  }
};

const divinationHeaders = (accept: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  'Accept': accept,
  'X-Client-ID': getClientId()
});

type DivinationStreamMeta = {
  requestId?: string;
  type?: DivinationType;
  divination?: unknown;
};

type DivinationStreamHandlers = {
  onMeta?: (meta: DivinationStreamMeta) => void;
  onText?: (chunk: string) => void;
};

type DivinationSupplementaryPayload = Partial<{
  gender: string;
  birthYear: number;
  interpretationStyle: string;
  outputLength: string;
}>;

type DivinationRequestOptions = Partial<{
  datetime: string;
  method: DivinationMethod;
  divinationNumber: number;
  signNumber: number;
  spreadType: string;
  temperature: number;
  supplementaryInfo: DivinationSupplementaryPayload;
}>;

type DivinationRequestPayload = {
  type: DivinationType;
  question: string;
  stream: boolean;
  debug: boolean;
  options: DivinationRequestOptions;
};

type UnknownRecord = Record<string, unknown>;

export const DIVINATION_TYPE_OPTIONS: Array<{ value: DivinationType; label: string; description: string }> = [
  { value: 'liuyao', label: '六爻', description: '适合具体问题判断' },
  { value: 'meihua', label: '梅花易数', description: '支持随机或数字起卦' },
  { value: 'qimen', label: '奇门遁甲', description: '适合趋势与决策问题' },
  { value: 'ssgw', label: '三山国王灵签', description: '可指定签号或随机抽签' },
  { value: 'tarot', label: '塔罗', description: '支持多种牌阵' },
  { value: 'tarot_single', label: '塔罗单牌', description: '快速获得单张牌指引' }
];

export const DIVINATION_METHOD_OPTIONS: Array<{ value: DivinationMethod; label: string }> = [
  { value: 'default', label: '默认' },
  { value: 'random', label: '随机' },
  { value: 'number', label: '数字起卦' }
];

export const TAROT_SPREAD_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'single', label: '单牌' },
  { value: 'three', label: '三牌阵' },
  { value: 'love', label: '感情牌阵' },
  { value: 'career', label: '事业牌阵' },
  { value: 'decision', label: '决策牌阵' },
  { value: 'celtic', label: '凯尔特十字' },
  { value: 'chakra', label: '脉轮牌阵' },
  { value: 'year', label: '年度牌阵' },
  { value: 'mindBodySpirit', label: '身心灵牌阵' },
  { value: 'horseshoe', label: '马蹄牌阵' }
];

const METHOD_REQUIRED_TYPES = new Set<DivinationType>(['liuyao', 'meihua', 'qimen']);

const trimText = (value: unknown): string => String(value || '').trim();

const parsePositiveInt = (value: unknown): number | undefined => {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const parseTemperature = (value: unknown): number | undefined => {
  const raw = String(value || '').trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(0, Math.min(2, parsed));
};

const isRecord = (value: unknown): value is UnknownRecord => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const toLocalDateInputValue = (date = new Date()): string => {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
};

export const createDefaultDivinationDraft = (): DivinationDraft => ({
  type: 'liuyao',
  question: '',
  datetime: '',
  method: 'default',
  divinationNumber: '',
  signNumber: '',
  spreadType: 'three',
  date: toLocalDateInputValue(),
  temperature: '',
  supplementaryInfo: {
    gender: '',
    birthYear: '',
    interpretationStyle: '专业',
    outputLength: '详细'
  }
});

export const getDivinationTypeLabel = (type: DivinationType): string => {
  return DIVINATION_TYPE_OPTIONS.find((item) => item.value === type)?.label || type;
};

export const buildDivinationRequestPayload = (draft: DivinationDraft): DivinationRequestPayload => {
  const question = trimText(draft.question);
  if (!question) {
    throw new Error('请输入要占卜的问题');
  }

  const options: DivinationRequestOptions = {};
  const datetime = trimText(draft.datetime);
  if (datetime) {
    options.datetime = new Date(datetime).toISOString();
  }

  if (METHOD_REQUIRED_TYPES.has(draft.type)) {
    options.method = draft.method;
    if (draft.method === 'number') {
      const divinationNumber = parsePositiveInt(draft.divinationNumber);
      if (!divinationNumber) {
        throw new Error('数字起卦时必须填写有效数字');
      }
      options.divinationNumber = divinationNumber;
    }
  }

  if (draft.type === 'ssgw') {
    const signNumber = parsePositiveInt(draft.signNumber);
    if (signNumber) {
      options.signNumber = signNumber;
    }
  }

  if (draft.type === 'tarot') {
    options.spreadType = trimText(draft.spreadType) || 'three';
  }

  const temperature = parseTemperature(draft.temperature);
  if (temperature !== undefined) {
    options.temperature = temperature;
  }

  const supplementaryInfo: DivinationSupplementaryPayload = {};
  const gender = trimText(draft.supplementaryInfo.gender);
  const birthYear = parsePositiveInt(draft.supplementaryInfo.birthYear);
  const interpretationStyle = trimText(draft.supplementaryInfo.interpretationStyle);
  const outputLength = trimText(draft.supplementaryInfo.outputLength);
  if (gender) supplementaryInfo.gender = gender;
  if (birthYear) supplementaryInfo.birthYear = birthYear;
  if (interpretationStyle) supplementaryInfo.interpretationStyle = interpretationStyle;
  if (outputLength) supplementaryInfo.outputLength = outputLength;
  if (Object.keys(supplementaryInfo).length > 0) {
    options.supplementaryInfo = supplementaryInfo;
  }

  return {
    type: draft.type,
    question,
    stream: false,
    debug: false,
    options
  };
};

type ParsedSseEvent = {
  event: string;
  data: string;
};

export const splitSseBuffer = (input: string): { events: string[]; rest: string } => {
  const events: string[] = [];
  let buffer = input;
  let match = buffer.match(/\r?\n\r?\n/);
  while (match && typeof match.index === 'number') {
    const block = buffer.slice(0, match.index);
    if (block.trim()) {
      events.push(block);
    }
    buffer = buffer.slice(match.index + match[0].length);
    match = buffer.match(/\r?\n\r?\n/);
  }
  return { events, rest: buffer };
};

export const parseSseEventBlocks = (input: string): ParsedSseEvent[] => {
  return input
    .split(/\r?\n\r?\n+/)
    .map((block) => block.replace(/\r/g, ''))
    .filter(Boolean)
    .map((block) => {
      let event = 'message';
      const dataLines: string[] = [];
      block.split(/\r?\n/).forEach((line) => {
        if (line.startsWith('event:')) {
          event = line.slice(6).trim() || 'message';
          return;
        }
        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart());
        }
      });
      return {
        event,
        data: dataLines.join('\n')
      };
    })
    .filter((item) => item.data);
};

export const createDivinationHistoryItem = (
  draft: DivinationDraft,
  response: DivinationApiResponse
): DivinationHistoryItem => {
  const now = Date.now();
  return {
    id: `divination-${now}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    requestId: trimText(response.requestId) || `local-${now}`,
    title: `${getDivinationTypeLabel(draft.type)} · ${trimText(draft.question).slice(0, 24) || '未命名问题'}`,
    draft: {
      ...draft,
      question: trimText(draft.question)
    },
    type: response.type,
    divination: response.divination ?? null,
    interpretation: trimText(response.interpretation) || '暂无解读内容',
    usage: response.usage
  };
};

export const normalizeDivinationHistory = (input: unknown): DivinationHistoryItem[] => {
  if (!Array.isArray(input)) return [];
  return input
    .filter(isRecord)
    .map((item, index) => {
      const draft = isRecord(item.draft)
        ? item.draft
        : createDefaultDivinationDraft();
      const rawType = trimText(item?.type || draft.type || 'liuyao');
      const type = (rawType === 'daily' ? 'liuyao' : rawType || 'liuyao') as DivinationType;
      const createdAt = Number(item?.createdAt || Date.now() + index);
      return {
        id: trimText(item?.id) || `divination-history-${createdAt}-${index}`,
        createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
        requestId: trimText(item?.requestId) || `restored-${createdAt}-${index}`,
        title: trimText(item?.title) || getDivinationTypeLabel(type),
        draft: {
          ...createDefaultDivinationDraft(),
          ...draft,
          type,
          question: trimText(draft?.question)
        },
        type,
        divination: item?.divination ?? null,
        interpretation: trimText(item?.interpretation) || '暂无解读内容',
        usage: item?.usage
      } as DivinationHistoryItem;
    })
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, MAX_HISTORY_SIZE);
};

export const upsertDivinationHistory = (
  current: DivinationHistoryItem[],
  next: DivinationHistoryItem
): DivinationHistoryItem[] => {
  const merged = [next, ...current.filter((item) => item.id !== next.id)];
  return normalizeDivinationHistory(merged);
};

export const requestDivination = async (draft: DivinationDraft): Promise<DivinationApiResponse> => {
  const payload = buildDivinationRequestPayload(draft);
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort(new Error(`占卜请求超时：${DIVINATION_REQUEST_TIMEOUT_MS}ms`));
  }, DIVINATION_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(DIVINATION_API_URL, {
      method: 'POST',
      headers: divinationHeaders('application/json'),
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const text = await response.text();
    let data: DivinationApiResponse;
    try {
      data = JSON.parse(text) as DivinationApiResponse;
    } catch {
      throw new Error('占卜服务返回了无法解析的数据');
    }
    if (!response.ok || !data.ok) {
      throw new Error(trimText(data?.error?.message) || `占卜请求失败（${response.status}）`);
    }
    return data;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('占卜响应较慢，请稍后重试');
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};

export const requestDivinationStream = async (
  draft: DivinationDraft,
  handlers: DivinationStreamHandlers = {}
): Promise<DivinationApiResponse> => {
  const payload = {
    ...buildDivinationRequestPayload(draft),
    stream: true
  };
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort(new Error(`占卜请求超时：${DIVINATION_REQUEST_TIMEOUT_MS}ms`));
  }, DIVINATION_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(DIVINATION_API_URL, {
      method: 'POST',
      headers: divinationHeaders('text/event-stream'),
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      const text = await response.text();
      try {
        const data = JSON.parse(text) as DivinationApiResponse;
        throw new Error(trimText(data?.error?.message) || `占卜请求失败（${response.status}）`);
      } catch {
        throw new Error(trimText(text) || `占卜请求失败（${response.status}）`);
      }
    }

    if (!response.body) {
      throw new Error('占卜服务未返回可读取的数据流');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let interpretation = '';
    let meta: DivinationStreamMeta = { type: draft.type, divination: null };
    let doneReceived = false;

    const applyEventBlock = (block: string) => {
      const events = parseSseEventBlocks(block);
      events.forEach((eventItem) => {
        if (eventItem.event === 'meta') {
          try {
            const parsed = JSON.parse(eventItem.data) as DivinationStreamMeta;
            meta = {
              ...meta,
              ...parsed
            };
            handlers.onMeta?.(meta);
          } catch {
            // 忽略异常 meta 数据
          }
          return;
        }

        if (eventItem.event === 'error') {
          try {
            const parsed = JSON.parse(eventItem.data) as { error?: { message?: string } };
            throw new Error(trimText(parsed?.error?.message) || '占卜流式解读失败');
          } catch (error: any) {
            throw new Error(error?.message || '占卜流式解读失败');
          }
        }

        if (eventItem.data === '[DONE]') {
          doneReceived = true;
          return;
        }

        try {
          const parsed = JSON.parse(eventItem.data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const chunk = parsed?.choices?.map((choice) => String(choice?.delta?.content ?? '')).join('') || '';
          if (!chunk) return;
          interpretation += chunk;
          handlers.onText?.(chunk);
        } catch {
          // 忽略无法解析的中间片段
        }
      });
    };

    while (!doneReceived) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunked = splitSseBuffer(buffer);
      buffer = chunked.rest;
      chunked.events.forEach(applyEventBlock);
    }

    if (buffer.trim()) {
      applyEventBlock(buffer);
    }

    return {
      ok: true,
      requestId: trimText(meta.requestId),
      type: (meta.type || draft.type) as DivinationType,
      divination: meta.divination ?? null,
      interpretation: interpretation || '暂无解读内容'
    };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('占卜响应较慢，请稍后重试');
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};
