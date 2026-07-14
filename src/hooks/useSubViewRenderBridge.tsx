import { useCallback } from 'react';
import type { SubView } from '../types';
import { renderAppSubView } from '../app/renderSubView';
import type { UseSubViewRenderBridgeParams } from './subViewRenderBridgeTypes';
import { useSubViewRenderParams } from './useSubViewRenderParams';

export const useSubViewRenderBridge = (params: UseSubViewRenderBridgeParams) => {
  const subViewRenderParams = useSubViewRenderParams({
    ...params
  });

  const renderSubView = useCallback((subView: SubView) => {
    return renderAppSubView(subViewRenderParams, subView);
  }, [subViewRenderParams]);

  return {
    renderSubView
  };
};
