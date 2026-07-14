import React from 'react';
import { MobileHeader, SectionDivider } from '../Common';
import { exportJsonBundle, exportJsonBundleWithOptions, exportZipBundle } from './storageExportUtils';
import { InlineActionRow } from '../utils/UtilsContactFormPrimitives';
import { buildEmojiExportTargets, collectEmojiStoreStateFromWindow, DEFAULT_EMOJI_GROUP_ID } from '../chatroom/emojiStore';
import { buildDesktopSettingsExportPayload } from '../services/desktopSettingsTransfer';
import { getWorldBookContextChars } from '../services/aiContextAssetStats';
import {
  CUSTOM_EMOJI_ORDER_STORAGE_KEY,
  EMOJI_GROUPS_STORAGE_KEY,
  HIDDEN_EMOJI_IDS_STORAGE_KEY
} from '../chatroom/emojiState';
import { resolveEncryptedHiddenRawObject } from '../utils/encryptedReadModel.ts';

const MAX_EXPORT_NAME_LENGTH = 36;

const sanitizeExportNamePart = (raw: string): string => {
  return String(raw || '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const buildExportNameLabel = (names: string[], fallback: string): string => {
  const cleaned = names
    .map((name) => sanitizeExportNamePart(name))
    .filter((name) => !!name);
  if (cleaned.length === 0) return fallback;
  if (cleaned.length === 1) return cleaned[0].slice(0, MAX_EXPORT_NAME_LENGTH);
  if (cleaned.length <= 3) return cleaned.join('、').slice(0, MAX_EXPORT_NAME_LENGTH);
  return `${cleaned[0]}等${cleaned.length}项`.slice(0, MAX_EXPORT_NAME_LENGTH);
};

const getResolvedWorldBookEntriesCount = (book: any): number => {
  if (Array.isArray(book?.entries) && book.entries.length > 0) return book.entries.length;
  const hidden = resolveEncryptedHiddenRawObject(book?.encryptedHiddenRaw);
  return Array.isArray(hidden?.entries) ? hidden.entries.length : 0;
};

const safeParseLocalJson = (key: string, fallback: any) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

interface TokenUsageSummary {
  totalChars: number;
  totalItems: number;
  avgCharsPerItem: number;
  chatChars: number;
  chatMessages: number;
  mailboxChars: number;
  mailboxLetters: number;
  forumChars: number;
  forumPosts: number;
  forumComments: number;
}

export type RestoreMode = 'merge' | 'overwrite' | 'desktop-only';

interface StorageSettingsViewProps {
  snapshot: any;
  onBackup: () => void;
  onRestore: (file: File, mode: RestoreMode) => void;
  onClear: () => void;
  onClearMailbox: () => void;
  onClearForums: () => void;
  onClearMusic: () => void;
  onClearAnonymous: () => void;
  onBack: () => void;
  tokenUsage: TokenUsageSummary;
}

export const StorageSettingsView: React.FC<StorageSettingsViewProps> = ({
  snapshot,
  onBackup,
  onRestore,
  onClear,
  onClearMailbox,
  onClearForums,
  onClearMusic,
  onClearAnonymous,
  onBack,
  tokenUsage
}) => {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [pendingRestoreFile, setPendingRestoreFile] = React.useState<File | null>(null);
  const [isExportPickerOpen, setIsExportPickerOpen] = React.useState(false);
  const [selectedExportIds, setSelectedExportIds] = React.useState<string[]>([]);
  const [includeChatHistoryInContactExport, setIncludeChatHistoryInContactExport] = React.useState(false);
  const [encryptContactsExport, setEncryptContactsExport] = React.useState(false);
  const [isWorldBookExportPickerOpen, setIsWorldBookExportPickerOpen] = React.useState(false);
  const [selectedWorldBookExportIds, setSelectedWorldBookExportIds] = React.useState<string[]>([]);
  const [encryptWorldBooksExport, setEncryptWorldBooksExport] = React.useState(false);
  const [isHtmlTemplateExportPickerOpen, setIsHtmlTemplateExportPickerOpen] = React.useState(false);
  const [selectedHtmlTemplateExportIds, setSelectedHtmlTemplateExportIds] = React.useState<string[]>([]);
  const [encryptHtmlTemplatesExport, setEncryptHtmlTemplatesExport] = React.useState(false);
  const [isEmojiExportPickerOpen, setIsEmojiExportPickerOpen] = React.useState(false);
  const [selectedEmojiExportIds, setSelectedEmojiExportIds] = React.useState<string[]>([]);
  const [exportTip, setExportTip] = React.useState<{ text: string; isError?: boolean } | null>(null);
  const dataSize = JSON.stringify(snapshot || {}).length;
  const formatSize = (size: number) => `${(size / 1024).toFixed(1)} KB`;
  const countNestedComments = (comments: any[] = []): number =>
    comments.reduce((sum: number, comment: any) => sum + 1 + countNestedComments(comment?.replies || []), 0);
  const messagesMap = snapshot?.messages && typeof snapshot.messages === 'object'
    ? (snapshot.messages as Record<string, unknown>)
    : {};
  const chatSessions = Object.keys(messagesMap).length;
  const chatMessages: number = Object.values(messagesMap).reduce<number>(
    (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
    0
  );
  const inboxCount = Array.isArray(snapshot?.inboxLetters) ? snapshot.inboxLetters.length : 0;
  const sentCount = Array.isArray(snapshot?.sentLetters) ? snapshot.sentLetters.length : 0;
  const forumSpaces = Array.isArray(snapshot?.forums) ? snapshot.forums.length : 0;
  const forumPosts = Array.isArray(snapshot?.forums)
    ? snapshot.forums.reduce((sum: number, forum: any) => sum + (forum?.posts?.length || 0), 0)
    : 0;
  const forumComments = Array.isArray(snapshot?.forums)
    ? snapshot.forums.reduce(
      (sum: number, forum: any) =>
        sum + (forum?.posts || []).reduce((postSum: number, post: any) => postSum + countNestedComments(post?.comments || []), 0),
      0
    )
    : 0;
  const anonymousHistoryCount = Array.isArray(snapshot?.anonymousChatHistory) ? snapshot.anonymousChatHistory.length : 0;
  const anonymousUnfinishedMessageCount = Array.isArray(snapshot?.anonymousUnfinishedSession?.messages)
    ? snapshot.anonymousUnfinishedSession.messages.length
    : 0;
  const anonymousHasUnfinishedSession = Boolean(snapshot?.anonymousHasUnfinishedSession && snapshot?.anonymousUnfinishedSession);
  const exportableContacts = Array.isArray(snapshot?.contacts)
    ? snapshot.contacts.filter((c: any) => c && typeof c === 'object' && !c.isGroup && c.id !== 'officialAccounts' && !c.encryptedReadOnly)
    : [];
  const exportableWorldBooks = Array.isArray(snapshot?.worldBooks)
    ? snapshot.worldBooks.filter((book: any) => book && typeof book === 'object' && !book.encryptedReadOnly)
      .filter((book: any) => String(book.id || '').trim() && String(book.name || '').trim())
    : [];
  const exportableHtmlTemplates = Array.isArray(snapshot?.htmlTemplates)
    ? snapshot.htmlTemplates.filter((tpl: any) => tpl && typeof tpl === 'object' && !tpl.encryptedReadOnly)
    : [];
  const emojiState = collectEmojiStoreStateFromWindow();
  const customEmojiList = emojiState.customEmojis.length > 0 && Array.isArray(emojiState.customEmojis)
    ? emojiState.customEmojis
    : (Array.isArray(snapshot?.customEmojis) ? snapshot.customEmojis : []);
  const emojiGroups = emojiState.emojiGroups.length > 0 && Array.isArray(emojiState.emojiGroups)
    ? emojiState.emojiGroups
    : safeParseLocalJson(EMOJI_GROUPS_STORAGE_KEY, []);
  const groupEmojiMap = emojiState.groupEmojis;

  const emojiExportTargets = buildEmojiExportTargets({
    customEmojis: customEmojiList,
    emojiGroups,
    groupEmojis: groupEmojiMap
  }).filter((item) => item.id && item.name);

  const showExportTip = (text: string, isError = false) => {
    setExportTip({ text, isError });
    window.setTimeout(() => {
      setExportTip((prev) => (prev?.text === text ? null : prev));
    }, 2500);
  };

  const toggleExportContact = (id: string) => {
    setSelectedExportIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const exportSelectedContacts = async () => {
    const idSet = new Set(selectedExportIds);
    const selected = exportableContacts.filter((contact: any) => idSet.has(String(contact.id)));
    if (selected.length === 0) {
      showExportTip('请至少选择一个联系人', true);
      return;
    }
    const selectedMessages = Object.fromEntries(
      Object.entries(messagesMap)
        .filter(([contactId, list]) => idSet.has(String(contactId)) && Array.isArray(list))
        .map(([contactId, list]) => [String(contactId), list])
    );
    const contactNameLabel = buildExportNameLabel(
      selected.map((contact: any) => String(contact?.remark || '').trim() || String(contact?.name || '').trim() || String(contact?.id || '')),
      '联系人'
    );
    const fileName = `叙说-${contactNameLabel}${includeChatHistoryInContactExport ? '-含聊天记录' : ''}${encryptContactsExport ? '-混淆' : ''}-${new Date().toISOString().slice(0, 10)}.json`;
    // 导出时剥离只读隐藏原始数据，避免重复携带隐藏明文。
    const sanitizedContacts = selected.map((c: any) => {
      const { encryptedHiddenRaw, ...rest } = c;
      return rest;
    });
    const payload: Record<string, any> = {
      version: 'contacts-export-v2',
      exportedAt: Date.now(),
      contacts: sanitizedContacts,
      exportOptions: {
        includeChatHistory: includeChatHistoryInContactExport
      }
    };
    if (includeChatHistoryInContactExport) payload.messages = selectedMessages;
    const ok = await exportJsonBundleWithOptions(
      fileName,
      payload,
      encryptContactsExport ? { encryptScope: 'contacts' } : undefined
    );
    if (!ok) {
      showExportTip('联系人导出失败', true);
      return;
    }
    const exportSessionCount = Object.keys(selectedMessages).length;
    const successText = includeChatHistoryInContactExport
      ? `联系人与聊天记录导出成功（${exportSessionCount} 个会话）`
      : '联系人导出成功';
    showExportTip(encryptContactsExport ? `${successText}（已混淆）` : successText);
    setIsExportPickerOpen(false);
  };

  const toggleExportWorldBook = (id: string) => {
    setSelectedWorldBookExportIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const exportSelectedWorldBooks = async () => {
    const idSet = new Set(selectedWorldBookExportIds);
    const selected = exportableWorldBooks.filter((book: any) => idSet.has(String(book.id)));
    if (selected.length === 0) {
      showExportTip('请至少选择一个世界书', true);
      return;
    }
    const worldBookNameLabel = buildExportNameLabel(
      selected.map((book: any) => String(book?.name || '').trim() || String(book?.id || '')),
      '世界书'
    );
    const normalizedSelectedWorldBooks = selected.map((book: any) => {
      const { encryptedHiddenRaw, ...rest } = book;
      return {
        ...rest,
        description: String(book?.description || '').trim()
      };
    });
    const fileName = `叙说-${worldBookNameLabel}${encryptWorldBooksExport ? '-混淆' : ''}-${new Date().toISOString().slice(0, 10)}.json`;
    const ok = await exportJsonBundleWithOptions(fileName, {
      version: 'worldbooks-export-v2',
      exportedAt: Date.now(),
      worldBooks: normalizedSelectedWorldBooks
    }, encryptWorldBooksExport ? { encryptScope: 'worldbooks' } : undefined);
    if (!ok) {
      showExportTip('世界书导出失败', true);
      return;
    }
    showExportTip(encryptWorldBooksExport ? '世界书导出成功（已混淆）' : '世界书导出成功');
    setIsWorldBookExportPickerOpen(false);
  };

  const toggleExportHtmlTemplate = (id: string) => {
    setSelectedHtmlTemplateExportIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const exportSelectedHtmlTemplates = async () => {
    const idSet = new Set(selectedHtmlTemplateExportIds);
    const selected = exportableHtmlTemplates.filter((tpl: any) => idSet.has(String(tpl.id)));
    if (selected.length === 0) {
      showExportTip('请至少选择一个HTML', true);
      return;
    }
    const nameLabel = buildExportNameLabel(
      selected.map((tpl: any) => String(tpl?.name || '').trim() || String(tpl?.id || '')),
      'HTML'
    );
    const normalizedSelected = selected.map((tpl: any) => {
      const { encryptedHiddenRaw, ...rest } = tpl;
      return rest;
    });
    const fileName = `叙说-${nameLabel}${encryptHtmlTemplatesExport ? '-混淆' : ''}-${new Date().toISOString().slice(0, 10)}.json`;
    const ok = await exportJsonBundleWithOptions(fileName, {
      version: 'htmltemplates-export-v1',
      exportedAt: Date.now(),
      htmlTemplates: normalizedSelected
    }, encryptHtmlTemplatesExport ? { encryptScope: 'htmltemplates' } : undefined);
    if (!ok) {
      showExportTip('HTML导出失败', true);
      return;
    }
    showExportTip(encryptHtmlTemplatesExport ? 'HTML导出成功（已混淆）' : 'HTML导出成功');
    setIsHtmlTemplateExportPickerOpen(false);
  };

  const toggleExportEmoji = (id: string) => {
    setSelectedEmojiExportIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const exportSelectedEmojis = async () => {
    const selectedSet = new Set(selectedEmojiExportIds);
    if (selectedSet.size === 0) {
      showExportTip('请至少选择一个表情分组', true);
      return;
    }
    const includeCustom = selectedSet.has(DEFAULT_EMOJI_GROUP_ID);
    const selectedGroups = (Array.isArray(emojiGroups) ? emojiGroups : []).filter((group: any) => selectedSet.has(`group:${String(group?.id || '')}`));
    const selectedGroupIds = new Set(selectedGroups.map((group: any) => String(group?.id || '')));
    const selectedGroupEmojis = Object.fromEntries(
      Object.entries(groupEmojiMap || {}).filter(([groupId, list]) => selectedGroupIds.has(String(groupId)) && Array.isArray(list))
    );
    const hiddenEmojiIds = safeParseLocalJson(HIDDEN_EMOJI_IDS_STORAGE_KEY, []);
    const selectedHiddenEmojiIds = Array.isArray(hiddenEmojiIds)
      ? hiddenEmojiIds.filter((id: any) => {
          const text = String(id || '');
          for (const groupId of selectedGroupIds) {
            if (text.startsWith(`${groupId}-`)) return true;
          }
          return false;
        })
      : [];
    const customEmojiOrder = safeParseLocalJson(CUSTOM_EMOJI_ORDER_STORAGE_KEY, []);
    const payload = {
      version: 'emoji-export-zip-v1',
      exportedAt: Date.now(),
      emojiExport: {
        customEmojis: includeCustom ? customEmojiList : [],
        customEmojiOrder: includeCustom ? (Array.isArray(customEmojiOrder) ? customEmojiOrder : []) : [],
        emojiGroups: selectedGroups,
        groupEmojis: selectedGroupEmojis,
        hiddenEmojiIds: selectedHiddenEmojiIds
      }
    };
    const nameLabel = buildExportNameLabel(
      emojiExportTargets
        .filter((item) => selectedSet.has(item.id))
        .map((item) => item.name),
      '表情分组'
    );
    const fileName = `叙说-${nameLabel}-表情导出-${new Date().toISOString().slice(0, 10)}.zip`;
    const ok = await exportZipBundle(fileName, payload);
    if (!ok) {
      showExportTip('表情分组导出失败', true);
      return;
    }
    showExportTip('表情分组导出成功');
    setIsEmojiExportPickerOpen(false);
  };

  const exportDesktopSettings = async () => {
    const fileName = `叙说-桌面设置-${new Date().toISOString().slice(0, 10)}.json`;
    const ok = await exportJsonBundle(fileName, buildDesktopSettingsExportPayload(snapshot?.settings));
    if (!ok) {
      showExportTip('桌面设置导出失败', true);
      return;
    }
    showExportTip('桌面设置导出成功');
  };

  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader title="存储管理" onBack={onBack} />
      <div className="flex-1 overflow-y-auto">
        <SectionDivider label="备份与恢复" />
        {exportTip && (
          <div className={`mx-3 mt-3 px-3 py-2 rounded-md text-[12px] ${exportTip.isError ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-600'}`}>
            {exportTip.text}
          </div>
        )}
        <div className="render-bg-secondary">
          <InlineActionRow label="备份数据" onClick={onBackup} />
          <InlineActionRow label="恢复数据" rightText="导入ZIP/JSON" onClick={() => fileRef.current?.click()} />
          <InlineActionRow label="导出联系人" rightText="单选/多选/全选" onClick={() => {
            setSelectedExportIds([]);
            setIncludeChatHistoryInContactExport(false);
            setEncryptContactsExport(false);
            setIsExportPickerOpen(true);
          }} />
          <InlineActionRow label="导出世界书" rightText="单选/多选/全选" onClick={() => {
            setSelectedWorldBookExportIds([]);
            setEncryptWorldBooksExport(false);
            setIsWorldBookExportPickerOpen(true);
          }} />
          <InlineActionRow label="导出HTML" rightText="单选/多选/全选" onClick={() => {
            setSelectedHtmlTemplateExportIds([]);
            setEncryptHtmlTemplatesExport(false);
            setIsHtmlTemplateExportPickerOpen(true);
          }} />
          <InlineActionRow label="导出桌面设置" rightText="桌面模式/壁纸/布局" onClick={() => { void exportDesktopSettings(); }} />
          <InlineActionRow label="导出表情分组" rightText="单选/多选/全选" onClick={() => {
            setSelectedEmojiExportIds([]);
            setIsEmojiExportPickerOpen(true);
          }} />
          <InlineActionRow label="清除信箱数据" danger rightText="收信/发信" onClick={onClearMailbox} />
          <InlineActionRow label="清除论坛数据" danger rightText="论坛内容" onClick={onClearForums} />
          <InlineActionRow label="清除音乐数据" danger rightText="队列/进度" onClick={onClearMusic} />
          <InlineActionRow label="清除匿名聊天数据" danger rightText="历史/未完成会话" onClick={onClearAnonymous} />
          <InlineActionRow label="清空本地数据" danger rightText="危险操作" onClick={onClear} />
          <input type="file" ref={fileRef} className="hidden" accept=".zip,.json,application/zip,application/json" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPendingRestoreFile(file);
            if (e.target) e.target.value = '';
          }} />
        </div>

        <SectionDivider label="数据概览" />
        <div className="render-bg-secondary p-4 space-y-3 text-sm render-text-secondary">
          <div className="flex justify-between"><span>联系人</span><span>{snapshot?.contacts?.length || 0}</span></div>
          <div className="flex justify-between"><span>聊天会话</span><span>{chatSessions}</span></div>
          <div className="flex justify-between"><span>聊天消息</span><span>{chatMessages}</span></div>
          <div className="flex justify-between"><span>朋友圈</span><span>{snapshot?.moments?.length || 0}</span></div>
          <div className="flex justify-between"><span>收藏</span><span>{snapshot?.favorites?.length || 0}</span></div>
          <div className="flex justify-between"><span>世界书</span><span>{snapshot?.worldBooks?.length || 0}</span></div>
          <div className="flex justify-between"><span>HTML</span><span>{snapshot?.htmlTemplates?.length || 0}</span></div>
          <div className="flex justify-between"><span>信箱</span><span>{`收${inboxCount} 发${sentCount} 总${inboxCount + sentCount}`}</span></div>
          <div className="flex justify-between"><span>论坛</span><span>{`空间${forumSpaces} 帖子${forumPosts} 评论${forumComments}`}</span></div>
          <div className="flex justify-between"><span>音乐</span><span>{`${snapshot?.musicState?.isPlaying ? '播放中' : '未播放'} · 队列${snapshot?.musicState?.queue?.length || 0}`}</span></div>
          <div className="flex justify-between"><span>匿名聊天</span><span>{`历史${anonymousHistoryCount} ${anonymousHasUnfinishedSession ? `未完成(消息${anonymousUnfinishedMessageCount})` : '无未完成会话'}`}</span></div>
          <div className="flex justify-between"><span>自定义表情</span><span>{Array.isArray(customEmojiList) ? customEmojiList.length : 0}</span></div>
          <div className="flex justify-between"><span>表情分组</span><span>{Array.isArray(emojiGroups) ? emojiGroups.length : 0}</span></div>
          <div className="flex justify-between"><span>数据体积</span><span>{formatSize(dataSize)}</span></div>
        </div>

        <SectionDivider label="字数统计" />
        <div className="render-bg-secondary p-4 text-sm render-text-secondary space-y-2">
          <div className="flex justify-between"><span>文本总条目</span><span>{tokenUsage.totalItems}</span></div>
          <div className="flex justify-between"><span>聊天字数</span><span>{tokenUsage.chatChars}</span></div>
          <div className="flex justify-between"><span>信箱字数</span><span>{tokenUsage.mailboxChars}</span></div>
          <div className="flex justify-between"><span>论坛字数</span><span>{tokenUsage.forumChars}</span></div>
          <div className="flex justify-between"><span>累计字数</span><span>{tokenUsage.totalChars}</span></div>
          <div className="flex justify-between"><span>平均每条</span><span>{tokenUsage.avgCharsPerItem}</span></div>
          <div className="text-[11px] text-gray-400">按聊天、信箱与论坛文本内容统计字符数</div>
        </div>

        {isExportPickerOpen && (
          <div className="fixed inset-0 z-[420] bg-black/40 flex items-end" onClick={() => setIsExportPickerOpen(false)}>
            <div className="w-full max-h-[72vh] app-surface-panel app-sheet overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="app-surface-header !pb-3">
                <div className="flex items-center justify-between">
                  <div className="text-[15px] font-semibold">选择导出联系人</div>
                  <div className="text-[12px] text-gray-500">已选 {selectedExportIds.length}</div>
                </div>
              </div>
              <div className="px-4 py-2 border-b render-border-subtle flex gap-2 text-[12px]">
                <button className="app-button app-button-muted border render-border" onClick={() => setSelectedExportIds(exportableContacts.map((c: any) => String(c.id)))}>全选</button>
                <button className="app-button app-button-muted border render-border" onClick={() => setSelectedExportIds([])}>清空</button>
              </div>
              <button
                className="app-list-item app-list-item--interactive"
                onClick={() => setIncludeChatHistoryInContactExport((prev) => !prev)}
              >
                <div className="app-list-item-main">
                  <div className="app-list-item-title">导出聊天记录</div>
                  <div className="app-list-item-desc">恢复时可同时恢复所选联系人的聊天记录</div>
                </div>
                <div className="app-list-item-side">
                  <i className={`fa-${includeChatHistoryInContactExport ? 'solid' : 'regular'} fa-circle-check text-[16px] ${includeChatHistoryInContactExport ? 'text-[#07c160]' : 'text-gray-400'}`} />
                </div>
              </button>
              <button
                className="app-list-item app-list-item--interactive"
                onClick={() => setEncryptContactsExport((prev) => !prev)}
              >
                <div className="app-list-item-main">
                  <div className="app-list-item-title">只读混淆导出</div>
                  <div className="app-list-item-desc">导出文件隐藏核心设定，导入后该联系人不可编辑且无法查看原文</div>
                </div>
                <div className="app-list-item-side">
                  <i className={`fa-${encryptContactsExport ? 'solid' : 'regular'} fa-circle-check text-[16px] ${encryptContactsExport ? 'text-[#07c160]' : 'text-gray-400'}`} />
                </div>
              </button>
              <div className="flex-1 min-h-0 overflow-y-auto pb-[calc(var(--safe-bottom)+8px)]">
                {exportableContacts.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[13px] text-gray-500">暂无可导出的联系人</div>
                ) : exportableContacts.map((contact: any) => {
                  const id = String(contact.id || '');
                  const checked = selectedExportIds.includes(id);
                  return (
                    <button
                      key={id}
                      className="app-list-item app-list-item--interactive"
                      onClick={() => toggleExportContact(id)}
                    >
                      <div className="app-list-item-main flex items-center">
                        <img src={contact.avatar || '/assets/image/user.png'} className="w-9 h-9 rounded-md object-cover mr-3" />
                        <span className="truncate app-list-item-title">{contact.remark?.trim() || contact.name || '未命名联系人'}</span>
                      </div>
                      <div className="app-list-item-side">
                        <i className={`fa-${checked ? 'solid' : 'regular'} fa-circle-check text-[16px] ${checked ? 'text-[#07c160]' : 'text-gray-400'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="app-surface-footer">
                <button className="app-button app-button-muted app-footer-button whitespace-nowrap border-r render-border-subtle" onClick={() => setIsExportPickerOpen(false)}>取消</button>
                <button className="app-button app-button-muted app-footer-button whitespace-nowrap" style={{ color: 'var(--app-accent-color)' }} onClick={() => { void exportSelectedContacts(); }}>导出所选</button>
              </div>
            </div>
          </div>
        )}
        {isWorldBookExportPickerOpen && (
          <div className="fixed inset-0 z-[420] bg-black/40 flex items-end" onClick={() => setIsWorldBookExportPickerOpen(false)}>
            <div className="w-full max-h-[72vh] app-surface-panel app-sheet overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="app-surface-header !pb-3">
                <div className="flex items-center justify-between">
                  <div className="text-[15px] font-semibold">选择导出世界书</div>
                  <div className="text-[12px] text-gray-500">已选 {selectedWorldBookExportIds.length}</div>
                </div>
              </div>
              <div className="px-4 py-2 border-b render-border-subtle flex gap-2 text-[12px]">
                <button className="app-button app-button-muted border render-border" onClick={() => setSelectedWorldBookExportIds(exportableWorldBooks.map((b: any) => String(b.id)))}>全选</button>
                <button className="app-button app-button-muted border render-border" onClick={() => setSelectedWorldBookExportIds([])}>清空</button>
              </div>
              <button
                className="app-list-item app-list-item--interactive"
                onClick={() => setEncryptWorldBooksExport((prev) => !prev)}
              >
                <div className="app-list-item-main">
                  <div className="app-list-item-title">只读混淆导出</div>
                  <div className="app-list-item-desc">导入后该世界书不可编辑且无法查看原文</div>
                </div>
                <div className="app-list-item-side">
                  <i className={`fa-${encryptWorldBooksExport ? 'solid' : 'regular'} fa-circle-check text-[16px] ${encryptWorldBooksExport ? 'text-[#07c160]' : 'text-gray-400'}`} />
                </div>
              </button>
              <div className="flex-1 min-h-0 overflow-y-auto pb-[calc(var(--safe-bottom)+8px)]">
                {exportableWorldBooks.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[13px] text-gray-500">暂无可导出的世界书</div>
                ) : exportableWorldBooks.map((book: any) => {
                  const id = String(book.id);
                  const checked = selectedWorldBookExportIds.includes(id);
                  return (
                    <button
                      key={id}
                      className="app-list-item app-list-item--interactive"
                      onClick={() => toggleExportWorldBook(id)}
                    >
                      <div className="app-list-item-main">
                        <div className="truncate app-list-item-title">{String(book.name)}</div>
                        <div className="app-list-item-desc truncate">{`${getResolvedWorldBookEntriesCount(book)} 条内容 · AI上下文约 ${getWorldBookContextChars(book)} 字符`}</div>
                      </div>
                      <div className="app-list-item-side">
                        <i className={`fa-${checked ? 'solid' : 'regular'} fa-circle-check text-[16px] ${checked ? 'text-[#07c160]' : 'text-gray-400'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="app-surface-footer">
                <button className="app-button app-button-muted app-footer-button whitespace-nowrap border-r render-border-subtle" onClick={() => setIsWorldBookExportPickerOpen(false)}>取消</button>
                <button className="app-button app-button-muted app-footer-button whitespace-nowrap" style={{ color: 'var(--app-accent-color)' }} onClick={() => { void exportSelectedWorldBooks(); }}>导出所选</button>
              </div>
            </div>
          </div>
        )}
        {isHtmlTemplateExportPickerOpen && (
          <div className="fixed inset-0 z-[420] bg-black/40 flex items-end" onClick={() => setIsHtmlTemplateExportPickerOpen(false)}>
            <div className="w-full max-h-[72vh] app-surface-panel app-sheet overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="app-surface-header !pb-3">
                <div className="flex items-center justify-between">
                  <div className="text-[15px] font-semibold">选择导出HTML</div>
                  <div className="text-[12px] text-gray-500">已选 {selectedHtmlTemplateExportIds.length}</div>
                </div>
              </div>
              <div className="px-4 py-2 border-b render-border-subtle flex gap-2 text-[12px]">
                <button className="app-button app-button-muted border render-border" onClick={() => setSelectedHtmlTemplateExportIds(exportableHtmlTemplates.map((t: any) => String(t.id)))}>全选</button>
                <button className="app-button app-button-muted border render-border" onClick={() => setSelectedHtmlTemplateExportIds([])}>清空</button>
              </div>
              <button
                className="app-list-item app-list-item--interactive"
                onClick={() => setEncryptHtmlTemplatesExport((prev) => !prev)}
              >
                <div className="app-list-item-main">
                  <div className="app-list-item-title">只读混淆导出</div>
                  <div className="app-list-item-desc">导入后该HTML不可编辑且无法查看原文</div>
                </div>
                <div className="app-list-item-side">
                  <i className={`fa-${encryptHtmlTemplatesExport ? 'solid' : 'regular'} fa-circle-check text-[16px] ${encryptHtmlTemplatesExport ? 'text-[#07c160]' : 'text-gray-400'}`} />
                </div>
              </button>
              <div className="flex-1 min-h-0 overflow-y-auto pb-[calc(var(--safe-bottom)+8px)]">
                {exportableHtmlTemplates.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[13px] text-gray-500">暂无可导出的HTML</div>
                ) : exportableHtmlTemplates.map((tpl: any, idx: number) => {
                  const id = String(tpl.id || `htmltemplate-${idx}`);
                  const checked = selectedHtmlTemplateExportIds.includes(id);
                  return (
                    <button
                      key={id}
                      className="app-list-item app-list-item--interactive"
                      onClick={() => toggleExportHtmlTemplate(id)}
                    >
                      <div className="app-list-item-main">
                        <div className="truncate app-list-item-title">{String(tpl.name || '未命名模板')}</div>
                        <div className="app-list-item-desc truncate">{tpl.variables?.length || 0} 个变量 · {((tpl.htmlContent?.length || 0) / 1024).toFixed(1)}KB</div>
                      </div>
                      <div className="app-list-item-side">
                        <i className={`fa-${checked ? 'solid' : 'regular'} fa-circle-check text-[16px] ${checked ? 'text-[#07c160]' : 'text-gray-400'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="app-surface-footer">
                <button className="app-button app-button-muted app-footer-button whitespace-nowrap border-r render-border-subtle" onClick={() => setIsHtmlTemplateExportPickerOpen(false)}>取消</button>
                <button className="app-button app-button-muted app-footer-button whitespace-nowrap" style={{ color: 'var(--app-accent-color)' }} onClick={() => { void exportSelectedHtmlTemplates(); }}>导出所选</button>
              </div>
            </div>
          </div>
        )}
        {isEmojiExportPickerOpen && (
          <div className="fixed inset-0 z-[420] bg-black/40 flex items-end" onClick={() => setIsEmojiExportPickerOpen(false)}>
            <div className="w-full max-h-[72vh] app-surface-panel app-sheet overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="app-surface-header !pb-3">
                <div className="flex items-center justify-between">
                  <div className="text-[15px] font-semibold">选择导出表情分组</div>
                  <div className="text-[12px] text-gray-500">已选 {selectedEmojiExportIds.length}</div>
                </div>
              </div>
              <div className="px-4 py-2 border-b render-border-subtle flex gap-2 text-[12px]">
                <button className="app-button app-button-muted border render-border" onClick={() => setSelectedEmojiExportIds(emojiExportTargets.map((item) => item.id))}>全选</button>
                <button className="app-button app-button-muted border render-border" onClick={() => setSelectedEmojiExportIds([])}>清空</button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto pb-[calc(var(--safe-bottom)+8px)]">
                {emojiExportTargets.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[13px] text-gray-500">暂无可导出的表情数据</div>
                ) : emojiExportTargets.map((item) => {
                  const checked = selectedEmojiExportIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      className="app-list-item app-list-item--interactive"
                      onClick={() => toggleExportEmoji(item.id)}
                    >
                      <div className="app-list-item-main">
                        <div className="truncate app-list-item-title">{item.name}</div>
                        <div className="app-list-item-desc truncate">{item.count} 个表情</div>
                      </div>
                      <div className="app-list-item-side">
                        <i className={`fa-${checked ? 'solid' : 'regular'} fa-circle-check text-[16px] ${checked ? 'text-[#07c160]' : 'text-gray-400'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="app-surface-footer">
                <button className="app-button app-button-muted app-footer-button whitespace-nowrap border-r render-border-subtle" onClick={() => setIsEmojiExportPickerOpen(false)}>取消</button>
                <button className="app-button app-button-muted app-footer-button whitespace-nowrap" style={{ color: 'var(--app-accent-color)' }} onClick={() => { void exportSelectedEmojis(); }}>导出所选</button>
              </div>
            </div>
          </div>
        )}
        {pendingRestoreFile && (
          <div className="fixed inset-0 z-[420] bg-black/40 flex items-end" onClick={() => setPendingRestoreFile(null)}>
            <div className="w-full app-surface-panel app-sheet overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="app-surface-header !pb-3">
                <div className="text-[15px] font-semibold">选择恢复方式</div>
                <div className="text-[12px] text-gray-500 mt-1">{pendingRestoreFile.name}</div>
              </div>
              <div className="py-1">
                <button
                  className="app-list-item app-list-item--interactive"
                  onClick={() => {
                    const file = pendingRestoreFile;
                    setPendingRestoreFile(null);
                    onRestore(file, 'merge');
                  }}
                >
                  <div className="app-list-item-main">
                    <div className="app-list-item-title">增量恢复</div>
                    <div className="app-list-item-desc">将导入数据合并到当前数据中，不删除已有内容</div>
                  </div>
                </button>
                <button
                  className="app-list-item app-list-item--interactive"
                  onClick={() => {
                    const file = pendingRestoreFile;
                    setPendingRestoreFile(null);
                    onRestore(file, 'desktop-only');
                  }}
                >
                  <div className="app-list-item-main">
                    <div className="app-list-item-title">仅恢复桌面设置</div>
                    <div className="app-list-item-desc">只应用桌面模式、壁纸、布局、Dock 和小组件设置，不改其他数据</div>
                  </div>
                </button>
                <button
                  className="app-list-item app-list-item--interactive app-list-item--danger"
                  onClick={() => {
                    const file = pendingRestoreFile;
                    setPendingRestoreFile(null);
                    onRestore(file, 'overwrite');
                  }}
                >
                  <div className="app-list-item-main">
                    <div className="app-list-item-title">全量恢复</div>
                    <div className="app-list-item-desc">用导入数据覆盖同类数据（高风险）</div>
                  </div>
                </button>
              </div>
              <div className="app-surface-footer">
                <button className="app-button app-button-muted app-footer-button whitespace-nowrap" onClick={() => setPendingRestoreFile(null)}>取消</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
