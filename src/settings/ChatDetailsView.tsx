import React from 'react';
import { ChatMode, Contact, HtmlTemplate, WorldBook } from '../types';
import { MobileHeader, SectionDivider } from '../Common';
import { buildHtmlTemplateChoiceDescription, buildWorldBookChoiceDescription } from '../services/aiContextAssetStats';
import { ChatModeSection } from './chatDetails/ChatModeSection';
import { InlineActionRow, InlineChoiceRow, InlineFieldRow, InlineRangeRow, InlineSwitchRow, TextareaFieldBlock } from '../utils/UtilsContactFormPrimitives';
import { SharedEmptyState } from './SharedPanelPrimitives';
import { resolveActionDescLimit, resolveInnerVoiceLimit } from '../utils/chat/contactReplyLimits';
import { resolveDescriptionComposerAvailability } from '../utils/chat/descriptionComposerCapabilities';
import { promptWechatAction } from '../utils/wechatDialog';

export const ChatDetailsView: React.FC<{
  contact: Contact;
  isPinned: boolean;
  onBack: () => void;
  onTogglePin: () => void;
  onSetBg: () => void;
  onClear: () => void;
  onSetChatMode: (mode: ChatMode) => void;
  onSetDescriptionFeatureEnabled: (enabled: boolean) => void;
  onSetDescriptionSayEnabled: (enabled: boolean) => void;
  onSetDescriptionDoEnabled: (enabled: boolean) => void;
  onSetSentenceRange: (range: { min: number; max: number }) => void;
  onSetReplyLimit: (limit: number) => void;
  onSetInnerVoiceLimit: (limit: number) => void;
  onSetActionDescLimit: (limit: number) => void;
  onSetMaxContextMessages: (limit: number) => void;
  onSetMemorySummaryThreshold: (count: number) => void;
  onSetWorldBooks: (ids: string[]) => void;
  onSetUseCustomWorldBooks?: (enabled: boolean) => void;
  worldBooks: WorldBook[];
  htmlTemplates?: HtmlTemplate[];
  onSetHtmlTemplates?: (ids: string[]) => void;
  onSetUseCustomHtmlTemplates?: (enabled: boolean) => void;
  imageLibraryGroups?: { id: string; name: string }[];
  onSetImageLibraryGroups?: (ids: string[]) => void;
  onSetUseCustomImageLibraryGroups?: (enabled: boolean) => void;
  onAvatarClick: () => void;
  onSetStatus: (status: string) => void;
  onSetProactiveChatEnabled: (enabled: boolean) => void;
  onSetProactiveChatWindowMinutes: (minutes: number) => void;
  onSetIdleChatEnabled?: (enabled: boolean) => void;
  onSetIdleChatTimeoutSeconds?: (seconds: number) => void;
  onRenameIfLine?: () => void;
  onDeleteContact: () => void;
  masks?: { id: string; name: string }[];
  onSetMask?: (maskId: string | undefined) => void;
  onSetUserPersona?: (persona: string) => void;
}> = ({
  contact,
  isPinned,
  onBack,
  onTogglePin,
  onSetBg,
  onClear,
  onSetChatMode,
  onSetDescriptionFeatureEnabled,
  onSetDescriptionSayEnabled,
  onSetDescriptionDoEnabled,
  onSetSentenceRange,
  onSetReplyLimit,
  onSetInnerVoiceLimit,
  onSetActionDescLimit,
  onSetMaxContextMessages,
  onSetMemorySummaryThreshold,
  onSetWorldBooks,
  onSetUseCustomWorldBooks,
  worldBooks,
  htmlTemplates = [],
  onSetHtmlTemplates,
  onSetUseCustomHtmlTemplates,
  imageLibraryGroups = [],
  onSetImageLibraryGroups,
  onSetUseCustomImageLibraryGroups,
  onAvatarClick,
  onSetStatus,
  onSetProactiveChatEnabled,
  onSetProactiveChatWindowMinutes,
  onSetIdleChatEnabled,
  onSetIdleChatTimeoutSeconds,
  onRenameIfLine,
  onDeleteContact,
  masks = [],
  onSetMask,
  onSetUserPersona
}) => {
  const currentMode = contact.chatMode || 'online';
  const descriptionAvailability = resolveDescriptionComposerAvailability(contact);
  const descriptionFeatureEnabled = descriptionAvailability.featureEnabled;
  const descriptionSayEnabled = descriptionAvailability.sayEnabled;
  const descriptionDoEnabled = descriptionAvailability.doEnabled;
  const sentenceRange = contact.sentenceRange || { min: 0, max: 3 };
  const replyLimit = contact.replyLimit || 120;
  const innerVoiceLimit = resolveInnerVoiceLimit(contact);
  const actionDescLimit = resolveActionDescLimit(contact);
  const maxContextMessages = Math.max(1, Number(contact.maxContextMessages || 30));
  const memorySummaryThreshold = Math.max(1, Number(contact.memorySummaryThreshold || 30));
  const selectedBooks = contact.worldBookIds || [];
  const selectedHtmlTemplateIds = contact.htmlTemplateIds || [];
  const selectedImageLibraryGroups = contact.imageLibraryGroupIds || [];
  const proactiveEnabled = !!contact.proactiveChatEnabled;
  const proactiveWindowMinutes = Math.max(1, Number(contact.proactiveChatWindowMinutes || 60));
  const idleEnabled = !!contact.idleChatEnabled;
  const idleTimeoutSeconds = Math.max(5, Number(contact.idleChatTimeoutSeconds || 30));
  const displayName = contact.isIfLine
    ? `${contact.name} · ${String(contact.ifLineLabel || '').trim() || 'if线'}`
    : contact.name;

  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader title="聊天详情" onBack={onBack} />
      <div className="flex-1 overflow-y-auto">
        <div className="render-bg-secondary p-4 flex flex-wrap gap-4 border-b render-border-subtle">
          <div className="flex flex-col items-center cursor-pointer" onClick={onAvatarClick}>
            <img src={contact.avatar} className="w-14 h-14 rounded-md object-cover" />
            <span className="text-xs text-gray-500 mt-1 truncate max-w-[96px] text-center">{displayName}</span>
          </div>
          <div className="w-14 h-14 rounded-md border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-400 cursor-pointer active:bg-gray-50 dark:active:bg-gray-900">
            <i className="fa-solid fa-plus text-xl"></i>
          </div>
        </div>
        <SectionDivider />
        {contact.encryptedReadOnly && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-md text-[12px] bg-amber-500/10 text-amber-600">
            该联系人来自加密导入，「更多信息」中的人设数据为只读保护
          </div>
        )}
        <div className="render-bg-secondary">
          <InlineActionRow label="查找聊天记录" onClick={() => {}} />
          {contact.isIfLine ? <InlineActionRow label="重命名if线" onClick={() => onRenameIfLine?.()} /> : null}
        </div>
        <SectionDivider />
        <div className="render-bg-secondary">
          <InlineSwitchRow label="置顶聊天" active={isPinned} onChange={onTogglePin} />
          <InlineSwitchRow label="消息免打扰" active={false} onChange={() => {}} />
        </div>
        <SectionDivider label="聊天模式" />
        <ChatModeSection
          currentMode={currentMode}
          descriptionFeatureEnabled={descriptionFeatureEnabled}
          descriptionSayEnabled={descriptionSayEnabled}
          descriptionDoEnabled={descriptionDoEnabled}
          onSetChatMode={onSetChatMode}
          onSetDescriptionFeatureEnabled={onSetDescriptionFeatureEnabled}
          onSetDescriptionSayEnabled={onSetDescriptionSayEnabled}
          onSetDescriptionDoEnabled={onSetDescriptionDoEnabled}
        />
        <SectionDivider label="回复设置" />
        <div className="render-bg-secondary">
          <InlineRangeRow label="分句范围" min={sentenceRange.min} max={sentenceRange.max} onChangeMin={(v) => onSetSentenceRange({ min: v, max: sentenceRange.max })} onChangeMax={(v) => onSetSentenceRange({ min: sentenceRange.min, max: v })} />
          <InlineFieldRow label="回复字数上限" value={String(replyLimit)} placeholder="120" onChange={(v) => onSetReplyLimit(Number(v) || 0)} />
          <InlineFieldRow label="心声字数上限" value={String(innerVoiceLimit)} placeholder="60" onChange={(v) => onSetInnerVoiceLimit(Number(v) || 0)} />
          <InlineFieldRow label="动作字数上限" value={String(actionDescLimit)} placeholder="60" onChange={(v) => onSetActionDescLimit(Number(v) || 0)} />
          <InlineFieldRow label="最大上下文条数" value={String(maxContextMessages)} placeholder="30" onChange={(v) => onSetMaxContextMessages(Math.max(1, Number(v) || 1))} />
          <InlineFieldRow label="记忆总结条数阈值" value={String(memorySummaryThreshold)} placeholder="30" onChange={(v) => onSetMemorySummaryThreshold(Math.max(1, Number(v) || 1))} />
        </div>

        <SectionDivider label="主动聊天" />
        <div className="render-bg-secondary">
          <InlineSwitchRow label="开启主动发起聊天" active={proactiveEnabled} onChange={() => { onSetProactiveChatEnabled(!proactiveEnabled); }} />
          <InlineFieldRow label="超时时间（分钟）" value={String(proactiveWindowMinutes)} placeholder="60" onChange={(v) => onSetProactiveChatWindowMinutes(Math.max(1, Number(v) || 1))} />
        </div>

        <SectionDivider label="搭话" />
        <div className="render-bg-secondary">
          <InlineSwitchRow label="开启搭话" active={idleEnabled} onChange={() => { onSetIdleChatEnabled?.(!idleEnabled); }} />
          <InlineFieldRow label="超时时间（秒）" value={String(idleTimeoutSeconds)} placeholder="30" onChange={(v) => onSetIdleChatTimeoutSeconds?.(Math.max(5, Number(v) || 5))} />
          <div className="text-[11px] text-gray-400">在聊天界面中如果没有点击输入框，超过指定时间后，联系人会自动搭话。</div>
        </div>

        <SectionDivider label="状态" />
        <div className="render-bg-secondary">
          <InlineActionRow label="联系人状态" rightText={contact.status || '未设置'} onClick={() => {
            promptWechatAction('设置联系人状态', contact.status || '', (next?: string) => {
              if (next !== undefined) onSetStatus(next);
            });
          }} />
        </div>

        <SectionDivider label="世界书" />
        <div className="render-bg-secondary p-4 space-y-2">
          <InlineSwitchRow label="使用自定义配置" active={contact.useCustomWorldBooks === true} onChange={() => onSetUseCustomWorldBooks?.(contact.useCustomWorldBooks !== true)} />
          {contact.useCustomWorldBooks === true ? (
            <>
              {worldBooks.map((book) => (
                <InlineChoiceRow
                  key={book.id}
                  label={book.name}
                  desc={buildWorldBookChoiceDescription(book)}
                  checked={selectedBooks.includes(book.id)}
                  onChange={(checked) => {
                    const next = checked ? [...selectedBooks, book.id] : selectedBooks.filter((id) => id !== book.id);
                    onSetWorldBooks(next);
                  }}
                />
              ))}
              {worldBooks.length === 0 && <SharedEmptyState className="py-2 text-xs">暂无世界书，请先在设置中添加</SharedEmptyState>}
            </>
          ) : (
            <div className="text-xs text-gray-400">使用全局配置（所有已启用的世界书）</div>
          )}
        </div>

        <SectionDivider label="HTML" />
        <div className="render-bg-secondary p-4 space-y-2">
          <InlineSwitchRow label="使用自定义配置" active={contact.useCustomHtmlTemplates === true} onChange={() => onSetUseCustomHtmlTemplates?.(contact.useCustomHtmlTemplates !== true)} />
          {contact.useCustomHtmlTemplates === true ? (
            <>
              {htmlTemplates.filter(t => t.enabled).map((tpl) => (
                <InlineChoiceRow
                  key={tpl.id}
                  label={tpl.name}
                  desc={buildHtmlTemplateChoiceDescription(tpl)}
                  checked={selectedHtmlTemplateIds.includes(tpl.id)}
                  onChange={(checked) => {
                    const next = checked ? [...selectedHtmlTemplateIds, tpl.id] : selectedHtmlTemplateIds.filter((id) => id !== tpl.id);
                    onSetHtmlTemplates?.(next);
                  }}
                />
              ))}
              {htmlTemplates.filter(t => t.enabled).length === 0 && <SharedEmptyState className="py-2 text-xs">暂无HTML，请先在设置中添加</SharedEmptyState>}
            </>
          ) : (
            <div className="text-xs text-gray-400">使用全局配置（所有已启用的HTML）</div>
          )}
        </div>

        <SectionDivider label="相册" />
        <div className="render-bg-secondary p-4 space-y-2">
          <InlineSwitchRow label="使用自定义配置" active={contact.useCustomImageLibraryGroups === true} onChange={() => onSetUseCustomImageLibraryGroups?.(contact.useCustomImageLibraryGroups !== true)} />
          {contact.useCustomImageLibraryGroups === true ? (
            <>
              {imageLibraryGroups.map((group) => (
                <InlineChoiceRow
                  key={group.id}
                  label={group.name}
                  checked={selectedImageLibraryGroups.includes(group.id)}
                  onChange={(checked) => {
                    const next = checked
                      ? [...selectedImageLibraryGroups, group.id]
                      : selectedImageLibraryGroups.filter((id) => id !== group.id);
                    onSetImageLibraryGroups?.(next);
                  }}
                />
              ))}
              {imageLibraryGroups.length === 0 && <SharedEmptyState className="py-2 text-xs">暂无相册，请先到"我-相册"添加</SharedEmptyState>}
              {imageLibraryGroups.length > 0 && <div className="text-[11px] text-gray-400">勾选后 AI 才能从该相册选择图片发送。</div>}
            </>
          ) : (
            <div className="text-xs text-gray-400">使用全局配置（所有已启用的相册）</div>
          )}
        </div>

        <SectionDivider label="我的面具" />
        <div className="render-bg-secondary p-4 space-y-2">
          <InlineChoiceRow
            label="默认面具（基于个人信息）"
            type="radio"
            name="mask"
            checked={!contact.selectedMaskId}
            onChange={() => onSetMask?.(undefined)}
          />
          {masks.map((mask) => (
            <InlineChoiceRow
              key={mask.id}
              label={mask.name}
              type="radio"
              name="mask"
              checked={contact.selectedMaskId === mask.id}
              onChange={() => onSetMask?.(mask.id)}
            />
          ))}
          {masks.length === 0 && <SharedEmptyState className="py-2 text-xs">暂无自定义面具，可在个人信息中添加</SharedEmptyState>}
        </div>

        <SectionDivider label="用户人设补充" />
        <TextareaFieldBlock
          label="用户人设补充"
          desc="该内容会追加在面具信息之后，用于补充该联系人的专属设定。"
          value={contact.userPersona || ''}
          placeholder="针对该联系人补充额外人设描述..."
          rowsClassName="min-h-[80px]"
          onChange={(value) => onSetUserPersona?.(value)}
        />

        <SectionDivider />
        <div className="render-bg-secondary">
          <InlineActionRow label="设置当前聊天背景" onClick={onSetBg} />
        </div>
        <SectionDivider />
        <div className="render-bg-secondary">
          <InlineActionRow label="清空聊天记录" danger onClick={onClear} />
          <InlineActionRow label="删除联系人" danger onClick={onDeleteContact} />
        </div>
        <SectionDivider />
      </div>
    </div>
  );
};
