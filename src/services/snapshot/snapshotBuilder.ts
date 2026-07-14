import type {
  AISettings,
  AppearanceSettings,
  BubbleTemplate,
  Contact,
  ContactMemories,
  DivinationHistoryItem,
  ForumSpace,
  FriendRequest,
  HtmlTemplate,
  MailLetter,
  Mask,
  Message,
  SoundVibrationSettings,
  UserProfile,
  WorldBook
} from '../../types/index.ts';
import type { AnonymousChatHistoryItem, AnonymousChatSettings } from '../../app/anonymousChatUtils';
import type { MailboxThemeSettings } from '../../mailbox/MailboxSubPages';
import { collectEmojiStoreStateFromWindow } from '../../chatroom/emojiStore.ts';
import {
  collectTruthOrDarePersistedState,
  type TruthOrDareRuntimeMap,
  type TruthOrDareTheme
} from '../../chatroom/truthOrDarePersistence.ts';
import {
  collectImageLibraryPersistedState,
  type ImageLibraryGroup,
  type ImageLibraryItem
} from '../imageLibraryStore.ts';
import {
  collectNovelPersistedState,
  type BookshelfEntry,
  type NovelPreference,
  type NovelReaderAppearance
} from '../../pages/novelDiscoverHelpers.ts';
import {
  collectAiProviderPersistedState,
  type AiProviderConfigMap
} from '../../settings/ai/aiProviderPersistence.ts';

export interface SnapshotInput {
  contacts: Contact[];
  user: UserProfile;
  walletBalance: number;
  messages: Record<string, Message[]>;
  favorites: Message[];
  moments: any[];
  settings: AppearanceSettings;
  aiSettings: AISettings;
  worldBooks: WorldBook[];
  officialArticles: any[];
  contactMemories: ContactMemories;
  friendRequests: FriendRequest[];
  discoverUnreadCount?: number;
  inboxLetters?: MailLetter[];
  sentLetters?: MailLetter[];
  soundVibrationSettings?: SoundVibrationSettings;
  hasAgreedTerms?: boolean;
  walletBank?: { name: string; last4: string };
  musicState?: any;
  masks?: Mask[];
  forums?: ForumSpace[];
  mailboxTheme?: MailboxThemeSettings;
  anonymousChatSettings?: AnonymousChatSettings;
  anonymousChatHistory?: AnonymousChatHistoryItem[];
  anonymousHasUnfinishedSession?: boolean;
  anonymousUnfinishedSession?: {
    partner: any;
    messages: Message[];
    startedAt: number;
  } | null;
  divinationHistory?: DivinationHistoryItem[];
  htmlTemplates?: HtmlTemplate[];
  bubbleTemplates?: BubbleTemplate[];
  truthDareThemes?: TruthOrDareTheme[];
  truthDareRuntime?: TruthOrDareRuntimeMap;
  imageLibraryGroups?: ImageLibraryGroup[];
  imageLibraryItems?: ImageLibraryItem[];
  novelBookshelf?: BookshelfEntry[];
  novelReaderAppearance?: NovelReaderAppearance;
  novelPreference?: NovelPreference;
  aiProviderPresets?: Record<string, unknown>[];
  aiProviderConfigs?: AiProviderConfigMap;
}

export interface SnapshotPayload {
  contacts: Contact[];
  user: UserProfile & { balance: number };
  messages: Record<string, Message[]>;
  favorites: Message[];
  moments: any[];
  settings: AppearanceSettings;
  aiSettings: AISettings;
  worldBooks: WorldBook[];
  customEmojis: any[];
  emojiGroups: any[];
  groupEmojis: Record<string, any[]>;
  hiddenEmojiIds: string[];
  customEmojiOrder: string[];
  selectedContacts: any[];
  currentArticle: any;
  officialArticles: any[];
  contactMemories: ContactMemories;
  friendRequests: FriendRequest[];
  discoverUnreadCount: number;
  inboxLetters: MailLetter[];
  sentLetters: MailLetter[];
  soundVibrationSettings?: SoundVibrationSettings;
  hasAgreedTerms: boolean;
  walletBank?: { name: string; last4: string };
  musicState?: any;
  masks: Mask[];
  forums: ForumSpace[];
  mailboxTheme?: MailboxThemeSettings;
  anonymousChatSettings?: AnonymousChatSettings;
  anonymousChatHistory: AnonymousChatHistoryItem[];
  anonymousHasUnfinishedSession: boolean;
  anonymousUnfinishedSession?: {
    partner: any;
    messages: Message[];
    startedAt: number;
  } | null;
  divinationHistory: DivinationHistoryItem[];
  htmlTemplates: HtmlTemplate[];
  bubbleTemplates: BubbleTemplate[];
  truthDareThemes: TruthOrDareTheme[];
  truthDareRuntime: TruthOrDareRuntimeMap;
  imageLibraryGroups: ImageLibraryGroup[];
  imageLibraryItems: ImageLibraryItem[];
  novelBookshelf: BookshelfEntry[];
  novelReaderAppearance: NovelReaderAppearance;
  novelPreference: NovelPreference;
  aiProviderPresets: Record<string, unknown>[];
  aiProviderConfigs: AiProviderConfigMap;
  // 图片引用表（用于 ZIP 导出）
  imageRefs?: Record<string, string>; // 原数据位置 -> 图片文件路径
}

/**
 * 估算数据大小（返回字节数）
 */
export const estimateDataSize = (payload: any): number => {
  try {
    return new Blob([JSON.stringify(payload)]).size;
  } catch {
    return 0;
  }
};

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

/**
 * 构建快照数据
 */
export const buildSnapshotPayload = ({
  contacts,
  user,
  walletBalance,
  messages,
  favorites,
  moments,
  settings,
  aiSettings,
  worldBooks,
  officialArticles,
  contactMemories,
  friendRequests,
  discoverUnreadCount = 0,
  inboxLetters = [],
  sentLetters = [],
  soundVibrationSettings,
  hasAgreedTerms = false,
  walletBank,
  musicState,
  masks = [],
  forums = [],
  mailboxTheme,
  anonymousChatSettings,
  anonymousChatHistory = [],
  anonymousHasUnfinishedSession = false,
  anonymousUnfinishedSession = null,
  divinationHistory = [],
  htmlTemplates = [],
  bubbleTemplates = [],
  truthDareThemes,
  truthDareRuntime,
  imageLibraryGroups,
  imageLibraryItems,
  novelBookshelf,
  novelReaderAppearance,
  novelPreference,
  aiProviderPresets,
  aiProviderConfigs
}: SnapshotInput): SnapshotPayload => {
  const emojiState = collectEmojiStoreStateFromWindow();
  const truthOrDareState = collectTruthOrDarePersistedState();
  const imageLibraryState = collectImageLibraryPersistedState();
  const novelState = collectNovelPersistedState();
  const aiProviderState = collectAiProviderPersistedState();
  return {
    contacts,
    user: { ...user, balance: walletBalance },
    messages,
    favorites,
    moments,
    settings,
    aiSettings,
    worldBooks,
    customEmojis: emojiState.customEmojis,
    emojiGroups: emojiState.emojiGroups,
    groupEmojis: emojiState.groupEmojis,
    hiddenEmojiIds: emojiState.hiddenEmojiIds,
    customEmojiOrder: emojiState.customEmojiOrder,
    selectedContacts: (window as any).selectedContacts || [],
    currentArticle: (window as any).currentArticle || null,
    officialArticles,
    contactMemories,
    friendRequests,
    discoverUnreadCount,
    inboxLetters,
    sentLetters,
    soundVibrationSettings,
    hasAgreedTerms,
    walletBank,
    musicState,
    masks,
    forums,
    mailboxTheme,
    anonymousChatSettings,
    anonymousChatHistory,
    anonymousHasUnfinishedSession,
    anonymousUnfinishedSession,
    divinationHistory,
    htmlTemplates,
    bubbleTemplates,
    truthDareThemes: truthDareThemes ?? truthOrDareState.truthDareThemes,
    truthDareRuntime: truthDareRuntime ?? truthOrDareState.truthDareRuntime,
    imageLibraryGroups: imageLibraryGroups ?? imageLibraryState.imageLibraryGroups,
    imageLibraryItems: imageLibraryItems ?? imageLibraryState.imageLibraryItems,
    novelBookshelf: novelBookshelf ?? novelState.novelBookshelf,
    novelReaderAppearance: novelReaderAppearance ?? novelState.novelReaderAppearance,
    novelPreference: novelPreference ?? novelState.novelPreference,
    aiProviderPresets: aiProviderPresets ?? aiProviderState.aiProviderPresets,
    aiProviderConfigs: aiProviderConfigs ?? aiProviderState.aiProviderConfigs
  };
};
