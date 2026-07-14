import React from 'react';
import type { Contact, ContactMemories, ContactMemoryEntry, SubView, UserProfile } from '../../types';
import {
  ContactMemoryView,
  ContactPersonaView,
  ContactRemarkView,
  EditProfileFieldView,
  EditProfileView,
  ProfileView
} from '../AppLazyViews';

type EditingProfileField = {
  key: keyof UserProfile;
  label: string;
  value: string;
};

export type ProfileSubView = Extract<
  SubView,
  'profile' | 'contactRemark' | 'contactPersona' | 'contactMemory' | 'profileMore' | 'editProfile' | 'editProfileField'
>;

export type ProfileSubViewParams = {
  subView: ProfileSubView;
  goBackSubView: () => void;
  pushSubView: (sub: SubView) => void;
  profileId: string | null;
  currentProfile: Contact | null;
  profileSnapshot: Contact | null;
  getProfilePlaceholder: (id?: string | null) => Contact;
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  masksCount: number;
  editingProfileField: EditingProfileField | null;
  contactMemories: ContactMemories;
  onOpenProfileChat: (contactId: string | null) => void;
  onSetProfileRemark: (contactId: string, remark: string) => void;
  onOpenProfileMoments: (nextProfileId: string) => void;
  onContactPersonaUpdate: (updated: Contact, currentProfile: Contact) => void;
  onContactMemoriesChange: (contactId: string, memories: ContactMemoryEntry[]) => void;
  onNavigateEditProfileField: (key: keyof UserProfile, label: string, value: string) => void;
};

export const renderProfileSubView = (params: ProfileSubViewParams) => {
  switch (params.subView) {
    case 'profile': {
      const profile = params.currentProfile || params.profileSnapshot || (params.profileId ? params.getProfilePlaceholder(params.profileId) : null);
      if (!profile) return null;
      return (
        <ProfileView
          contact={profile}
          onBack={params.goBackSubView}
          onSend={() => params.onOpenProfileChat(params.profileId)}
          onSetRemark={(remark) => {
            if (!params.profileId || params.profileId === 'me') return;
            params.onSetProfileRemark(params.profileId, remark);
          }}
          onMoreInfo={() => params.pushSubView('contactPersona')}
          onEditRemark={() => params.pushSubView('contactRemark')}
          onMoments={() => params.onOpenProfileMoments(params.profileId || 'me')}
        />
      );
    }
    case 'contactRemark':
      return params.currentProfile ? (
        <ContactRemarkView
          contact={params.currentProfile}
          onBack={params.goBackSubView}
          onSave={(remark) => {
            if (params.currentProfile?.id === 'me') {
              params.goBackSubView();
              return;
            }
            if (params.currentProfile) {
              params.onSetProfileRemark(params.currentProfile.id, remark);
            }
            params.goBackSubView();
          }}
        />
      ) : null;
    case 'contactPersona':
      return params.currentProfile ? (
        <ContactPersonaView
          contact={params.currentProfile}
          memories={params.contactMemories[params.currentProfile.id] || []}
          onBack={params.goBackSubView}
          onUpdate={(updated) => params.currentProfile && params.onContactPersonaUpdate(updated, params.currentProfile)}
          onUpdateMemories={(memories) => params.currentProfile && params.onContactMemoriesChange(params.currentProfile.id, memories)}
          onViewMemories={() => params.pushSubView('contactMemory')}
        />
      ) : null;
    case 'contactMemory':
      return params.currentProfile ? (
        <ContactMemoryView
          contactId={params.currentProfile.id}
          memories={params.contactMemories[params.currentProfile.id] || []}
          onBack={params.goBackSubView}
          onUpdate={(memories) => params.onContactMemoriesChange(params.currentProfile!.id, memories)}
        />
      ) : null;
    case 'profileMore':
      return (
        <EditProfileView
          user={params.user}
          setUser={params.setUser}
          onBack={params.goBackSubView}
          showPersona
          onNavigate={params.onNavigateEditProfileField}
        />
      );
    case 'editProfile':
      return (
        <EditProfileView
          user={params.user}
          setUser={params.setUser}
          onBack={params.goBackSubView}
          onMore={() => params.pushSubView('profileMore')}
          onNavigate={params.onNavigateEditProfileField}
          onMasks={() => params.pushSubView('masks')}
          masksCount={params.masksCount}
        />
      );
    case 'editProfileField':
      return params.editingProfileField ? (
        <EditProfileFieldView
          fieldKey={params.editingProfileField.key}
          fieldLabel={params.editingProfileField.label}
          initialValue={params.editingProfileField.value}
          onBack={params.goBackSubView}
          onSave={(value) => params.setUser(prev => ({ ...prev, [params.editingProfileField!.key]: value }))}
        />
      ) : null;
    default:
      return null;
  }
};

export const ProfileSubViewRouter: React.FC<ProfileSubViewParams> = (params) => renderProfileSubView(params);
