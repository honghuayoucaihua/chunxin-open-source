import React from 'react';
import type { AppearanceSettings, EmojiGroup, EmojiItem, Message } from '../types';
import { collectResolvedEmojiTokens, stripResolvedEmojiTokens } from './emojiTokenResolver';
import { resolveEmojiTokenValue } from './emojiToken';

type EmojiLike = {
  id: string;
  url: string;
  desc: string;
  groupId?: string;
};

const EMOJI_TOKEN_REGEX = /\[emoji:([^\]]+)\]/gi;
const EMOJI_ONLY_REGEX = /^\[emoji:([^\]]+)\]$/i;

const normalizeDuration = (durationSec?: number): number | undefined => {
  const parsed = Number(durationSec);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const isSpecialMessageType = (type: string): boolean =>
  type === 'redpacket' || type === 'transfer' || type === 'location' || type === 'miniprogram' || type === 'image';

export const buildCallMessage = (
  senderId: string,
  status: 'missed' | 'ongoing' | 'ended',
  content: string,
  durationSec?: number
): Message => ({
  id: `call-${Date.now()}`,
  senderId,
  content,
  timestamp: Date.now(),
  type: 'call',
  callStatus: status,
  callDurationSec: normalizeDuration(durationSec)
});

export const getBubbleStyleBySettings = (
  settings: AppearanceSettings & { chatBg?: string; headerImage?: string; footerImage?: string },
  isMe: boolean,
  type: string
): React.CSSProperties => {
  if (isSpecialMessageType(type)) return {};
  // When bubble workshop is active, skip inline styles so CSS class selectors take effect
  if (document.documentElement.hasAttribute('data-bubble-workshop')) return {};
  const style: React.CSSProperties = {
    backgroundColor: isMe ? 'var(--bubble-me)' : 'var(--bubble-other)',
    color: isMe ? 'var(--bubble-text-me)' : 'var(--bubble-text-other)'
  };
  if (settings.bubblePadding !== undefined) {
    style.padding = `${settings.bubblePadding}px`;
  }
  if (settings.bubbleBorderWidth !== undefined && settings.bubbleBorderWidth > 0) {
    style.borderWidth = `${settings.bubbleBorderWidth}px`;
    style.borderStyle = 'solid';
    style.borderColor = isMe ? (settings.bubbleBorderColorMe || '#ccc') : (settings.bubbleBorderColorOther || '#ccc');
  }
  if (settings.bubbleOpacity !== undefined) {
    style.opacity = settings.bubbleOpacity;
  }
  if (settings.bubbleBlur !== undefined && settings.bubbleBlur > 0) {
    const blurValue = `blur(${settings.bubbleBlur}px) saturate(115%)`;
    style.backdropFilter = blurValue;
    (style as React.CSSProperties & { WebkitBackdropFilter?: string }).WebkitBackdropFilter = blurValue;
  }
  if (settings.bubbleShadow) {
    style.boxShadow = settings.bubbleShadow;
  }
  return style;
};

export const renderTextWithEmojiToken = (
  content: string,
  fallbackSrc: string,
  resolveEmoji: (desc: string) => EmojiLike | null
): React.ReactNode => {
  if (!content) return content;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = EMOJI_TOKEN_REGEX.exec(content)) !== null) {
    const before = content.slice(lastIndex, match.index);
    if (before) parts.push(before);
    const desc = match[1] || '';
    const emoji = resolveEmoji(desc);
    if (emoji) {
      parts.push(
        <img
          key={`${emoji.id}-${match.index}`}
          src={emoji.url}
          alt={emoji.desc}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            const img = event.currentTarget;
            if (img.dataset.fallbackApplied === '1') return;
            img.dataset.fallbackApplied = '1';
            img.src = fallbackSrc;
          }}
          className="inline-block align-middle max-w-[100px] max-h-[100px]"
        />
      );
    } else {
      parts.push(match[0]);
    }
    lastIndex = match.index + match[0].length;
  }
  const tail = content.slice(lastIndex);
  if (tail) parts.push(tail);
  return parts.length > 0 ? parts : content;
};

export const getEmojiOnlyToken = (
  content: string,
  resolveEmoji: (desc: string) => EmojiLike | null
): EmojiLike | null => {
  const match = content.trim().match(EMOJI_ONLY_REGEX);
  if (!match) return null;
  return resolveEmoji(match[1] || '');
};

export { collectResolvedEmojiTokens, stripResolvedEmojiTokens };
