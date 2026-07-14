import React from 'react';
import type { Contact, Mask, SubView, UserProfile, WorldBook, ForumSpace } from '../../types';
import type { AISettings } from '../../types/settings';
import { ForumView } from '../lazyViews/groupForumNovelLazyViews';

export type ForumSubView = Extract<SubView, 'forum' | 'forumCreate' | 'forumSpace' | 'forumPostDetail' | 'forumSettings'>;

type ForumSubViewParams = {
  subView: ForumSubView;
  goBackSubView: (source?: 'app' | 'history', steps?: number) => void;
  pushSubView: (sub: SubView) => void;
  replaceSubView: (sub: SubView) => void;
  contacts: Contact[];
  masks: Mask[];
  worldBooks: WorldBook[];
  user: UserProfile;
  currentUserName: string;
  forums: ForumSpace[];
  onForumsChange: React.Dispatch<React.SetStateAction<ForumSpace[]>>;
  aiSettings: AISettings;
  runtimeUserPromptBase?: string;
  showToast?: (message: string) => void;
};

export const renderForumSubView = (params: ForumSubViewParams) => {
  return (
    <ForumView
      subView={params.subView}
      pushSubView={params.pushSubView}
      replaceSubView={params.replaceSubView}
      goBackSubView={params.goBackSubView}
      contacts={params.contacts}
      masks={params.masks}
      worldBooks={params.worldBooks}
      user={params.user}
      currentUserName={params.currentUserName}
      forums={params.forums}
      onForumsChange={params.onForumsChange}
      aiSettings={params.aiSettings}
      runtimeUserPromptBase={params.runtimeUserPromptBase}
      onToast={params.showToast}
    />
  );
};
