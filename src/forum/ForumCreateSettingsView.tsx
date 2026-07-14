import React from 'react';
import { MobileHeader } from '../Common';
import { Contact, Mask, WorldBook } from '../types';
import ChoiceChip from './ChoiceChip';
import { SharedEmptyState } from '../settings/SharedPanelPrimitives';

type ForumCreateSettingsViewProps = {
  isSettings: boolean;
  onBack: () => void;
  contactOptions: Contact[];
  masks: Mask[];
  worldBooks: WorldBook[];
  forumNameInput: string;
  onForumNameInputChange: (value: string) => void;
  selectedContactIds: string[];
  onToggleContactId: (id: string) => void;
  selectedMaskId: string;
  onSelectedMaskIdChange: (value: string) => void;
  selectedMaskIds: string[];
  onSelectedMaskIdsChange: React.Dispatch<React.SetStateAction<string[]>>;
  tagInput: string;
  onTagInputChange: (value: string) => void;
  onAddTag: () => void;
  tags: string[];
  onRemoveTag: (tag: string) => void;
  worldviewInput: string;
  onWorldviewInputChange: (value: string) => void;
  selectedWorldBookIds: string[];
  onToggleWorldBook: (id: string) => void;
  canCreateForum: boolean;
  isGenerating: boolean;
  onCreateForum: () => void;
  onSaveForumSettings: () => void;
  onDeleteForum: () => void;
};

const ForumCreateSettingsView: React.FC<ForumCreateSettingsViewProps> = ({
  isSettings,
  onBack,
  contactOptions,
  masks,
  worldBooks,
  forumNameInput,
  onForumNameInputChange,
  selectedContactIds,
  onToggleContactId,
  selectedMaskId,
  onSelectedMaskIdChange,
  selectedMaskIds,
  onSelectedMaskIdsChange,
  tagInput,
  onTagInputChange,
  onAddTag,
  tags,
  onRemoveTag,
  worldviewInput,
  onWorldviewInputChange,
  selectedWorldBookIds,
  onToggleWorldBook,
  canCreateForum,
  isGenerating,
  onCreateForum,
  onSaveForumSettings,
  onDeleteForum
}) => (
  <div className="flex flex-col h-full render-bg-primary render-text-primary">
    <MobileHeader title={isSettings ? '论坛设置' : '新建论坛'} onBack={onBack} />
    <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-4">
      <div className="app-field">
        <div className="text-sm font-semibold mb-2">论坛名称</div>
        <input className="app-field-input text-sm" value={forumNameInput} onChange={(e) => onForumNameInputChange(e.target.value)} />
      </div>

      <div>
        <div className="text-sm font-semibold mb-2">联系人（可多选）</div>
        {contactOptions.length === 0 ? (
          <SharedEmptyState className="py-2 text-xs render-text-secondary">暂无可选联系人</SharedEmptyState>
        ) : (
          <div className="flex flex-wrap gap-2">
            {contactOptions.map((c) => (
              <ChoiceChip key={c.id} active={selectedContactIds.includes(c.id)} label={c.name} onClick={() => onToggleContactId(c.id)} />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="text-sm font-semibold mb-2">面具（可多选）</div>
        {masks.length === 0 ? (
          <SharedEmptyState className="py-2 text-xs render-text-secondary">暂无已创建面具</SharedEmptyState>
        ) : (
          <div className="flex flex-wrap gap-2">
            <ChoiceChip active={selectedMaskIds.length === 0} label="不使用" onClick={() => { onSelectedMaskIdsChange([]); onSelectedMaskIdChange(''); }} />
            {masks.map((m) => (
              <ChoiceChip
                key={m.id}
                active={selectedMaskIds.includes(m.id)}
                label={m.name}
                onClick={() => {
                  onSelectedMaskIdsChange((prev) => {
                    const next = prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id];
                    onSelectedMaskIdChange(next[0] || '');
                    return next;
                  });
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="app-field">
        <div className="text-sm font-semibold mb-2">论坛板块（可编辑）</div>
        <div className="app-field-row">
          <input
            className="app-field-input flex-1 text-sm"
            placeholder="输入板块并添加"
            value={tagInput}
            onChange={(e) => onTagInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddTag();
              }
            }}
          />
          <button className="app-button app-button-primary app-icon-button" onClick={onAddTag}>
            <i className="fa-solid fa-plus"></i>
          </button>
        </div>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border render-border-subtle">
                #{t}
                <button onClick={() => onRemoveTag(t)}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="app-field">
        <div className="text-sm font-semibold mb-2">世界观（可选）</div>
        <textarea className="app-field-textarea text-sm" rows={4} value={worldviewInput} onChange={(e) => onWorldviewInputChange(e.target.value)} />
      </div>

      <div>
        <div className="text-sm font-semibold mb-2">世界书（可选）</div>
        <div className="space-y-2">
          {worldBooks.map((book) => {
            const checked = selectedWorldBookIds.includes(book.id);
            return (
              <button
                key={book.id}
                type="button"
                className={`w-full text-left px-3 py-2 rounded-lg border ${checked ? 'text-white border-transparent' : 'render-border-subtle render-bg-primary render-text-secondary'}`}
                style={checked ? { backgroundColor: 'var(--app-accent-color)' } : {}}
                onClick={() => onToggleWorldBook(book.id)}
              >
                <div className="text-[13px] font-medium">{book.name}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>

    <div className="p-4 border-t render-border-subtle render-bg-tertiary space-y-2">
      {!isSettings ? (
        <button
          className="w-full app-button app-button-primary"
          disabled={!canCreateForum || isGenerating}
          onClick={onCreateForum}
        >
          {isGenerating ? '处理中...' : '进入论坛'}
        </button>
      ) : (
        <>
          <button className="w-full app-button app-button-primary" onClick={onSaveForumSettings}>
            保存设置
          </button>
          <button className="w-full app-button app-button-danger border border-red-500" onClick={onDeleteForum}>
            删除论坛
          </button>
        </>
      )}
    </div>
  </div>
);

export default ForumCreateSettingsView;
