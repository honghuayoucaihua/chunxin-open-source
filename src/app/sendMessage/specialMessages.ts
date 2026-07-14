import {
  sanitizeGeneratedArticleText,
  sanitizeGeneratedArticleTitle
} from '../../appBootstrapUtils.ts';
import type { Message } from '../../types';
import type { AISettings, Contact, Moment } from '../../types';
import type { HtmlTemplate } from '../../types/htmlTemplate';
import { renderTemplate } from '../../utils/htmlTemplate/index.ts';
import type { AISpecial } from '../../utils/chat/aiReplyParser';
import type { SendMessageFlowParams } from './types';
import { formatWalletAmount, parseWalletAmount } from '../walletFlowUtils.ts';
import { redactSensitiveText } from '../../services/httpService.ts';
import {
  normalizeGeneratedStrictNonSystemEventText,
  normalizeGeneratedVisibleText
} from '../../utils/generatedVisibleText.ts';

type SpecialMessageItem = AISpecial & {
  author?: string;
  authorId?: string;
  message?: string;
  likes?: unknown[];
  comments?: unknown[];
  imageOptions?: UnknownRecord;
};

type SpecialMessageRuntimeParams = {
  user: SendMessageFlowParams['user'];
  aiSettings: AISettings;
  htmlTemplates?: HtmlTemplate[];
  setMoments?: (updater: (prev: Moment[]) => Moment[]) => void;
  setOfficialArticles?: (updater: (prev: Array<{ id: string; title: string; desc: string; thumb: string; author: string; avatar: string; time: number }>) => Array<{ id: string; title: string; desc: string; thumb: string; author: string; avatar: string; time: number }>) => void;
};

const VOLCENGINE_IMAGE_ENDPOINT = '';
const VOLCENGINE_MIN_PIXELS = 3686400;
const VOLCENGINE_DEFAULT_SIZE = '1920x1920';
const DEFAULT_IMAGE_GENERATION_TIMEOUT_MS = 120000;

type UnknownRecord = Record<string, unknown>;
type ImageGenerationOptions = Record<string, string | number | boolean>;

const normalizeImageResponseFormat = (format: unknown): 'openai' | 'google' | 'volcengine' => {
  if (format === 'google' || format === 'volcengine') return format;
  return 'openai';
};

const isRecord = (value: unknown): value is UnknownRecord => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const isPaymentSpecialMessage = (item: AISpecial): boolean => (
  item.type === 'redpacket' || item.type === 'transfer'
);

const getConfiguredContactVoiceId = (contact: Contact): string =>
  contact.minimaxTTS?.enabled === true ? String(contact.minimaxTTS?.voiceId || '').trim() : '';

const canLandVoiceSpecial = (special: SpecialMessageItem, contact: Contact): boolean => {
  const configuredVoiceId = getConfiguredContactVoiceId(contact);
  const requestedVoiceId = String(special.voiceId || '').trim();
  return Boolean(configuredVoiceId && requestedVoiceId === configuredVoiceId);
};

const canLandSpecialMessage = (
  special: SpecialMessageItem,
  contact: Contact,
  params: SpecialMessageRuntimeParams
): boolean => {
  if (special.type === 'narration' || special.type === 'templateData') return true;
  if (special.type === 'system') {
    if (special.truthDareCommand === 'nextRound') return true;
    return Boolean(special.patTarget && contact.chatMode !== 'story');
  }
  if (contact.chatMode === 'story') return false;
  if (special.type === 'imageGen') return params.aiSettings?.enableImageGeneration === true;
  if (special.type === 'voice') return canLandVoiceSpecial(special, contact);
  if (special.type === 'moments' || special.type === 'officialAccount') return contact.allowRichActions === true;
  return true;
};

const getContactPaymentBalance = (contact: Contact): number | null => (
  Number.isFinite(Number(contact.balance))
    ? Math.max(0, Number(Number(contact.balance).toFixed(2)))
    : null
);

const exceedsContactBalance = (availableBalance: number | null, amount: number): boolean => (
  availableBalance !== null && amount > availableBalance
);

export const hasBlockedPaymentSpecialIntent = (
  specials: AISpecial[] | undefined,
  contact: Contact,
  params: SpecialMessageRuntimeParams
): boolean => {
  let remainingPaymentBalance = getContactPaymentBalance(contact);
  return (specials || []).some((item) => {
    if (!isPaymentSpecialMessage(item)) return false;
    const special = item as SpecialMessageItem;
    if (!canLandSpecialMessage(special, contact, params)) return true;
    const amount = parseWalletAmount(String(special.amount ?? ''));
    if (amount === null || exceedsContactBalance(remainingPaymentBalance, amount)) return true;
    if (remainingPaymentBalance !== null) {
      remainingPaymentBalance = Math.max(0, Number((remainingPaymentBalance - amount).toFixed(2)));
    }
    return false;
  });
};

export const hasLandableSpecialMessageIntent = (
  specials: AISpecial[] | undefined,
  contact: Contact,
  params: SpecialMessageRuntimeParams,
  selectedContactId?: string
): boolean => {
  let remainingPaymentBalance = getContactPaymentBalance(contact);
  const fromName = contact.name;
  const userName = String(params.user?.name || '').trim();

  return (specials || []).some((item) => {
    const special = item as SpecialMessageItem;
    if (!canLandSpecialMessage(special, contact, params)) return false;
    if (isPaymentSpecialMessage(item)) {
      const amount = parseWalletAmount(String(special.amount ?? ''));
      if (amount === null || exceedsContactBalance(remainingPaymentBalance, amount)) return false;
      if (remainingPaymentBalance !== null) {
        remainingPaymentBalance = Math.max(0, Number((remainingPaymentBalance - amount).toFixed(2)));
      }
      return true;
    }
    if (special.type === 'system') {
      if (special.truthDareCommand === 'nextRound') return true;
      if (!special.patTarget) return false;
      const target = String(special.patTarget || '').trim();
      const targetName = ['我', '你'].includes(target)
        ? userName
        : ['自己', '本人', '我自己', '她自己', '他自己'].includes(target)
          ? fromName
          : target;
      return Boolean(targetName && fromName !== targetName);
    }
    if (special.type === 'location') {
      return Boolean(normalizeGeneratedStrictNonSystemEventText(special.locationName, { collapseWhitespace: true })
        || normalizeGeneratedStrictNonSystemEventText(special.locationAddress, { collapseWhitespace: true }));
    }
    if (special.type === 'voice') {
      return Boolean(normalizeGeneratedStrictNonSystemEventText(special.content, { collapseWhitespace: true }));
    }
    if (special.type === 'call') {
      const callStatus = special.callStatus === 'missed' || special.callStatus === 'ongoing' || special.callStatus === 'ended'
        ? special.callStatus
        : undefined;
      const duration = Number(special.callDurationSec);
      return Boolean(callStatus || (Number.isFinite(duration) && duration >= 0));
    }
    if (special.type === 'moments') {
      return Boolean(normalizeGeneratedStrictNonSystemEventText(special.content, { joinWith: '\n' }));
    }
    if (special.type === 'officialAccount') {
      return Boolean(sanitizeGeneratedArticleTitle(normalizeGeneratedStrictNonSystemEventText(special.title, { collapseWhitespace: true }))
        && sanitizeGeneratedArticleText(normalizeGeneratedStrictNonSystemEventText(special.desc, { joinWith: '\n' })));
    }
    if (special.type === 'imageGen') {
      return Boolean(normalizeGeneratedVisibleText(special.content, { joinWith: '\n' }));
    }
    if (special.type === 'templateData') {
      const templateId = String(special.templateId || '').trim();
      const htmlTemplates = Array.isArray(params.htmlTemplates) ? params.htmlTemplates : [];
      return Boolean(templateId && htmlTemplates.some((template) => template.id === templateId && template.htmlContent));
    }
    if (special.type === 'narration') {
      return Boolean(normalizeGeneratedVisibleText(special.content, { joinWith: '\n' }));
    }
    if (special.type === 'image') {
      return Boolean(normalizeGeneratedVisibleText(special.content, { joinWith: '\n' }));
    }
    return Boolean(selectedContactId && normalizeGeneratedVisibleText(special.content, { joinWith: '\n' }));
  });
};

const normalizeSpecialLocationMessage = (
  special: SpecialMessageItem,
  selectedContactId: string,
  idx: number
): Message | null => {
  const locationName = normalizeGeneratedStrictNonSystemEventText(special.locationName, { collapseWhitespace: true });
  const locationAddress = normalizeGeneratedStrictNonSystemEventText(special.locationAddress, { collapseWhitespace: true });
  if (!locationName && !locationAddress) return null;
  return {
    id: `${Date.now()}-sp-${idx}`,
    senderId: selectedContactId,
    content: locationName || locationAddress,
    timestamp: Date.now(),
    type: 'location',
    locationName,
    locationAddress
  } as Message;
};

const normalizeSpecialVoiceMessage = (
  special: SpecialMessageItem,
  selectedContactId: string,
  idx: number
): Message | null => {
  const content = normalizeGeneratedStrictNonSystemEventText(special.content, { collapseWhitespace: true });
  if (!content) return null;
  return {
    id: `${Date.now()}-sp-${idx}`,
    senderId: selectedContactId,
    content,
    timestamp: Date.now(),
    type: 'voice',
    voiceId: special.voiceId,
    voiceSpeed: special.voiceSpeed,
    voiceLanguage: special.voiceLanguage
  } as Message;
};

const normalizeSpecialCallMessage = (
  special: SpecialMessageItem,
  selectedContactId: string,
  idx: number
): Message | null => {
  const callStatus = special.callStatus === 'missed' || special.callStatus === 'ongoing' || special.callStatus === 'ended'
    ? special.callStatus
    : undefined;
  const duration = Number(special.callDurationSec);
  const callDurationSec = Number.isFinite(duration) && duration >= 0 ? Math.floor(duration) : undefined;
  if (!callStatus && callDurationSec === undefined) return null;
  return {
    id: `${Date.now()}-sp-${idx}`,
    senderId: selectedContactId,
    content: normalizeGeneratedStrictNonSystemEventText(special.content, { collapseWhitespace: true }),
    timestamp: Date.now(),
    type: 'call',
    callDurationSec,
    callStatus
  } as Message;
};

const buildImageGenerationEndpoint = (format: 'openai' | 'google' | 'volcengine', baseUrl: string, model: string, apiKey: string) => {
  const normalizedBase = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (format === 'volcengine') {
    return normalizedBase || VOLCENGINE_IMAGE_ENDPOINT;
  }
  if (format === 'google') {
    if (!normalizedBase) throw new Error('Google 图像地址未配置');
    const endpoint = normalizedBase.includes(':generateImages')
      ? normalizedBase
      : `${normalizedBase}/v1beta/models/${encodeURIComponent(model)}:generateImages`;
    const joiner = endpoint.includes('?') ? '&' : '?';
    return `${endpoint}${joiner}key=${encodeURIComponent(apiKey)}`;
  }
  if (!normalizedBase) throw new Error('OpenAI 图像地址未配置');
  if (/\/images\/generations$/i.test(normalizedBase)) return normalizedBase;
  return `${normalizedBase}/images/generations`;
};

const extractImageUrlFromResponse = (format: 'openai' | 'google' | 'volcengine', data: unknown): string => {
  if (format === 'google') {
    const record = isRecord(data) ? data : {};
    const generatedImages = Array.isArray(record.generatedImages) ? record.generatedImages : [];
    const images = Array.isArray(record.images) ? record.images : [];
    const inlineData = generatedImages[0] && isRecord(generatedImages[0])
      ? generatedImages[0].image && isRecord(generatedImages[0].image)
        ? generatedImages[0].image.imageBytes
        : undefined
      : images[0] && isRecord(images[0])
        ? images[0].imageBytes
        : undefined;
    if (typeof inlineData === 'string' && inlineData.trim()) {
      return `data:image/png;base64,${inlineData.trim()}`;
    }
    const uri = generatedImages[0] && isRecord(generatedImages[0])
      ? generatedImages[0].image && isRecord(generatedImages[0].image)
        ? generatedImages[0].image.uri
        : undefined
      : images[0] && isRecord(images[0])
        ? images[0].uri
        : undefined;
    if (typeof uri === 'string' && uri.trim()) return uri.trim();
    throw new Error('Google 生图响应缺少可用图片数据');
  }

  const record = isRecord(data) ? data : {};
  const first = Array.isArray(record.data) ? record.data[0] : null;
  const firstRecord = isRecord(first) ? first : {};
  const url = String(firstRecord.url || '').trim();
  if (url) return url;
  const b64 = String(firstRecord.b64_json || firstRecord.base64 || '').trim();
  if (b64) return `data:image/png;base64,${b64}`;
  throw new Error('生图响应缺少可用图片数据');
};

const normalizeVolcengineSize = (rawSize?: string): string => {
  const value = String(rawSize || '').trim();
  if (!value) return VOLCENGINE_DEFAULT_SIZE;
  const matched = value.match(/^(\d{2,5})x(\d{2,5})$/i);
  if (!matched) return VOLCENGINE_DEFAULT_SIZE;

  const width = Number(matched[1]);
  const height = Number(matched[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return VOLCENGINE_DEFAULT_SIZE;
  }

  const pixels = width * height;
  if (pixels >= VOLCENGINE_MIN_PIXELS) return `${width}x${height}`;

  const scale = Math.sqrt(VOLCENGINE_MIN_PIXELS / pixels);
  const nextWidth = Math.ceil(width * scale);
  const nextHeight = Math.ceil(height * scale);
  return `${nextWidth}x${nextHeight}`;
};

const toFiniteNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const resolveImageGenerationTimeoutMs = (settings: AISettings): number => {
  const seconds = settings.enableAdvancedModelSettings ? toFiniteNumber(settings.requestTimeout) : undefined;
  if (!seconds || seconds <= 0) return DEFAULT_IMAGE_GENERATION_TIMEOUT_MS;
  return Math.min(300000, Math.max(5000, Math.round(seconds * 1000)));
};

const fetchImageGenerationWithTimeout = async (
  endpoint: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => {
    controller.abort(new Error(`生图请求超时（>${timeoutMs}ms）`));
  }, timeoutMs);
  try {
    return await fetch(endpoint, {
      ...init,
      signal: controller.signal
    });
  } finally {
    globalThis.clearTimeout(timeout);
  }
};

const normalizeOpenAIOptions = (raw: unknown): ImageGenerationOptions => {
  if (!isRecord(raw)) return {};
  const out: ImageGenerationOptions = {};
  const quality = String(raw.quality || '').trim();
  const style = String(raw.style || '').trim();
  const background = String(raw.background || '').trim();
  const responseFormat = String(raw.response_format || '').trim();
  const user = String(raw.user || '').trim();
  const n = toFiniteNumber(raw.n);
  if (quality) out.quality = quality;
  if (style) out.style = style;
  if (background) out.background = background;
  if (responseFormat) out.response_format = responseFormat;
  if (user) out.user = user;
  if (n && n > 0) out.n = Math.floor(n);
  return out;
};

const normalizeGoogleOptions = (raw: unknown): ImageGenerationOptions => {
  if (!isRecord(raw)) return {};
  const out: ImageGenerationOptions = {};
  const negativePrompt = String(raw.negativePrompt || '').trim();
  const aspectRatio = String(raw.aspectRatio || '').trim();
  const safetyFilterLevel = String(raw.safetyFilterLevel || '').trim();
  const numberOfImages = toFiniteNumber(raw.numberOfImages);
  const seed = toFiniteNumber(raw.seed);
  if (negativePrompt) out.negativePrompt = negativePrompt;
  if (aspectRatio) out.aspectRatio = aspectRatio;
  if (safetyFilterLevel) out.safetyFilterLevel = safetyFilterLevel;
  if (numberOfImages && numberOfImages > 0) out.numberOfImages = Math.floor(numberOfImages);
  if (seed && seed >= 0) out.seed = Math.floor(seed);
  return out;
};

const normalizeVolcengineOptions = (raw: unknown): ImageGenerationOptions => {
  const source = isRecord(raw) ? raw : {};
  const out: ImageGenerationOptions = { watermark: false };
  const seed = toFiniteNumber(source.seed);
  const guidanceScale = toFiniteNumber(source.guidance_scale);
  if (seed && seed >= 0) out.seed = Math.floor(seed);
  if (guidanceScale && guidanceScale > 0) out.guidance_scale = guidanceScale;
  return out;
};

const requestGeneratedImage = async (
  params: { aiSettings: AISettings },
  prompt: string,
  size?: string,
  options?: UnknownRecord
): Promise<string> => {
  const aiSettings = params.aiSettings;
  const format = normalizeImageResponseFormat(aiSettings.imageResponseFormat);
  const apiKey = String(aiSettings.imageApiKey || '').trim();
  const model = String(aiSettings.imageModel || '').trim();
  const baseUrl = String(aiSettings.imageBaseUrl || '').trim();

  if (!apiKey) throw new Error('图像 API Key 未配置');
  if (!model) throw new Error('图像模型未配置');

  const normalizedSize = format === 'volcengine'
    ? normalizeVolcengineSize(size)
    : String(size || '').trim() || undefined;

  const endpoint = buildImageGenerationEndpoint(format, baseUrl, model, apiKey);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (format !== 'google') headers.Authorization = `Bearer ${apiKey}`;

  console.info('[imageGen] request start', {
    format,
    model,
    size: normalizedSize || '(provider default)'
  });

  const response = await fetchImageGenerationWithTimeout(
    endpoint,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(
        format === 'google'
          ? {
              prompt: { text: prompt },
              sampleCount: Math.max(1, Number(normalizeGoogleOptions(options).numberOfImages || 1)),
              config: normalizeGoogleOptions(options)
            }
          : {
              model,
              prompt,
              ...(normalizedSize ? { size: normalizedSize } : {}),
              ...(format === 'volcengine' ? normalizeVolcengineOptions(options) : normalizeOpenAIOptions(options))
            }
      )
    },
    resolveImageGenerationTimeoutMs(aiSettings)
  );
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`生图请求失败(${response.status}) ${redactSensitiveText(errText)}`.trim());
  }

  const data = await response.json();
  return extractImageUrlFromResponse(format, data);
};

export async function buildSpecialMessages(
  parsed: { specials: AISpecial[] },
  contact: Contact,
  params: SpecialMessageRuntimeParams,
  selectedContactId: string
): Promise<Message[]> {
  let remainingPaymentBalance = getContactPaymentBalance(contact);
  const extraMsgs = await Promise.all(parsed.specials.map(async (item, idx) => {
    const special = item as SpecialMessageItem;
    if (!canLandSpecialMessage(special, contact, params)) return null;
    if (isPaymentSpecialMessage(item)) {
      const amount = parseWalletAmount(String(special.amount ?? ''));
      if (amount === null || exceedsContactBalance(remainingPaymentBalance, amount)) return null;
      if (remainingPaymentBalance !== null) {
        remainingPaymentBalance = Math.max(0, Number((remainingPaymentBalance - amount).toFixed(2)));
      }
      const normalizedAmount = formatWalletAmount(amount);
      const paymentType = special.type as Extract<Message['type'], 'redpacket' | 'transfer'>;
      const content = normalizeGeneratedStrictNonSystemEventText(special.message, { collapseWhitespace: true });
      return {
        id: `${Date.now()}-sp-${idx}`,
        senderId: selectedContactId,
        content,
        timestamp: Date.now(),
        type: paymentType,
        amount: normalizedAmount,
        isOpened: false,
        paymentStatus: 'pending'
      } as Message;
    }
    if (item.type === 'narration') {
      const narrationText = normalizeGeneratedVisibleText(special.content, { joinWith: '\n' });
      if (!narrationText) return null;
      const firstLine = narrationText.split(/\r?\n/)[0]?.trim() || narrationText;
      const normalized = firstLine.replace(/^\*+\s*/, '').replace(/\s*\*+$/, '').replace(/^旁白[:：]?\s*/, '').trim();
      if (!normalized) return null;
      return {
        id: `${Date.now()}-sp-${idx}`,
        senderId: selectedContactId,
        content: '',
        timestamp: Date.now(),
        type: 'text',
        narrationDesc: normalized
      } as Message;
    }
    if (item.type === 'system' && special.patTarget) {
      const fromName = contact.name;
      const resolveTarget = (target: string) => {
        if (['我', '你'].includes(target)) return params.user.name;
        if (['自己', '本人', '我自己', '她自己', '他自己'].includes(target)) return fromName;
        return target;
      };
      const targetName = resolveTarget(special.patTarget);
      const fromPatDesc = contact.patDesc?.trim() || '';
      const patText = fromPatDesc ? `「${fromPatDesc}」` : '';
      if (fromName === targetName) return null;
      return {
        id: `${Date.now()}-sp-${idx}`,
        senderId: selectedContactId,
        content: `${fromName} 拍了拍 ${targetName}${patText ? ` ${patText}` : ''}`,
        timestamp: Date.now(),
        type: 'system',
        pat: { fromId: contact.id, fromName, targetName }
      } as Message;
    }
    if (item.type === 'system' && item.truthDareCommand === 'nextRound') {
      return {
        id: `${Date.now()}-sp-${idx}`,
        senderId: 'system',
        content: '',
        timestamp: Date.now(),
        type: 'system',
        truthDareCommand: 'nextRound'
      } as Message;
    }
    if (item.type === 'moments') {
      const content = normalizeGeneratedStrictNonSystemEventText(special.content, { joinWith: '\n' });
      if (!content) return null;
      const authorHint = String(special.author || special.authorId || '').trim().toLowerCase();
      const isUserAuthor = ['me', 'self', 'user', params.user?.name?.toLowerCase()].filter(Boolean).includes(authorHint);
      const likes = Array.isArray(special.likes)
        ? special.likes
            .map((name) => normalizeGeneratedStrictNonSystemEventText(name, { collapseWhitespace: true }))
            .filter(Boolean)
            .slice(0, 8)
        : [];
      const comments = Array.isArray(special.comments)
        ? special.comments
            .map((comment, commentIndex: number) => {
              if (!comment || typeof comment !== 'object') return null;
              const record = comment as Record<string, unknown>;
              const user = normalizeGeneratedStrictNonSystemEventText(record.user, { collapseWhitespace: true });
              const text = normalizeGeneratedStrictNonSystemEventText(record.text, { collapseWhitespace: true });
              const replyTo = normalizeGeneratedStrictNonSystemEventText(record.replyTo, { collapseWhitespace: true });
              if (!user || !text) return null;
              return {
                id: `${Date.now()}-moment-comment-${idx}-${commentIndex}`,
                user,
                text,
                replyTo: replyTo || undefined
              };
            })
            .filter((c): c is NonNullable<typeof c> => c != null)
            .slice(0, 12)
        : [];
      const newMoment = {
        id: `${Date.now()}-moment-${idx}`,
        authorId: isUserAuthor ? 'me' : contact.id,
        author: isUserAuthor ? params.user.name : (contact.remark?.trim() || contact.name),
        avatar: isUserAuthor ? params.user.avatar : contact.avatar,
        content,
        images: [],
        likes,
        comments,
        location: normalizeGeneratedStrictNonSystemEventText(special.location, { collapseWhitespace: true }) || undefined,
        timestamp: Date.now()
      };
      params.setMoments?.((prev) => [newMoment, ...prev]);
      const summaryPrefix = isUserAuthor ? '【朋友圈·我发布】' : '【朋友圈·TA发布】';
      return {
        id: `${Date.now()}-sp-${idx}`,
        senderId: selectedContactId,
        content: `${summaryPrefix}${content}`,
        timestamp: Date.now(),
        type: 'text'
      } as Message;
    }
    if (item.type === 'officialAccount') {
      const title = sanitizeGeneratedArticleTitle(normalizeGeneratedStrictNonSystemEventText(special.title, { collapseWhitespace: true }));
      const desc = sanitizeGeneratedArticleText(normalizeGeneratedStrictNonSystemEventText(special.desc, { joinWith: '\n' }));
      if (!(title && desc)) return null;
      const newArticle = {
        id: `${Date.now()}-oa-${idx}`,
        title,
        desc,
        thumb: special.thumb || '',
        author: contact.remark?.trim() || contact.name,
        avatar: contact.avatar,
        time: Date.now()
      };
      params.setOfficialArticles?.((prev) => [newArticle, ...prev]);
      return {
        id: `${Date.now()}-sp-${idx}`,
        senderId: selectedContactId,
        content: `【订阅号】${title}`,
        timestamp: Date.now(),
        type: 'text'
      } as Message;
    }
    if (item.type === 'imageGen') {
      const prompt = normalizeGeneratedVisibleText(item.content, { joinWith: '\n' });
      if (!prompt) return null;
      try {
        const imageOptions = isRecord(special.imageOptions) ? special.imageOptions : undefined;
        const imageUrl = await requestGeneratedImage(params, prompt, String(special.imageSize || '').trim() || undefined, imageOptions);
        return {
          id: `${Date.now()}-sp-${idx}`,
          senderId: selectedContactId,
          content: imageUrl,
          timestamp: Date.now(),
          type: 'image'
        } as Message;
      } catch (error: unknown) {
        const reason = error instanceof Error ? String(error.message || '未知错误').trim() : '未知错误';
        console.warn('[imageGen] request failed:', redactSensitiveText(reason));
        return null;
      }
    }
    if (item.type === 'templateData') {
      const templateId = String(special.templateId || '').trim();
      const vars = (special.vars && typeof special.vars === 'object') ? special.vars as Record<string, unknown> : {};
      const htmlTemplates = Array.isArray(params.htmlTemplates) ? params.htmlTemplates : [];
      const template = htmlTemplates.find((t) => t.id === templateId) as HtmlTemplate | undefined;
      if (!template || !template.htmlContent) return null;
      try {
        const renderedHtml = renderTemplate(template.htmlContent, vars);
        return {
          id: `${Date.now()}-sp-${idx}`,
          senderId: selectedContactId,
          content: renderedHtml,
          timestamp: Date.now(),
          type: 'text',
          title: template.name
        } as Message;
      } catch {
        return null;
      }
    }
    if (item.type === 'location') return normalizeSpecialLocationMessage(special, selectedContactId, idx);
    if (item.type === 'voice') return normalizeSpecialVoiceMessage(special, selectedContactId, idx);
    if (item.type === 'call') return normalizeSpecialCallMessage(special, selectedContactId, idx);
    return {
      id: `${Date.now()}-sp-${idx}`,
      senderId: selectedContactId,
      content: normalizeGeneratedVisibleText(item.content, { joinWith: '\n' }),
      timestamp: Date.now(),
      type: special.type as Message['type'],
      amount: special.amount,
      locationName: special.locationName,
      locationAddress: special.locationAddress,
      title: special.title,
      desc: special.desc,
      thumb: special.thumb,
      pat: special.pat,
      imageCaption: special.type === 'image' ? undefined : special.imageCaption,
      voiceId: special.voiceId,
      voiceSpeed: special.voiceSpeed,
      voiceLanguage: special.voiceLanguage,
      callDurationSec: special.callDurationSec,
      callStatus: special.callStatus
    } as Message;
  }));
  return extraMsgs.filter(Boolean) as Message[];
}
