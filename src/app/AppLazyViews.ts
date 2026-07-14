import React from 'react';

export const ForumView = React.lazy(() => import('../forum/ForumSubPages'));
export const CommunityListView = React.lazy(() => import('../community/CommunityListView'));
export const CommunityUploadView = React.lazy(() => import('../community/CommunityUploadView'));
export const CommunityDetailView = React.lazy(() => import('../community/CommunityDetailView'));
export const CommunityMySharesView = React.lazy(() => import('../community/CommunityMySharesView'));

export const ProfileView = React.lazy(() => import('../profile/ProfileSubPages').then((m) => ({ default: m.ProfileView })));
export const EditProfileView = React.lazy(() => import('../profile/ProfileSubPages').then((m) => ({ default: m.EditProfileView })));
export const EditProfileFieldView = React.lazy(() => import('../profile/ProfileSubPages').then((m) => ({ default: m.EditProfileFieldView })));
export const ContactPersonaView = React.lazy(() => import('../profile/ProfileSubPages').then((m) => ({ default: m.ContactPersonaView })));
export const ContactRemarkView = React.lazy(() => import('../profile/ProfileSubPages').then((m) => ({ default: m.ContactRemarkView })));
export const ContactMemoryView = React.lazy(() => import('../profile/ProfileSubPages').then((m) => ({ default: m.ContactMemoryView })));
export const MasksView = React.lazy(() => import('../profile/ProfileSubPages').then((m) => ({ default: m.MasksView })));
export const MaskEditView = React.lazy(() => import('../profile/ProfileSubPages').then((m) => ({ default: m.MaskEditView })));

export const SettingsView = React.lazy(() => import('../settings/SettingSubPages').then((m) => ({ default: m.SettingsView })));
export const SoundSettingsView = React.lazy(() => import('../settings/SettingSubPages').then((m) => ({ default: m.SoundSettingsView })));
export const DisplaySettingsView = React.lazy(() => import('../settings/SettingSubPages').then((m) => ({ default: m.DisplaySettingsView })));
export const ChatBgSettingsView = React.lazy(() => import('../settings/SettingSubPages').then((m) => ({ default: m.ChatBgSettingsView })));
export const ChatDetailsView = React.lazy(() => import('../settings/SettingSubPages').then((m) => ({ default: m.ChatDetailsView })));
export const AISettingsView = React.lazy(() => import('../settings/SettingSubPages').then((m) => ({ default: m.AISettingsView })));
export const StorageSettingsView = React.lazy(() => import('../settings/SettingSubPages').then((m) => ({ default: m.StorageSettingsView })));
export const WorldBooksView = React.lazy(() => import('../settings/SettingSubPages').then((m) => ({ default: m.WorldBooksView })));
export const WorldBookEditView = React.lazy(() => import('../settings/SettingSubPages').then((m) => ({ default: m.WorldBookEditView })));
export const PromptRuleTreeView = React.lazy(() => import('../settings/SettingSubPages').then((m) => ({ default: m.PromptRuleTreeView })));
export const HtmlTemplatesView = React.lazy(() => import('../settings/SettingSubPages').then((m) => ({ default: m.HtmlTemplatesView })));
export const HtmlTemplateEditView = React.lazy(() => import('../settings/SettingSubPages').then((m) => ({ default: m.HtmlTemplateEditView })));
export const BubbleWorkshopListView = React.lazy(() => import('../settings/SettingSubPages').then((m) => ({ default: m.BubbleWorkshopListView })));
export const BubbleWorkshopEditView = React.lazy(() => import('../settings/SettingSubPages').then((m) => ({ default: m.BubbleWorkshopEditView })));
export const SkinSettingsView = React.lazy(() => import('../settings/SettingSubPages').then((m) => ({ default: m.SkinSettingsView })));

export const PayView = React.lazy(() => import('../finance/FinanceSubPages').then((m) => ({ default: m.PayView })));
export const ReceivePayView = React.lazy(() => import('../finance/FinanceSubPages').then((m) => ({ default: m.ReceivePayView })));
export const SendRedPacketView = React.lazy(() => import('../finance/FinanceSubPages').then((m) => ({ default: m.SendRedPacketView })));
export const TransferView = React.lazy(() => import('../finance/FinanceSubPages').then((m) => ({ default: m.TransferView })));
export const ReceiveTransferView = React.lazy(() => import('../finance/FinanceSubPages').then((m) => ({ default: m.ReceiveTransferView })));
export const ReceiveRedPacketView = React.lazy(() => import('../finance/FinanceSubPages').then((m) => ({ default: m.ReceiveRedPacketView })));
export const WalletView = React.lazy(() => import('../finance/FinanceSubPages').then((m) => ({ default: m.WalletView })));
export const WalletTopUpView = React.lazy(() => import('../finance/FinanceSubPages').then((m) => ({ default: m.WalletTopUpView })));
export const WalletWithdrawView = React.lazy(() => import('../finance/FinanceSubPages').then((m) => ({ default: m.WalletWithdrawView })));

export const OfficialAccountsView = React.lazy(() => import('../official/OfficialAccountSubPages').then((m) => ({ default: m.OfficialAccountsView })));
export const OfficialAccountArticlesView = React.lazy(() => import('../official/OfficialAccountSubPages').then((m) => ({ default: m.OfficialAccountArticlesView })));
export const ArticleDetailView = React.lazy(() => import('../official/OfficialAccountSubPages').then((m) => ({ default: m.ArticleDetailView })));

export const SendLocationView = React.lazy(() => import('../utils/UtilsSubPages').then((m) => ({ default: m.SendLocationView })));
export const ScanView = React.lazy(() => import('../utils/UtilsSubPages').then((m) => ({ default: m.ScanView })));
export const ShakeView = React.lazy(() => import('../utils/UtilsSubPages').then((m) => ({ default: m.ShakeView })));
export const MiniProgramsView = React.lazy(() => import('../utils/UtilsSubPages').then((m) => ({ default: m.MiniProgramsView })));
export const FavoritesView = React.lazy(() => import('../utils/UtilsSubPages').then((m) => ({ default: m.FavoritesView })));
export const ContactPickerView = React.lazy(() => import('../utils/UtilsSubPages').then((m) => ({ default: m.ContactPickerView })));
export const StickerImportView = React.lazy(() => import('../utils/UtilsSubPages').then((m) => ({ default: m.StickerImportView })));
export const AddFriendView = React.lazy(() => import('../utils/UtilsSubPages').then((m) => ({ default: m.AddFriendView })));
export const CreateGroupView = React.lazy(() => import('../utils/UtilsSubPages').then((m) => ({ default: m.CreateGroupView })));
export const NewFriendsView = React.lazy(() => import('../utils/UtilsSubPages').then((m) => ({ default: m.NewFriendsView })));
export const ContactCardView = React.lazy(() => import('../utils/UtilsSubPages').then((m) => ({ default: m.ContactCardView })));
export const EmojiGroupsView = React.lazy(() => import('../utils/UtilsSubPages').then((m) => ({ default: m.EmojiGroupsView })));
export const ImageLibraryGroupsView = React.lazy(() => import('../utils/UtilsSubPages').then((m) => ({ default: m.ImageLibraryGroupsView })));

export const MailboxHomeView = React.lazy(() => import('../mailbox/MailboxSubPages').then((m) => ({ default: m.MailboxHomeView })));
export const MailComposeView = React.lazy(() => import('../mailbox/MailboxSubPages').then((m) => ({ default: m.MailComposeView })));
export const MailInboxView = React.lazy(() => import('../mailbox/MailboxSubPages').then((m) => ({ default: m.MailInboxView })));
export const MailSentView = React.lazy(() => import('../mailbox/MailboxSubPages').then((m) => ({ default: m.MailSentView })));
export const MailLetterDetailView = React.lazy(() => import('../mailbox/MailboxSubPages').then((m) => ({ default: m.MailLetterDetailView })));
export const MailboxContactsView = React.lazy(() => import('../mailbox/MailboxSubPages').then((m) => ({ default: m.MailboxContactsView })));
export const MailboxSettingsView = React.lazy(() => import('../mailbox/MailboxSubPages').then((m) => ({ default: m.MailboxSettingsView })));

export const ListenMusicView = React.lazy(() => import('../music/MusicSubPages').then((m) => ({ default: m.ListenMusicView })));
export const MusicSearchView = React.lazy(() => import('../music/MusicFeatureSubPages').then((m) => ({ default: m.MusicSearchView })));
export const MusicInviteView = React.lazy(() => import('../music/MusicFeatureSubPages').then((m) => ({ default: m.MusicInviteView })));
export const MusicPlaylistView = React.lazy(() => import('../music/MusicFeatureSubPages').then((m) => ({ default: m.MusicPlaylistView })));

export const XushuoTeamView = React.lazy(() => import('../pages/XushuoTeam'));
export const XushuoAboutView = React.lazy(() => import('../pages/XushuoTeam').then((m) => ({ default: m.XushuoAboutView })));
export const XushuoHelpView = React.lazy(() => import('../pages/XushuoTeam').then((m) => ({ default: m.XushuoHelpView })));
export const NovelDiscoverView = React.lazy(() => import('../pages/NovelDiscoverView'));
