import React from 'react';
import type { Contact, MailLetter, Mask, SubView, UserProfile } from '../../types';
import type { MailboxThemeSettings } from '../../mailbox/MailboxSubPages';
import {
  MailComposeView,
  MailInboxView,
  MailLetterDetailView,
  MailSentView,
  MailboxContactsView,
  MailboxHomeView,
  MailboxSettingsView
} from '../AppLazyViews';

export type MailboxSubView = Extract<
  SubView,
  | 'mailbox'
  | 'mailboxCompose'
  | 'mailboxInbox'
  | 'mailboxSent'
  | 'mailboxLetterDetail'
  | 'mailboxContacts'
  | 'mailboxSettings'
>;

export type MailboxSubViewParams = {
  subView: MailboxSubView;
  goBackSubView: () => void;
  pushSubView: (sub: SubView) => void;
  contacts: Contact[];
  user: UserProfile;
  worldBooks: Array<{ id: string; name: string }>;
  masks: Mask[];
  mailboxTheme: MailboxThemeSettings;
  onMailboxThemeChange: React.Dispatch<React.SetStateAction<MailboxThemeSettings>>;
  inboxLetters: MailLetter[];
  sentLetters: MailLetter[];
  selectedMailboxType: 'inbox' | 'sent';
  selectedMailboxLetter: MailLetter | null;
  onSelectMailboxLetter: (type: 'inbox' | 'sent', letter: MailLetter) => void;
  onSendMailboxLetter: (input: { toContactId: string; subject?: string; content: string; blessing: string }) => void;
  onContactWorldBooksChange: (contactId: string, worldBookIds: string[]) => void;
  onContactSignatureImageChange: (contactId: string, dataUrl: string) => void;
  onContactStampImageChange: (contactId: string, dataUrl: string) => void;
};

export const renderMailboxSubView = (params: MailboxSubViewParams) => {
  switch (params.subView) {
    case 'mailbox':
      return (
        <MailboxHomeView
          onBack={params.goBackSubView}
          onCompose={() => params.pushSubView('mailboxCompose')}
          onInbox={() => params.pushSubView('mailboxInbox')}
          onSent={() => params.pushSubView('mailboxSent')}
          onContacts={() => params.pushSubView('mailboxContacts')}
          onSettings={() => params.pushSubView('mailboxSettings')}
          inboxCount={params.inboxLetters.length}
          sentCount={params.sentLetters.length}
          theme={params.mailboxTheme}
        />
      );
    case 'mailboxCompose':
      return (
        <MailComposeView
          onBack={params.goBackSubView}
          contacts={params.contacts}
          currentUserName={params.user.name || '我'}
          theme={params.mailboxTheme}
          onSendLetter={params.onSendMailboxLetter}
        />
      );
    case 'mailboxInbox':
      return (
        <MailInboxView
          onBack={params.goBackSubView}
          inboxLetters={params.inboxLetters}
          onOpenLetter={(letter) => params.onSelectMailboxLetter('inbox', letter)}
          theme={params.mailboxTheme}
        />
      );
    case 'mailboxSent':
      return (
        <MailSentView
          onBack={params.goBackSubView}
          sentLetters={params.sentLetters}
          onOpenLetter={(letter) => params.onSelectMailboxLetter('sent', letter)}
          theme={params.mailboxTheme}
        />
      );
    case 'mailboxLetterDetail':
      return params.selectedMailboxLetter ? (
        <MailLetterDetailView
          onBack={params.goBackSubView}
          letter={params.selectedMailboxLetter}
          title={params.selectedMailboxType === 'inbox' ? '收信详情' : '发信详情'}
          theme={params.mailboxTheme}
        />
      ) : null;
    case 'mailboxContacts':
      return (
        <MailboxContactsView
          onBack={params.goBackSubView}
          user={params.user}
          contacts={params.contacts}
          worldBooks={params.worldBooks}
          masks={params.masks.map(mask => ({ id: mask.id, name: mask.name }))}
          myMaskId={params.mailboxTheme.myMaskId}
          onMyMaskChange={(maskId) => params.onMailboxThemeChange(prev => ({ ...prev, myMaskId: maskId }))}
          onContactWorldBooksChange={params.onContactWorldBooksChange}
          onSignatureImageChange={(dataUrl) => params.onMailboxThemeChange(prev => ({ ...prev, signatureImage: dataUrl }))}
          onStampImageChange={(dataUrl) => params.onMailboxThemeChange(prev => ({ ...prev, stampImage: dataUrl }))}
          onContactSignatureImageChange={params.onContactSignatureImageChange}
          onContactStampImageChange={params.onContactStampImageChange}
          theme={params.mailboxTheme}
        />
      );
    case 'mailboxSettings':
      return (
        <MailboxSettingsView
          onBack={params.goBackSubView}
          theme={params.mailboxTheme}
          onThemeChange={params.onMailboxThemeChange}
        />
      );
    default:
      return null;
  }
};

export const MailboxSubViewRouter: React.FC<MailboxSubViewParams> = (params) => renderMailboxSubView(params);
