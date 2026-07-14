import type { Message } from '../../types';

const BASE64_IMAGE_DATA_URL_GLOBAL_PATTERN = /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi;

const normalizeDisplayText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'bigint') return String(value);
  return '';
};

const splitTextDraftByImageDataUrl = (content: unknown): Array<{ type: 'text' | 'image'; content: string }> => {
  const normalized = normalizeDisplayText(content);
  const chunks: Array<{ type: 'text' | 'image'; content: string }> = [];
  let lastIndex = 0;
  BASE64_IMAGE_DATA_URL_GLOBAL_PATTERN.lastIndex = 0;
  let matched: RegExpExecArray | null;
  while ((matched = BASE64_IMAGE_DATA_URL_GLOBAL_PATTERN.exec(normalized)) !== null) {
    const before = normalized.slice(lastIndex, matched.index).replace(/\s{2,}/g, ' ').trim();
    if (before) chunks.push({ type: 'text', content: before });
    chunks.push({ type: 'image', content: matched[0] });
    lastIndex = matched.index + matched[0].length;
  }
  const tail = normalized.slice(lastIndex).replace(/\s{2,}/g, ' ').trim();
  if (tail) chunks.push({ type: 'text', content: tail });
  return chunks.length > 0 ? chunks : [{ type: 'text', content: normalized.trim() }];
};

export const splitReplyToMessages = (senderId: string, rawText: unknown, quotedMsg?: Message) => {
  const content = normalizeDisplayText(rawText);
  const regex = /\[emoji:([^\]]+)\]/gi;
  const drafts: Array<{ type: 'text' | 'image'; content: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const before = content.slice(lastIndex, match.index).replace(/\s{2,}/g, ' ').trim();
    if (before) drafts.push({ type: 'text', content: before });
    const token = match[0].trim();
    if (token) drafts.push({ type: 'text', content: token });
    lastIndex = match.index + match[0].length;
  }

  const tail = content.slice(lastIndex).replace(/\s{2,}/g, ' ').trim();
  if (tail) drafts.push({ type: 'text', content: tail });

  const expandedDrafts: Array<{ type: 'text' | 'image'; content: string }> = [];
  drafts.forEach((item) => {
    if (item.type === 'image') {
      expandedDrafts.push(item);
      return;
    }
    splitTextDraftByImageDataUrl(item.content).forEach((chunk) => {
      if (chunk.content) expandedDrafts.push(chunk);
    });
  });

  if (drafts.length === 0) {
    const fallback = content.trim();
    if (!fallback) return [] as Message[];
    splitTextDraftByImageDataUrl(fallback).forEach((chunk) => {
      if (chunk.content) expandedDrafts.push(chunk);
    });
  }

  const finalDrafts = expandedDrafts.length > 0 ? expandedDrafts : drafts;
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return finalDrafts.map((item, idx) => ({
    id: `${seed}-${senderId}-${idx}`,
    senderId,
    content: item.content,
    timestamp: Date.now() + idx,
    type: item.type,
    quotedMsg: idx === 0 ? quotedMsg : undefined
  } as Message));
};
