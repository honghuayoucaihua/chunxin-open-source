import { Contact } from '../types';
import { APP_LOGO_COMPACT_SRC } from '../services/staticAssetPaths';

type ContactByIdMap = Record<string, Contact>;

export const formatChatMessageTime = (timestamp?: number): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfThatDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.floor((startOfToday - startOfThatDay) / (24 * 60 * 60 * 1000));
  const timeText = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (dayDiff === 0) return timeText;
  if (dayDiff === 1) return `昨天 ${timeText}`;
  if (dayDiff >= 2 && dayDiff <= 6) {
    const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${weekMap[date.getDay()]} ${timeText}`;
  }
  return `${date.getMonth() + 1}/${date.getDate()} ${timeText}`;
};

export const resolveChatSenderName = (
  senderId: string,
  meName: string,
  contactById: ContactByIdMap,
  fallbackContact: Contact
): string => {
  if (senderId === 'me') return meName || '我';
  const sender = contactById[senderId];
  if (sender) return sender.remark?.trim() || sender.name;
  return fallbackContact.remark?.trim() || fallbackContact.name;
};

export const resolveChatHeaderAvatar = (
  hideHeaderAvatar: boolean,
  contact: Contact,
  contactById: ContactByIdMap
): { resolvedHeaderAvatar?: string; resolvedHeaderAvatarGroup: string[] } => {
  if (hideHeaderAvatar) return { resolvedHeaderAvatar: undefined, resolvedHeaderAvatarGroup: [] };

  const rawAvatar = typeof contact.avatar === 'string' ? contact.avatar.trim() : '';
  if (!contact.isGroup) {
    return { resolvedHeaderAvatar: rawAvatar || undefined, resolvedHeaderAvatarGroup: [] };
  }

  const fromMemberIds = (ids: string[]) => ids
    .map((id) => contactById[id]?.avatar)
    .filter((v): v is string => typeof v === 'string' && !!v.trim());

  let memberAvatars: string[] = [];
  if (rawAvatar.startsWith('group:')) {
    const ids = rawAvatar.slice(6).split(',').map((id) => id.trim()).filter(Boolean);
    memberAvatars = fromMemberIds(ids);
  } else if (Array.isArray(contact.memberIds) && contact.memberIds.length > 0) {
    memberAvatars = fromMemberIds(contact.memberIds);
  }

  const groupAvatars = memberAvatars
    .filter((v): v is string => typeof v === 'string' && !!v.trim())
    .slice(0, 9);

  if (groupAvatars.length > 1) {
    return { resolvedHeaderAvatar: undefined, resolvedHeaderAvatarGroup: groupAvatars };
  }

  return {
    resolvedHeaderAvatar: groupAvatars[0] || APP_LOGO_COMPACT_SRC,
    resolvedHeaderAvatarGroup: []
  };
};

export const resolveChatHeaderTitle = (params: {
  isMultiSelecting: boolean;
  multiSelectCount: number;
  titleOverride?: string;
  contact: Contact;
  isTyping?: boolean;
}): string => {
  const { isMultiSelecting, multiSelectCount, titleOverride, contact, isTyping } = params;
  const baseName = contact.remark?.trim() || contact.name;
  const displayName = contact.isIfLine ? `${baseName} · ${String(contact.ifLineLabel || '').trim() || 'if线'}` : baseName;
  if (isMultiSelecting) return `已选择 ${multiSelectCount} 条`;
  if (titleOverride) return titleOverride;
  if (contact.isGroup) return `${displayName}（${(contact.memberIds?.length || 0) + 1}）`;
  if (isTyping) return '对方正在输入中…';
  return displayName;
};

export const resolveChatHeaderSubtitle = (params: {
  isMultiSelecting: boolean;
  chatMode?: string;
  subtitleOverride?: string;
  currentSkinId?: string;
  contact: Contact;
}): string | undefined => {
  const { isMultiSelecting, chatMode, subtitleOverride, currentSkinId, contact } = params;
  if (isMultiSelecting) return undefined;
  if (chatMode === 'story') return undefined;
  if (typeof subtitleOverride === 'string') return subtitleOverride || undefined;
  if (currentSkinId === 'y2k' || currentSkinId === 'qq') return (contact.status && contact.status.trim()) ? contact.status : '在线';
  return contact.status ? contact.status : undefined;
};
