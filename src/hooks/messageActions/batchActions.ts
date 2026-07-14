import { Message } from '../../types';
import { getLastDisplayMessage, getMessagePreview } from '../../utils/chatHelpers';
import { refreshConversationPreviewFromMessages } from '../../app/chatMessageFlowUtils';
import { isPaymentMessageType, resolvePaymentStatus } from '../../app/walletFlowUtils';
import { UseMessageActionsParams } from './types';
import { rollbackPendingPaymentEffects } from './paymentRollback';

const normalizeActionIds = (data: unknown): string[] => {
  if (!Array.isArray(data)) return [];
  return data.map((id) => String(id || '').trim()).filter(Boolean);
};

export const handleDeleteMultiple = (
  params: Pick<UseMessageActionsParams, 'messages' | 'setMessages' | 'setContacts' | 'setWalletBalance' | 'setUser' | 'applyContactBalanceDelta' | 'showToast'>,
  selectedContactId: string,
  data: unknown
) => {
  const idsToDelete = normalizeActionIds(data);
  if (!idsToDelete.length) return;
  const idSet = new Set(idsToDelete);
  const removedMessages = (params.messages[selectedContactId] || []).filter(m => idSet.has(m.id));
  const chatMsgs = (params.messages[selectedContactId] || []).filter(m => !idSet.has(m.id));
  rollbackPendingPaymentEffects(params, selectedContactId, removedMessages);
  params.setMessages(prev => ({ ...prev, [selectedContactId]: (prev[selectedContactId] || []).filter(m => !idSet.has(m.id)) }));
  refreshConversationPreviewFromMessages(params, selectedContactId, chatMsgs);
  params.showToast(`已删除 ${idsToDelete.length} 条消息`);
};

export const handleFavoriteMultiple = (
  params: Pick<UseMessageActionsParams, 'setFavorites' | 'showToast'>,
  currentMsgs: Message[],
  data: unknown
) => {
  const idsToFav = normalizeActionIds(data);
  if (!idsToFav.length) return;
  const msgsToFav = currentMsgs.filter(m => idsToFav.includes(m.id));
  params.setFavorites(prev => [...msgsToFav.filter(m => !prev.find(f => f.id === m.id)), ...prev]);
  params.showToast(`已添加 ${msgsToFav.length} 条消息至收藏`);
};

const cloneMessageForIfLine = (msg: Message, id: string): Message => {
  const cloned = { ...msg, id };
  if (isPaymentMessageType(msg.type)
    && resolvePaymentStatus(msg) === 'pending') {
    return {
      ...cloned,
      isOpened: false,
      paymentStatus: 'expired'
    };
  }
  return cloned;
};

export const handleIfLineMultiple = (
  params: Pick<UseMessageActionsParams, 'contacts' | 'messages' | 'setContacts' | 'setMessages' | 'setSelectedContactId' | 'pushSubView' | 'openPrompt' | 'showToast'>,
  selectedContactId: string,
  currentMsgs: Message[],
  data: unknown
) => {
  const ids = normalizeActionIds(data);
  if (ids.length === 0) return;
  const selectedIndexes = ids
    .map((id) => currentMsgs.findIndex((msg) => msg.id === id))
    .filter((index) => index >= 0);
  if (selectedIndexes.length === 0) {
    params.showToast('未找到选中消息');
    return;
  }
  const cutoffIndex = Math.max(...selectedIndexes);
  const copied = currentMsgs.slice(0, cutoffIndex + 1);
  if (copied.length === 0) return;
  const sourceContact = params.contacts.find((contact) => contact.id === selectedContactId);
  if (!sourceContact) {
    params.showToast('找不到原会话');
    return;
  }

  const now = Date.now();
  const ifLineId = `ifline-${selectedContactId}-${now}-${Math.random().toString(36).slice(2, 8)}`;
  const siblingIfLines = params.contacts.filter((contact) => contact.isIfLine && contact.sourceContactId === sourceContact.id).length;
  const defaultIfLineLabel = `分支${siblingIfLines + 1}`;
  const clonedMessages = copied
    .sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0))
    .map((msg, index) => cloneMessageForIfLine(
      msg,
      `${ifLineId}-msg-${index}-${Math.random().toString(36).slice(2, 7)}`
    ));
  const lastMsg = getLastDisplayMessage(clonedMessages);
  const sourceName = String(sourceContact.name || '会话').trim() || '会话';

  const ifLineContact = {
    ...sourceContact,
    id: ifLineId,
    name: sourceName,
    unreadCount: 0,
    isPinned: false,
    lastMessage: getMessagePreview(lastMsg),
    lastTime: lastMsg?.timestamp || now,
    lastMessagePreviewMode: 'message' as const,
    lastMessageSourceId: lastMsg?.id,
    isIfLine: true,
    sourceContactId: sourceContact.id,
    ifLineLabel: defaultIfLineLabel,
    lastProactiveChatAt: undefined,
    lastIdleChatAt: undefined
  };

  params.setMessages((prev) => ({ ...prev, [ifLineId]: clonedMessages }));
  params.setContacts((prev) => [ifLineContact, ...prev]);
  params.setSelectedContactId(ifLineId);
  params.pushSubView('ifLine');
  params.pushSubView('chat');
  params.openPrompt('if线命名', defaultIfLineLabel, (value) => {
    if (value === undefined) return;
    const trimmed = String(value || '').trim();
    if (!trimmed) return false;
    params.setContacts((prev) => prev.map((contact) => contact.id === ifLineId ? { ...contact, ifLineLabel: trimmed } : contact));
    return true;
  }, 'if线命名');
  params.showToast('正在跳转至if线');
};
