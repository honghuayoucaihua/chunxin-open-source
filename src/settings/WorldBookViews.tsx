import React, { useState } from 'react';
import { AISettings, WorldBook } from '../types';
import { MobileHeader, SectionDivider } from '../Common';
import { formatCharCount, getWorldBookContentChars, getWorldBookContextChars, getWorldBookDescriptionChars, getWorldBookEntryChars } from '../services/aiContextAssetStats';
import { AppSwitch } from '../utils/UtilsContactFormPrimitives';
import { TemplateEditorEntryCard, TemplateEditorFieldCard, TemplateEditorSummaryCard, TemplateListCard } from './TemplateEditorPrimitives';
import { SharedEmptyState } from './SharedPanelPrimitives';
import { resolveEncryptedHiddenRawObject } from '../utils/encryptedReadModel';
import { confirmWechatAction, promptWechatAction } from '../utils/wechatDialog';
import { PROMPT_RULE_TREE_RULE_OPTIONS, DEFAULT_PROMPT_RULE_TREE_GROUPS, normalizePromptRuleTreeSettings } from '../utils/prompt/promptRuleTree';

const getResolvedWorldBookEntries = (book: WorldBook) => {
  if (Array.isArray(book.entries) && book.entries.length > 0) return book.entries;
  const hidden = resolveEncryptedHiddenRawObject(book.encryptedHiddenRaw);
  return hidden && Array.isArray(hidden.entries) ? hidden.entries : [];
};

export const WorldBooksView: React.FC<{
  books: WorldBook[];
  setBooks: (b: WorldBook[]) => void;
  onBack: () => void;
  onEdit: (book: WorldBook) => void;
  onOpenRuleTree: () => void;
}> = ({ books, setBooks, onBack, onEdit, onOpenRuleTree }) => {
  const hasReadOnlyBooks = books.some((book) => !!book.encryptedReadOnly);
  const addBook = () => {
    promptWechatAction('世界书名称', '', (name?: string) => {
      if (!name) return;
      const newBook: WorldBook = { id: `wb-${Date.now()}`, name, description: '', enabled: true, entries: [] };
      setBooks([...books, newBook]);
      onEdit(newBook);
    });
  };

  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader title="世界书" onBack={onBack} actions={<button className="app-button app-button-primary whitespace-nowrap" onClick={addBook}>新增</button>} />
      {hasReadOnlyBooks && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-md text-[12px] bg-amber-500/10 text-amber-600">
          含加密导入的世界书，这些条目为只读不可编辑（可删除）
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        <SectionDivider label="规则树" />
        <div className="mx-3">
          <TemplateListCard className="flex items-center gap-3">
            <button className="flex-1 min-w-0 text-left" onClick={onOpenRuleTree}>
              <div className="font-medium text-[14px] leading-5 truncate">规则树</div>
              <div className="text-xs text-gray-400 mt-1 leading-5">内置角色扮演规则，用简单开关提升聊天和剧情体验</div>
            </button>
            <i className="fa-solid fa-chevron-right text-[12px] text-gray-400" />
          </TemplateListCard>
        </div>
        <SectionDivider label="世界书" />
        {books.map((book) => (
          <div key={book.id} className="mt-3 mx-3">
            <TemplateListCard className="flex items-center gap-3">
              <button className="flex-1 min-w-0 text-left" onClick={() => onEdit(book)}>
                <div className="font-medium text-[14px] leading-5 truncate">{book.name}</div>
                <div className="text-xs text-gray-400 mt-1 leading-5 truncate">{String(book.description || '').trim() || '暂无描述'}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {getResolvedWorldBookEntries(book).length} 条内容 · AI上下文约 {formatCharCount(getWorldBookContextChars(book))}
                </div>
              </button>
              <AppSwitch active={book.enabled} onChange={() => {
                if (book.encryptedReadOnly) return;
                setBooks(books.map((item) => (item.id === book.id ? { ...item, enabled: !item.enabled } : item)));
              }} />
            </TemplateListCard>
          </div>
        ))}
        {books.length === 0 && <SharedEmptyState className="py-10">暂无世界书</SharedEmptyState>}
      </div>
    </div>
  );
};

export const PromptRuleTreeView: React.FC<{
  settings: AISettings;
  setSettings: React.Dispatch<React.SetStateAction<AISettings>>;
  onBack: () => void;
}> = ({ settings, setSettings, onBack }) => {
  const normalized = normalizePromptRuleTreeSettings(settings.promptRuleTree);
  const disabled = new Set(normalized.disabledRuleIds || []);
  const enabled = new Set(normalized.enabledRuleIds || []);
  const groups = DEFAULT_PROMPT_RULE_TREE_GROUPS.filter((group) =>
    PROMPT_RULE_TREE_RULE_OPTIONS.some((rule) => rule.group === group)
  );
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const updateRuleTree = (next: ReturnType<typeof normalizePromptRuleTreeSettings>) => {
    setSettings((prev) => ({
      ...prev,
      promptRuleTree: normalizePromptRuleTreeSettings(next)
    }));
  };
  const toggleRule = (id: string) => {
    const nextDisabled = new Set(disabled);
    const nextEnabled = new Set(enabled);
    const isDefaultEnabled = false;
    const active = normalized.enabled && (nextEnabled.has(id) || !nextDisabled.has(id) && isDefaultEnabled);
    if (active) {
      nextEnabled.delete(id);
      nextDisabled.add(id);
    } else {
      nextDisabled.delete(id);
      nextEnabled.add(id as any);
    }
    updateRuleTree({
      enabled: normalized.enabled,
      enabledRuleIds: Array.from(nextEnabled),
      disabledRuleIds: Array.from(nextDisabled)
    });
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const getActiveRuleCount = (rules: typeof PROMPT_RULE_TREE_RULE_OPTIONS) => rules.filter((rule) => {
    if (!normalized.enabled) return false;
    return enabled.has(rule.id);
  }).length;

  const enableAllRules = () => {
    updateRuleTree({
      enabled: true,
      enabledRuleIds: PROMPT_RULE_TREE_RULE_OPTIONS.map((rule) => rule.id),
      disabledRuleIds: []
    });
  };

  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader
        title="规则树"
        onBack={onBack}
        actions={<button className="app-button app-button-primary whitespace-nowrap" onClick={enableAllRules}>一键开启</button>}
      />
      <div className="flex-1 overflow-y-auto pb-6">
        <SectionDivider label="总开关" />
        <div className="mx-3">
          <TemplateListCard className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[14px] leading-5">启用规则树</div>
              <div className="text-xs text-gray-400 mt-1 leading-5">关闭后不再注入内置角色扮演规则</div>
            </div>
            <AppSwitch
              active={normalized.enabled}
              onChange={() => updateRuleTree({ ...normalized, enabled: !normalized.enabled })}
            />
          </TemplateListCard>
        </div>

        {groups.map((group) => {
          const groupRules = PROMPT_RULE_TREE_RULE_OPTIONS.filter((rule) => rule.group === group);
          const expanded = expandedGroups[group] === true;
          const activeCount = getActiveRuleCount(groupRules);
          return (
            <React.Fragment key={group}>
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className="wechat-divider render-bg-primary flex-shrink-0 w-full text-left"
              >
                <div className="wechat-divider-label px-4 py-1.5 text-[12px] text-gray-500 font-medium uppercase tracking-wider flex items-center justify-between">
                  <span>{group}</span>
                  <span className="flex items-center gap-2 text-[11px] font-normal normal-case tracking-normal text-gray-400">
                    {activeCount}/{groupRules.length} 已开
                    <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </span>
                </div>
              </button>
              {expanded && (
                <div className="space-y-3 px-3">
                  {groupRules.map((rule) => {
                    const active = normalized.enabled && enabled.has(rule.id);
                    return (
                      <TemplateListCard key={rule.id} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-[14px] leading-5 truncate">{rule.title}</div>
                            {rule.storyOnly ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500">剧情</span> : null}
                          </div>
                          <div className="text-xs text-gray-400 mt-1 leading-5">{rule.summary}</div>
                        </div>
                        <AppSwitch active={active} onChange={() => toggleRule(rule.id)} />
                      </TemplateListCard>
                    );
                  })}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export const WorldBookEditView: React.FC<{
  book: WorldBook;
  onBack: () => void;
  onSave: (next: WorldBook) => void;
  onDelete?: (id: string) => void;
}> = ({ book, onBack, onSave, onDelete }) => {
  const [name, setName] = useState(book.name);
  const [description, setDescription] = useState(book.description || '');
  const [entries, setEntries] = useState(getResolvedWorldBookEntries(book));
  const isReadOnly = !!book.encryptedReadOnly;
  const draftBook: WorldBook = { ...book, name, description, entries };
  const descriptionChars = getWorldBookDescriptionChars(draftBook);
  const contentChars = getWorldBookContentChars(draftBook);
  const contextChars = getWorldBookContextChars(draftBook);

  const updateEntry = (id: string, text: string) => {
    if (isReadOnly) return;
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, text } : e)));
  };

  const addEntry = () => {
    if (isReadOnly) return;
    setEntries((prev) => [...prev, { id: `${book.id}-${Date.now()}`, text: '' }]);
  };

  const removeEntry = (id: string) => {
    if (isReadOnly) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSave = () => {
    if (isReadOnly) return;
    const cleanedName = name.trim();
    if (!cleanedName) return;
    const cleaned = entries.map((e) => ({ ...e, text: e.text.trim() })).filter((e) => e.text.length > 0);
    onSave({
      ...book,
      name: cleanedName,
      description: description.trim(),
      entries: cleaned
    });
    onBack();
  };

  const handleDelete = () => {
    if (!onDelete) return;
    const remove = () => {
      onDelete(book.id);
      onBack();
    };
    confirmWechatAction(`确定删除「${book.name}」吗？`, remove);
  };

  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader
        title="编辑世界书"
        onBack={onBack}
        actions={<button className="app-button app-button-primary whitespace-nowrap" onClick={handleSave}>保存</button>}
      />
      <div className="flex-1 overflow-y-auto">
        <SectionDivider label="概览" />
        <div className="px-3">
          <TemplateEditorSummaryCard>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[11px] render-text-tertiary">描述</div>
                <div className="text-[13px] font-medium mt-1">{formatCharCount(descriptionChars)}</div>
              </div>
              <div>
                <div className="text-[11px] render-text-tertiary">内容</div>
                <div className="text-[13px] font-medium mt-1">{formatCharCount(contentChars)}</div>
              </div>
              <div>
                <div className="text-[11px] render-text-tertiary">AI上下文</div>
                <div className="text-[13px] font-medium mt-1">{formatCharCount(contextChars)}</div>
              </div>
            </div>
          </TemplateEditorSummaryCard>
        </div>

        <SectionDivider label="名称" />
        <div className="px-3">
          <TemplateEditorFieldCard>
          <input
            value={name}
            disabled={isReadOnly}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent outline-none text-[14px] text-gray-900 dark:text-white"
            placeholder="输入世界书名称"
          />
          </TemplateEditorFieldCard>
        </div>

        <SectionDivider label="描述" />
        <div className="px-3">
          <TemplateEditorFieldCard>
          <textarea
            value={description}
            disabled={isReadOnly}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-[70px] bg-transparent outline-none text-[14px] text-gray-900 dark:text-white resize-none"
            placeholder="输入世界书描述"
          />
          <div className="mt-2 text-right text-[11px] text-gray-400">描述 {formatCharCount(descriptionChars)}</div>
          </TemplateEditorFieldCard>
        </div>

        <SectionDivider label={`内容（${entries.length} 条，合计 ${formatCharCount(contentChars)}）`} />
        <div className="space-y-3 px-3 pb-6">
          {entries.map((entry, index) => (
            <TemplateEditorEntryCard key={entry.id}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">内容 {index + 1} · {formatCharCount(getWorldBookEntryChars(entry))}</span>
                <button className={`text-xs whitespace-nowrap ${isReadOnly ? 'text-gray-300 cursor-not-allowed' : 'text-danger'}`} disabled={isReadOnly} onClick={() => removeEntry(entry.id)}>删除</button>
              </div>
              <textarea
                value={entry.text}
                disabled={isReadOnly}
                onChange={(e) => updateEntry(entry.id, e.target.value)}
                className="w-full min-h-[88px] bg-transparent outline-none text-[14px] text-gray-900 dark:text-white resize-none"
                placeholder="输入世界书内容"
              />
            </TemplateEditorEntryCard>
          ))}
          {entries.length === 0 && <SharedEmptyState className="py-6">暂无内容，点击下方按钮添加</SharedEmptyState>}
          {isReadOnly && <div className="text-center text-[12px] text-amber-600">该世界书来自加密导入，当前为只读</div>}
          <button className={`app-button w-full whitespace-nowrap ${isReadOnly ? 'app-button-muted opacity-60 cursor-not-allowed' : 'app-button-muted'}`} disabled={isReadOnly} onClick={addEntry}>新增内容</button>
          <button className="app-button app-button-danger w-full whitespace-nowrap" onClick={handleDelete}>删除当前世界书</button>
        </div>
      </div>
    </div>
  );
};
