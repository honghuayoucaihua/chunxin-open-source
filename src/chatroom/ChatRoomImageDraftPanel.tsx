import React from 'react';

export type PendingImageDraft = {
  id: string;
  imageUrl: string;
  imageCaption: string;
};

type ChatRoomImageDraftPanelProps = {
  drafts: PendingImageDraft[];
  isSending: boolean;
  onClose: () => void;
  onCaptionChange: (id: string, value: string) => void;
  onRemove: (id: string) => void;
  onSend: () => void;
};

export const ChatRoomImageDraftPanel: React.FC<ChatRoomImageDraftPanelProps> = ({
  drafts,
  isSending,
  onClose,
  onCaptionChange,
  onRemove,
  onSend
}) => (
  <div className="fixed inset-0 z-[550] bg-black/30 flex items-end" onClick={onClose}>
    <div
      className="w-full max-w-md mx-auto render-bg-secondary rounded-t-2xl border-t render-border"
      style={{ paddingBottom: 'calc(16px + var(--safe-bottom))' }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="px-4 py-3 border-b render-border flex items-center justify-between">
        <span className="text-[16px] font-semibold render-text-primary">图片描述</span>
        <button className="text-[13px] render-text-secondary" onClick={onClose}>关闭</button>
      </div>
      <div className="max-h-[55vh] overflow-y-auto px-4 py-3 space-y-3">
        {drafts.map((draft) => (
          <div key={draft.id} className="flex gap-3">
            <img src={draft.imageUrl} alt="" className="w-16 h-16 rounded object-cover flex-shrink-0 chat-media-preview-thumb" />
            <div className="flex-1 space-y-1">
              <textarea
                className="w-full h-16 rounded render-bg-tertiary px-2 py-1 text-[13px] render-text-primary outline-none resize-none"
                placeholder="输入这张图的文字描述（可留空）"
                value={draft.imageCaption}
                onChange={(event) => onCaptionChange(draft.id, event.target.value)}
              />
              <button className="text-[12px] text-danger" onClick={() => onRemove(draft.id)}>删除</button>
            </div>
          </div>
        ))}
        {!drafts.length && (
          <div className="text-center text-[13px] render-text-secondary py-6">暂无待发送图片</div>
        )}
      </div>
      <div className="px-4 pt-2">
        <button
          className="w-full h-11 rounded-lg text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--app-accent-color)' }}
          disabled={!drafts.length || isSending}
          onClick={onSend}
        >
          {isSending ? '发送中...' : `发送 ${drafts.length} 张图片`}
        </button>
      </div>
    </div>
  </div>
);

export default ChatRoomImageDraftPanel;
