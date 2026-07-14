import React from 'react';
import type { SubView } from '../../types';
import { renderCommunitySubView } from '../subviews/communitySubViews';
import { renderForumSubView } from '../subviews/forumSubViews';
import { renderNovelSubView } from '../subviews/novelSubViews';
import { MediaOfficialSubViewRouter } from '../AppLazySubViews';
import type { AppSubViewRenderParams } from '../subviewRenderParams/types';
import type { CommunitySubView } from '../subviews/communitySubViews';
import type { ForumSubView } from '../subviews/forumSubViews';
import type { MediaOfficialSubView } from '../subviews/mediaOfficialSubViews';
import type { NovelSubView } from '../subviews/novelSubViews';

export const renderContentSubView = (params: AppSubViewRenderParams, subView: SubView): React.ReactNode => {
  const communitySubView: CommunitySubView | null = (
    subView === 'community'
    || subView === 'communityUpload'
    || subView === 'communityDetail'
    || subView === 'communityMyShares'
  ) ? subView : null;
  if (communitySubView) {
    return renderCommunitySubView({
      subView: communitySubView,
      goBackSubView: params.goBackSubView,
      pushSubView: params.pushSubView,
      contacts: params.contacts,
      worldBooks: params.worldBooks,
      htmlTemplates: params.htmlTemplates || [],
      bubbleTemplates: params.bubbleTemplates || [],
      setContacts: params.setContacts,
      setWorldBooks: params.setWorldBooks,
      setHtmlTemplates: params.setHtmlTemplates,
      setBubbleTemplates: params.setBubbleTemplates,
      setMessages: params.setMessages,
      activeCommunityShareId: params.activeCommunityShareId,
      setActiveCommunityShareId: params.setActiveCommunityShareId,
      showToast: params.showToast
    });
  }

  const forumSubView: ForumSubView | null = (
    subView === 'forum'
    || subView === 'forumCreate'
    || subView === 'forumSpace'
    || subView === 'forumPostDetail'
    || subView === 'forumSettings'
  ) ? subView : null;
  if (forumSubView) {
    return renderForumSubView({
      subView: forumSubView,
      goBackSubView: params.goBackSubView,
      pushSubView: params.pushSubView,
      replaceSubView: params.replaceSubView,
      contacts: params.contacts,
      masks: params.masks,
      worldBooks: params.worldBooks,
      user: params.user,
      currentUserName: params.user.name,
      forums: params.forums,
      onForumsChange: params.setForums,
      aiSettings: params.aiSettings,
      runtimeUserPromptBase: params.runtimeUserPromptBase,
      showToast: params.showToast
    });
  }

  const novelSubView: NovelSubView | null = (
    subView === 'novelDiscover'
    || subView === 'novelDetail'
    || subView === 'novelReader'
  ) ? subView : null;
  if (novelSubView) {
    return renderNovelSubView({
      subView: novelSubView,
      goBackSubView: params.goBackSubView,
      pushSubView: params.pushSubView,
      aiSettings: params.aiSettings,
      showToast: params.showToast
    });
  }

  const mediaOfficialSubView: MediaOfficialSubView | null = (
    subView === 'officialAccounts'
    || subView === 'officialAccountArticles'
    || subView === 'articleDetail'
    || subView === 'listenMusic'
    || subView === 'musicSearch'
    || subView === 'musicInvite'
    || subView === 'musicPlaylist'
    || subView === 'contactPicker'
    || subView === 'stickerImport'
    || subView === 'xushuoTeam'
    || subView === 'xushuoAbout'
    || subView === 'xushuoHelp'
  ) ? subView : null;
  if (mediaOfficialSubView) {
    return (
      <MediaOfficialSubViewRouter
        subView={mediaOfficialSubView}
        officialArticles={params.officialArticles}
        contacts={params.contacts}
        currentUserName={params.user.name || '我'}
        currentUserAvatar={params.user.avatar}
        userAvatar={params.user.avatar}
        goBackSubView={params.goBackSubView}
        pushSubView={params.pushSubView}
        replaceSubView={params.replaceSubView}
        musicState={params.musicState}
        onMusicStateChange={params.handleMusicStateChange}
        onOpenOfficialArticle={params.handleOpenOfficialArticle}
        onManualGenerateOfficialArticle={params.handleManualGenerateOfficialArticle}
        onGenerateInitialArticleComments={params.handleGenerateInitialArticleComments}
        onGenerateReplyToArticleComment={params.handleGenerateReplyToArticleComment}
        onArticleCommentsChange={params.handleOfficialArticleCommentsChange}
        onDeleteCurrentArticle={params.handleDeleteCurrentOfficialArticle}
        onContactPickerConfirm={(ids: string[]) => {
          const purpose = (window as any).contactPickerPurpose;
          (window as any).contactPickerPurpose = undefined;
          if (purpose === 'remindWhoPost') {
            params.goBackSubView('app', 2);
            params.handleRemindWhoPost(ids);
            return;
          }
          if (purpose === 'selectIdentity') {
            (window as any).selectedIdentityId = ids[0] || undefined;
            params.goBackSubView();
            return;
          }
          params.handleContactPickerConfirm(ids);
        }}
        onStickerImportConfirm={params.handleStickerImportConfirm}
      />
    );
  }

  return null;
};
