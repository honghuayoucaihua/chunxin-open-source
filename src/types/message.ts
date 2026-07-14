export type ChatMode = 'online' | 'online-inner' | 'offline' | 'offline-inner' | 'story';

export interface QuotedMessageSnapshot {
  id: string;
  senderId: string;
  content: string;
  timestamp: number;
  type: 'text';
  imageCaption?: string;
  isNpc?: boolean;
  npcName?: string;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: number;
  type: 'text' | 'image' | 'voice' | 'redpacket' | 'transfer' | 'location' | 'miniprogram' | 'truthdare' | 'system' | 'call';
  imageCaption?: string;
  amount?: string;
  isOpened?: boolean;
  paymentStatus?: 'pending' | 'received' | 'refunded' | 'expired';
  openedAt?: number;
  locationName?: string;
  locationAddress?: string;
  title?: string;
  desc?: string;
  thumb?: string;
  isFavorited?: boolean;
  quotedMsg?: QuotedMessageSnapshot;
  innerVoice?: string;
  actionDesc?: string;
  narrationDesc?: string;
  translatedContentZhCN?: string;
  pat?: { fromId: string; fromName: string; targetName: string };
  voiceLanguage?: string;
  voiceSpeed?: number;
  voiceId?: string;
  callStatus?: 'missed' | 'ongoing' | 'ended';
  callDurationSec?: number;
  isNpc?: boolean;
  npcName?: string;
  truthDareKind?: 'invite' | 'accepted';
  truthDareThemeName?: string;
  truthDareCommand?: 'nextRound';
}

export interface MailLetter {
  id: string;
  toContactId: string;
  toName: string;
  fromName: string;
  subject?: string;
  content: string;
  blessing: string;
  date: string;
  signatureImage?: string;
  stampImage?: string;
  createdAt: number;
}

export interface Comment {
  id: string;
  user: string;
  text: string;
  replyTo?: string; // 可选，回复的目标用户
}

export interface Moment {
  id: string;
  author: string;
  avatar: string;
  authorId: string;
  content: string;
  images?: string[];
  imageDescriptions?: string[];
  timestamp: number;
  likes: string[];
  comments: Comment[];
  location?: string;
}

export interface WorldBookEntry {
  id: string;
  text: string;
}

export interface WorldBook {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  entries: WorldBookEntry[];
  encryptedReadOnly?: boolean;
  encryptedHiddenRaw?: string;
}

export type ForumCategory = '推荐' | '日常' | '情感' | '校园' | '技术' | '兴趣' | '新闻';

export interface ForumPostComment {
  id: string;
  author: string;
  authorContactId?: string;
  content: string;
  createdAt: number;
  likes?: number;
  likedByMe?: boolean;
  isAnonymous?: boolean;
  maskId?: string;
  replyToId?: string;
  replyToAuthor?: string;
  replies?: ForumPostComment[];
}

export interface ForumPost {
  id: string;
  forumId: string;
  title: string;
  content: string;
  author: string;
  authorContactId?: string;
  category: ForumCategory;
  likes: number;
  likedByMe?: boolean;
  comments: ForumPostComment[];
  createdAt: number;
  editedAt?: number;
  isAnonymous?: boolean;
  maskId?: string;
  pinned?: boolean;
  isNews?: boolean;
}

export interface ForumSpace {
  id: string;
  name: string;
  roleIds: string[];
  maskId: string;
  maskIds?: string[];
  worldview: string;
  worldBookIds: string[];
  tags?: string[];
  posts: ForumPost[];
  createdAt: number;
  updatedAt: number;
}
