import { useEffect, useMemo } from 'react';
import { AppTab } from '../types';
import type {
  Contact,
  FriendRequest,
  SubView,
  UserProfile
} from '../types';

type SetState<T> = (updater: T | ((prev: T) => T)) => void;

type MomentsUnreadWindow = Window & {
  __prevMomentsLen?: number;
};

const getMomentsUnreadWindow = (): MomentsUnreadWindow | null =>
  typeof window === 'undefined' ? null : window as MomentsUnreadWindow;

type UseAppViewStateSyncParams = {
  activeSubView: SubView;
  selectedContactId: string | null;
  contacts: Contact[];
  setContacts: SetState<Contact[]>;
  setIsChatInputFocused: SetState<boolean>;
  profileId: string | null;
  user: UserProfile;
  setProfileSnapshot: SetState<Contact | null>;
  friendRequests: FriendRequest[];
  momentsLength: number;
  activeTab: AppTab;
  isStateLoaded: boolean;
  setDiscoverUnreadCount: SetState<number>;
  isTelegramLayout: boolean;
  setActiveTab: SetState<AppTab>;
  setProfileId: SetState<string | null>;
};

export const useAppViewStateSync = (params: UseAppViewStateSyncParams) => {
  const {
    activeSubView,
    selectedContactId,
    contacts,
    setContacts,
    setIsChatInputFocused,
    profileId,
    user,
    setProfileSnapshot,
    friendRequests,
    momentsLength,
    activeTab,
    isStateLoaded,
    setDiscoverUnreadCount,
    isTelegramLayout,
    setActiveTab,
    setProfileId
  } = params;

  const isInChatView = activeSubView === 'chat' && !!selectedContactId;

  useEffect(() => {
    if (activeSubView !== 'chat' || !selectedContactId) return;
    const activeContactId = selectedContactId;
    setContacts((prev) => {
      let changed = false;
      const next = prev.map((contact) => {
        if (contact.id !== activeContactId) return contact;
        if (Number(contact.unreadCount || 0) <= 0) return contact;
        changed = true;
        return { ...contact, unreadCount: 0 };
      });
      return changed ? next : prev;
    });
  }, [activeSubView, selectedContactId, setContacts]);

  useEffect(() => {
    if (!isInChatView) {
      setIsChatInputFocused(false);
    }
  }, [isInChatView, setIsChatInputFocused]);

  useEffect(() => {
    if (!profileId) return;
    if (profileId === 'me') {
      setProfileSnapshot({
        id: 'me',
        name: user.name,
        avatar: user.avatar,
        wechatId: user.wechatId,
        signature: user.signature,
        region: user.region
      } as Contact);
      return;
    }
    const found = contacts.find((contact) => contact.id === profileId);
    if (found) setProfileSnapshot(found);
  }, [profileId, contacts, user, setProfileSnapshot]);

  const chatUnreadCount = useMemo(() => {
    return contacts.reduce((sum, contact) => {
      if (contact.isIfLine) return sum;
      return sum + Math.max(0, Number(contact.unreadCount || 0));
    }, 0);
  }, [contacts]);

  const ifLineUnreadCount = useMemo(() => {
    return contacts.reduce((sum, contact) => {
      if (!contact.isIfLine) return sum;
      return sum + Math.max(0, Number(contact.unreadCount || 0));
    }, 0);
  }, [contacts]);

  const contactUnreadCount = useMemo(() => {
    return friendRequests.filter((item) => item.status === 'pending').length;
  }, [friendRequests]);

  useEffect(() => {
    const currentLen = momentsLength;
    const runtimeWindow = getMomentsUnreadWindow();
    const prevLen = Number(runtimeWindow?.__prevMomentsLen || currentLen);
    const isViewingMoments = activeTab === AppTab.DISCOVER || activeSubView === 'moments';
    if (isStateLoaded && currentLen > prevLen && !isViewingMoments) {
      setDiscoverUnreadCount((prev) => prev + (currentLen - prevLen));
    }
    if (runtimeWindow) runtimeWindow.__prevMomentsLen = currentLen;
  }, [momentsLength, activeTab, activeSubView, isStateLoaded, setDiscoverUnreadCount]);

  useEffect(() => {
    if (activeTab === AppTab.DISCOVER || activeSubView === 'moments') {
      setDiscoverUnreadCount(0);
    }
  }, [activeTab, activeSubView, setDiscoverUnreadCount]);

  useEffect(() => {
    if (!isTelegramLayout) return;
    if (activeSubView !== 'none') return;
    if (activeTab === AppTab.DISCOVER || activeTab === AppTab.ME) {
      setActiveTab(AppTab.CHATS);
    }
  }, [isTelegramLayout, activeTab, activeSubView, setActiveTab]);

  useEffect(() => {
    if (!isTelegramLayout) return;
    if (activeSubView === 'moments' && !profileId) {
      setProfileId('me');
    }
  }, [isTelegramLayout, activeSubView, profileId, setProfileId]);

  return {
    isInChatView,
    chatUnreadCount,
    ifLineUnreadCount,
    contactUnreadCount
  };
};
