import React from 'react';
import type { SubView } from '../../types';
import type { AISettings } from '../../types/settings';
import { NovelDiscoverView } from '../lazyViews/groupForumNovelLazyViews';

export type NovelSubView = Extract<SubView, 'novelDiscover' | 'novelDetail' | 'novelReader'>;

type NovelSubViewParams = {
  subView: NovelSubView;
  goBackSubView: (source?: 'app' | 'history', steps?: number) => void;
  pushSubView: (sub: SubView) => void;
  aiSettings: AISettings;
  showToast?: (message: string) => void;
};

export const renderNovelSubView = (params: NovelSubViewParams) => {
  return (
    <NovelDiscoverView
      onBack={params.goBackSubView}
      subView={params.subView}
      pushSubView={params.pushSubView}
      goBackSubView={params.goBackSubView}
      aiSettings={params.aiSettings}
      showToast={params.showToast}
    />
  );
};
