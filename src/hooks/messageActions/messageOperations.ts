import type { Message } from '../../types/index.ts';
import { createQuotedMessageSnapshot } from '../../utils/chat/messageQuote.ts';
import type { UseMessageActionsParams } from './types.ts';
import { buildEmojiToken } from '../../chatroom/emojiToken.ts';
import { DEFAULT_EMOJI_GROUP_ID } from '../../chatroom/emojiStore.ts';
import { appendChatMessagesAndRefreshPreview, refreshConversationPreviewFromMessages } from '../../app/chatMessageFlowUtils.ts';
import { rollbackPendingPaymentEffects } from './paymentRollback.ts';

type EditableField = 'content' | 'innerVoice' | 'actionDesc' | 'narrationDesc';

type MessageEditActionData = {
  field?: unknown;
};

type SendEmojiActionData = {
  id?: unknown;
  desc?: unknown;
  groupId?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const normalizeDisplayText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'bigint') return String(value);
  return '';
};

const resolveEditableField = (value: unknown): EditableField => {
  const raw = normalizeDisplayText(value).trim();
  if (raw === 'innerVoice') return 'innerVoice';
  if (raw === 'actionDesc') return 'actionDesc';
  if (raw === 'narrationDesc') return 'narrationDesc';
  return 'content';
};

const getEditableFieldLabel = (field: EditableField) => {
  if (field === 'innerVoice') return '心声';
  if (field === 'actionDesc') return '动作';
  if (field === 'narrationDesc') return '旁白';
  return '正文';
};

const patchMessageField = (list: Message[], msgId: string, field: EditableField, value: string) =>
  list.map((item) => item.id === msgId ? { ...item, [field]: value } : item);

export const handleDelete = (
  params: Pick<UseMessageActionsParams, 'messages' | 'setMessages' | 'setContacts' | 'setWalletBalance' | 'setUser' | 'applyContactBalanceDelta'>,
  selectedContactId: string,
  targetMsg: Message | undefined
) => {
  if (!targetMsg) return;
  const nextMsgs = (params.messages[selectedContactId] || []).filter(m => m.id !== targetMsg.id);
  rollbackPendingPaymentEffects(params, selectedContactId, [targetMsg]);
  params.setMessages(prev => ({ ...prev, [selectedContactId]: (prev[selectedContactId] || []).filter(m => m.id !== targetMsg.id) }));
  refreshConversationPreviewFromMessages(params, selectedContactId, nextMsgs);
};

export const handleFavorite = (
  params: Pick<UseMessageActionsParams, 'favorites' | 'setFavorites' | 'showToast'>,
  targetMsg: Message | undefined,
  msgId: string
) => {
  if (!targetMsg) return;
  if (!params.favorites.find(f => f.id === msgId)) {
    params.setFavorites([targetMsg, ...params.favorites]);
    params.showToast('已添加至收藏');
  }
};

export const handleEdit = (
  params: Pick<UseMessageActionsParams, 'messages' | 'setMessages' | 'setContacts' | 'openPrompt' | 'showToast'>,
  selectedContactId: string,
  targetMsg: Message | undefined,
  msgId: string,
  data: MessageEditActionData | unknown
) => {
  if (!targetMsg) return;
  if (targetMsg.type !== 'text') {
    params.showToast('仅文本消息支持编辑正文/心声/动作/旁白');
    return;
  }
  const field = resolveEditableField(isRecord(data) ? data.field : undefined);
  const fieldLabel = getEditableFieldLabel(field);
  const initialValue = normalizeDisplayText(targetMsg[field]);
  params.openPrompt('编辑内容', initialValue, (value) => {
    if (value === undefined || value === null) return;
    const nextValue = normalizeDisplayText(value);
    if (!nextValue.trim()) {
      params.showToast(`${fieldLabel}至少需要 1 个字符`);
      return false;
    }
    const nextMsgs = patchMessageField(params.messages[selectedContactId] || [], msgId, field, nextValue);
    params.setMessages(prev => ({
      ...prev,
      [selectedContactId]: patchMessageField(prev[selectedContactId] || [], msgId, field, nextValue)
    }));
    refreshConversationPreviewFromMessages(params, selectedContactId, nextMsgs);
    return true;
  }, `编辑${fieldLabel}`);
};

export const handleQuote = (
  params: Pick<UseMessageActionsParams, 'setQuotedMessage'>,
  targetMsg: Message | undefined
) => {
  if (!targetMsg) return;
  params.setQuotedMessage(createQuotedMessageSnapshot(targetMsg) || null);
};

export const handleSendEmoji = (
  params: Pick<UseMessageActionsParams, 'setMessages' | 'setContacts'>,
  selectedContactId: string,
  data: SendEmojiActionData | unknown
) => {
  const emojiData = isRecord(data) ? data : {};
  const emojiId = normalizeDisplayText(emojiData.id).trim();
  const emojiDesc = normalizeDisplayText(emojiData.desc).trim();
  if (!emojiId || !emojiDesc) return;
  const emojiGroupId = normalizeDisplayText(emojiData.groupId).trim() || DEFAULT_EMOJI_GROUP_ID;
  const emojiText = buildEmojiToken({
    id: emojiId,
    groupId: emojiGroupId,
    desc: emojiDesc
  });
  const emojiMsg: Message = { id: Date.now().toString(), senderId: 'me', content: emojiText, timestamp: Date.now(), type: 'text' };
  appendChatMessagesAndRefreshPreview(params, selectedContactId, [emojiMsg]);
};
