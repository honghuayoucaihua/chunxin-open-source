import { useState, useCallback, useRef, useMemo } from 'react';
import type {
  AppTab, Contact, ContactMemories, FriendRequest, HtmlTemplate, BubbleTemplate, MailLetter,
  Message, SubView, UserProfile, AppearanceSettings, AISettings,
  SoundVibrationSettings, Mask, ForumSpace, Moment, QuotedMessageSnapshot
} from '../types';
import { AppTab as AppTabEnum } from '../types';
import { INITIAL_CONTACTS, MOCK_MOMENTS, INITIAL_USER, DEFAULT_APPEARANCE_SETTINGS, DEFAULT_WORLD_BOOKS, BUILTIN_OFFICIAL_ARTICLES } from '../constants';
import type { ContactFormData } from '../utils/UtilsSubPages';
import type { MailboxThemeSettings } from '../mailbox/MailboxSubPages';
import type { MusicState } from '../music/musicCommon';
import { normalizeAiSettings } from '../appBootstrapUtils';
import { normalizeSoundVibrationSettings } from '../appStateMigrationUtils';
import { resolveRenderConfig } from '../render-engine';
import { globalAudioManager } from '../services/globalAudio';
import { createRainDrops, createSnowFlakes, createThunderFlashes } from '../app/visualEffects';
import { applyWalletDelta, parseWalletAmount, parseWalletDelta } from '../app/walletFlowUtils';
import {
  appendSubViewStack,
  isGoBackDebounced,
  popSubViewStack,
  replaceTopSubViewStack
} from '../app/navigationStackUtils';
import {
  DEFAULT_ANONYMOUS_SETTINGS,
  type AnonymousChatHistoryItem,
  type AnonymousChatPartner,
  type AnonymousChatSettings
} from '../app/anonymousChatUtils';
import { createDefaultDivinationDraft } from '../services/divinationService';
import type { DivinationDraft, DivinationHistoryItem } from '../types';
import type { ApkUpdateInfo, DownloadProgress } from '../services/apkUpdateService';
import type { UiDialogState } from '../types';

// 定义属于各个标签页的子视图
const ME_SUB_VIEWS: SubView[] = ['settings', 'aiSettings', 'soundSettings', 'displaySettings', 'skinSettings', 'chatBgSettings', 'storageSettings', 'worldBooks', 'worldBookEdit', 'promptRuleTree', 'editProfile', 'profileMore', 'masks', 'maskEdit', 'htmlTemplates', 'htmlTemplateEdit', 'bubbleTemplates', 'bubbleTemplateEdit'];

export function useAppState() {
  // ==================== Navigation State ====================
  const [activeTab, setActiveTab] = useState<AppTab>(AppTabEnum.CHATS);
  const [activeSubView, setActiveSubView] = useState<SubView>('none');
  const [subViewStack, setSubViewStack] = useState<SubView[]>(['none']);
  const subViewStackRef = useRef<SubView[]>(['none']);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const activeSubViewRef = useRef<SubView>('none');
  const previousSubViewRef = useRef<SubView>('none');
  const historyBackSyncRef = useRef(false);
  const lastGoBackTimeRef = useRef(0);

  // ==================== Chat State ====================
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [showPanel, setShowPanel] = useState<'emoji' | 'more' | 'none'>('none');
  const [quotedMessage, setQuotedMessage] = useState<QuotedMessageSnapshot | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({
    '1': [{ id: 'm-init', senderId: '1', content: '嗨，最近在忙什么？', timestamp: Date.now(), type: 'text' }]
  });
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [typingContactIds, setTypingContactIds] = useState<string[]>([]);
  const replyTaskVersionRef = useRef<Record<string, number>>({});
  const [activeVoiceCallContactId, setActiveVoiceCallContactId] = useState<string | null>(null);
  const [activePaymentMessage, setActivePaymentMessage] = useState<null | { chatId: string; msgId: string; type: 'redpacket' | 'transfer' }>(null);
  const [showRedPacketPreview, setShowRedPacketPreview] = useState(false);

  // ==================== Profile State ====================
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileSnapshot, setProfileSnapshot] = useState<Contact | null>(null);
  const [contactCardPreview, setContactCardPreview] = useState<Contact | null>(null);
  const [contactCardImage, setContactCardImage] = useState('');

  // ==================== Community State ====================
  const [activeCommunityShareId, setActiveCommunityShareId] = useState<string | null>(null);

  // ==================== User State ====================
  const [user, setUser] = useState<UserProfile>(INITIAL_USER);
  const [walletBalance, setWalletBalance] = useState<number>(Number.isFinite(INITIAL_USER.balance) ? Number(INITIAL_USER.balance) : 0);
  const [walletBank, setWalletBank] = useState<{ name: string; last4: string }>({ name: '工商银行', last4: '4780' });
  const [favorites, setFavorites] = useState<Message[]>([]);
  const [moments, setMoments] = useState(MOCK_MOMENTS);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [contactMemories, setContactMemories] = useState<ContactMemories>({});
  const [addFriendDraft, setAddFriendDraft] = useState<Partial<ContactFormData>>({});
  const [addFriendGreetingDraft, setAddFriendGreetingDraft] = useState('你好，我是叙说·春信用户');
  const [editingProfileField, setEditingProfileField] = useState<{ key: keyof UserProfile; label: string; value: string } | null>(null);
  const [discoverUnreadCount, setDiscoverUnreadCount] = useState(0);
  const [hasAgreedTerms, setHasAgreedTerms] = useState(false);

  // ==================== AI State ====================
  const [aiSettings, setAiSettings] = useState<AISettings>(normalizeAiSettings());
  const [worldBooks, setWorldBooks] = useState(DEFAULT_WORLD_BOOKS);
  const [masks, setMasks] = useState<Mask[]>([]);
  const [editingMaskId, setEditingMaskId] = useState<string | null>(null);
  const [editingWorldBook, setEditingWorldBook] = useState<string | null>(null);
  const [htmlTemplates, setHtmlTemplates] = useState<HtmlTemplate[]>([]);
  const [editingHtmlTemplateId, setEditingHtmlTemplateId] = useState<string | null>(null);
  const [bubbleTemplates, setBubbleTemplates] = useState<BubbleTemplate[]>([]);
  const [editingBubbleTemplateId, setEditingBubbleTemplateId] = useState<string | null>(null);

  // ==================== Appearance & UI State ====================
  const [settings, setSettings] = useState<AppearanceSettings>(DEFAULT_APPEARANCE_SETTINGS);
  const [isAppearanceReady, setIsAppearanceReady] = useState(false);
  const [isInDesktopApp, setIsInDesktopApp] = useState(false);
  const [soundVibrationSettings, setSoundVibrationSettings] = useState<SoundVibrationSettings>(normalizeSoundVibrationSettings());
  const [officialArticles, setOfficialArticles] = useState<any[]>(BUILTIN_OFFICIAL_ARTICLES);
  const [forums, setForums] = useState<ForumSpace[]>([]);
  const [isStateLoaded, setIsStateLoaded] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [uiDialog, setUiDialog] = useState<UiDialogState>(null);
  const [uiDialogInput, setUiDialogInput] = useState('');
  const [progressDialog, setProgressDialog] = useState<null | { title?: string; message: string; progress?: number; cancellable?: boolean; onCancel?: () => void }>(null);
  const backupAbortControllerRef = useRef<AbortController | null>(null);
  const lastOfficialAuthorIdRef = useRef<string | null>(null);

  // ==================== Music State ====================
  const [musicState, setMusicState] = useState<MusicState>({
    queue: [], currentIndex: 0, isPlaying: false, currentTime: 0, duration: 0,
    joinedIds: [], togetherStartAt: null, togetherElapsed: 0, togetherMode: 'together',
    distanceKm: 0, audioUrl: null, playMode: 'sequence'
  });

  // ==================== Anonymous Chat State ====================
  const [anonymousChatSettings, setAnonymousChatSettings] = useState<AnonymousChatSettings>(DEFAULT_ANONYMOUS_SETTINGS);
  const [anonymousPartner, setAnonymousPartner] = useState<AnonymousChatPartner | null>(null);
  const [anonymousHistory, setAnonymousHistory] = useState<AnonymousChatHistoryItem[]>([]);
  const [anonymousSessionStartedAt, setAnonymousSessionStartedAt] = useState<number | null>(null);
  const [anonymousSessionActive, setAnonymousSessionActive] = useState(false);
  const [anonymousPeerLeft, setAnonymousPeerLeft] = useState(false);
  const [anonymousInputValue, setAnonymousInputValue] = useState('');
  const [anonymousSettingsVisible, setAnonymousSettingsVisible] = useState(false);
  const [anonymousTagDraft, setAnonymousTagDraft] = useState('');
  const [anonymousIsMatching, setAnonymousIsMatching] = useState(false);
  const [anonymousViewingHistoryId, setAnonymousViewingHistoryId] = useState<string | null>(null);
  const [anonymousHasUnfinishedSession, setAnonymousHasUnfinishedSession] = useState(false);
  const [anonymousUnfinishedSession, setAnonymousUnfinishedSession] = useState<{
    partner: AnonymousChatPartner; messages: Message[]; startedAt: number;
  } | null>(null);

  // ==================== Divination State ====================
  const [divinationDraft, setDivinationDraft] = useState<DivinationDraft>(createDefaultDivinationDraft());
  const [divinationHistory, setDivinationHistory] = useState<DivinationHistoryItem[]>([]);
  const [currentDivinationRecord, setCurrentDivinationRecord] = useState<DivinationHistoryItem | null>(null);
  const [divinationSubmitting, setDivinationSubmitting] = useState(false);

  // ==================== Mailbox State ====================
  const [inboxLetters, setInboxLetters] = useState<MailLetter[]>([]);
  const [sentLetters, setSentLetters] = useState<MailLetter[]>([]);
  const [selectedMailboxLetter, setSelectedMailboxLetter] = useState<MailLetter | null>(null);
  const [selectedMailboxType, setSelectedMailboxType] = useState<'inbox' | 'sent'>('inbox');
  const [mailboxTheme, setMailboxTheme] = useState<MailboxThemeSettings>({
    skin: 'mailbox', paperBackground: '', fontColor: '#2f2416',
    signatureImage: '', stampImage: '', myMaskId: ''
  });

  // ==================== APK/PWA Update State ====================
  const [apkUpdateInfo, setApkUpdateInfo] = useState<ApkUpdateInfo | null>(null);
  const [showApkUpdateDialog, setShowApkUpdateDialog] = useState(false);
  const [apkDownloadProgress, setApkDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPwaUpdateDialog, setShowPwaUpdateDialog] = useState(false);

  // ==================== Derived/Computed Values ====================
  const resolvedRenderConfig = useMemo(() => resolveRenderConfig(settings), [settings]);
  const rootSkinId = resolvedRenderConfig.skinId;
  const isTelegramLayout = resolvedRenderConfig.layout.telegramSidebar;
  const rainDrops = useMemo(() => createRainDrops(), []);
  const snowFlakes = useMemo(() => createSnowFlakes(), []);
  const thunderFlashes = useMemo(() => createThunderFlashes(), []);

  // ==================== Navigation Actions ====================
  const pushSubView = useCallback((next: SubView) => {
    setSubViewStack((prev) => {
      const newStack = appendSubViewStack(prev, next);
      if (newStack === prev) return prev;
      subViewStackRef.current = newStack;
      return newStack;
    });
    setActiveSubView(next);
  }, []);

  const replaceSubView = useCallback((next: SubView) => {
    setSubViewStack((prev) => {
      const cloned = replaceTopSubViewStack(prev, next);
      subViewStackRef.current = cloned;
      return cloned;
    });
    setActiveSubView(next);
  }, []);

  const goBackSubView = useCallback((source: 'app' | 'history' = 'app', steps = 1) => {
    const now = Date.now();
    if (isGoBackDebounced(lastGoBackTimeRef.current, now)) return;
    lastGoBackTimeRef.current = now;
    if (source === 'app') {
      historyBackSyncRef.current = true;
    }
    let currentStack = subViewStackRef.current;
    let isFromMeTab = false;
    let nextView: SubView = 'none';
    for (let i = 0; i < steps; i++) {
      const currentView = currentStack[currentStack.length - 1];
      if (ME_SUB_VIEWS.includes(currentView)) isFromMeTab = true;
      const result = popSubViewStack(currentStack);
      currentStack = result.newStack;
      nextView = result.nextView;
    }
    if (nextView === 'none' && isFromMeTab) {
      setActiveTab(AppTabEnum.ME);
    }
    subViewStackRef.current = currentStack;
    setSubViewStack(currentStack);
    setActiveSubView(nextView);
  }, []);

  const resetNavigation = useCallback(() => {
    subViewStackRef.current = ['none'];
    setSubViewStack(['none']);
    setActiveSubView('none');
    setSelectedContactId(null);
    setProfileId(null);
    setProfileSnapshot(null);
    setShowPanel('none');
    setQuotedMessage(null);
    historyBackSyncRef.current = true;
  }, []);

  // ==================== UI Actions ====================
  const handleMusicStateChange = useCallback((partial: Partial<MusicState>) => {
    setMusicState(prev => ({ ...prev, ...partial }));
  }, []);

  const showToastFn = useCallback((message: string, duration = 1800) => {
    const id = Date.now();
    setToast({ id, message });
    window.setTimeout(() => {
      setToast(prev => (prev && prev.id === id ? null : prev));
    }, duration);
  }, []);

  const openAlert = useCallback((message: string, title?: string, options?: Partial<Exclude<UiDialogState, null>>) => {
    setUiDialog({ type: 'alert', title, message, ...options });
  }, []);

  const openConfirm = useCallback((
    message: string,
    onConfirm: () => void,
    title?: string,
    options?: {
      onCancel?: () => void;
      confirmText?: string;
      cancelText?: string;
      dismissOnBackdrop?: boolean;
    }
  ) => {
    setUiDialog({ type: 'confirm', title, message, onConfirm, ...options });
  }, []);

  const openPrompt = useCallback((message: string, defaultValue: string, onConfirm: (value?: string) => boolean | void, title?: string) => {
    setUiDialogInput(defaultValue ?? '');
    setUiDialog({ type: 'prompt', title, message, onConfirm });
  }, []);

  const applyWalletIncome = useCallback((amount?: string | number) => {
    const parsed = parseWalletAmount(String(amount ?? ''));
    if (parsed === null) return;
    setWalletBalance(prev => {
      const next = applyWalletDelta(prev, parsed);
      setUser(userPrev => ({ ...userPrev, balance: next }));
      return next;
    });
  }, []);

  const applyContactBalanceDelta = useCallback((contactId: string | null | undefined, delta?: string | number) => {
    const parsed = parseWalletDelta(delta);
    if (!contactId || parsed === null || parsed === 0) return;
    setContacts(prev => prev.map(contact => {
      if (contact.id !== contactId || contact.isGroup) return contact;
      const current = Number.isFinite(Number(contact.balance)) ? Number(contact.balance) : 0;
      const next = applyWalletDelta(current, parsed);
      return { ...contact, balance: Math.max(0, next) };
    }));
  }, []);

  return {
    // Navigation
    activeTab, setActiveTab, activeSubView, setActiveSubView, subViewStack, setSubViewStack,
    subViewStackRef, isMobile, setIsMobile, showPlusMenu, setShowPlusMenu,
    activeSubViewRef, previousSubViewRef, historyBackSyncRef,
    pushSubView, replaceSubView, goBackSubView, resetNavigation,

    // Chat
    selectedContactId, setSelectedContactId, inputValue, setInputValue,
    inputMode, setInputMode, showPanel, setShowPanel, quotedMessage, setQuotedMessage,
    messages, setMessages, contacts, setContacts, typingContactIds, setTypingContactIds,
    replyTaskVersionRef,
    activeVoiceCallContactId, setActiveVoiceCallContactId,
    activePaymentMessage, setActivePaymentMessage, showRedPacketPreview, setShowRedPacketPreview,

    // Profile
    profileId, setProfileId, profileSnapshot, setProfileSnapshot,
    contactCardPreview, setContactCardPreview, contactCardImage, setContactCardImage,

    // Community
    activeCommunityShareId, setActiveCommunityShareId,

    // User
    user, setUser, walletBalance, setWalletBalance, walletBank, setWalletBank,
    favorites, setFavorites, moments, setMoments, friendRequests, setFriendRequests,
    contactMemories, setContactMemories, addFriendDraft, setAddFriendDraft,
    addFriendGreetingDraft, setAddFriendGreetingDraft, editingProfileField, setEditingProfileField,
    discoverUnreadCount, setDiscoverUnreadCount,
    hasAgreedTerms, setHasAgreedTerms, applyWalletIncome, applyContactBalanceDelta,

    // AI
    aiSettings, setAiSettings, worldBooks, setWorldBooks, masks, setMasks,
    editingMaskId, setEditingMaskId, editingWorldBook, setEditingWorldBook,
    htmlTemplates, setHtmlTemplates, editingHtmlTemplateId, setEditingHtmlTemplateId,
    bubbleTemplates, setBubbleTemplates, editingBubbleTemplateId, setEditingBubbleTemplateId,

    // Appearance & UI
    settings, setSettings, isAppearanceReady, setIsAppearanceReady,
    isInDesktopApp, setIsInDesktopApp,
    soundVibrationSettings, setSoundVibrationSettings,
    officialArticles, setOfficialArticles, forums, setForums,
    isStateLoaded, setIsStateLoaded,
    toast, setToast, uiDialog, setUiDialog, uiDialogInput, setUiDialogInput,
    progressDialog, setProgressDialog, backupAbortControllerRef, lastOfficialAuthorIdRef,
    resolvedRenderConfig, rootSkinId, isTelegramLayout, rainDrops, snowFlakes, thunderFlashes,
    showToast: showToastFn, openAlert, openConfirm, openPrompt,

    // Music
    musicState, setMusicState, handleMusicStateChange,

    // Anonymous
    anonymousChatSettings, setAnonymousChatSettings,
    anonymousPartner, setAnonymousPartner,
    anonymousHistory, setAnonymousHistory,
    anonymousSessionStartedAt, setAnonymousSessionStartedAt,
    anonymousSessionActive, setAnonymousSessionActive,
    anonymousPeerLeft, setAnonymousPeerLeft,
    anonymousInputValue, setAnonymousInputValue,
    anonymousSettingsVisible, setAnonymousSettingsVisible,
    anonymousTagDraft, setAnonymousTagDraft,
    anonymousIsMatching, setAnonymousIsMatching,
    anonymousViewingHistoryId, setAnonymousViewingHistoryId,
    anonymousHasUnfinishedSession, setAnonymousHasUnfinishedSession,
    anonymousUnfinishedSession, setAnonymousUnfinishedSession,

    // Divination
    divinationDraft, setDivinationDraft,
    divinationHistory, setDivinationHistory,
    currentDivinationRecord, setCurrentDivinationRecord,
    divinationSubmitting, setDivinationSubmitting,

    // Mailbox
    inboxLetters, setInboxLetters, sentLetters, setSentLetters,
    selectedMailboxLetter, setSelectedMailboxLetter,
    selectedMailboxType, setSelectedMailboxType,
    mailboxTheme, setMailboxTheme,

    // APK/PWA Update
    apkUpdateInfo, setApkUpdateInfo,
    showApkUpdateDialog, setShowApkUpdateDialog,
    apkDownloadProgress, setApkDownloadProgress,
    isDownloading, setIsDownloading,
    showPwaUpdateDialog, setShowPwaUpdateDialog,
  };
}

export type AppState = ReturnType<typeof useAppState>;
