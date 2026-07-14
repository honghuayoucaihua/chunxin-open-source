import React from 'react';
import { AppTab } from '../types';
import { formatChatTime } from '../utils/chatHelpers';
import type { MainTabRenderParams } from './mainTabRenderParams';
import type { Contact } from '../types';

const ChatsTab = React.lazy(() => import('../tabs/ChatsTab').then((module) => ({ default: module.ChatsTab })));
const ContactsTab = React.lazy(() => import('../tabs/ContactsTab').then((module) => ({ default: module.ContactsTab })));
const DiscoverTab = React.lazy(() => import('../tabs/DiscoverTab').then((module) => ({ default: module.DiscoverTab })));
const MeTab = React.lazy(() => import('../tabs/MeTab').then((module) => ({ default: module.MeTab })));

const MAIN_TAB_FALLBACK = <div className="flex-1 render-bg-secondary" />;

export const renderMainTab = (params: MainTabRenderParams): React.ReactNode => {
  switch (params.activeTab) {
    case AppTab.CHATS:
      return (
        <React.Suspense fallback={MAIN_TAB_FALLBACK}>
          <ChatsTab
            contacts={params.chatContacts}
            userAvatar={params.user.avatar}
            userName={params.user.name}
            userStatus={params.user.status}
            onHeaderAvatarClick={() => params.setActiveTab?.(AppTab.ME)}
            typingIds={params.typingContactIds}
            isTelegramLayout={params.isTelegramLayout}
            onOpenTeam={() => params.pushSubView('xushuoTeam')}
            onSelect={(id) => {
              if (id === 'officialAccounts') {
                params.pushSubView('officialAccountArticles');
                return;
              }
              params.setSelectedContactId(id);
              params.setContacts((prev) => prev.map((contact) => contact.id === id ? { ...contact, unreadCount: 0 } : contact));
              params.pushSubView('chat');
            }}
            onSearchTrigger={() => params.pushSubView('search')}
            onPlusClick={() => params.setShowPlusMenu(true)}
            onAction={params.handleChatAction}
            onManualGenerate={async () => {
              const aiCandidates = params.contacts.filter((contact) => contact.isAi && !contact.isGroup);
              if (aiCandidates.length === 0) return;
              const proactive = aiCandidates.filter((contact) => contact.proactiveChatEnabled);
              const pool = proactive.length > 0 ? proactive : aiCandidates;
              const target = [...pool].sort((a: Contact, b: Contact) => Number(a.lastProactiveChatAt || 0) - Number(b.lastProactiveChatAt || 0))[0];
              if (!target) return;
              await params.triggerProactiveChat(target);
            }}
            formatTime={formatChatTime}
          />
        </React.Suspense>
      );
    case AppTab.CONTACTS:
      return (
        <React.Suspense fallback={MAIN_TAB_FALLBACK}>
          <ContactsTab
            contacts={params.chatContacts}
            onSelect={(id) => { params.setProfileId(id); params.pushSubView('profile'); }}
            onSearchTrigger={() => params.pushSubView('search')}
            onAddFriend={() => params.pushSubView('addFriend')}
            onNewFriends={() => params.pushSubView('newFriends')}
            onGroupChats={() => params.pushSubView('groupChats')}
            newFriendCount={params.contactUnreadCount}
            formatTime={formatChatTime}
          />
        </React.Suspense>
      );
    case AppTab.DISCOVER:
      return (
        <React.Suspense fallback={MAIN_TAB_FALLBACK}>
          <DiscoverTab
            onMoments={() => { params.setProfileId('me'); params.pushSubView('moments'); }}
            onMiniPrograms={() => params.pushSubView('miniprograms')}
            onScan={() => params.pushSubView('scan')}
            onShake={() => params.pushSubView('shake')}
            onDivination={() => params.pushSubView('divination')}
            onListenMusic={() => params.pushSubView('listenMusic')}
            onIfLine={() => params.pushSubView('ifLine')}
            onNovelDiscover={() => params.pushSubView('novelDiscover')}
            onForum={() => params.pushSubView('forum')}
            onMailbox={() => params.pushSubView('mailbox')}
            onAnonymousChat={() => params.pushSubView('anonymousChat')}
            onCommunity={() => params.pushSubView('community')}
            isDesktopMode={params.isDesktopMode}
          />
        </React.Suspense>
      );
    case AppTab.ME:
      return (
        <React.Suspense fallback={MAIN_TAB_FALLBACK}>
          <MeTab user={params.user} setUser={params.setUser} onSub={params.pushSubView} />
        </React.Suspense>
      );
    default:
      return null;
  }
};
