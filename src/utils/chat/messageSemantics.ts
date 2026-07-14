import type { Message } from '../../types/message.ts';

const normalizeText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'bigint') return String(value);
  return '';
};

export const getMessageBodyText = (
  message?: Pick<Message, 'content'> | null
): string => normalizeText(message?.content);

export const getMessageMetaPreviewText = (
  message?: Pick<Message, 'innerVoice' | 'actionDesc' | 'narrationDesc'> | null,
  separator = ' · '
): string => [
  normalizeText(message?.innerVoice),
  normalizeText(message?.actionDesc),
  normalizeText(message?.narrationDesc)
].filter(Boolean).join(separator);

export const hasMessageMetaText = (
  message?: Pick<Message, 'innerVoice' | 'actionDesc' | 'narrationDesc'> | null
): boolean => !!getMessageMetaPreviewText(message);

export const isDoStyleMessage = (
  message?: Pick<Message, 'type' | 'content' | 'actionDesc'> | null
): boolean => (
  message?.type === 'text'
  && !getMessageBodyText(message)
  && !!normalizeText(message?.actionDesc)
);

export const isMetaOnlyTextMessage = (
  message?: Pick<Message, 'type' | 'content' | 'innerVoice' | 'actionDesc' | 'narrationDesc'> | null
): boolean => (
  message?.type === 'text'
  && !getMessageBodyText(message)
  && hasMessageMetaText(message)
);

export const hasMeaningfulMessageSemantics = (
  message?: Pick<
    Message,
    'type'
    | 'content'
    | 'imageCaption'
    | 'locationName'
    | 'locationAddress'
    | 'title'
    | 'desc'
    | 'amount'
    | 'innerVoice'
    | 'actionDesc'
    | 'narrationDesc'
    | 'truthDareCommand'
    | 'pat'
  > | null
): boolean => {
  if (!message || message.truthDareCommand) return false;

  const bodyText = getMessageBodyText(message);
  if (message.type === 'text') return !!bodyText || hasMessageMetaText(message);
  if (message.type === 'system') return !!bodyText || !!message.pat;
  if (message.type === 'image') return !!(bodyText || normalizeText(message.imageCaption));
  if (message.type === 'location') {
    return !!(bodyText || normalizeText(message.locationName) || normalizeText(message.locationAddress));
  }
  if (message.type === 'miniprogram') {
    return !!(bodyText || normalizeText(message.title) || normalizeText(message.desc));
  }
  if (message.type === 'transfer') return !!(bodyText || normalizeText(message.amount));
  return true;
};
