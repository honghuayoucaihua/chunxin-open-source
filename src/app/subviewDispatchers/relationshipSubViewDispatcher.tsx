import React from 'react';
import type { SubView } from '../../types';
import { renderDiscoverListSubView } from '../subviews/discoverListSubViews';
import { renderDiscoveryActionSubView } from '../subviews/discoveryActionSubViews';
import { renderFriendSubView } from '../subviews/friendSubViews';
import { renderGroupSubView } from '../subviews/groupSubViews';
import { ProfileSubViewRouter, SocialSubViewRouter } from '../AppLazySubViews';
import type { AppSubViewRenderParams } from '../subviewRenderParams/types';
import type { DiscoverListSubView } from '../subviews/discoverListSubViews';
import type { DiscoveryActionSubView } from '../subviews/discoveryActionSubViews';
import type { FriendSubView } from '../subviews/friendSubViews';
import type { GroupSubView } from '../subviews/groupSubViews';
import type { ProfileSubView } from '../subviews/profileSubViews';
import type { SocialMomentsOwner, SocialSubView } from '../subviews/socialSubViews';
import type { Contact, UserProfile } from '../../types';

const resolveSocialMomentsOwner = (
  profileId: string | null | undefined,
  user: UserProfile,
  contacts: Contact[]
): SocialMomentsOwner | undefined => {
  if (profileId === 'me') {
    return { id: 'me', name: user.name, avatar: user.avatar, momentsCover: user.momentsCover };
  }
  return contacts.find((contact) => contact.id === profileId);
};

export const renderRelationshipSubView = (params: AppSubViewRenderParams, subView: SubView): React.ReactNode => {
  if (subView === 'moments' || subView === 'postMoment') {
    return (
      <SocialSubViewRouter
        subView={subView as SocialSubView}
        user={params.user}
        setUser={params.setUser}
        moments={params.moments}
        owner={resolveSocialMomentsOwner(params.profileId, params.user, params.contacts)}
        isOwnerMe={params.profileId === 'me'}
        goBackSubView={params.goBackSubView}
        onAvatarClick={params.handleMomentsAvatarClick}
        onPostEntry={() => params.pushSubView('postMoment')}
        onManualGenerateMoment={params.handleManualGenerateMoment}
        onUpdateMoments={params.setMoments}
        onCommentCreate={params.handleMomentCommentCreate}
        onSelectPostContacts={() => params.pushSubView('contactPicker')}
        selectedPostContacts={(window as any).selectedContacts || []}
        onPublishMoment={params.handlePublishMoment}
        aiSettings={params.aiSettings}
        contacts={params.contacts}
        onRemindWhoPostPicker={() => {
          (window as any).contactPickerPurpose = 'remindWhoPost';
          params.pushSubView('contactPicker');
        }}
        onSelectIdentityPicker={() => {
          (window as any).contactPickerPurpose = 'selectIdentity';
          params.pushSubView('contactPicker');
        }}
      />
    );
  }

  if (subView === 'search' || subView === 'anonymousHistory' || subView === 'ifLine') {
    return renderDiscoverListSubView({
      subView: subView as DiscoverListSubView,
      contacts: params.contacts,
      ifLineContacts: params.ifLineContacts,
      userAvatar: params.user.avatar,
      userName: params.user.name,
      userStatus: params.user.status,
      goBackSubView: params.goBackSubView,
      pushSubView: params.pushSubView,
      anonymousHistory: params.anonymousHistory,
      anonymousHeaderImage: params.settings.headerImage,
      aiSettings: params.aiSettings,
      showToast: params.showToast,
      onIfLineSelect: params.onIfLineSelect,
      onIfLineAction: params.onIfLineAction,
      onSearchSelect: params.handleSearchSelectContact,
      onSelectAnonymousHistory: params.handleSelectAnonymousHistory
    });
  }

  if (
    subView === 'profile'
    || subView === 'contactRemark'
    || subView === 'contactPersona'
    || subView === 'contactMemory'
    || subView === 'profileMore'
    || subView === 'editProfile'
    || subView === 'editProfileField'
  ) {
    return (
      <ProfileSubViewRouter
        subView={subView as ProfileSubView}
        goBackSubView={params.goBackSubView}
        pushSubView={params.pushSubView}
        profileId={params.profileId}
        currentProfile={params.currentProfile}
        profileSnapshot={params.profileSnapshot}
        getProfilePlaceholder={params.getProfilePlaceholder}
        user={params.user}
        setUser={params.setUser}
        masksCount={params.masks.length}
        editingProfileField={params.editingProfileField}
        contactMemories={params.contactMemories}
        onOpenProfileChat={params.handleOpenProfileChat}
        onSetProfileRemark={params.handleSetProfileRemark}
        onOpenProfileMoments={params.handleOpenProfileMoments}
        onContactPersonaUpdate={params.handleContactPersonaUpdate}
        onContactMemoriesChange={params.handleContactMemoriesChange}
        onNavigateEditProfileField={params.handleNavigateEditProfileField}
      />
    );
  }

  if (subView === 'addFriend' || subView === 'newFriends' || subView === 'contactCard') {
    return renderFriendSubView({
      subView: subView as FriendSubView,
      goBackSubView: params.goBackSubView,
      addFriendDraft: params.addFriendDraft,
      onAddFriendDraftChange: params.setAddFriendDraft,
      addFriendGreetingDraft: params.addFriendGreetingDraft,
      onAddFriendGreetingDraftChange: params.setAddFriendGreetingDraft,
      friendRequests: params.friendRequests,
      contactCardPreview: params.contactCardPreview,
      contactCardImage: params.contactCardImage,
      onResetAddFriendDraft: params.resetAddFriendDraft,
      onAIGenerateContactForm: params.handleAIGenerateContactForm,
      onCreateFriendContact: params.handleCreateFriendContact,
      onRequestIncoming: params.handleFriendRequestIncoming,
      onExportContactQr: params.handleExportContactQr,
      onAcceptFriendRequest: params.handleAcceptFriendRequest,
      onContactCardSaveResult: (ok: boolean) => params.showToast(ok ? '已触发保存，请到相册查看' : '保存失败，请重试')
    });
  }

  if (subView === 'groupChats' || subView === 'createGroup') {
    return renderGroupSubView({
      subView: subView as GroupSubView,
      goBackSubView: params.goBackSubView,
      contacts: params.contacts,
      currentUserName: params.user.name,
      onOpenGroupChat: params.handleOpenGroupChat,
      onCreateGroupConfirm: params.handleCreateGroupConfirm
    });
  }

  if (subView === 'scan' || subView === 'shake') {
    return renderDiscoveryActionSubView({
      subView: subView as DiscoveryActionSubView,
      goBackSubView: params.goBackSubView,
      contacts: params.contacts,
      user: params.user,
      aiSettings: params.aiSettings,
      onScanImage: async (file: File) => {
        const scanned = await params.parseContactFromCardImage(file);
        if (!scanned) {
          params.showToast('图片中未检测到可识别名片');
          return null;
        }
        return scanned;
      },
      onScanRequestCreated: params.handleScanRequestCreated,
      onShakeCreateContact: params.handleShakeCreateContact
    });
  }

  return null;
};
