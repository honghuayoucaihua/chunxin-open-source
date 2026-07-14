import React from 'react';
import SkinIcon from '../shell/SkinIcon';
import type { QuotedMessageSnapshot } from '../types';
import { getQuotePreviewText } from '../utils/chat/messageQuote';

type ChatRoomComposerProps = {
  composerReplacement?: React.ReactNode;
  leftActions?: React.ReactNode;
  isWechatSkin?: boolean;
  isStoryMode?: boolean;
  showDescriptionToggle?: boolean;
  descriptionInputKind?: 'say' | 'do';
  descriptionSayEnabled?: boolean;
  descriptionDoEnabled?: boolean;
  setDescriptionInputKind: (value: 'say' | 'do') => void;
  setInputMode: (value: 'text' | 'voice') => void;
  inputMode: 'text' | 'voice';
  storyInputKind?: 'chat' | 'story';
  setStoryInputKind?: (value: 'chat' | 'story') => void;
  isIMessageSkin?: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
  setShowPanel: (value: 'emoji' | 'more' | 'none') => void;
  showPanel: 'emoji' | 'more' | 'none';
  textInputRef: React.RefObject<HTMLTextAreaElement | null>;
  onInputAdjust?: () => void;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
  onSendWithOptions?: (payload: { text?: string; append?: boolean; source?: 'manual' | 'generated' | 'storyAdvance' | 'storyInsight'; inputKind?: 'chat' | 'story' }) => Promise<void> | void;
  onSend: () => void;
  onDescriptionComposerSend?: () => void;
  enableSentenceSend?: boolean;
  onTempSend: () => void;
  handleGenerateReplies?: (force: boolean) => Promise<void> | void;
  isGeneratingReplies?: boolean;
  generatedReplies?: string[];
  isKakaoSkin?: boolean;
  isTelegramSkin?: boolean;
  isY2KSkin?: boolean;
  isRetroSkin?: boolean;
  handleUseGeneratedReply?: (value: string) => void;
  quotedMessage?: QuotedMessageSnapshot | null;
  resolveSenderName: (senderId: string) => string;
  onCancelQuote?: () => void;
};

const ChatRoomComposer: React.FC<ChatRoomComposerProps> = (props) => {
  if (props.composerReplacement) {
    return (
      <div className="p-2" onClick={(e) => e.stopPropagation()}>
        {props.composerReplacement}
      </div>
    );
  }

  return (
    <>
      <div className="p-2 flex items-center space-x-2 render-chat-composer-row" onClick={(e) => e.stopPropagation()}>
        {props.leftActions}
        {props.isWechatSkin && !props.isStoryMode && !props.showDescriptionToggle && (
          <button
            className="flex items-center justify-center text-gray-700 dark:text-[#E1E1E1] text-2xl render-chat-btn"
            style={{ width: 'var(--render-input-action-size, 32px)', height: 'var(--render-input-action-size, 32px)' }}
            onClick={() => props.setInputMode(props.inputMode === 'text' ? 'voice' : 'text')}
          >
            <SkinIcon icon={props.inputMode === 'text' ? 'fa-microphone' : 'fa-keyboard'} />
          </button>
        )}
        {props.isStoryMode && (
          <div className="h-7 rounded-full border render-border-subtle render-bg-secondary p-0.5 flex items-center w-[58px]">
            <button
              className={`flex-1 h-full rounded-full text-[11px] leading-none font-medium transition-all ${props.storyInputKind === 'chat' ? 'text-white' : 'render-text-secondary'}`}
              style={props.storyInputKind === 'chat' ? { backgroundColor: 'var(--app-accent-color)' } : {}}
              onClick={() => props.setStoryInputKind?.('chat')}
            >
              说
            </button>
            <button
              className={`flex-1 h-full rounded-full text-[11px] leading-none font-medium transition-all ${props.storyInputKind === 'story' ? 'text-white' : 'render-text-secondary'}`}
              style={props.storyInputKind === 'story' ? { backgroundColor: 'var(--app-accent-color)' } : {}}
              onClick={() => props.setStoryInputKind?.('story')}
            >
              做
            </button>
          </div>
        )}
        {props.showDescriptionToggle && !props.isStoryMode && (
          <div className="h-7 rounded-full border render-border-subtle render-bg-secondary p-0.5 flex items-center w-[58px]">
            <button
              disabled={!props.descriptionSayEnabled}
              className={`flex-1 h-full rounded-full text-[11px] leading-none font-medium transition-all ${props.descriptionInputKind === 'say' ? 'text-white' : 'render-text-secondary'}`}
              style={props.descriptionInputKind === 'say' ? { backgroundColor: 'var(--app-accent-color)' } : {}}
              onClick={() => props.setDescriptionInputKind('say')}
            >
              说
            </button>
            <button
              disabled={!props.descriptionDoEnabled}
              className={`flex-1 h-full rounded-full text-[11px] leading-none font-medium transition-all ${props.descriptionInputKind === 'do' ? 'text-white' : 'render-text-secondary'}`}
              style={props.descriptionInputKind === 'do' ? { backgroundColor: 'var(--app-accent-color)' } : {}}
              onClick={() => props.setDescriptionInputKind('do')}
            >
              做
            </button>
          </div>
        )}
        {props.isIMessageSkin && !props.inputValue.trim() && !props.isStoryMode && (
          <button
            className="flex items-center justify-center text-gray-700 text-2xl render-chat-btn render-imessage-plus-btn"
            style={{ width: 'var(--render-input-action-size, 32px)', height: 'var(--render-input-action-size, 32px)' }}
            onClick={() => props.setShowPanel(props.showPanel === 'more' ? 'none' : 'more')}
          >
            <SkinIcon icon="fa-plus" />
          </button>
        )}
        <div
          className="flex-1 render-bg-secondary rounded-md overflow-hidden render-chat-input-shell render-chat-composer-shell relative"
          style={{
            borderRadius: 'var(--render-input-radius, 8px)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border-color)'
          }}
        >
          {props.inputMode === 'text' ? (
            <textarea
              ref={props.textInputRef}
              rows={1}
              className={`block w-full min-h-9 max-h-[160px] bg-transparent render-text-primary px-2 py-2 outline-none resize-none leading-5 ${props.isIMessageSkin ? 'pr-10' : ''}`}
              placeholder={props.isStoryMode
                ? (props.storyInputKind === 'chat' ? '输入聊天内容…' : '输入一段剧情…')
                : props.showDescriptionToggle
                  ? (props.descriptionInputKind === 'do' ? '输入场景描述…' : '输入聊天内容…')
                  : (props.isIMessageSkin ? '讯息 · SMS' : undefined)}
              value={props.inputValue}
              onChange={(e) => props.setInputValue(e.target.value)}
              onInput={props.onInputAdjust}
              onFocus={props.onInputFocus}
              onBlur={props.onInputBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (props.isStoryMode && props.onSendWithOptions) {
                    void props.onSendWithOptions({ text: props.inputValue, append: true, source: 'manual', inputKind: props.storyInputKind });
                  } else if (props.showDescriptionToggle && props.onDescriptionComposerSend) {
                    props.onDescriptionComposerSend();
                  } else {
                    props.onSend();
                  }
                }
              }}
            />
          ) : (
            <div className="w-full h-9 flex items-center justify-center font-bold render-text-primary active:bg-[var(--bg-hover)]">按住 说话</div>
          )}
          {props.isIMessageSkin && !props.inputValue.trim() && !props.isStoryMode && (
            <button
              className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-gray-400 render-imessage-inline-mic"
              style={{ width: '22px', height: '22px' }}
              onClick={() => props.setShowPanel(props.showPanel === 'emoji' ? 'none' : 'emoji')}
            >
              <SkinIcon icon="fa-face-smile" variant="fa-regular" />
            </button>
          )}
        </div>
        {!props.isStoryMode && !props.isIMessageSkin && !props.inputValue.trim() && (
          <button
            className="flex items-center justify-center text-gray-700 dark:text-[#E1E1E1] text-2xl render-chat-btn"
            style={{ width: 'var(--render-input-action-size, 32px)', height: 'var(--render-input-action-size, 32px)' }}
            onClick={() => props.setShowPanel(props.showPanel === 'emoji' ? 'none' : 'emoji')}
          >
            <SkinIcon icon="fa-face-smile" variant="fa-regular" />
          </button>
        )}
        {props.enableSentenceSend && props.inputValue.trim() && !props.isStoryMode && (
          <button className="h-9 text-white px-2.5 rounded font-bold text-[13px] active:opacity-70 whitespace-nowrap" style={{ backgroundColor: 'var(--app-accent-color)' }} onClick={(e) => { e.stopPropagation(); props.onTempSend(); }}>分句</button>
        )}
        {props.inputValue.trim() ? (
          <button
            className="h-9 w-9 rounded-full text-white text-[14px] active:opacity-70 flex items-center justify-center"
            style={{ backgroundColor: 'var(--app-accent-color)' }}
            onClick={(e) => {
              e.stopPropagation();
              if (props.isStoryMode && props.onSendWithOptions) {
                void props.onSendWithOptions({ text: props.inputValue, append: true, source: 'manual', inputKind: props.storyInputKind });
              } else if (props.showDescriptionToggle && props.onDescriptionComposerSend) {
                props.onDescriptionComposerSend();
              } else {
                props.onSend();
              }
            }}
          >
            <SkinIcon icon="fa-paper-plane" />
          </button>
        ) : props.isStoryMode ? (
          <button
            className="h-9 w-9 rounded-full text-white text-[14px] active:opacity-70 disabled:opacity-60 flex items-center justify-center"
            style={{ backgroundColor: 'var(--app-accent-color)' }}
            onClick={(e) => {
              e.stopPropagation();
              void props.handleGenerateReplies?.(true);
            }}
            disabled={props.isGeneratingReplies}
            title={props.isGeneratingReplies ? '生成中' : '生成'}
          >
            <i className={`fa-solid ${props.isGeneratingReplies ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`}></i>
          </button>
        ) : !props.isIMessageSkin ? (
          <button
            className="flex items-center justify-center text-gray-700 dark:text-[#E1E1E1] text-2xl render-chat-btn"
            style={{ width: 'var(--render-input-action-size, 32px)', height: 'var(--render-input-action-size, 32px)' }}
            onClick={() => props.setShowPanel(props.showPanel === 'more' ? 'none' : 'more')}
          >
            <SkinIcon icon="fa-circle-plus" />
          </button>
        ) : null}
      </div>
      {props.isStoryMode && props.generatedReplies && props.generatedReplies.length > 0 && !props.inputValue.trim() && (
        <div className="px-2.5 pb-2">
          <div
            className={`border p-2 ${props.isIMessageSkin ? 'rounded-[18px] shadow-sm' : props.isY2KSkin ? 'rounded-none' : props.isRetroSkin ? 'rounded-md' : 'rounded-xl'} ${props.isKakaoSkin ? 'bg-[#F8F9FB] dark:bg-[#2A2B2D] border-[#E5E8EF] dark:border-[#44484D]' : props.isTelegramSkin ? 'bg-[#F7FAFF] dark:bg-[#1E2A36] border-[#DDE8F7] dark:border-[#34506D]' : props.isY2KSkin ? 'bg-white dark:bg-[#101010] border-gray-300 dark:border-gray-700' : props.isRetroSkin ? 'bg-[#FFFDF5] dark:bg-[#1F1A12] border-[#D8C8A4] dark:border-[#5D4A2D]' : 'render-bg-secondary render-border-subtle'}`}
          >
            <div className="space-y-1.5">
              {props.generatedReplies.map((item: string, idx: number) => (
                <div key={`${item}-${idx}`} className="flex items-center gap-1.5">
                  <button
                    className={`flex-1 text-left px-2.5 py-2 border text-[13px] active:opacity-80 ${props.isIMessageSkin ? 'rounded-[14px]' : props.isY2KSkin ? 'rounded-none' : 'rounded-lg'} ${props.isKakaoSkin ? 'bg-white dark:bg-[#212325] border-[#E7EBF2] dark:border-[#3B3F45] text-[#1F2937] dark:text-[#F3F4F6]' : props.isTelegramSkin ? 'bg-white/90 dark:bg-[#243444] border-[#D8E7FA] dark:border-[#45627F] text-[#1E293B] dark:text-[#E2E8F0]' : props.isY2KSkin ? 'bg-white dark:bg-[#121212] border-gray-300 dark:border-gray-700 text-black dark:text-white' : props.isRetroSkin ? 'bg-[#FFF9E8] dark:bg-[#2A2215] border-[#D8C8A4] dark:border-[#5D4A2D] text-[#2C2416] dark:text-[#F6EAD0]' : 'render-bg-tertiary render-border-subtle render-text-primary'}`}
                    onClick={() => props.handleUseGeneratedReply?.(item)}
                  >
                    {item}
                  </button>
                  <button
                    className={`w-8 h-8 border text-[12px] flex items-center justify-center ${props.isIMessageSkin ? 'rounded-[12px]' : props.isY2KSkin ? 'rounded-none' : 'rounded-lg'} ${props.isKakaoSkin ? 'bg-white dark:bg-[#212325] border-[#E7EBF2] dark:border-[#3B3F45] text-[#6B7280] dark:text-[#D1D5DB]' : props.isTelegramSkin ? 'bg-white/90 dark:bg-[#243444] border-[#D8E7FA] dark:border-[#45627F] text-[#64748B] dark:text-[#CBD5E1]' : props.isY2KSkin ? 'bg-white dark:bg-[#121212] border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300' : props.isRetroSkin ? 'bg-[#FFF9E8] dark:bg-[#2A2215] border-[#D8C8A4] dark:border-[#5D4A2D] text-[#6B5B3E] dark:text-[#D5C5A0]' : 'render-bg-secondary render-border-subtle render-text-secondary'}`}
                    onClick={() => props.setInputValue(item)}
                    title="编辑"
                  >
                    <i className="fa-solid fa-pen"></i>
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2">
              <button
                className={`w-full h-9 border text-[13px] font-medium flex items-center justify-center gap-2 active:opacity-80 ${props.isIMessageSkin ? 'rounded-[14px]' : props.isY2KSkin ? 'rounded-none' : 'rounded-lg'} ${props.isKakaoSkin ? 'bg-white dark:bg-[#212325] border-[#E7EBF2] dark:border-[#3B3F45] text-[#4B5563] dark:text-[#D1D5DB]' : props.isTelegramSkin ? 'bg-white/90 dark:bg-[#243444] border-[#D8E7FA] dark:border-[#45627F] text-[#475569] dark:text-[#CBD5E1]' : props.isY2KSkin ? 'bg-white dark:bg-[#121212] border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200' : props.isRetroSkin ? 'bg-[#FFF9E8] dark:bg-[#2A2215] border-[#D8C8A4] dark:border-[#5D4A2D] text-[#5E4A2B] dark:text-[#D5C5A0]' : 'render-bg-secondary render-border-subtle render-text-secondary'}`}
                onClick={() => void props.handleGenerateReplies?.(true)}
                disabled={props.isGeneratingReplies}
                title={props.isGeneratingReplies ? '生成中' : '换一换'}
              >
                <i className={`fa-solid ${props.isGeneratingReplies ? 'fa-spinner fa-spin' : 'fa-rotate'}`}></i>
                <span>{props.isGeneratingReplies ? '生成中' : '换一换'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {props.quotedMessage && (
        <div className="px-3 pb-2">
          <div className="inline-flex items-center px-2 py-1 text-[12px] bg-white/70 dark:bg-[#222] border border-gray-200 dark:border-gray-700 rounded-md">
            <div className="max-w-[260px] truncate text-gray-600 dark:text-gray-300">
              引用 {props.resolveSenderName(props.quotedMessage.senderId)}：{getQuotePreviewText(props.quotedMessage)}
            </div>
            <button className="ml-2 text-gray-400" onClick={() => props.onCancelQuote?.()}><i className="fa-solid fa-xmark"></i></button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatRoomComposer;
