import type { Message } from '../../types/message.ts';
import { getMessageBodyText, getMessageMetaPreviewText } from './messageSemantics.ts';

export type AppendedMessageMemoryRecord = { text: string; source: 'user' | 'model' };

const normalizeText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'bigint') return String(value);
  return '';
};

const getMessageMetaMemoryParts = (message: Message, source: 'user' | 'model'): string[] => {
  const innerVoice = normalizeText(message.innerVoice);
  const actionDesc = normalizeText(message.actionDesc);
  const narrationDesc = normalizeText(message.narrationDesc);

  if (source === 'user') {
    return [
      innerVoice ? `用户心声：${innerVoice}` : '',
      actionDesc ? `用户行为：${actionDesc}` : '',
      narrationDesc ? `用户旁白：${narrationDesc}` : ''
    ].filter(Boolean);
  }

  return [
    innerVoice ? `心声：${innerVoice}` : '',
    actionDesc ? `动作：${actionDesc}` : '',
    narrationDesc ? `旁白：${narrationDesc}` : ''
  ].filter(Boolean);
};

export const getAppendedMessageMemoryRecord = (message: Message): AppendedMessageMemoryRecord | null => {
  if (!message || message.senderId === 'system' || message.truthDareCommand) return null;
  if (message.type === 'system' || message.type === 'redpacket' || message.type === 'transfer') return null;

  const source: 'user' | 'model' = message.senderId === 'me' ? 'user' : 'model';
  const bodyText = getMessageBodyText(message);
  const metaText = getMessageMetaMemoryParts(message, source).join(' · ') || getMessageMetaPreviewText(message);
  const translatedText = normalizeText(message.translatedContentZhCN);
  const parts: string[] = [];

  if (message.type === 'text') {
    if (bodyText) parts.push(bodyText);
    if (metaText) parts.push(metaText);
    if (translatedText && translatedText !== bodyText) parts.push(`译文：${translatedText}`);
  } else if (message.type === 'truthdare' || message.type === 'call') {
    if (bodyText) parts.push(bodyText);
  } else if (message.type === 'image') {
    const caption = normalizeText(message.imageCaption);
    if (caption) parts.push(`图片：${caption}`);
  } else if (message.type === 'location') {
    const locationText = [
      normalizeText(message.locationName),
      normalizeText(message.locationAddress)
    ].filter(Boolean).join('，');
    if (locationText) parts.push(`位置：${locationText}`);
  } else if (message.type === 'miniprogram') {
    const miniProgramText = [
      normalizeText(message.title),
      normalizeText(message.desc)
    ].filter(Boolean).join('，');
    if (miniProgramText) parts.push(`小程序：${miniProgramText}`);
  }

  const text = parts.filter(Boolean).join(' · ').trim();
  return text ? { text, source } : null;
};
