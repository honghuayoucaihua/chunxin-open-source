import type { Message } from '../../types/message.ts';
import {
  getMessageBodyText,
  getMessageMetaPreviewText,
  isMetaOnlyTextMessage
} from './messageSemantics.ts';

export const formatChatTime = (timestamp?: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfThatDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.floor((startOfToday - startOfThatDay) / (24 * 60 * 60 * 1000));

  if (dayDiff === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  if (dayDiff === 1) return '昨天';
  if (dayDiff >= 2 && dayDiff <= 6) {
    const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekMap[date.getDay()];
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

export const getMessagePreview = (msg?: Message) => {
  if (!msg) return '';
  const text = getMessageBodyText(msg);
  if (msg.type === 'image') {
    return '[图片]';
  }
  if (msg.type === 'voice') return '[语音]';
  if (msg.type === 'call') {
    if (msg.callStatus === 'missed') return '[未接通语音通话]';
    if (msg.callStatus === 'ended') return `[语音通话 ${Math.max(0, Math.floor(Number(msg.callDurationSec || 0)))}秒]`;
    return '[语音通话中]';
  }
  if (msg.type === 'redpacket') return '[红包]';
  if (msg.type === 'transfer') return '[转账]';
  if (msg.type === 'location') return '[位置]';
  if (msg.type === 'miniprogram') return '[小程序]';
  if (msg.type === 'truthdare') return '[真心话大冒险]';
  if (msg.truthDareCommand) return '';
  if (msg.type === 'system') return text || '系统消息';
  if (msg.type === 'text') {
    if (text) {
      const lower = text.trimStart().toLowerCase();
      if (lower.startsWith('<!doctype html') || lower.startsWith('<html')) {
        return msg.title ? `[${msg.title}]` : '[HTML]';
      }
      return text;
    }
    const metaPreview = getMessageMetaPreviewText(msg);
    return isMetaOnlyTextMessage(msg) ? `[${metaPreview}]` : '';
  }
  return text;
};

export const getLastDisplayMessage = (list: Message[]) => {
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const msg = list[i];
    if (msg.type !== 'system' || msg.content) return msg;
  }
  return list[list.length - 1];
};
