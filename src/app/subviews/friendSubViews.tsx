import React from 'react';
import type { Contact, FriendRequest, SubView } from '../../types';
import type { ContactFormData } from '../../utils/UtilsSubPages';
import { AddFriendView, ContactCardView, NewFriendsView } from '../lazyViews/friendLazyViews';

export type FriendSubView = Extract<SubView, 'addFriend' | 'newFriends' | 'contactCard'>;

type FriendSubViewParams = {
  subView: FriendSubView;
  goBackSubView: () => void;
  addFriendDraft: Partial<ContactFormData>;
  onAddFriendDraftChange: React.Dispatch<React.SetStateAction<Partial<ContactFormData>>>;
  addFriendGreetingDraft: string;
  onAddFriendGreetingDraftChange: React.Dispatch<React.SetStateAction<string>>;
  friendRequests: FriendRequest[];
  contactCardPreview: Contact | null;
  contactCardImage: string;
  onResetAddFriendDraft: () => void;
  onAIGenerateContactForm: (description: string) => Promise<Partial<ContactFormData>>;
  onCreateFriendContact: (contact: Contact) => void;
  onRequestIncoming: (form: ContactFormData, greeting: string, openingLine: string) => void;
  onExportContactQr: (contact: Contact) => Promise<void>;
  onAcceptFriendRequest: (requestId: string) => void;
  onContactCardSaveResult: (ok: boolean) => void;
};

export const renderFriendSubView = (params: FriendSubViewParams) => {
  if (params.subView === 'addFriend') {
    return (
      <AddFriendView
        onBack={() => {
          params.onResetAddFriendDraft();
          params.goBackSubView();
        }}
        initialForm={params.addFriendDraft}
        onFormChange={params.onAddFriendDraftChange}
        initialGreeting={params.addFriendGreetingDraft}
        onGreetingChange={params.onAddFriendGreetingDraftChange}
        onAIGenerate={params.onAIGenerateContactForm}
        onCreate={params.onCreateFriendContact}
        onRequestIncoming={params.onRequestIncoming}
        onExportQr={params.onExportContactQr}
      />
    );
  }
  if (params.subView === 'newFriends') {
    return <NewFriendsView requests={params.friendRequests} onBack={params.goBackSubView} onAccept={params.onAcceptFriendRequest} />;
  }
  if (params.subView === 'contactCard') {
    return params.contactCardPreview ? (
      <ContactCardView
        contact={params.contactCardPreview}
        cardImage={params.contactCardImage}
        onBack={params.goBackSubView}
        onSaveResult={params.onContactCardSaveResult}
      />
    ) : null;
  }
  return null;
};
