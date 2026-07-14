import React from 'react';
import type { Contact, SubView } from '../../types';
import type { MusicState } from '../../music/musicCommon';
import type { OfficialArticle, OfficialCommentContact } from '../officialArticleTypes';
import {
  ArticleDetailView,
  ContactPickerView,
  ListenMusicView,
  MusicInviteView,
  MusicPlaylistView,
  MusicSearchView,
  OfficialAccountArticlesView,
  OfficialAccountsView,
  StickerImportView,
  XushuoAboutView,
  XushuoHelpView,
  XushuoTeamView
} from '../AppLazyViews';

export type MediaOfficialSubView = Extract<
  SubView,
  | 'officialAccounts'
  | 'officialAccountArticles'
  | 'articleDetail'
  | 'listenMusic'
  | 'musicSearch'
  | 'musicInvite'
  | 'musicPlaylist'
  | 'contactPicker'
  | 'stickerImport'
  | 'xushuoTeam'
  | 'xushuoAbout'
  | 'xushuoHelp'
>;

export type MediaOfficialSubViewParams = {
  subView: MediaOfficialSubView;
  officialArticles: any[];
  contacts: Contact[];
  currentUserName: string;
  currentUserAvatar?: string;
  userAvatar?: string;
  goBackSubView: () => void;
  pushSubView: (sub: SubView) => void;
  replaceSubView: (sub: SubView) => void;
  musicState: MusicState;
  onMusicStateChange: (partial: Partial<MusicState>) => void;
  onOpenOfficialArticle: (article: any) => void;
  onManualGenerateOfficialArticle: () => Promise<void>;
  onGenerateInitialArticleComments: (article: any) => Promise<any[]>;
  onGenerateReplyToArticleComment: (input: { article: any; commentText: string; contacts: Contact[] }) => Promise<any>;
  onArticleCommentsChange: (nextComments: any[]) => void;
  onDeleteCurrentArticle: () => void;
  onContactPickerConfirm: (ids: string[]) => void;
  onStickerImportConfirm: (stickers: any[]) => void;
};

const renderOfficialAccountsSubView = (params: MediaOfficialSubViewParams) => {
  if (params.subView === 'officialAccounts') {
    return (
      <OfficialAccountsView
        articles={params.officialArticles}
        onBack={params.goBackSubView}
        onSelect={() => params.pushSubView('officialAccountArticles')}
      />
    );
  }
  if (params.subView === 'officialAccountArticles') {
    return (
      <OfficialAccountArticlesView
        articles={params.officialArticles}
        onBack={params.goBackSubView}
        onArticle={params.onOpenOfficialArticle}
        onManualGenerate={params.onManualGenerateOfficialArticle}
      />
    );
  }
  return null;
};

const renderArticleDetailSubView = (params: MediaOfficialSubViewParams) => {
  if (params.subView !== 'articleDetail') return null;
  return (
    <ArticleDetailView
      article={(window as any).currentArticle}
      contacts={params.contacts.filter(contact => !contact.isGroup)}
      currentUserName={params.currentUserName}
      currentUserAvatar={params.currentUserAvatar || '/assets/image/user.png'}
      onGenerateInitialComments={params.onGenerateInitialArticleComments}
      onGenerateReplyToComment={params.onGenerateReplyToArticleComment as (args: { article: OfficialArticle; commentText: string; contacts: OfficialCommentContact[] }) => Promise<{ user: string; text: string; avatar?: string } | null>}
      onBack={params.goBackSubView}
      onCommentsChange={params.onArticleCommentsChange}
      onDelete={params.onDeleteCurrentArticle}
    />
  );
};

const renderMusicSubView = (params: MediaOfficialSubViewParams) => {
  if (params.subView === 'listenMusic') {
    return (
      <ListenMusicView
        contacts={params.contacts}
        userAvatar={params.userAvatar || ''}
        onBack={params.goBackSubView}
        onNavigate={params.pushSubView}
        musicState={params.musicState}
        onMusicStateChange={params.onMusicStateChange}
      />
    );
  }
  if (params.subView === 'musicSearch') {
    return (
      <MusicSearchView
        onBack={params.goBackSubView}
        onBackToMusic={() => params.replaceSubView('listenMusic')}
        musicState={params.musicState}
        onMusicStateChange={params.onMusicStateChange}
      />
    );
  }
  if (params.subView === 'musicInvite') {
    return (
      <MusicInviteView
        contacts={params.contacts}
        userAvatar={params.userAvatar || ''}
        onBack={params.goBackSubView}
        musicState={params.musicState}
        onMusicStateChange={params.onMusicStateChange}
      />
    );
  }
  if (params.subView === 'musicPlaylist') {
    return <MusicPlaylistView onBack={params.goBackSubView} musicState={params.musicState} onMusicStateChange={params.onMusicStateChange} />;
  }
  return null;
};

const renderAboutSubView = (params: MediaOfficialSubViewParams) => {
  if (params.subView === 'xushuoTeam') return <XushuoTeamView onBack={params.goBackSubView} onNavigate={params.pushSubView} />;
  if (params.subView === 'xushuoAbout') return <XushuoAboutView onBack={params.goBackSubView} />;
  if (params.subView === 'xushuoHelp') return <XushuoHelpView onBack={params.goBackSubView} />;
  return null;
};

const renderToolsSubView = (params: MediaOfficialSubViewParams) => {
  if (params.subView === 'contactPicker') {
    return (
      <ContactPickerView
        contacts={params.contacts.filter(contact => !contact.isGroup)}
        onBack={params.goBackSubView}
        onConfirm={params.onContactPickerConfirm}
      />
    );
  }
  if (params.subView === 'stickerImport') {
    return (
      <StickerImportView
        files={(window as any).pendingStickers || []}
        onBack={params.goBackSubView}
        onConfirm={params.onStickerImportConfirm}
      />
    );
  }
  return null;
};

export const renderMediaOfficialSubView = (params: MediaOfficialSubViewParams) => {
  return (
    renderOfficialAccountsSubView(params) ||
    renderArticleDetailSubView(params) ||
    renderMusicSubView(params) ||
    renderAboutSubView(params) ||
    renderToolsSubView(params)
  );
};

export const MediaOfficialSubViewRouter: React.FC<MediaOfficialSubViewParams> = (params) => renderMediaOfficialSubView(params);
