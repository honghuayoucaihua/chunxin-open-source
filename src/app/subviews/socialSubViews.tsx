import React from 'react';
import { MomentsView, PostMomentView } from '../../pages/Moments';
import type { Contact, Moment, SubView, UserProfile } from '../../types';
import type { AISettings } from '../../types';

export type SocialSubView = Extract<SubView, 'moments' | 'postMoment'>;
export type SocialMomentsOwner = { id: string; name: string; avatar: string; momentsCover?: string } | Contact;

export type SocialSubViewParams = {
  subView: SocialSubView;
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  moments: Moment[];
  owner?: SocialMomentsOwner;
  isOwnerMe: boolean;
  goBackSubView: () => void;
  onAvatarClick: (id: string) => void;
  onPostEntry: () => void;
  onManualGenerateMoment: () => Promise<void>;
  onUpdateMoments: React.Dispatch<React.SetStateAction<Moment[]>>;
  onCommentCreate: (momentId: string, commentText: string, replyTo?: { user?: string }) => void;
  onSelectPostContacts: () => void;
  selectedPostContacts: string[];
  onPublishMoment: (text: string, images: string[], location: string, visibility: string, imageDescriptions?: string[], identityContactId?: string) => void;
  aiSettings: AISettings;
  contacts: Contact[];
  onRemindWhoPostPicker: () => void;
  onSelectIdentityPicker: () => void;
};

export const renderSocialSubView = (params: SocialSubViewParams) => {
  if (params.subView === 'moments') {
    return (
      <MomentsView
        user={params.user}
        setUser={params.setUser}
        moments={params.moments}
        owner={params.owner}
        isOwnerMe={params.isOwnerMe}
        onBack={params.goBackSubView}
        onAvatarClick={params.onAvatarClick}
        onPost={params.isOwnerMe ? params.onPostEntry : undefined}
        onManualGenerate={params.onManualGenerateMoment}
        onUpdateMoments={params.onUpdateMoments}
        onCommentCreate={params.onCommentCreate}
      />
    );
  }
  if (params.subView === 'postMoment') {
    return (
      <PostMomentView
        user={params.user}
        onBack={params.goBackSubView}
        onSelectContacts={params.onSelectPostContacts}
        selectedContacts={params.selectedPostContacts}
        onPost={params.onPublishMoment}
        disableImageDescription={params.aiSettings.provider !== 'builtin' && !!params.aiSettings.customModelSupportsImageRecognition}
        contacts={params.contacts}
        onRemindWhoPostPicker={params.onRemindWhoPostPicker}
        onSelectIdentityPicker={params.onSelectIdentityPicker}
      />
    );
  }
  return null;
};

export const SocialSubViewRouter: React.FC<SocialSubViewParams> = (params) => renderSocialSubView(params);
