import {
  BUILTIN_OFFICIAL_ARTICLES,
  DEFAULT_APPEARANCE_SETTINGS,
  DEFAULT_WORLD_BOOKS,
  INITIAL_CONTACTS,
  INITIAL_USER,
  MOCK_MOMENTS
} from '../constants.ts';
import { DEFAULT_ANONYMOUS_SETTINGS } from './anonymousChatUtils.ts';
import { PLAYLIST_STORAGE_KEY } from '../music/musicCommon.ts';
import { clearAllLocalPersistedData } from '../services/localDataCleanup.ts';
import { syncAllEnabledEmojisFromState, syncEmojiStoreStateToWindow } from '../chatroom/emojiStore.ts';
import { bumpRuntimeResetEpoch } from '../services/runtimeResetGuard.ts';
import { bumpAnonymousRuntimeResetEpoch } from '../services/anonymousRuntimeResetGuard.ts';
import { globalAudioManager } from '../services/globalAudio.ts';
import { bumpMusicRuntimeResetEpoch } from '../services/musicRuntimeResetGuard.ts';
import { createDefaultDivinationDraft } from '../services/divinationService.ts';

const buildInitialMessagePatch = () => ({
  '1': [{ id: 'm-init', senderId: '1', content: '嗨，最近在忙什么？', timestamp: Date.now(), type: 'text' }]
});

const buildInitialMailboxTheme = () => ({
  skin: 'mailbox',
  paperBackground: '',
  fontColor: '#2f2416',
  signatureImage: '',
  stampImage: '',
  myMaskId: ''
});

const buildInitialMusicState = () => ({
  queue: [],
  currentIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  joinedIds: [],
  togetherStartAt: null,
  togetherElapsed: 0,
  togetherMode: 'together',
  distanceKm: 0,
  audioUrl: null,
  playMode: 'sequence'
});

const buildInitialWalletBank = () => ({
  name: '工商银行',
  last4: '4780'
});

const resetRuntimeSidecarWindowState = (): void => {
  const emptyEmojiState = {
    customEmojis: [],
    emojiGroups: [],
    groupEmojis: {},
    hiddenEmojiIds: [],
    customEmojiOrder: []
  };
  syncEmojiStoreStateToWindow(emptyEmojiState);
  syncAllEnabledEmojisFromState(emptyEmojiState);
  (window as any).selectedContacts = [];
  (window as any).currentArticle = null;
  (window as any).newStickers = null;
  (window as any).imageLibraryGroups = [];
  (window as any).imageLibraryItems = [];
};

export const runClearMailboxFlow = (params: any): void => {
  params.openConfirm('确定清空信箱数据吗？将清除收信、发信与信箱设置。', () => {
    params.setInboxLetters([]);
    params.setSentLetters([]);
    params.setSelectedMailboxLetter(null);
    params.setMailboxTheme(buildInitialMailboxTheme());
    params.showToast('信箱数据已清空');
  }, '清空信箱数据');
};

export const runClearForumFlow = (params: any): void => {
  params.openConfirm('确定清空论坛数据吗？将清除论坛空间与帖子。', () => {
    params.setForums([]);
    params.showToast('论坛数据已清空');
  }, '清空论坛数据');
};

export const runClearMusicFlow = (params: any): void => {
  params.openConfirm('确定清空音乐数据吗？将清除播放队列、进度和联机状态。', () => {
    bumpMusicRuntimeResetEpoch();
    try {
      localStorage.removeItem(PLAYLIST_STORAGE_KEY);
    } catch {
      // 本地播放列表缓存清理失败不应阻止当前界面状态重置。
    }
    globalAudioManager.stop();
    params.setMusicState(buildInitialMusicState());
    params.showToast('音乐数据已清空');
  }, '清空音乐数据');
};

export const runClearAnonymousFlow = (params: any): void => {
  params.openConfirm('确定清空匿名聊天数据吗？将清除历史记录与未完成会话。', () => {
    bumpAnonymousRuntimeResetEpoch();
    params.setAnonymousHistory([]);
    params.setAnonymousHasUnfinishedSession(false);
    params.setAnonymousUnfinishedSession(null);
    params.setAnonymousSessionActive(false);
    params.setAnonymousPartner(null);
    params.setAnonymousSessionStartedAt(null);
    params.setAnonymousPeerLeft(false);
    params.setAnonymousInputValue('');
    params.setAnonymousViewingHistoryId(null);
    params.setAnonymousIsMatching(false);
    params.setMessages((prev: Record<string, any[]>) => {
      const next = { ...prev };
      delete next[params.anonymousChatId];
      return next;
    });
    params.showToast('匿名聊天数据已清空');
  }, '清空匿名聊天数据');
};

export const runClearStorageFlow = (params: any): void => {
  params.openConfirm('确定清空本地数据吗？此操作不可恢复。', () => {
    void (async () => {
      try {
        await clearAllLocalPersistedData();
      } catch (error) {
        console.error('Clear local persisted data error:', error);
        params.openAlert(`清空失败：${error instanceof Error ? error.message : '未知错误'}`, '清空数据');
        return;
      }
      bumpAnonymousRuntimeResetEpoch();
      bumpMusicRuntimeResetEpoch();
      bumpRuntimeResetEpoch();
      globalAudioManager.stop();
      resetRuntimeSidecarWindowState();
      params.setSelectedContactId(null);
      params.setActiveSubView('none');
      params.setSubViewStack(['none']);
      params.setDivinationDraft(createDefaultDivinationDraft());
      params.setCurrentDivinationRecord(null);
      params.setDivinationSubmitting(false);
      params.showToast('已清空，正在刷新...');
      params.setIsStateLoaded(false);
      window.setTimeout(() => params.forceReloadApp(), 120);
      window.setTimeout(() => params.forceReloadApp(), 1200);
      window.setTimeout(() => {
        resetRuntimeSidecarWindowState();
        params.setContacts(INITIAL_CONTACTS);
        params.setUser(INITIAL_USER);
        params.setWalletBalance(Number.isFinite(INITIAL_USER.balance) ? Number(INITIAL_USER.balance) : 0);
        params.setWalletBank(buildInitialWalletBank());
        params.setMessages(buildInitialMessagePatch());
        params.setMoments(MOCK_MOMENTS);
        params.setFavorites([]);
        params.setSettings(DEFAULT_APPEARANCE_SETTINGS);
        params.setAiSettings(params.normalizeAiSettings({ provider: 'builtin' }));
        params.setWorldBooks(DEFAULT_WORLD_BOOKS);
        params.setMasks([]);
        params.setHtmlTemplates?.([]);
        params.setBubbleTemplates?.([]);
        params.setForums([]);
        params.setSoundVibrationSettings(params.normalizeSoundVibrationSettings());
        params.setContactMemories({});
        params.setOfficialArticles(BUILTIN_OFFICIAL_ARTICLES);
        params.setFriendRequests([]);
        params.setDiscoverUnreadCount(0);
        params.setInboxLetters([]);
        params.setSentLetters([]);
        params.setSelectedMailboxLetter(null);
        params.setMailboxTheme(buildInitialMailboxTheme());
        params.setAnonymousChatSettings(DEFAULT_ANONYMOUS_SETTINGS);
        params.setAnonymousHistory([]);
        params.setAnonymousHasUnfinishedSession(false);
        params.setAnonymousUnfinishedSession(null);
        params.setAnonymousSessionActive(false);
        params.setAnonymousPartner(null);
        params.setAnonymousSessionStartedAt(null);
        params.setAnonymousPeerLeft(false);
        params.setAnonymousInputValue('');
        params.setAnonymousViewingHistoryId(null);
        params.setAnonymousIsMatching(false);
        params.setDivinationDraft(createDefaultDivinationDraft());
        params.setDivinationHistory([]);
        params.setCurrentDivinationRecord(null);
        params.setDivinationSubmitting(false);
        params.setHasAgreedTerms(false);
        params.setMusicState(buildInitialMusicState());
        params.setSelectedContactId(null);
        params.setActiveSubView('none');
        params.setSubViewStack(['none']);
        params.setIsStateLoaded(true);
        params.showToast('已清空');
      }, 1800);
    })();
  }, '清空数据');
};
