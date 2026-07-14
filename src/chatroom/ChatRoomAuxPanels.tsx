import React from 'react';
import type { Message } from '../types';

type StoryInsightModalState = { open: boolean; inner: string; status: string };

type ChatRoomAuxPanelsProps = {
  isStoryMode: boolean;
  showInnerActionPanel: boolean;
  setShowInnerActionPanel: (value: boolean) => void;
  innerActionType: 'innerVoice' | 'action';
  setInnerActionType: (value: 'innerVoice' | 'action') => void;
  allowInnerVoice?: boolean;
  allowActionDesc?: boolean;
  innerActionInput: string;
  setInnerActionInput: (value: string) => void;
  onAppendMessage?: (message: Message) => void;
  storyInsightModal: StoryInsightModalState;
  setStoryInsightModal: (value: StoryInsightModalState) => void;
  isGeneratingReplies: boolean;
  inputValue: string;
  generatedReplies: string[];
  showAddEmojiMenu: boolean;
  setShowAddEmojiMenu: (value: boolean) => void;
  onPickAlbum: () => void;
  onPickUrlImport: () => void;
};

const ChatRoomAuxPanels: React.FC<ChatRoomAuxPanelsProps> = ({
  isStoryMode,
  showInnerActionPanel,
  setShowInnerActionPanel,
  innerActionType,
  setInnerActionType,
  allowInnerVoice = true,
  allowActionDesc = true,
  innerActionInput,
  setInnerActionInput,
  onAppendMessage,
  storyInsightModal,
  setStoryInsightModal,
  isGeneratingReplies,
  inputValue,
  generatedReplies,
  showAddEmojiMenu,
  setShowAddEmojiMenu,
  onPickAlbum,
  onPickUrlImport
}) => {
  const effectiveInnerActionType = innerActionType === 'action'
    ? (allowActionDesc ? 'action' : 'innerVoice')
    : (allowInnerVoice ? 'innerVoice' : 'action');
  const canSendInnerAction = (effectiveInnerActionType === 'innerVoice' && allowInnerVoice)
    || (effectiveInnerActionType === 'action' && allowActionDesc);
  const panelTitle = allowInnerVoice && allowActionDesc
    ? '发送心声/动作'
    : (allowInnerVoice ? '发送心声' : '发送动作');

  return (
  <>
    {showInnerActionPanel && !isStoryMode && canSendInnerAction && (
      <div className="fixed bottom-0 left-0 right-0 z-[500] flex flex-col" onClick={() => setShowInnerActionPanel(false)}>
        <div className="app-surface-panel app-sheet shadow-2xl" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 'calc(16px + var(--safe-bottom))' }}>
          <div className="app-surface-header">
            <div className="text-center text-[16px] font-semibold render-text-primary">{panelTitle}</div>
          </div>
          <div className="app-surface-body">
            {allowInnerVoice && allowActionDesc && (
              <div className="flex gap-2 pb-3">
                <button
                  className={`flex-1 app-button ${effectiveInnerActionType === 'innerVoice' ? 'app-button-primary' : 'app-button-muted render-bg-tertiary'}`}
                  style={effectiveInnerActionType === 'innerVoice' ? { backgroundColor: 'var(--app-accent-color)' } : {}}
                  onClick={() => setInnerActionType('innerVoice')}
                >
                  心声
                </button>
                <button
                  className={`flex-1 app-button ${effectiveInnerActionType === 'action' ? 'app-button-primary' : 'app-button-muted render-bg-tertiary'}`}
                  style={effectiveInnerActionType === 'action' ? { backgroundColor: 'var(--app-accent-color)' } : {}}
                  onClick={() => setInnerActionType('action')}
                >
                  动作
                </button>
              </div>
            )}
            <textarea
              className="app-field-textarea h-24 text-[14px] render-bg-tertiary"
              placeholder={effectiveInnerActionType === 'innerVoice' ? '输入心声内容...' : '输入动作描述...'}
              value={innerActionInput}
              onChange={(e) => setInnerActionInput(e.target.value)}
              autoFocus
            />
          </div>
          <div className="app-surface-footer">
            <button className="app-button app-button-muted app-footer-button whitespace-nowrap" onClick={() => setShowInnerActionPanel(false)}>取消</button>
            <button
              className="app-button app-button-muted app-footer-button whitespace-nowrap"
              style={{ color: innerActionInput.trim() ? 'var(--app-accent-color)' : 'var(--render-text-tertiary)' }}
              disabled={!innerActionInput.trim()}
              onClick={() => {
                if (!innerActionInput.trim()) return;
                if (onAppendMessage) {
                  const msg: Message = {
                    id: `${Date.now()}`,
                    senderId: 'me',
                    content: '',
                    timestamp: Date.now(),
                    type: 'text',
                    innerVoice: effectiveInnerActionType === 'innerVoice' && allowInnerVoice ? innerActionInput.trim() : undefined,
                    actionDesc: effectiveInnerActionType === 'action' && allowActionDesc ? innerActionInput.trim() : undefined
                  };
                  onAppendMessage(msg);
                }
                setInnerActionInput('');
                setShowInnerActionPanel(false);
              }}
            >
              发送
            </button>
          </div>
        </div>
      </div>
    )}

    {isStoryMode && storyInsightModal.open && (
      <div className="fixed inset-0 z-[540] flex items-center justify-center bg-black/40" onClick={() => setStoryInsightModal({ open: false, inner: '', status: '' })}>
        <div className="w-[88%] max-w-[440px] app-surface-panel rounded-xl" onClick={(e) => e.stopPropagation()}>
          <div className="app-surface-header">
            <div className="flex items-center justify-between">
              <div className="text-[16px] font-semibold render-text-primary">心声与状态</div>
              <button
                className="app-button app-button-muted app-icon-button border render-border-subtle render-bg-secondary render-text-secondary"
                onClick={() => setStoryInsightModal({ open: false, inner: '', status: '' })}
                title="关闭"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
          <div className="app-surface-body">
            <div className="grid grid-cols-1 gap-2">
              <div className="rounded-lg border render-border-subtle render-bg-tertiary px-3 py-2">
                <div className="text-[12px] font-semibold render-text-secondary mb-1">心声</div>
                <div className="text-[13px] leading-6 whitespace-pre-wrap render-text-primary max-h-[24vh] overflow-y-auto">{storyInsightModal.inner || '暂无心声'}</div>
              </div>
              <div className="rounded-lg border render-border-subtle render-bg-tertiary px-3 py-2">
                <div className="text-[12px] font-semibold render-text-secondary mb-1">状态</div>
                <div className="text-[13px] leading-6 whitespace-pre-wrap render-text-primary max-h-[24vh] overflow-y-auto">{storyInsightModal.status || '暂无状态'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {isStoryMode && isGeneratingReplies && !inputValue.trim() && generatedReplies.length === 0 && (
      <div className="px-3 pb-2 text-[12px] render-text-secondary"><i className="fa-solid fa-spinner fa-spin"></i></div>
    )}

    {showAddEmojiMenu && (
      <div className="fixed inset-0 z-[500] flex items-end justify-center" onClick={() => setShowAddEmojiMenu(false)}>
        <div className="w-full max-w-md app-surface-panel app-sheet shadow-2xl" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 'calc(16px + var(--safe-bottom))' }}>
          <div className="app-surface-header text-center">
            <span className="text-[16px] font-semibold render-text-primary">添加表情</span>
          </div>
          <button
            className="w-full px-6 py-4 text-left render-text-primary active:bg-[var(--bg-hover)] flex items-center space-x-4 app-list-item"
            onClick={onPickAlbum}
          >
            <div className="w-10 h-10 rounded-full render-bg-tertiary flex items-center justify-center">
              <i className="fa-solid fa-image text-lg" style={{ color: 'var(--app-accent-color)' }}></i>
            </div>
            <div>
              <div className="text-[15px] font-medium">从相册导入</div>
              <div className="text-[12px] render-text-tertiary">从手机相册选择图片</div>
            </div>
          </button>
          <button
            className="w-full px-6 py-4 text-left render-text-primary active:bg-[var(--bg-hover)] flex items-center space-x-4 app-list-item"
            onClick={onPickUrlImport}
          >
            <div className="w-10 h-10 rounded-full render-bg-tertiary flex items-center justify-center">
              <i className="fa-solid fa-link text-lg" style={{ color: 'var(--app-accent-color)' }}></i>
            </div>
            <div>
              <div className="text-[15px] font-medium">从URL导入</div>
              <div className="text-[12px] render-text-tertiary">通过图片链接批量添加</div>
            </div>
          </button>
          <button
            className="w-full app-button app-button-danger app-footer-button border-t render-border-subtle whitespace-nowrap"
            onClick={() => setShowAddEmojiMenu(false)}
          >
            取消
          </button>
        </div>
      </div>
    )}
  </>
  );
};

export default ChatRoomAuxPanels;
