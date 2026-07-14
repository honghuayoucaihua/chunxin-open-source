import type { Message, QuotedMessageSnapshot } from '../../types';
import { getMessagePreview } from './messagePreview.ts';
import { getMessageBodyText, getMessageMetaPreviewText, isMetaOnlyTextMessage } from './messageSemantics.ts';
import { resolvePaymentStatus } from '../../app/walletFlowUtils.ts';
import { normalizeGeneratedNonSystemEventText } from '../generatedVisibleText.ts';

const normalizeText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'bigint') return String(value);
  return '';
};
const normalizeQuoteVisibleText = (value: unknown): string => normalizeGeneratedNonSystemEventText(value, { collapseWhitespace: true });

const getPaymentStatusQuoteLabel = (message: Pick<Message, 'type' | 'paymentStatus' | 'isOpened'>): string => {
  const status = resolvePaymentStatus(message);
  if (status === 'received') return message.type === 'transfer' ? '已收款' : '已领取';
  if (status === 'expired') return '已失效';
  if (status === 'refunded') return '已退回';
  return message.type === 'transfer' ? '待收款' : '待领取';
};

const normalizePaymentAmountForQuote = (amount: unknown): string => {
  const text = normalizeText(amount);
  if (!text) return '';
  const parsed = Number(text);
  return Number.isFinite(parsed) ? `¥${parsed.toFixed(2)}` : `¥${text.replace(/^¥\s*/, '')}`;
};

const normalizeTransferNoteForQuote = (content: string, amountText: string): string => {
  const text = normalizeText(content);
  if (!text) return '';
  const amountPattern = amountText
    ? amountText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/^¥/, '¥?')
    : '';
  const genericTransferPattern = amountPattern
    ? new RegExp(`^(?:转账|微信转账)?\\s*${amountPattern}$`, 'i')
    : /^(?:转账|微信转账)$/i;
  return genericTransferPattern.test(text.replace(/\s+/g, ' ')) ? '' : text;
};

export const getQuotePreviewText = (message?: Message | null): string => {
  if (!message) return '';
  if (message.type === 'image') {
    const caption = normalizeQuoteVisibleText(message.imageCaption);
    return caption ? `[图片] ${caption}` : '[图片]';
  }
  if (message.type === 'redpacket') {
    const statusLabel = getPaymentStatusQuoteLabel(message);
    const amountText = normalizePaymentAmountForQuote(message.amount);
    const content = normalizeQuoteVisibleText(message.content);
    const detail = [amountText, content].filter(Boolean).join(' ');
    return detail ? `[系统红包·${statusLabel}] ${detail}` : `[系统红包·${statusLabel}]`;
  }
  if (message.type === 'transfer') {
    const statusLabel = getPaymentStatusQuoteLabel(message);
    const amountText = normalizePaymentAmountForQuote(message.amount);
    const note = normalizeTransferNoteForQuote(normalizeQuoteVisibleText(message.content), amountText);
    const detail = [amountText, note].filter(Boolean).join(' ');
    return detail ? `[系统转账·${statusLabel}] ${detail}` : `[系统转账·${statusLabel}]`;
  }
  if (message.type === 'location') {
    const name = normalizeQuoteVisibleText(message.locationName);
    const address = normalizeQuoteVisibleText(message.locationAddress);
    const detail = [name, address].filter(Boolean).join('，');
    return detail ? `[位置] ${detail}` : '[位置]';
  }
  if (isMetaOnlyTextMessage(message) && !getMessageBodyText(message)) {
    const metaPreview = getMessageMetaPreviewText(message);
    if (metaPreview) return `[${metaPreview}]`;
  }
  const preview = getMessagePreview(message);
  if (preview) return preview;
  return normalizeText(message.content) || '[消息]';
};

export const createQuotedMessageSnapshot = (message?: Message | null): QuotedMessageSnapshot | undefined => {
  if (!message) return undefined;
  const preview = getQuotePreviewText(message);
  return {
    id: message.id,
    senderId: message.senderId,
    content: preview,
    timestamp: Number.isFinite(Number(message.timestamp)) ? Number(message.timestamp) : Date.now(),
    type: 'text',
    ...(message.imageCaption ? { imageCaption: message.imageCaption } : {}),
    ...(message.isNpc ? { isNpc: true } : {}),
    ...(message.npcName ? { npcName: message.npcName } : {})
  };
};
