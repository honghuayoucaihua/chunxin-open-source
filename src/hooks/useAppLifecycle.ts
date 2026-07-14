import { useEffect, useRef } from 'react';
import type { AppearanceSettings, SoundVibrationSettings, AISettings, Contact, ContactMemories, FriendRequest, HtmlTemplate, BubbleTemplate, MailLetter, Message, Moment, UserProfile, Mask, ForumSpace } from '../types';
import { INITIAL_CONTACTS, BUILTIN_OFFICIAL_ARTICLES } from '../constants';
import { loadState, saveState } from '../services/storage';
import { buildSnapshotPayload } from '../services/snapshotService';
import {
  adaptLegacyBackupData,
  isFullAppSnapshotPayload,
  maybeNormalizeContacts,
  maybeNormalizeMessages,
  normalizeSoundVibrationSettings,
  shouldSkipImportedContact,
  unwrapImportedBackupData
} from '../appStateMigrationUtils';
import {
  mergeBuiltInContacts,
  normalizeAiSettings,
  normalizeAppearanceSettings,
  DEFAULT_ADD_FRIEND_GREETING
} from '../appBootstrapUtils';
import { applyEmojiPersistedState } from '../services/emojiPersistenceState';
import {
  ANONYMOUS_CHAT_ID,
  DEFAULT_ANONYMOUS_SETTINGS,
  type AnonymousChatHistoryItem,
  type AnonymousChatPartner,
  type AnonymousChatSettings
} from '../app/anonymousChatUtils';
import { normalizeDivinationHistory } from '../services/divinationService';
import type { MailboxThemeSettings } from '../mailbox/MailboxSubPages';
import type { MusicState } from '../music/musicCommon.ts';
import type { ContactFormData } from '../utils/UtilsSubPages';
import type { DivinationHistoryItem } from '../types';
import { applyTruthOrDarePersistedState } from '../chatroom/truthOrDarePersistence.ts';
import { applyImageLibraryPersistedState } from '../services/imageLibraryStore.ts';
import { applyNovelPersistedState } from '../pages/novelDiscoverHelpers.ts';
import { applyAiProviderPersistedState } from '../settings/ai/aiProviderPersistence.ts';
import { persistPlaylistFromMusicState } from '../music/musicCommon.ts';

export interface AppLifecycleSetters {
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  setMessages: React.Dispatch<React.SetStateAction<Record<string, Message[]>>>;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  setWalletBalance: React.Dispatch<React.SetStateAction<number>>;
  setMoments: React.Dispatch<React.SetStateAction<Moment[]>>;
  setFavorites: React.Dispatch<React.SetStateAction<Message[]>>;
  setSettings: React.Dispatch<React.SetStateAction<AppearanceSettings>>;
  setIsAppearanceReady: React.Dispatch<React.SetStateAction<boolean>>;
  setAiSettings: React.Dispatch<React.SetStateAction<AISettings>>;
  setWorldBooks: React.Dispatch<React.SetStateAction<any[]>>;
  setMasks: React.Dispatch<React.SetStateAction<Mask[]>>;
  setForums: React.Dispatch<React.SetStateAction<ForumSpace[]>>;
  setSoundVibrationSettings: React.Dispatch<React.SetStateAction<SoundVibrationSettings>>;
  setWalletBank: React.Dispatch<React.SetStateAction<{ name: string; last4: string }>>;
  setMusicState: React.Dispatch<React.SetStateAction<MusicState>>;
  setContactMemories: React.Dispatch<React.SetStateAction<ContactMemories>>;
  setOfficialArticles: React.Dispatch<React.SetStateAction<any[]>>;
  setFriendRequests: React.Dispatch<React.SetStateAction<FriendRequest[]>>;
  setDiscoverUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  setInboxLetters: React.Dispatch<React.SetStateAction<MailLetter[]>>;
  setSentLetters: React.Dispatch<React.SetStateAction<MailLetter[]>>;
  setMailboxTheme: React.Dispatch<React.SetStateAction<MailboxThemeSettings>>;
  setAnonymousChatSettings: React.Dispatch<React.SetStateAction<AnonymousChatSettings>>;
  setAnonymousHistory: React.Dispatch<React.SetStateAction<AnonymousChatHistoryItem[]>>;
  setAnonymousHasUnfinishedSession: React.Dispatch<React.SetStateAction<boolean>>;
  setAnonymousUnfinishedSession: React.Dispatch<React.SetStateAction<{ partner: AnonymousChatPartner; messages: Message[]; startedAt: number } | null>>;
  setDivinationHistory: React.Dispatch<React.SetStateAction<DivinationHistoryItem[]>>;
  setHasAgreedTerms: React.Dispatch<React.SetStateAction<boolean>>;
  setHtmlTemplates: React.Dispatch<React.SetStateAction<HtmlTemplate[]>>;
  setBubbleTemplates: React.Dispatch<React.SetStateAction<BubbleTemplate[]>>;
  setIsStateLoaded: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface AppLifecycleOptions {
  onPersistError?: (message: string) => void;
}

/**
 * Loads persisted state on mount, saves state periodically on changes
 */
export function useAppLifecycle(
  setters: AppLifecycleSetters,
  persistDeps: {
    contacts: Contact[];
    user: UserProfile;
    walletBalance: number;
    walletBank: { name: string; last4: string };
    musicState: MusicState;
    messages: Record<string, Message[]>;
    favorites: Message[];
    moments: Moment[];
    settings: AppearanceSettings;
    aiSettings: AISettings;
    worldBooks: any[];
    masks: Mask[];
    forums: ForumSpace[];
    officialArticles: any[];
    contactMemories: ContactMemories;
    friendRequests: FriendRequest[];
    discoverUnreadCount: number;
    inboxLetters: MailLetter[];
    sentLetters: MailLetter[];
    mailboxTheme: MailboxThemeSettings;
    soundVibrationSettings: SoundVibrationSettings;
    hasAgreedTerms: boolean;
    isStateLoaded: boolean;
    anonymousChatSettings: AnonymousChatSettings;
    anonymousHistory: AnonymousChatHistoryItem[];
    anonymousHasUnfinishedSession: boolean;
    anonymousUnfinishedSession: { partner: AnonymousChatPartner; messages: Message[]; startedAt: number } | null;
    divinationHistory: DivinationHistoryItem[];
    htmlTemplates: HtmlTemplate[];
    bubbleTemplates: BubbleTemplate[];
  },
  options: AppLifecycleOptions = {}
): void {
  const lastPersistErrorNoticeAtRef = useRef(0);
  const { onPersistError } = options;

  // Load state on mount
  useEffect(() => {
    let mounted = true;

    loadState()
      .then(async (persisted) => {
        if (!mounted || !persisted) return;
        const restored = adaptLegacyBackupData(unwrapImportedBackupData(persisted));

        const normalizedContacts = maybeNormalizeContacts(restored.contacts);
        const filteredContacts = normalizedContacts
          ? normalizedContacts.filter((c) => !shouldSkipImportedContact(c))
          : null;
        if (filteredContacts) {
          setters.setContacts(mergeBuiltInContacts(filteredContacts));
        }
        if (restored.messages) {
          setters.setMessages(maybeNormalizeMessages(restored.messages, filteredContacts || INITIAL_CONTACTS));
        }

        if (restored.user) {
          setters.setUser(restored.user);
          setters.setWalletBalance(Number.isFinite(restored.user?.balance) ? Number(restored.user?.balance) : 0);
        }
        if (restored.moments) setters.setMoments(restored.moments);
        if (restored.favorites) setters.setFavorites(restored.favorites);
        if (restored.settings) {
          setters.setIsAppearanceReady(false);
          setters.setSettings(normalizeAppearanceSettings(restored.settings as AppearanceSettings));
        }
        if (restored.aiSettings) setters.setAiSettings(normalizeAiSettings(restored.aiSettings));
        if (restored.worldBooks) setters.setWorldBooks(restored.worldBooks);
        if ((restored as any).masks) setters.setMasks((restored as any).masks);
        if (Array.isArray((restored as any).htmlTemplates)) setters.setHtmlTemplates((restored as any).htmlTemplates);
        if (Array.isArray((restored as any).bubbleTemplates)) setters.setBubbleTemplates((restored as any).bubbleTemplates);
        if (Array.isArray((restored as any).forums)) setters.setForums((restored as any).forums);
        setters.setSoundVibrationSettings(normalizeSoundVibrationSettings((restored as any).soundVibrationSettings));
        if ((restored as any).walletBank && typeof (restored as any).walletBank === 'object') {
          const bank = (restored as any).walletBank;
          setters.setWalletBank({
            name: String(bank.name || '工商银行'),
            last4: String(bank.last4 || '4780')
          });
        }
        if ((restored as any).musicState && typeof (restored as any).musicState === 'object') {
          setters.setMusicState(prev => ({ ...prev, ...(restored as any).musicState }));
          persistPlaylistFromMusicState((restored as any).musicState);
        }
        await applyEmojiPersistedState(restored);
        if (restored.selectedContacts) (window as any).selectedContacts = restored.selectedContacts;
        if (restored.currentArticle) (window as any).currentArticle = restored.currentArticle;
        if (restored.contactMemories && typeof restored.contactMemories === 'object') setters.setContactMemories(restored.contactMemories as ContactMemories);
        if (restored.officialArticles) {
          setters.setOfficialArticles(restored.officialArticles);
        } else {
          setters.setOfficialArticles(BUILTIN_OFFICIAL_ARTICLES);
        }
        if (Array.isArray(restored.friendRequests)) {
          setters.setFriendRequests((restored.friendRequests as FriendRequest[]).filter(req => !shouldSkipImportedContact(req.contact)));
        }
        if (Number.isFinite(Number((restored as any).discoverUnreadCount))) {
          setters.setDiscoverUnreadCount(Number((restored as any).discoverUnreadCount));
        }
        if (Array.isArray((restored as any).inboxLetters)) {
          setters.setInboxLetters((restored as any).inboxLetters as MailLetter[]);
        }
        if (Array.isArray((restored as any).sentLetters)) {
          setters.setSentLetters((restored as any).sentLetters as MailLetter[]);
        }
        if ((restored as any).mailboxTheme && typeof (restored as any).mailboxTheme === 'object') {
          setters.setMailboxTheme(prev => ({ ...prev, ...((restored as any).mailboxTheme as Partial<MailboxThemeSettings>) }));
        }
        const shouldRestorePersistedModules = isFullAppSnapshotPayload(restored)
          || Array.isArray((restored as any).truthDareThemes)
          || Object.prototype.hasOwnProperty.call(restored, 'truthDareRuntime')
          || Array.isArray((restored as any).imageLibraryGroups)
          || Array.isArray((restored as any).imageLibraryItems)
          || Array.isArray((restored as any).novelBookshelf)
          || ((restored as any).novelReaderAppearance && typeof (restored as any).novelReaderAppearance === 'object')
          || ((restored as any).novelPreference && typeof (restored as any).novelPreference === 'object')
          || Array.isArray((restored as any).aiProviderPresets)
          || ((restored as any).aiProviderConfigs && typeof (restored as any).aiProviderConfigs === 'object');
        if (shouldRestorePersistedModules) {
          applyTruthOrDarePersistedState(restored, 'overwrite');
          applyImageLibraryPersistedState(restored, 'overwrite');
          applyNovelPersistedState(restored, 'overwrite');
          applyAiProviderPersistedState(restored, 'overwrite');
        }
        const restoredAnonymousSettings = (restored as any).anonymousChatSettings;
        if (restoredAnonymousSettings && typeof restoredAnonymousSettings === 'object') {
          const onlyOppositeSex = !!restoredAnonymousSettings.onlyOppositeSex;
          const incomingRange = Array.isArray(restoredAnonymousSettings.ageRange)
            ? restoredAnonymousSettings.ageRange
            : DEFAULT_ANONYMOUS_SETTINGS.ageRange;
          const minAge = Math.max(16, Number(incomingRange[0] || 18));
          const maxAge = Math.max(minAge, Number(incomingRange[1] || 35));
          const tags = Array.isArray(restoredAnonymousSettings.tags)
            ? restoredAnonymousSettings.tags.map((t: any) => String(t || '').trim()).filter(Boolean).slice(0, 6)
            : [];
          setters.setAnonymousChatSettings({ onlyOppositeSex, ageRange: [minAge, maxAge], tags });
        }
        const restoredHistoryRaw = Array.isArray((restored as any).anonymousChatHistory)
          ? ((restored as any).anonymousChatHistory as any[])
          : [];
        const restoredHistory = restoredHistoryRaw.map((item: any) => {
          const messages = Array.isArray(item?.messages)
            ? item.messages
            : [{
                id: `${item?.endedAt || Date.now()}-history-tip`,
                senderId: ANONYMOUS_CHAT_ID,
                content: item?.reason === 'leftByPeer' ? '对方离开了聊天' : '你已离开当前聊天',
                timestamp: Number(item?.endedAt || Date.now()),
                type: 'system'
              } as Message];
          return {
            ...item,
            messages
          } as AnonymousChatHistoryItem;
        });
        setters.setAnonymousHistory(restoredHistory);
        setters.setAnonymousHasUnfinishedSession(Boolean((restored as any).anonymousHasUnfinishedSession));
        setters.setDivinationHistory(normalizeDivinationHistory((restored as any).divinationHistory));
        const restoredUnfinished = (restored as any).anonymousUnfinishedSession;
        if (restoredUnfinished && typeof restoredUnfinished === 'object' && restoredUnfinished.partner) {
          setters.setAnonymousUnfinishedSession({
            partner: restoredUnfinished.partner as AnonymousChatPartner,
            messages: Array.isArray(restoredUnfinished.messages) ? restoredUnfinished.messages as Message[] : [],
            startedAt: Number(restoredUnfinished.startedAt || Date.now())
          });
        } else {
          setters.setAnonymousUnfinishedSession(null);
        }
        setters.setHasAgreedTerms(
          typeof (restored as any).hasAgreedTerms === 'boolean'
            ? Boolean((restored as any).hasAgreedTerms)
            : true
        );
      })
      .catch((error) => {
        console.error('[AppLifecycle] 加载持久状态失败，以初始状态启动:', error);
      })
      .finally(() => {
        if (mounted) {
          setters.setIsStateLoaded(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Save state on changes
  const {
    contacts, user, walletBalance, walletBank, musicState, messages, favorites, moments,
    settings, aiSettings, worldBooks, masks, forums, officialArticles, contactMemories,
    friendRequests, discoverUnreadCount, inboxLetters, sentLetters, mailboxTheme,
    soundVibrationSettings, hasAgreedTerms, isStateLoaded,
    anonymousChatSettings, anonymousHistory, anonymousHasUnfinishedSession, anonymousUnfinishedSession,
    divinationHistory,
    htmlTemplates, bubbleTemplates
  } = persistDeps;

  useEffect(() => {
    if (!isStateLoaded) return;
    const handler = window.setTimeout(() => {
      const payload = buildSnapshotPayload({
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
        anonymousChatHistory: anonymousHistory,
        anonymousHasUnfinishedSession,
        anonymousUnfinishedSession,
        divinationHistory,
        htmlTemplates,
        bubbleTemplates
      });
      saveState(payload).catch((error) => {
        console.error('Persist state error:', error);
        const now = Date.now();
        if (now - lastPersistErrorNoticeAtRef.current >= 30000) {
          lastPersistErrorNoticeAtRef.current = now;
          onPersistError?.('本地保存失败，请检查浏览器存储空间');
        }
      });
    }, 1200);
    return () => window.clearTimeout(handler);
  }, [contacts, user, walletBalance, walletBank, musicState, messages, favorites, moments, settings, aiSettings, worldBooks, masks, forums, officialArticles, contactMemories, friendRequests, discoverUnreadCount, inboxLetters, sentLetters, mailboxTheme, soundVibrationSettings, hasAgreedTerms, isStateLoaded, anonymousChatSettings, anonymousHistory, anonymousHasUnfinishedSession, anonymousUnfinishedSession, divinationHistory, htmlTemplates, bubbleTemplates, onPersistError]);
}
