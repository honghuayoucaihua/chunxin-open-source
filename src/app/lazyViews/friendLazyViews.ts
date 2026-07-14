import React from 'react';

export const AddFriendView = React.lazy(() => import('../../utils/UtilsSubPages').then((m) => ({ default: m.AddFriendView })));
export const NewFriendsView = React.lazy(() => import('../../utils/UtilsSubPages').then((m) => ({ default: m.NewFriendsView })));
export const ContactCardView = React.lazy(() => import('../../utils/UtilsSubPages').then((m) => ({ default: m.ContactCardView })));
