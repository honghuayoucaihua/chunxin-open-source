import type { Dispatch, SetStateAction } from 'react';
import type { AppTab, Contact, SubView, UserProfile } from '../types';

export type ChatListAction = 'pin' | 'clear' | 'delete';

export type MainTabRenderParams = {
  activeTab: AppTab;
  chatContacts: Contact[];
  user: UserProfile;
  typingContactIds: string[];
  setActiveTab?: Dispatch<SetStateAction<AppTab>>;
  setUser: Dispatch<SetStateAction<UserProfile>>;
  isTelegramLayout: boolean;
  pushSubView: (subView: SubView) => void;
  setSelectedContactId: Dispatch<SetStateAction<string | null>>;
  setContacts: Dispatch<SetStateAction<Contact[]>>;
  setShowPlusMenu: Dispatch<SetStateAction<boolean>>;
  handleChatAction: (action: ChatListAction, id: string) => void;
  triggerProactiveChat: (contact: Contact) => Promise<void>;
  contacts: Contact[];
  contactUnreadCount: number;
  setProfileId: Dispatch<SetStateAction<string | null>>;
  isDesktopMode: boolean;
};
