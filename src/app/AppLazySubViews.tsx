import React from 'react';

export const AnonymousChatSubViewRouter = React.lazy(() => import('./subviews/anonymousChatSubViews').then((m) => ({ default: m.AnonymousChatSubViewRouter })));
export const DivinationSubViewRouter = React.lazy(() => import('./subviews/divinationSubViews').then((m) => ({ default: m.DivinationSubViewRouter })));
export const ChatDetailsSubViewRouter = React.lazy(() => import('./subviews/chatDetailsSubViews').then((m) => ({ default: m.ChatDetailsSubViewRouter })));
export const SocialSubViewRouter = React.lazy(() => import('./subviews/socialSubViews').then((m) => ({ default: m.SocialSubViewRouter })));
export const SettingsSubViewRouter = React.lazy(() => import('./subviews/settingsSubViews').then((m) => ({ default: m.SettingsSubViewRouter })));
export const ProfileSubViewRouter = React.lazy(() => import('./subviews/profileSubViews').then((m) => ({ default: m.ProfileSubViewRouter })));
export const MailboxSubViewRouter = React.lazy(() => import('./subviews/mailboxSubViews').then((m) => ({ default: m.MailboxSubViewRouter })));
export const MediaOfficialSubViewRouter = React.lazy(() => import('./subviews/mediaOfficialSubViews').then((m) => ({ default: m.MediaOfficialSubViewRouter })));
