import React from 'react';

export const CreateGroupView = React.lazy(() => import('../../utils/UtilsSubPages').then((m) => ({ default: m.CreateGroupView })));
export const ForumView = React.lazy(() => import('../../forum/ForumSubPages'));
export const NovelDiscoverView = React.lazy(() => import('../../pages/NovelDiscoverView'));
