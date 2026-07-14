import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type {
  Contact,
  ContactMemories,
  DivinationDraft,
  DivinationHistoryItem,
  FriendRequest,
  MailLetter,
  Mask,
  Message,
  UserProfile
} from '../types';
import type { MailboxThemeSettings } from '../mailbox/MailboxSubPages';
import type { MusicState } from '../music/musicCommon';
import type { RestoreMode } from './restoreFlow';
import { loadDataMaintenanceHandlerRuntime } from './dataMaintenanceRuntimeLoader';

export type BuildDataMaintenanceActionHandlersOptions = {
  backupAbortControllerRef: MutableRefObject<AbortController | null>;
  setProgressDialog: Dispatch<SetStateAction<any>>;
  showToast: (message: string, duration?: number) => void;
  contacts: Contact[];
  user: UserProfile;
  walletBalance: number;
  messages: Record<string, Message[]>;
  favorites: Message[];
  moments: any[];
  settings: any;
  aiSettings: any;
  worldBooks: any[];
  officialArticles: any[];
  contactMemories: ContactMemories;
  friendRequests: FriendRequest[];
  discoverUnreadCount: number;
  inboxLetters: MailLetter[];
  sentLetters: MailLetter[];
  soundVibrationSettings: any;
  hasAgreedTerms: boolean;
  walletBank: { name: string; last4: string };
  musicState: MusicState;
  masks: Mask[];
  htmlTemplates: any[];
  bubbleTemplates: any[];
  forums: any[];
  mailboxTheme: MailboxThemeSettings;
  anonymousChatSettings: any;
  anonymousHistory: any[];
  anonymousHasUnfinishedSession: boolean;
  anonymousUnfinishedSession: any;
  divinationHistory: any[];
  setContacts: Dispatch<SetStateAction<Contact[]>>;
  setUser: Dispatch<SetStateAction<UserProfile>>;
  setWalletBalance: Dispatch<SetStateAction<number>>;
  setMessages: Dispatch<SetStateAction<Record<string, Message[]>>>;
  setFavorites: Dispatch<SetStateAction<Message[]>>;
  setMoments: Dispatch<SetStateAction<any[]>>;
  setSettings: Dispatch<SetStateAction<any>>;
  setAiSettings: Dispatch<SetStateAction<any>>;
  setWorldBooks: Dispatch<SetStateAction<any[]>>;
  setMasks: Dispatch<SetStateAction<Mask[]>>;
  setHtmlTemplates?: Dispatch<SetStateAction<any[]>>;
  setBubbleTemplates?: Dispatch<SetStateAction<any[]>>;
  setForums: Dispatch<SetStateAction<any[]>>;
  setSoundVibrationSettings: Dispatch<SetStateAction<any>>;
  setContactMemories: Dispatch<SetStateAction<ContactMemories>>;
  setOfficialArticles: Dispatch<SetStateAction<any[]>>;
  setFriendRequests: Dispatch<SetStateAction<FriendRequest[]>>;
  setDiscoverUnreadCount: Dispatch<SetStateAction<number>>;
  setInboxLetters: Dispatch<SetStateAction<MailLetter[]>>;
  setSentLetters: Dispatch<SetStateAction<MailLetter[]>>;
  setMailboxTheme: Dispatch<SetStateAction<MailboxThemeSettings>>;
  setAnonymousChatSettings: Dispatch<SetStateAction<any>>;
  setAnonymousHistory: Dispatch<SetStateAction<any[]>>;
  setAnonymousHasUnfinishedSession: Dispatch<SetStateAction<boolean>>;
  setAnonymousUnfinishedSession: Dispatch<SetStateAction<any>>;
  setDivinationHistory: Dispatch<SetStateAction<any[]>>;
  setHasAgreedTerms: Dispatch<SetStateAction<boolean>>;
  setWalletBank: Dispatch<SetStateAction<{ name: string; last4: string }>>;
  setMusicState: Dispatch<SetStateAction<MusicState>>;
  setIsStateLoaded: Dispatch<SetStateAction<boolean>>;
  openConfirm: (message: string, onConfirm: () => void, title?: string) => void;
  setSelectedMailboxLetter: Dispatch<SetStateAction<MailLetter | null>>;
  setAnonymousSessionActive: Dispatch<SetStateAction<boolean>>;
  setAnonymousPartner: Dispatch<SetStateAction<any | null>>;
  setAnonymousSessionStartedAt: Dispatch<SetStateAction<number | null>>;
  setAnonymousPeerLeft: Dispatch<SetStateAction<boolean>>;
  setAnonymousInputValue: Dispatch<SetStateAction<string>>;
  setAnonymousViewingHistoryId: Dispatch<SetStateAction<string | null>>;
  setAnonymousIsMatching: Dispatch<SetStateAction<boolean>>;
  setDivinationDraft: Dispatch<SetStateAction<DivinationDraft>>;
  anonymousChatId: string;
  openAlert: (message: string, title?: string) => void;
  forceReloadApp: () => void;
  setSelectedContactId: Dispatch<SetStateAction<string | null>>;
  setActiveSubView: Dispatch<SetStateAction<any>>;
  setSubViewStack: Dispatch<SetStateAction<any[]>>;
  setCurrentDivinationRecord: Dispatch<SetStateAction<DivinationHistoryItem | null>>;
  setDivinationSubmitting: Dispatch<SetStateAction<boolean>>;
};

export const buildDataMaintenanceActionHandlers = (options: BuildDataMaintenanceActionHandlersOptions) => {
  return {
    buildSnapshot: async () => {
      const runtime = await loadDataMaintenanceHandlerRuntime();
      return runtime.buildSnapshotRuntime(options);
    },
    estimateTokens: async () => {
      const runtime = await loadDataMaintenanceHandlerRuntime();
      return runtime.estimateTokensRuntime(options);
    },
    handleBackup: async () => {
      const runtime = await loadDataMaintenanceHandlerRuntime();
      await runtime.handleBackupRuntime(options);
    },
    handleRestore: async (file: File, mode: RestoreMode = 'overwrite') => {
      const runtime = await loadDataMaintenanceHandlerRuntime();
      await runtime.handleRestoreRuntime(options, file, mode);
    },
    handleClearMailboxData: async () => {
      const runtime = await loadDataMaintenanceHandlerRuntime();
      await runtime.handleClearMailboxDataRuntime(options);
    },
    handleClearForumData: async () => {
      const runtime = await loadDataMaintenanceHandlerRuntime();
      await runtime.handleClearForumDataRuntime(options);
    },
    handleClearMusicData: async () => {
      const runtime = await loadDataMaintenanceHandlerRuntime();
      await runtime.handleClearMusicDataRuntime(options);
    },
    handleClearAnonymousData: async () => {
      const runtime = await loadDataMaintenanceHandlerRuntime();
      await runtime.handleClearAnonymousDataRuntime(options);
    },
    handleClearStorage: async () => {
      const runtime = await loadDataMaintenanceHandlerRuntime();
      await runtime.handleClearStorageRuntime(options);
    }
  };
};
