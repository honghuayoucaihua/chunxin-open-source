import React from 'react';
import type { SubView } from '../types';
import { renderContentSubView } from './subviewDispatchers/contentSubViewDispatcher';
import { renderConversationSubView } from './subviewDispatchers/conversationSubViewDispatcher';
import { renderRelationshipSubView } from './subviewDispatchers/relationshipSubViewDispatcher';
import { renderToolingSubView } from './subviewDispatchers/toolingSubViewDispatcher';
import type { AppSubViewRenderParams } from './subviewRenderParams/types';

export const renderAppSubView = (params: AppSubViewRenderParams, subView: SubView): React.ReactNode => {
  const conversationView = renderConversationSubView(params, subView);
  if (conversationView) return conversationView;

  const relationshipView = renderRelationshipSubView(params, subView);
  if (relationshipView) return relationshipView;

  const toolingView = renderToolingSubView(params, subView);
  if (toolingView) return toolingView;

  const contentView = renderContentSubView(params, subView);
  if (contentView) return contentView;

  return null;
};
