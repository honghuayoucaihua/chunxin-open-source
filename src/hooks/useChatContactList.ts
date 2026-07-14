import { useCallback, useMemo } from 'react';
import { BUILTIN_CONTACT_IDS } from '../constants';
import { clearContactMemories } from '../services/contactMemoryService';
import { refreshConversationPreviewFromMessages } from '../app/chatMessageFlowUtils';
import { syncContactPreviewFromMessages } from '../utils/chatHelpers';
import type { Contact, ContactMemories, Message } from '../types';

type SetState<T> = (updater: T | ((prev: T) => T)) => void;

type OpenConfirm = (
  message: string,
  onConfirm: () => void,
  title?: string
) => void;

type UseChatContactListParams = {
  contacts: Contact[];
  messages: Record<string, Message[]>;
  officialArticles: Array<{ title?: string; time?: string | number }>;
  selectedContactId: string | null;
  profileId: string | null;
  currentChat?: Contact | null;
  setContacts: SetState<Contact[]>;
  setMessages: SetState<Record<string, Message[]>>;
  setContactMemories: SetState<ContactMemories>;
  setSelectedContactId: SetState<string | null>;
  setProfileId: SetState<string | null>;
  pushSubView: (subView: 'chat') => void;
  resetNavigation: () => void;
  openConfirm: OpenConfirm;
  showToast: (message: string) => void;
};

export const useChatContactList = (params: UseChatContactListParams) => {
  const {
    contacts,
    messages,
    officialArticles,
    selectedContactId,
    profileId,
    currentChat,
    setContacts,
    setMessages,
    setContactMemories,
    setSelectedContactId,
    setProfileId,
    pushSubView,
    resetNavigation,
    openConfirm,
    showToast
  } = params;

  const handleDeleteContact = useCallback((id: string, options?: {
    confirmMessage?: string;
    confirmTitle?: string;
    successToast?: string;
  }) => {
    const target = contacts.find((contact) => contact.id === id);
    if (!target) return;
    if (BUILTIN_CONTACT_IDS.has(id)) {
      showToast('不给删');
      return;
    }
    openConfirm(
      options?.confirmMessage || (target.isGroup ? `确定删除群聊「${target.name}」吗？` : `确定删除联系人「${target.name}」吗？`),
      () => {
        setContacts((prev) => {
          const withoutTarget = prev.filter((contact) => contact.id !== id);
          return withoutTarget.map((contact) => {
            if (!contact.isGroup || !(contact.memberIds || []).includes(id)) return contact;
            const nextMemberIds = (contact.memberIds || []).filter((memberId) => memberId !== id);
            return { ...contact, memberIds: nextMemberIds, signature: `${nextMemberIds.length}位群成员` };
          });
        });
        setMessages((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setContactMemories((prev) => clearContactMemories(prev, id));
        if (selectedContactId === id) {
          setSelectedContactId(null);
          resetNavigation();
        }
        if (profileId === id) {
          setProfileId(null);
          resetNavigation();
        }
        showToast(options?.successToast || (target.isGroup ? '群聊已删除' : '联系人已删除'));
      },
      options?.confirmTitle || (target.isGroup ? '删除群聊' : '删除联系人')
    );
  }, [contacts, openConfirm, profileId, resetNavigation, selectedContactId, setContactMemories, setContacts, setMessages, setProfileId, setSelectedContactId, showToast]);

  const handleConfirmDeleteCurrentContact = useCallback(() => {
    if (!currentChat || currentChat.isGroup) return;
    handleDeleteContact(currentChat.id);
  }, [currentChat, handleDeleteContact]);

  const handleConfirmExitCurrentGroup = useCallback(() => {
    if (!currentChat || !currentChat.isGroup) return;
    handleDeleteContact(currentChat.id, {
      confirmMessage: `确定退出群聊「${currentChat.name}」吗？`,
      confirmTitle: '退出群聊',
      successToast: '已退出群聊'
    });
  }, [currentChat, handleDeleteContact]);

  const handleChatAction = useCallback((action: 'pin' | 'clear' | 'delete', id: string) => {
    const target = contacts.find((contact) => contact.id === id);
    if (!target) return;
    switch (action) {
      case 'pin':
        setContacts((prev) => prev.map((contact) => contact.id === id ? { ...contact, isPinned: !contact.isPinned } : contact));
        break;
      case 'clear':
        openConfirm(`确定清空与「${target.name}」的聊天记录吗？`, () => {
          setMessages((prev) => ({ ...prev, [id]: [] }));
          refreshConversationPreviewFromMessages({ setContacts }, id, []);
          setContactMemories((prev) => clearContactMemories(prev, id));
          showToast('聊天记录已清空');
        }, '清空聊天记录');
        break;
      case 'delete':
        handleDeleteContact(id);
        break;
    }
  }, [contacts, handleDeleteContact, openConfirm, setContactMemories, setContacts, setMessages, showToast]);

  const handleIfLineSelect = useCallback((id: string) => {
    setSelectedContactId(id);
    setContacts((prev) => prev.map((contact) => contact.id === id ? { ...contact, unreadCount: 0 } : contact));
    pushSubView('chat');
  }, [pushSubView, setContacts, setSelectedContactId]);

  const handleIfLineAction = useCallback((action: 'pin' | 'clear' | 'delete', id: string) => {
    handleChatAction(action, id);
  }, [handleChatAction]);

  const chatContacts = useMemo(() => {
    const normalContacts = contacts.filter((contact) => !contact.isIfLine);
    const withMessages = normalContacts.map((contact) => {
      const chatMessages = messages[contact.id] || [];
      return syncContactPreviewFromMessages(contact, chatMessages);
    });
    const rawOfficialTime = officialArticles[0]?.time;
    const officialTimestamp = typeof rawOfficialTime === 'number'
      ? rawOfficialTime
      : typeof rawOfficialTime === 'string'
        ? (() => {
          const parsed = new Date(rawOfficialTime).getTime();
          return Number.isFinite(parsed) ? parsed : 0;
        })()
        : 0;
    const officialEntry = {
      id: 'officialAccounts',
      name: '订阅号',
      pinyin: 'D',
      avatar: 'icon:fa-newspaper',
      unreadCount: 0,
      lastMessage: officialArticles[0]?.title || '欢迎使用叙说·春信',
      lastTime: officialTimestamp,
      isPinned: true
    } as Contact;
    return [officialEntry, ...withMessages];
  }, [contacts, messages, officialArticles]);

  const ifLineContacts = useMemo(() => {
    return contacts
      .filter((contact) => contact.isIfLine)
      .map((contact) => {
        const chatMessages = messages[contact.id] || [];
        return syncContactPreviewFromMessages(contact, chatMessages);
      });
  }, [contacts, messages]);

  return {
    handleDeleteContact,
    handleConfirmDeleteCurrentContact,
    handleConfirmExitCurrentGroup,
    handleChatAction,
    handleIfLineSelect,
    handleIfLineAction,
    chatContacts,
    ifLineContacts
  };
};
