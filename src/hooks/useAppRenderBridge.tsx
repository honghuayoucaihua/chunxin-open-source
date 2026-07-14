import { useCallback, useMemo } from 'react';
import type { AppState } from './useAppState';
import type { AppActionHandlers } from './useAppActionHandlers';
import type { Contact } from '../types';
import { renderMainTab } from '../app/renderActiveTab';
import { useSubViewRenderBridge } from './useSubViewRenderBridge';

type ContactRenderHandlers = {
  handleDeleteContact: (id: string, options?: {
    confirmMessage?: string;
    confirmTitle?: string;
    successToast?: string;
  }) => void;
  handleConfirmDeleteCurrentContact: () => void;
  handleConfirmExitCurrentGroup: () => void;
  handleChatAction: (action: 'pin' | 'clear' | 'delete', id: string) => void;
  handleIfLineSelect: (id: string) => void;
  handleIfLineAction: (action: 'pin' | 'clear' | 'delete', id: string) => void;
};

type UseAppRenderBridgeParams = {
  state: AppState;
  currentChat: Contact | undefined;
  currentProfile: Contact | null | undefined;
  chatContacts: Contact[];
  ifLineContacts: Contact[];
  chatUnreadCount: number;
  ifLineUnreadCount: number;
  contactUnreadCount: number;
  getProfilePlaceholder: (id?: string | null) => Contact;
  handleHighContextLimitWarning: (contextLimit: number) => void;
  triggerProactiveChat: (contact: Contact) => Promise<void>;
  runtimeUserPromptBase: string;
  buildRuntimePromptWithMemory: (contact: Contact | undefined, limit?: number) => string;
  setIsChatInputFocused: (focused: boolean) => void;
  contactHandlers: ContactRenderHandlers;
  actionHandlers: AppActionHandlers & {
    handleStartAnonymousMatch: () => void;
    handleResumeAnonymousSession: () => void;
    handleAnonymousSend: () => void;
    handleAnonymousLeave: (reason: 'leftByMe' | 'leftByPeer') => void;
  };
};

export const useAppRenderBridge = (params: UseAppRenderBridgeParams) => {
  const {
    state: s,
    chatContacts,
    chatUnreadCount,
    ifLineUnreadCount,
    contactUnreadCount,
    triggerProactiveChat,
    contactHandlers
  } = params;

  const renderActiveTab = useCallback(() => {
    return renderMainTab({
      activeTab: s.activeTab,
      chatContacts,
      user: s.user,
      typingContactIds: s.typingContactIds,
      setActiveTab: s.setActiveTab,
      setUser: s.setUser,
      isTelegramLayout: s.isTelegramLayout,
      pushSubView: s.pushSubView,
      setSelectedContactId: s.setSelectedContactId,
      setContacts: s.setContacts,
      setShowPlusMenu: s.setShowPlusMenu,
      handleChatAction: contactHandlers.handleChatAction,
      triggerProactiveChat,
      contacts: s.contacts,
      contactUnreadCount,
      setProfileId: s.setProfileId,
      isDesktopMode: !!s.settings.enableDesktopMode
    });
  }, [chatContacts, contactHandlers.handleChatAction, contactUnreadCount, s, triggerProactiveChat]);
  const { renderSubView } = useSubViewRenderBridge(params);

  const tabBadges = useMemo(() => ({
    chats: chatUnreadCount,
    contacts: contactUnreadCount,
    discover: s.discoverUnreadCount + ifLineUnreadCount
  }), [chatUnreadCount, contactUnreadCount, s.discoverUnreadCount, ifLineUnreadCount]);

  return {
    renderActiveTab,
    renderSubView,
    tabBadges
  };
};
