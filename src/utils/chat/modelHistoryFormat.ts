import type { Message } from '../../types';
import { getQuotePreviewText } from './messageQuote.ts';
import { resolvePaymentStatus } from '../../app/walletFlowUtils.ts';

export type ModelHistoryFormatOptions = {
  includeTimestamp?: boolean;
  includeTranslation?: boolean;
  speakerLabel?: string;
  allowedMeta?: {
    inner?: boolean;
    action?: boolean;
    narration?: boolean;
  };
};

const BEIJING_TIME_ZONE = 'Asia/Shanghai';

const normalizeText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'bigint') return String(value);
  return '';
};

const toOptionalFiniteNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const formatCallDurationMmSs = (rawSeconds: unknown): string => {
  const seconds = toOptionalFiniteNumber(rawSeconds);
  if (seconds === undefined) return '';
  const total = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

export const formatBeijingTimestampForChat = (timestamp: number): string => {
  const ms = Number(timestamp);
  if (!Number.isFinite(ms)) return '';
  try {
    const parts = new Intl.DateTimeFormat('zh-CN', {
      timeZone: BEIJING_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
      hour12: false
    }).formatToParts(new Date(ms));

    const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value || '';
    const year = pick('year');
    const month = pick('month');
    const day = pick('day');
    const hour = pick('hour');
    const minute = pick('minute');
    const second = pick('second');
    const weekday = pick('weekday');
    if (!(year && month && day && hour && minute && second)) return '';
    const dateText = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    return weekday ? `${dateText} ${weekday}` : dateText;
  } catch {
    const d = new Date(ms);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    const second = String(d.getSeconds()).padStart(2, '0');
    const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekMap[d.getDay()] || '';
    return `${year}-${month}-${day} ${hour}:${minute}:${second} ${weekday}`.trim();
  }
};

export const buildBeijingTimeAwarenessPrompt = (enabled: boolean, now: Date = new Date()): string => {
  if (!enabled) return '';
  const stamp = formatBeijingTimestampForChat(now.getTime());
  if (!stamp) return '';
  return `【当前北京时间】\n${stamp}\n请基于当前时间语境组织回复（如白天/夜晚、工作日/周末、节日与作息），但不要在每条消息里机械复述时间，也不要主动把完整日期、星期或具体时刻写进聊天正文；仅在用户明确询问时间日期，或情境确实需要时再提及。`;
};

const isUrlLike = (value: string): boolean => /^https?:\/\//i.test(value) || /^data:/i.test(value);

const getPaymentStatusHistoryLabel = (message: Pick<Message, 'type' | 'paymentStatus' | 'isOpened'>): string => {
  const status = resolvePaymentStatus(message);
  if (status === 'received') return message.type === 'transfer' ? '已收款' : '已领取';
  if (status === 'expired') return '已失效';
  if (status === 'refunded') return '已退回';
  return message.type === 'transfer' ? '待收款' : '待领取';
};

const normalizePaymentAmountText = (amount: unknown): string => {
  const text = normalizeText(amount);
  if (!text) return '';
  const parsed = Number(text);
  return Number.isFinite(parsed) ? `¥${parsed.toFixed(2)}` : `¥${text.replace(/^¥\s*/, '')}`;
};

const normalizePaymentNote = (content: string, amountText: string, type: Message['type']): string => {
  const text = normalizeText(content);
  if (!text) return '';
  if (type === 'transfer') {
    const amountPattern = amountText
      ? amountText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/^¥/, '¥?')
      : '';
    const genericTransferPattern = amountPattern
      ? new RegExp(`^(?:转账|微信转账)?\\s*${amountPattern}$`, 'i')
      : /^(?:转账|微信转账)$/i;
    if (genericTransferPattern.test(text.replace(/\s+/g, ' '))) return '';
  }
  return text;
};

export const formatMessageForModelHistory = (
  message: Message,
  options: ModelHistoryFormatOptions = {}
): { text: string; imageUrl?: string } | null => {
  const includeTimestamp = options.includeTimestamp === true;
  const includeTranslation = options.includeTranslation !== false;
  const speakerLabel = normalizeText(options.speakerLabel);

  const content = normalizeText(message.content);
  const allowedMeta = options.allowedMeta;
  const innerAllowed = allowedMeta?.inner !== false;
  const preserveUserActionDirective = message.senderId === 'me'
    && message.type === 'text'
    && !content
    && !!normalizeText(message.actionDesc);
  const actionAllowed = allowedMeta?.action !== false || preserveUserActionDirective;
  const actionLabel = preserveUserActionDirective && allowedMeta?.action === false ? '用户行为' : '动作';
  const narrationAllowed = allowedMeta?.narration !== false;
  const innerVoice = innerAllowed ? normalizeText(message.innerVoice) : '';
  const actionDesc = actionAllowed ? normalizeText(message.actionDesc) : '';
  const narrationDesc = narrationAllowed ? normalizeText(message.narrationDesc) : '';
  const translatedText = includeTranslation ? normalizeText(message.translatedContentZhCN) : '';
  const quotedMsg = message.quotedMsg;
  const quotedText = getQuotePreviewText(quotedMsg);
  const quotedSender = quotedMsg ? normalizeText(quotedMsg.npcName) : '';

  const quoteLines: string[] = [];
  if (quotedText) quoteLines.push(`【引用】${quotedSender ? `${quotedSender}：` : ''}${quotedText}`);

  const metaLines: string[] = [];
  if (innerVoice) metaLines.push(`【心声】${innerVoice}`);
  if (actionDesc) metaLines.push(`【${actionLabel}】${actionDesc}`);
  if (narrationDesc) metaLines.push(`【旁白】${narrationDesc}`);
  if (translatedText && translatedText !== content) metaLines.push(`【译文】${translatedText}`);

  const baseText = (() => {
    if (message.type === 'text') return content;

    if (message.type === 'image') {
      const desc = normalizeText(message.imageCaption);
      return desc ? `[图片] ${desc}` : '[图片]';
    }

    if (message.type === 'voice') {
      if (content && !isUrlLike(content)) return `[语音] ${content}`;
      return '[语音]';
    }

    if (message.type === 'redpacket') {
      const statusLabel = getPaymentStatusHistoryLabel(message);
      const amountText = normalizePaymentAmountText(message.amount);
      const note = normalizePaymentNote(content, amountText, message.type);
      const detail = [amountText, note].filter(Boolean).join(' ');
      return detail ? `[系统红包·${statusLabel}] ${detail}` : `[系统红包·${statusLabel}]`;
    }

    if (message.type === 'transfer') {
      const statusLabel = getPaymentStatusHistoryLabel(message);
      const amountText = normalizePaymentAmountText(message.amount);
      const note = normalizePaymentNote(content, amountText, message.type);
      const detail = [amountText, note].filter(Boolean).join(' ');
      return detail ? `[系统转账·${statusLabel}] ${detail}` : `[系统转账·${statusLabel}]`;
    }

    if (message.type === 'location') {
      const name = normalizeText(message.locationName);
      const address = normalizeText(message.locationAddress);
      const detail = [name, address].filter(Boolean).join('，');
      return detail ? `[位置] ${detail}` : '[位置]';
    }

    if (message.type === 'miniprogram') {
      const title = normalizeText(message.title);
      const desc = normalizeText(message.desc);
      const detail = [title, desc].filter(Boolean).join('：');
      return detail ? `[小程序] ${detail}` : '[小程序]';
    }

    if (message.type === 'truthdare') {
      const themeName = normalizeText(message.truthDareThemeName);
      return themeName ? `[真心话大冒险] ${themeName}` : '[真心话大冒险]';
    }

    if (message.type === 'call') {
      const durationText = formatCallDurationMmSs(message.callDurationSec);
      const status = normalizeText(message.callStatus);
      const statusText = status === 'missed'
        ? '未接通'
        : status === 'ongoing'
          ? '通话中'
          : status === 'ended'
            ? (durationText ? `通话 ${durationText}` : '通话结束')
            : (durationText ? `通话 ${durationText}` : '通话');
      const extra = content ? ` · ${content}` : '';
      return `【通话】${statusText}${extra}`;
    }

    if (message.type === 'system') {
      if (message.truthDareCommand) return '';
      if (content) return `【系统】${content}`;
      if (message.pat) return `【系统】${message.pat.fromName} 拍了拍 ${message.pat.targetName}`;
      return '';
    }

    return content;
  })();

  const lines = [...quoteLines, baseText, ...metaLines].map((line) => normalizeText(line)).filter(Boolean);
  if (lines.length === 0) return null;

  let prefix = '';
  if (includeTimestamp) {
    const stamp = formatBeijingTimestampForChat(message.timestamp);
    if (stamp) prefix += `[${stamp}] `;
  }
  if (speakerLabel) prefix += `${speakerLabel}：`;
  if (prefix) {
    lines[0] = `${prefix}${lines[0]}`;
  }

  const imageUrl = message.type === 'image' ? (content || undefined) : undefined;
  return { text: lines.join('\n'), ...(imageUrl ? { imageUrl } : {}) };
};
