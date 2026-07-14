import React from 'react';

export const ScanView = React.lazy(() => import('../../utils/UtilsSubPages').then((m) => ({ default: m.ScanView })));
export const ShakeView = React.lazy(() => import('../../utils/UtilsSubPages').then((m) => ({ default: m.ShakeView })));
