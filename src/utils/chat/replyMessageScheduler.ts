import type { Message } from '../../types';
import { getMessageBodyText, getMessageMetaPreviewText } from './messageSemantics.ts';

type ShouldRun = () => boolean;

type SequentialReplyScheduleOptions<T> = {
  getDelayMs: (item: T, index: number) => number;
  run: (item: T, index: number) => void;
  shouldRun?: ShouldRun;
  onSkipped?: (item: T, index: number) => void;
};

const normalizeDelayMs = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
};

const normalizeText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'bigint') return String(value);
  return '';
};

export const scheduleSequentialReplyItems = <T>(
  items: T[],
  options: SequentialReplyScheduleOptions<T>
): number => {
  let totalDelay = 0;
  items.forEach((item, index) => {
    totalDelay += normalizeDelayMs(options.getDelayMs(item, index));
    setTimeout(() => {
      if (options.shouldRun && !options.shouldRun()) {
        options.onSkipped?.(item, index);
        return;
      }
      options.run(item, index);
    }, totalDelay);
  });
  return totalDelay;
};

export const scheduleReplyFollowup = (
  delayMs: number,
  run: () => void,
  shouldRun?: ShouldRun,
  onSkipped?: () => void
): number => {
  const normalizedDelay = normalizeDelayMs(delayMs);
  if (normalizedDelay === 0) {
    if (shouldRun && !shouldRun()) {
      onSkipped?.();
      return 0;
    }
    run();
    return 0;
  }
  setTimeout(() => {
    if (shouldRun && !shouldRun()) {
      onSkipped?.();
      return;
    }
    run();
  }, normalizedDelay);
  return normalizedDelay;
};

export const getGroupReplyPreviewText = (
  message: Pick<Message, 'type' | 'content' | 'innerVoice' | 'actionDesc' | 'narrationDesc' | 'callStatus' | 'callDurationSec'>
): string => {
  if (message.type === 'image') return '[图片]';
  if (message.type === 'redpacket') return '[红包]';
  if (message.type === 'transfer') return '[转账]';
  if (message.type === 'location') return '[位置]';
  if (message.type === 'voice') return '[语音]';
  if (message.type === 'call') {
    if (message.callStatus === 'missed') return '[未接通语音通话]';
    if (message.callStatus === 'ended') return `[语音通话 ${Math.max(0, Math.floor(Number(message.callDurationSec || 0)))}秒]`;
    return '[语音通话中]';
  }
  if (message.type === 'system') return getMessageBodyText(message) || '[系统消息]';
  const text = getMessageBodyText(message);
  if (text) return text;
  return getMessageMetaPreviewText(message);
};

export const getGroupReplyMemoryText = (
  message: Pick<
    Message,
    'type'
    | 'content'
    | 'innerVoice'
    | 'actionDesc'
    | 'narrationDesc'
    | 'translatedContentZhCN'
    | 'locationName'
    | 'locationAddress'
    | 'callStatus'
    | 'callDurationSec'
  >
): string => {
  if (message.type === 'system' || message.type === 'redpacket' || message.type === 'transfer') return '';
  if (message.type === 'image') return '[图片]';
  if (message.type === 'location') {
    const locationText = [
      normalizeText(message.locationName) || normalizeText(message.content),
      normalizeText(message.locationAddress)
    ].filter(Boolean).join('，');
    return locationText ? `位置：${locationText}` : '';
  }
  if (message.type === 'voice') {
    const voiceText = getMessageBodyText(message);
    return voiceText ? `语音：${voiceText}` : '[语音]';
  }
  if (message.type === 'call') {
    const seconds = Math.max(0, Math.floor(Number(message.callDurationSec || 0)));
    const status = message.callStatus === 'missed'
      ? '未接通'
      : message.callStatus === 'ended'
        ? (seconds > 0 ? `通话 ${seconds}秒` : '通话结束')
        : message.callStatus === 'ongoing'
          ? '通话中'
          : '通话';
    const callText = getMessageBodyText(message);
    return callText ? `通话：${status} · ${callText}` : `通话：${status}`;
  }
  const content = getMessageBodyText(message);
  const innerVoice = normalizeText(message.innerVoice);
  const actionDesc = normalizeText(message.actionDesc);
  const narrationDesc = normalizeText(message.narrationDesc);
  const translatedText = normalizeText(message.translatedContentZhCN);
  return [
    content,
    innerVoice ? `心声：${innerVoice}` : '',
    actionDesc ? `动作：${actionDesc}` : '',
    narrationDesc ? `旁白：${narrationDesc}` : '',
    translatedText && translatedText !== content ? `译文：${translatedText}` : ''
  ].filter(Boolean).join(' · ');
};
