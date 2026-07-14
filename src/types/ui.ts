export enum AppTab {
  CHATS = 'chats',
  CONTACTS = 'contacts',
  DISCOVER = 'discover',
  ME = 'me'
}

export type SubView =
  | 'none'
  | 'chat'
  | 'anonymousChat'
  | 'anonymousHistory'
  | 'moments'
  | 'mailbox'
  | 'mailboxCompose'
  | 'mailboxInbox'
  | 'mailboxSent'
  | 'mailboxLetterDetail'
  | 'mailboxContacts'
  | 'mailboxSettings'
  | 'profile'
  | 'chatDetails'
  | 'editProfile'
  | 'editProfileField'
  | 'profileMore'
  | 'contactPersona'
  | 'contactRemark'
  | 'settings'
  | 'displaySettings'
  | 'skinSettings'
  | 'chatBgSettings'
  | 'aiSettings'
  | 'soundSettings'
  | 'storageSettings'
  | 'worldBooks'
  | 'worldBookEdit'
  | 'promptRuleTree'
  | 'addFriend'
  | 'newFriends'
  | 'contactCard'
  | 'search'
  | 'pay'
  | 'receivePay'
  | 'wallet'
  | 'walletTopUp'
  | 'walletWithdraw'
  | 'miniprograms'
  | 'postMoment'
  | 'redPacket'
  | 'transfer'
  | 'sendLocation'
  | 'scan'
  | 'shake'
  | 'divination'
  | 'divinationResult'
  | 'divinationHistory'
  | 'listenMusic'
  | 'ifLine'
  | 'novelDiscover'
  | 'musicSearch'
  | 'musicInvite'
  | 'musicPlaylist'
  | 'officialAccounts'
  | 'officialAccountArticles'
  | 'articleDetail'
  | 'xushuoTeam'
  | 'xushuoAbout'
  | 'xushuoHelp'
  | 'contactPicker'
  | 'favorites'
  | 'stickerImport'
  | 'createGroup'
  | 'groupChats'
  | 'groupDetails'
  | 'emojiGroups'
  | 'imageLibraryGroups'
  | 'contactMemory'
  | 'masks'
  | 'maskEdit'
  | 'forum'
  | 'forumCreate'
  | 'forumSpace'
  | 'forumPostDetail'
  | 'forumSettings'
  | 'novelDetail'
  | 'novelReader'
  | 'community'
  | 'communityUpload'
  | 'communityDetail'
  | 'communityMyShares'
  | 'htmlTemplates'
  | 'htmlTemplateEdit'
  | 'bubbleTemplates'
  | 'bubbleTemplateEdit';

// 表情分组
export interface EmojiGroup {
  id: string;
  name: string;
  folder: string;        // 对应 public/assets/emoji 下的文件夹名
  enabled: boolean;      // 是否启用
  isBuiltIn: boolean;    // 是否内置分组（内置分组不可删除）
  order: number;         // 排序
}

// 表情项
export interface EmojiItem {
  id: string;
  url: string;
  desc: string;
  groupId?: string;      // 所属分组ID
}

export interface ImageLibraryGroup {
  id: string;
  name: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface ImageLibraryItem {
  id: string;
  groupId: string;
  url: string;
  desc: string;
  createdAt: number;
}

export type UiDialogState = null | {
  type: 'alert' | 'confirm' | 'prompt';
  title?: string;
  message: string;
  onConfirm?: (value?: string) => boolean | void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  dismissOnBackdrop?: boolean;
};
