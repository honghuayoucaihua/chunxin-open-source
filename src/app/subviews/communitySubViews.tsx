import React from 'react';
import type { Contact, Message, SubView, WorldBook } from '../../types';
import type { HtmlTemplate } from '../../types/htmlTemplate';
import type { BubbleTemplate } from '../../types/bubbleTemplate';
import {
  CommunityListView,
  CommunityUploadView,
  CommunityDetailView,
  CommunityMySharesView
} from '../lazyViews/communityLazyViews';

export type CommunitySubView = Extract<SubView, 'community' | 'communityUpload' | 'communityDetail' | 'communityMyShares'>;

type CommunitySubViewParams = {
  subView: CommunitySubView;
  goBackSubView: () => void;
  pushSubView: (sub: SubView) => void;
  contacts: Contact[];
  worldBooks: WorldBook[];
  htmlTemplates: HtmlTemplate[];
  bubbleTemplates: BubbleTemplate[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  setWorldBooks: React.Dispatch<React.SetStateAction<WorldBook[]>>;
  setHtmlTemplates: React.Dispatch<React.SetStateAction<HtmlTemplate[]>>;
  setBubbleTemplates: React.Dispatch<React.SetStateAction<BubbleTemplate[]>>;
  setMessages: React.Dispatch<React.SetStateAction<Record<string, Message[]>>>;
  activeCommunityShareId: string | null;
  setActiveCommunityShareId: (id: string | null) => void;
  showToast: (msg: string) => void;
};

export const renderCommunitySubView = (params: CommunitySubViewParams) => {
  switch (params.subView) {
    case 'community':
      return (
        <CommunityListView
          onBack={params.goBackSubView}
          onDetail={(id) => {
            params.setActiveCommunityShareId(id);
            params.pushSubView('communityDetail');
          }}
          onUpload={() => params.pushSubView('communityUpload')}
          onMyShares={() => params.pushSubView('communityMyShares')}
        />
      );
    case 'communityUpload':
      return (
        <CommunityUploadView
          onBack={params.goBackSubView}
          contacts={params.contacts}
          worldBooks={params.worldBooks}
          htmlTemplates={params.htmlTemplates}
          bubbleTemplates={params.bubbleTemplates}
          onToast={params.showToast}
        />
      );
    case 'communityDetail':
      return params.activeCommunityShareId ? (
        <CommunityDetailView
          shareId={params.activeCommunityShareId}
          onBack={params.goBackSubView}
          contacts={params.contacts}
          worldBooks={params.worldBooks}
          htmlTemplates={params.htmlTemplates}
          bubbleTemplates={params.bubbleTemplates}
          setContacts={params.setContacts}
          setWorldBooks={params.setWorldBooks}
          setHtmlTemplates={params.setHtmlTemplates}
          setBubbleTemplates={params.setBubbleTemplates}
          setMessages={params.setMessages}
          onToast={params.showToast}
        />
      ) : null;
    case 'communityMyShares':
      return (
        <CommunityMySharesView
          onBack={params.goBackSubView}
          onUpload={() => params.pushSubView('communityUpload')}
          onToast={params.showToast}
        />
      );
    default:
      return null;
  }
};
