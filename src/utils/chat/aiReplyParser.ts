import type { Message } from '../../types/message.ts';
import {
  normalizeGeneratedActionText,
  normalizeGeneratedInnerVoiceText,
  normalizeGeneratedStrictNonSystemEventText,
  normalizeGeneratedTranslationText,
  normalizeGeneratedVisibleText
} from '../generatedVisibleText.ts';

export type AIQuote = { target?: string; text?: string };
export type AIOrderedSegment = { type: 'text' | 'inner' | 'action'; value: string };
export type AIDialogueTurn = { text: string; isNpc?: boolean; npcName?: string };
type ParseAIReplyOptions = { allowSocial?: boolean; requireStructured?: boolean; allowStoryTags?: boolean; acceptPlainText?: boolean };
type UnknownRecord = Record<string, unknown>;
type RawTagRecord = UnknownRecord & { type?: unknown };
export type JsonExtractionStage = 'direct';
export type ExtractedJsonObjectResult = {
  value: Record<string, any>;
  stage: JsonExtractionStage;
};

const BASE64_IMAGE_DATA_URL_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/i;
const SOCIAL_SPECIAL_TYPES = new Set(['moments', 'officialAccount']);
const SUPPORTED_SPECIAL_TYPES = new Set([
  'image',
  'imageGen',
  'redpacket',
  'transfer',
  'location',
  'moments',
  'officialAccount',
  'pat',
  'voice',
  'call',
  'narration',
  'templateData',
  'system'
]);
const isRecord = (value: unknown): value is UnknownRecord => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const isTagRecord = (value: unknown): value is RawTagRecord => isRecord(value);

const getTagType = (value: unknown): string => String(isTagRecord(value) ? value.type || '' : '').trim();

const isSupportedSpecialType = (type: string, allowSocial: boolean): boolean => {
  if (!SUPPORTED_SPECIAL_TYPES.has(type)) return false;
  if (!allowSocial && SOCIAL_SPECIAL_TYPES.has(type)) return false;
  return true;
};

const tryParseJsonRecord = (input: string): Record<string, any> | null => {
  try {
    const parsed = JSON.parse(input);
    return isRecord(parsed) ? parsed as Record<string, any> : null;
  } catch {
    return null;
  }
};

export const containsJsonObjectFragment = (input: string): boolean => {
  const source = String(input || '');
  let startIndex = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{') {
      if (depth === 0) startIndex = index;
      depth += 1;
      continue;
    }
    if (char === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0 && startIndex >= 0) {
        const candidate = source.slice(startIndex, index + 1).trim();
        if (tryParseJsonRecord(candidate)) return true;
        startIndex = -1;
      }
    }
  }

  return false;
};

const normalizeImageContent = (raw: unknown): string | null => {
  const value = String(raw || '').trim();
  if (!value) return null;
  const matchedDataUrl = value.match(BASE64_IMAGE_DATA_URL_PATTERN);
  if (matchedDataUrl) {
    const mimeType = matchedDataUrl[1];
    const base64Data = String(matchedDataUrl[2] || '').replace(/\s+/g, '');
    return base64Data ? `data:${mimeType};base64,${base64Data}` : null;
  }
  if (/^https?:\/\//i.test(value) || /^blob:/i.test(value) || value.startsWith('/')) return value;
  return null;
};

const normalizeMomentComment = (raw: unknown): { user: string; text: string; replyTo?: string } | null => {
  const source = isRecord(raw) ? raw : {};
  const user = normalizeGeneratedStrictNonSystemEventText(source.user, { collapseWhitespace: true });
  const replyTo = normalizeGeneratedStrictNonSystemEventText(source.replyTo, { collapseWhitespace: true });
  const text = normalizeGeneratedStrictNonSystemEventText(source.text, { collapseWhitespace: true });
  if (!text) return null;
  if (!user || !text) return null;
  return replyTo ? { user, text, replyTo } : { user, text };
};

export type AISpecial = Partial<Pick<Message, 'content' | 'imageCaption' | 'amount' | 'locationName' | 'locationAddress' | 'title' | 'desc' | 'thumb' | 'pat' | 'voiceId' | 'voiceSpeed' | 'voiceLanguage' | 'callDurationSec' | 'callStatus'>> & {
  type: Message['type'] | 'moments' | 'officialAccount' | 'narration' | 'imageGen' | 'templateData';
  patTarget?: string;
  truthDareCommand?: 'nextRound';
  message?: string;
  location?: string;
  imageSize?: string;
  imageOptions?: Record<string, unknown>;
  author?: string;
  authorId?: string;
  likes?: string[];
  comments?: Array<{ user: string; text: string; replyTo?: string }>;
  templateId?: string;
  vars?: Record<string, unknown>;
};

export const extractFirstJsonObjectDetailed = (raw: string): ExtractedJsonObjectResult | null => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;

  const direct = tryParseJsonRecord(trimmed);
  if (direct) return { value: direct, stage: 'direct' };

  return null;
};

export const extractFirstJsonObject = (raw: string): Record<string, any> | null =>
  extractFirstJsonObjectDetailed(raw)?.value || null;

export const extractStrictJsonObject = (raw: string): Record<string, any> | null => {
  const extracted = extractFirstJsonObjectDetailed(raw);
  return extracted?.value || null;
};

export const parseAIReply = (
  raw: string,
  allowInner: boolean = true,
  allowAction: boolean = true,
  options?: ParseAIReplyOptions
) => {
  const input = String(raw || '').trim();
  const allowSocial = options?.allowSocial !== false;
  const allowStoryTags = options?.allowStoryTags === true;
  let payload = extractStrictJsonObject(input) as UnknownRecord | null;

  if (!payload) {
    const plainReplyText = options?.acceptPlainText === true && !containsJsonObjectFragment(input)
      ? normalizeGeneratedStrictNonSystemEventText(input, { collapseWhitespace: true })
      : '';
    return {
      text: plainReplyText,
      innerVoice: undefined,
      actionDesc: undefined,
      statusUpdate: undefined,
      patDescUpdate: undefined,
      sentences: plainReplyText ? [plainReplyText] : [],
      specials: [] as AISpecial[],
      quote: null as AIQuote | null,
      translatedContentZhCN: undefined as string | undefined,
      translatedSentencesZhCN: [] as string[],
      orderedSegments: plainReplyText ? [{ type: 'text' as const, value: plainReplyText }] : [],
      dialogueTurns: [] as AIDialogueTurn[]
    };
  }
  let resolvedPayload: UnknownRecord = payload;

  let text = normalizeGeneratedStrictNonSystemEventText(resolvedPayload.text, { collapseWhitespace: true });
  if (tryParseJsonRecord(text) || containsJsonObjectFragment(text)) text = '';
  const tags = Array.isArray(resolvedPayload.tags) ? resolvedPayload.tags.filter(isTagRecord) : [];

  const pickTagValues = (type: string, keyCandidates: string[] = ['value']) =>
    tags
      .filter((item) => getTagType(item) === type)
      .map((item) => {
        for (const key of keyCandidates) {
          const value = item[key];
          if (typeof value === 'string' && value.trim()) return value;
          if (typeof value === 'number' && Number.isFinite(value)) return value;
        }
        return '';
      })
      .filter(Boolean);

  const innerFromTags = allowInner ? pickTagValues('inner').map((item) => normalizeGeneratedInnerVoiceText(item, { collapseWhitespace: true })).filter(Boolean) : [];
  const actionFromTags = allowAction ? pickTagValues('action').map((item) => normalizeGeneratedActionText(item, { collapseWhitespace: true })).filter(Boolean) : [];
  const storyInnerFromTags = allowInner && allowStoryTags ? pickTagValues('storyInner').map((item) => normalizeGeneratedInnerVoiceText(item, { collapseWhitespace: true })).filter(Boolean) : [];
  const storyStateFromTags = allowAction && allowStoryTags ? pickTagValues('storyState').map((item) => normalizeGeneratedActionText(item, { collapseWhitespace: true })).filter(Boolean) : [];
  const sentenceFromTags = pickTagValues('sentence').map((item) => normalizeGeneratedStrictNonSystemEventText(item, { collapseWhitespace: true })).filter(Boolean);

  const statusFromTags = pickTagValues('status').map((item) => normalizeGeneratedStrictNonSystemEventText(item, { collapseWhitespace: true })).filter(Boolean);
  const patDescFromTags = pickTagValues('patDesc').map((item) => normalizeGeneratedStrictNonSystemEventText(item, { collapseWhitespace: true })).filter(Boolean);

  const innerVoiceRaw = allowInner
    ? normalizeGeneratedInnerVoiceText(resolvedPayload.innerVoice, { collapseWhitespace: true })
    : '';
  const actionDescRaw = allowAction
    ? normalizeGeneratedActionText(resolvedPayload.actionDesc, { collapseWhitespace: true })
    : '';

  const dedup = (list: string[]) => list.filter((item, idx, arr) => arr.indexOf(item) === idx);
  const normalizedStoryInner = dedup(storyInnerFromTags);
  const normalizedStoryState = dedup(storyStateFromTags);

  const innerList = normalizedStoryInner.length > 0
    ? normalizedStoryInner
    : dedup([innerVoiceRaw, ...innerFromTags].filter(Boolean));
  const actionList = dedup([
    ...normalizedStoryState,
    actionDescRaw,
    ...actionFromTags
  ].filter(Boolean));

  const innerVoice = innerList.length > 0 ? innerList.join('；') : undefined;
  const actionDesc = actionList.length > 0 ? actionList.join('；') : undefined;

  const statusUpdate = normalizedStoryState.length > 0
    ? undefined
    : dedup(statusFromTags).at(-1) || undefined;
  const patDescUpdate = dedup(patDescFromTags).at(-1) || undefined;

  const bilingualPairs = Array.isArray(resolvedPayload.pairs)
    ? resolvedPayload.pairs
        .map((item) => ({
          text: normalizeGeneratedStrictNonSystemEventText((isRecord(item) ? item.text : '') ?? '', { collapseWhitespace: true }),
          translationZh: normalizeGeneratedTranslationText((isRecord(item) ? item.translationZh : '') ?? '', { collapseWhitespace: true })
        }))
        .filter((item) => Boolean(item.text))
    : [];
  if (bilingualPairs.length > 0) {
    text = bilingualPairs.map((item) => item.text).join('').trim();
  }

  let sentences = bilingualPairs.length > 0
    ? bilingualPairs.map((item) => item.text)
    : dedup([
        ...sentenceFromTags
      ]);

  if (text && bilingualPairs.length === 0) {
    const normalize = (value: string) => String(value || '').replace(/\s+/g, ' ').trim();
    const normalizedText = normalize(text);
    const hasTextInSentences = sentences.some((item) => normalize(item) === normalizedText);
    if (!hasTextInSentences) {
      sentences = [text, ...sentences];
    }
  }

  const dialogueTurns: AIDialogueTurn[] = (() => {
    const source = Array.isArray(resolvedPayload.messages) ? resolvedPayload.messages : [];
    if (!Array.isArray(source) || source.length === 0) return [];
    const turns = source
      .map((item) => {
        const sourceItem = isRecord(item) ? item : {};
        const textValue = normalizeGeneratedStrictNonSystemEventText(sourceItem.text, { collapseWhitespace: true });
        if (!textValue) return null;
        const roleRaw = String(sourceItem.role ?? '').trim().toLowerCase();
        const npcNameRaw = normalizeGeneratedStrictNonSystemEventText(sourceItem.npcName, { collapseWhitespace: true });
        const isNpc = !!(
          sourceItem.isNpc
          || roleRaw === 'npc'
        );
        return {
          text: textValue,
          isNpc: isNpc || undefined,
          npcName: isNpc ? (npcNameRaw || undefined) : undefined
        } as AIDialogueTurn;
      })
      .filter((item): item is AIDialogueTurn => Boolean(item));
    return turns;
  })();

  const translatedContentZhCN = bilingualPairs.length > 0
    ? bilingualPairs.map((item) => item.translationZh).filter(Boolean).join('').trim() || undefined
    : normalizeGeneratedTranslationText(resolvedPayload.translationZh, { collapseWhitespace: true }) || undefined;
  let translatedSentencesZhCN = bilingualPairs.length > 0
    ? bilingualPairs.map((item) => item.translationZh || '')
    : [];

  const orderedSegments: AIOrderedSegment[] = [];
  tags.forEach((item) => {
    const type = getTagType(item);
    const rawValue = item.value;
    const value = type === 'sentence'
      ? normalizeGeneratedStrictNonSystemEventText(rawValue, { collapseWhitespace: true })
      : (type === 'inner' || (allowStoryTags && type === 'storyInner'))
        ? normalizeGeneratedInnerVoiceText(rawValue, { collapseWhitespace: true })
        : (type === 'action' || (allowStoryTags && type === 'storyState'))
          ? normalizeGeneratedActionText(rawValue, { collapseWhitespace: true })
          : String(rawValue ?? '').trim();
    if (!value) return;
    if (type === 'sentence') {
      orderedSegments.push({ type: 'text', value });
      return;
    }
    if ((type === 'inner' || (allowStoryTags && type === 'storyInner')) && allowInner) {
      orderedSegments.push({ type: 'inner', value });
      return;
    }
    if ((type === 'action' || (allowStoryTags && type === 'storyState')) && allowAction) {
      orderedSegments.push({ type: 'action', value });
    }
  });
  if (text) {
    const normalize = (value: string) => String(value || '').replace(/\s+/g, ' ').trim();
    const normalizedText = normalize(text);
    const hasTextSegment = orderedSegments.some((segment) => segment.type === 'text' && normalize(segment.value) === normalizedText);
    if (!hasTextSegment) {
      orderedSegments.unshift({ type: 'text', value: text });
    }
  }

  const quoteTag = tags.find((item) => getTagType(item) === 'quote');
  const quote = quoteTag && typeof quoteTag === 'object'
    ? {
        target: normalizeGeneratedStrictNonSystemEventText(quoteTag.target, { collapseWhitespace: true }) || undefined,
        text: normalizeGeneratedStrictNonSystemEventText(quoteTag.text, { collapseWhitespace: true }) || undefined
      }
    : isRecord(resolvedPayload.quote)
      ? {
          target: normalizeGeneratedStrictNonSystemEventText(resolvedPayload.quote.target, { collapseWhitespace: true }) || undefined,
          text: normalizeGeneratedStrictNonSystemEventText(resolvedPayload.quote.text, { collapseWhitespace: true }) || undefined
        }
      : null;

  const specialsRaw = [
    ...(Array.isArray(resolvedPayload.specials) ? resolvedPayload.specials.filter(isRecord) : []),
    ...tags.filter((item) => {
      const type = getTagType(item);
      return isSupportedSpecialType(type, allowSocial);
    })
  ];

  const buildSpecialDedupKey = (item: unknown) => {
    const source = isRecord(item) ? item : {};
    const type = String(source.type || '').trim();
    switch (type) {
      case 'imageGen':
        return [type, source.prompt, source.size].map((value) => String(value || '').trim()).join('|');
      case 'image':
        return [type, source.url].map((value) => String(value || '').trim()).join('|');
      case 'redpacket':
      case 'transfer':
        return [type, source.amount, source.message].map((value) => String(value || '').trim()).join('|');
      case 'location':
        return [type, source.locationName, source.locationAddress].map((value) => String(value || '').trim()).join('|');
      case 'moments':
        return [type, source.content, source.author, source.authorId, source.location].map((value) => String(value || '').trim()).join('|');
      case 'officialAccount':
        return [type, source.title, source.desc, source.thumb].map((value) => String(value || '').trim()).join('|');
      case 'pat':
        return [type, source.targetName].map((value) => String(value || '').trim()).join('|');
      case 'system':
        return [type, source.command].map((value) => String(value || '').trim()).join('|');
      case 'voice':
        return [type, source.content, source.voiceId].map((value) => String(value || '').trim()).join('|');
      case 'call':
        return [type, source.status, source.durationSec, source.content].map((value) => String(value || '').trim()).join('|');
      case 'narration':
        return [type, source.value].map((value) => String(value || '').trim()).join('|');
      case 'templateData':
        return [type, source.templateId].map((value) => String(value || '').trim()).join('|');
      default:
        return type;
    }
  };

  const uniqueSpecialsRaw = specialsRaw.filter((item, idx, arr) => {
    const key = buildSpecialDedupKey(item);
    return arr.findIndex(candidate => buildSpecialDedupKey(candidate) === key) === idx;
  });

  const specials: AISpecial[] = uniqueSpecialsRaw.map((item): AISpecial | null => {
      const source = isRecord(item) ? item : {};
      const type = String(source.type || '').trim();
      switch (type) {
      case 'imageGen': {
        const prompt = normalizeGeneratedStrictNonSystemEventText(source.prompt, { joinWith: '\n' });
        if (!prompt) return null;
        const imageSize = String(source.size || '').trim() || undefined;
        const optionSource = isRecord(source.options) ? source.options : {};
        const imageOptions: Record<string, unknown> = { ...optionSource };
        ['quality', 'style', 'background', 'response_format', 'n', 'user', 'negativePrompt', 'numberOfImages', 'aspectRatio', 'safetyFilterLevel', 'seed', 'guidance_scale']
          .forEach((key) => {
            if (source[key] !== undefined && imageOptions[key] === undefined) {
              imageOptions[key] = source[key];
            }
          });
        return {
          type: 'imageGen',
          content: prompt,
          imageCaption: normalizeGeneratedStrictNonSystemEventText(source.caption, { collapseWhitespace: true }) || undefined,
          imageSize,
          imageOptions: Object.keys(imageOptions).length > 0 ? imageOptions : undefined
        };
      }
      case 'image': {
        const imageUrl = normalizeImageContent(source.url);
        if (!imageUrl) return null;
        return {
          type: 'image',
          content: imageUrl
        };
      }
      case 'redpacket': {
        const message = normalizeGeneratedStrictNonSystemEventText(source.message, { collapseWhitespace: true });
        return {
          type: 'redpacket',
          content: message,
          message,
          amount: String(source.amount || '')
        };
      }
      case 'transfer': {
        const message = normalizeGeneratedStrictNonSystemEventText(source.message, { collapseWhitespace: true });
        return {
          type: 'transfer',
          content: message,
          message,
          amount: String(source.amount || '')
        };
      }
      case 'location':
        return {
          type: 'location',
          content: '位置',
          locationName: normalizeGeneratedStrictNonSystemEventText(source.locationName, { collapseWhitespace: true }),
          locationAddress: normalizeGeneratedStrictNonSystemEventText(source.locationAddress, { collapseWhitespace: true })
        };
      case 'moments':
        if (!allowSocial) return null;
        return {
          type: 'moments',
          content: normalizeGeneratedStrictNonSystemEventText(source.content, { joinWith: '\n' }),
          author: normalizeGeneratedStrictNonSystemEventText(source.author, { collapseWhitespace: true }) || undefined,
          authorId: String(source.authorId || '').trim() || undefined,
          location: normalizeGeneratedStrictNonSystemEventText(source.location, { collapseWhitespace: true }) || undefined,
          likes: Array.isArray(source.likes)
            ? source.likes.map((name: unknown) => normalizeGeneratedStrictNonSystemEventText(name, { collapseWhitespace: true })).filter(Boolean)
            : undefined,
          comments: Array.isArray(source.comments)
            ? source.comments
                .map((comment) => normalizeMomentComment(comment))
                .filter((c): c is NonNullable<typeof c> => c != null)
            : undefined
        };
      case 'officialAccount':
        if (!allowSocial) return null;
        return {
          type: 'officialAccount',
          title: normalizeGeneratedStrictNonSystemEventText(source.title, { collapseWhitespace: true }),
          desc: normalizeGeneratedStrictNonSystemEventText(source.desc, { joinWith: '\n' }),
          thumb: String(source.thumb || '') || undefined
        };
      case 'pat': {
        const patTarget = normalizeGeneratedStrictNonSystemEventText(source.targetName, { collapseWhitespace: true });
        if (!patTarget) return null;
        return {
          type: 'system',
          content: '',
          patTarget
        };
      }
      case 'system': {
        const commandRaw = String(source.command || '').trim().toLowerCase();
        const truthDareCommand = commandRaw === 'next_round'
          ? 'nextRound'
          : undefined;
        if (truthDareCommand) {
          return {
            type: 'system',
            content: '',
            truthDareCommand
          };
        }
        return null;
      }
      case 'voice':
        return {
          type: 'voice',
          content: normalizeGeneratedStrictNonSystemEventText(source.content, { collapseWhitespace: true }),
          voiceId: String(source.voiceId || ''),
          voiceSpeed: Number.isFinite(Number(source.speed)) ? Number(source.speed) : undefined,
          voiceLanguage: String(source.language || '') || undefined
        };
      case 'call': {
        const statusRaw = String(source.status || '').trim();
        const callStatus = statusRaw === 'missed' || statusRaw === 'ongoing' || statusRaw === 'ended'
          ? statusRaw
          : undefined;
        return {
          type: 'call',
          content: normalizeGeneratedStrictNonSystemEventText(source.content, { collapseWhitespace: true }),
          callStatus,
          callDurationSec: Number.isFinite(Number(source.durationSec))
            ? Number(source.durationSec)
            : undefined
        };
      }
      case 'narration':
        return {
          type: 'narration',
          content: normalizeGeneratedStrictNonSystemEventText(source.value, { joinWith: '\n' })
        };
      case 'templateData': {
        const templateId = String(source.templateId || '').trim();
        if (!templateId) return null;
        const vars = isRecord(source.vars) ? source.vars : {};
        return {
          type: 'templateData',
          templateId,
          vars,
          content: ''
        };
      }
      default:
        return null;
    }
  }).filter((item): item is AISpecial => Boolean(item));

  return { text, innerVoice, actionDesc, statusUpdate, patDescUpdate, sentences, specials, quote, translatedContentZhCN, translatedSentencesZhCN, orderedSegments, dialogueTurns };
};
