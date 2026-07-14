import React from 'react';
import type { Contact, Message, SoundVibrationSettings, SubView, UserProfile, AppearanceSettings, AISettings } from '../../types';
import { AnonymousHeaderActions, AnonymousSettingsOverlay } from '../anonymousPanels';
import type { AnonymousChatSettings } from '../anonymousChatUtils';

const ChatRoom = React.lazy(() => import('../../ChatRoom'));

export type AnonymousChatSubView = Extract<SubView, 'anonymousChat'>;

type AnonymousChatSubViewParams = {
  subView: AnonymousChatSubView;
  goBackSubView: () => void;
  pushSubView: (sub: SubView) => void;
  anonymousChatId: string;
  messages: Record<string, Message[]>;
  typingContactIds: string[];
  anonymousViewingHistoryId: string | null;
  anonymousPartner: { gender: 'male' | 'female'; age: number; tags: string[] } | null;
  anonymousSessionActive: boolean;
  anonymousIsMatching: boolean;
  anonymousHasUnfinishedSession: boolean;
  anonymousUnfinishedSession: unknown;
  anonymousPeerLeft: boolean;
  anonymousSettingsVisible: boolean;
  anonymousChatSettings: AnonymousChatSettings;
  anonymousTagDraft: string;
  setAnonymousTagDraft: React.Dispatch<React.SetStateAction<string>>;
  setAnonymousChatSettings: React.Dispatch<React.SetStateAction<AnonymousChatSettings>>;
  setAnonymousSettingsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  aiSettings: AISettings;
  user: UserProfile;
  settings: AppearanceSettings;
  soundVibrationSettings: SoundVibrationSettings;
  inputMode: 'text' | 'voice';
  setInputMode: React.Dispatch<React.SetStateAction<'text' | 'voice'>>;
  showPanel: 'emoji' | 'more' | 'none';
  setShowPanel: React.Dispatch<React.SetStateAction<'emoji' | 'more' | 'none'>>;
  anonymousInputValue: string;
  setAnonymousInputValue: React.Dispatch<React.SetStateAction<string>>;
  contacts: Contact[];
  hideHeaderAvatar: boolean;
  rootSkinId: string;
  onStartAnonymousMatch: () => void;
  onResumeAnonymousSession: () => void;
  onAnonymousSend: () => void;
  onAnonymousLeave: (reason: 'leftByMe' | 'leftByPeer' | 'system') => void;
};

const buildAnonymousChatContact = (anonymousSessionActive: boolean, anonymousPeerLeft: boolean): Contact => ({
  id: 'anonymous-chat',
  name: '匿名聊天',
  pinyin: 'N',
  avatar: '/assets/image/user.png',
  unreadCount: 0,
  isAi: true,
  isGroup: false,
  chatMode: 'online',
  status: anonymousSessionActive
    ? '已匹配'
    : anonymousPeerLeft
      ? '对方已离开'
      : '未匹配'
});

export const renderAnonymousChatSubView = (params: AnonymousChatSubViewParams) => {
  const anonymousMsgs = params.messages[params.anonymousChatId] || [];
  const isAnonymousTyping = params.typingContactIds.includes(params.anonymousChatId);
  const isViewingHistory = !!params.anonymousViewingHistoryId;
  const anonymousChatContact = buildAnonymousChatContact(params.anonymousSessionActive, params.anonymousPeerLeft);
  const anonymousHeaderActions = (
    <AnonymousHeaderActions
      onOpenHistory={() => {
        params.setAnonymousSettingsVisible(false);
        params.pushSubView('anonymousHistory');
      }}
      onToggleSettings={() => params.setAnonymousSettingsVisible((value) => !value)}
    />
  );
  const anonymousOverlayPanels = (
    <AnonymousSettingsOverlay
      visible={params.anonymousSettingsVisible}
      settings={params.anonymousChatSettings}
      tagDraft={params.anonymousTagDraft}
      onTagDraftChange={params.setAnonymousTagDraft}
      onToggleTag={(tag) => {
        params.setAnonymousChatSettings((prev) => {
          const exists = prev.tags.includes(tag);
          if (exists) {
            return { ...prev, tags: prev.tags.filter((item) => item !== tag) };
          }
          if (prev.tags.length >= 6) return prev;
          return { ...prev, tags: [...prev.tags, tag] };
        });
      }}
      onSettingsChange={(updater) => params.setAnonymousChatSettings(updater)}
      onClose={() => params.setAnonymousSettingsVisible(false)}
    />
  );
  const infoBar = params.anonymousPartner ? (
    <div className="px-3 py-2 border-b render-border-subtle render-bg-secondary text-[12px]">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium render-text-primary">{params.anonymousPartner.gender === 'male' ? '男' : '女'}</span>
        <span className="render-text-secondary">{params.anonymousPartner.age}岁</span>
        {params.anonymousPartner.tags.map((tag) => (
          <span key={tag} className="px-2 py-0.5 rounded-full render-bg-primary border render-border-subtle render-text-secondary">{tag}</span>
        ))}
      </div>
      {isViewingHistory && (
        <div className="mt-1 text-[11px] render-text-secondary">历史会话（只读），无法继续对话</div>
      )}
    </div>
  ) : (
    <div className="px-3 py-2 border-b render-border-subtle render-bg-secondary text-[12px] render-text-secondary">尚未匹配，点击开始聊天后将随机生成人设</div>
  );

  if (!params.anonymousSessionActive && anonymousMsgs.length === 0) {
    return (
      <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
        <div className="flex items-center px-4 border-b render-border" style={{ paddingTop: 'var(--safe-top)', height: 'calc(var(--header-height, 48px) + var(--safe-top))' }}>
          <button onClick={() => params.goBackSubView()} className="text-lg render-text-primary">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <div className="flex-1 text-center text-[16px] font-semibold render-text-primary">匿名聊天</div>
          <div className="flex items-center gap-3">{anonymousHeaderActions}</div>
        </div>
        {anonymousOverlayPanels}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {params.anonymousIsMatching && (
            <div className="mb-5 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: 'var(--app-accent-color)', borderRightColor: 'var(--app-accent-color)' }} />
              <div className="mt-2 text-xs render-text-secondary">正在匹配中，请稍候…</div>
            </div>
          )}
          <button
            className="h-11 px-6 rounded-lg text-white font-semibold disabled:opacity-60"
            style={{ backgroundColor: 'var(--app-accent-color)' }}
            onClick={params.onStartAnonymousMatch}
            disabled={params.anonymousIsMatching}
          >
            {params.anonymousIsMatching ? '匹配中...' : '开始聊天'}
          </button>
          {params.anonymousHasUnfinishedSession && !!params.anonymousUnfinishedSession && (
            <button
              className="mt-3 h-10 px-5 rounded-lg border render-border render-text-primary text-[14px] font-medium"
              onClick={params.onResumeAnonymousSession}
            >
              回到刚刚的聊天
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <ChatRoom
        contact={anonymousChatContact}
        me={params.user}
        messages={anonymousMsgs}
        settings={{ ...params.settings, chatBg: params.settings.chatBg }}
        vibrationEnabled={params.soundVibrationSettings.vibrationEnabled}
        inputValue={params.anonymousInputValue}
        setInputValue={params.setAnonymousInputValue}
        inputMode={params.inputMode}
        setInputMode={params.setInputMode}
        showPanel={params.showPanel}
        setShowPanel={params.setShowPanel}
        onSend={params.onAnonymousSend}
        onTempSend={() => {}}
        enableSentenceSend={false}
        onBack={params.goBackSubView}
        onMore={() => {}}
        onAvatarClick={() => {}}
        onSub={params.pushSubView}
        allContacts={params.contacts}
        onPat={() => {}}
        isTyping={isAnonymousTyping}
        hideHeaderAvatar={params.hideHeaderAvatar}
        hideMessageAvatar
        hideMessageSenderName
        titleOverride="匿名聊天"
        subtitleOverride={params.rootSkinId === 'imessage' ? undefined : (isAnonymousTyping ? '对方正在输入中…' : undefined)}
        showMoreAction={false}
        headerActions={anonymousHeaderActions}
        topInfoBar={infoBar}
        composerReplacement={
          params.anonymousSessionActive ? (
            <div className="flex items-center gap-2">
              <button className="h-9 px-3 rounded text-[13px] border render-border render-text-primary" onClick={() => params.onAnonymousLeave('leftByMe')}>
                离开
              </button>
              <div className="flex-1 render-bg-secondary rounded-md border render-border overflow-hidden">
                <textarea
                  rows={1}
                  className="block w-full min-h-9 max-h-[120px] bg-transparent text-gray-900 dark:text-white px-2 py-2 outline-none resize-none leading-5"
                  placeholder="输入消息..."
                  value={params.anonymousInputValue}
                  onChange={(e) => params.setAnonymousInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      params.onAnonymousSend();
                    }
                  }}
                />
              </div>
              <button className="h-9 px-3 rounded text-white text-[14px] font-semibold" style={{ backgroundColor: 'var(--app-accent-color)' }} onClick={params.onAnonymousSend}>
                发送
              </button>
            </div>
          ) : (
            <button
              className="w-full h-10 rounded text-white font-semibold disabled:opacity-60"
              style={{ backgroundColor: 'var(--app-accent-color)' }}
              onClick={params.onStartAnonymousMatch}
              disabled={params.anonymousIsMatching}
            >
              {params.anonymousIsMatching ? '匹配中...' : '重新匹配'}
            </button>
          )
        }
        aiSettings={params.aiSettings}
      />
      {anonymousOverlayPanels}
    </>
  );
};

export const AnonymousChatSubViewRouter: React.FC<AnonymousChatSubViewParams> = (params) => (
  <React.Suspense fallback={<div className="h-full render-bg-primary" />}>
    {renderAnonymousChatSubView(params)}
  </React.Suspense>
);
