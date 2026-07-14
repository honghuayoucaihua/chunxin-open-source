import React from 'react';
import { MobileHeader, SectionDivider } from '../../Common';
import type { ChatMode, Contact, GroupRelation, HtmlTemplate, Mask, SentenceRange, SubView, UserProfile, WorldBook } from '../../types';
import { ChatDetailsView } from '../AppLazyViews';
import { buildHtmlTemplateChoiceDescription, buildWorldBookChoiceDescription } from '../../services/aiContextAssetStats';
import { normalizePositiveLimit } from '../chatDetailsFlowUtils';
import { ChatModeSection } from '../../settings/chatDetails/ChatModeSection';
import { InlineActionRow, InlineChoiceRow, InlineFieldRow, InlineSwitchRow, TextareaFieldBlock } from '../../utils/UtilsContactFormPrimitives';
import { SharedEmptyState } from '../../settings/SharedPanelPrimitives';
import { clampContextMessageLimit } from '../../services/aiRequestBudget';
import { shouldWarnOnContextLimitIncrease } from '../../services/aiContextWarning';
import { resolveActionDescLimit, resolveInnerVoiceLimit } from '../../utils/chat/contactReplyLimits';
import { resolveDescriptionComposerAvailability } from '../../utils/chat/descriptionComposerCapabilities';
import { promptWechatAction } from '../../utils/wechatDialog';

export type ChatDetailsSubView = Extract<SubView, 'chatDetails' | 'groupDetails'>;

export type ChatDetailsSubViewParams = {
  subView: ChatDetailsSubView;
  currentChat: Contact | null;
  contacts: Contact[];
  user: UserProfile;
  masks: Mask[];
  worldBooks: WorldBook[];
  htmlTemplates: HtmlTemplate[];
  imageLibraryGroups: { id: string; name: string }[];
  goBackSubView: () => void;
  pushSubView: (sub: SubView) => void;
  onHighContextLimitWarning?: (contextLimit: number) => void;
  onUpdateCurrentChat: (patch: Partial<Contact>) => void;
  onUpdateCurrentChatGroupRelations: (relations: GroupRelation[]) => void;
  onOpenGroupMemberProfile: (memberId: string) => void;
  onOpenCurrentChatProfile: () => void;
  onConfirmClearCurrentChatMessages: (isGroup: boolean) => void;
  onConfirmDeleteCurrentContact: () => void;
  onConfirmExitCurrentGroup: () => void;
};

const renderGroupDetails = (params: ChatDetailsSubViewParams) => {
  if (!params.currentChat) return null;
  const currentChat = params.currentChat;
  const handleEditGroupName = () => {
    const currentName = currentChat.name || '';
    const applyNextName = (nextName?: string) => {
      if (nextName === undefined) return;
      const trimmed = nextName.trim();
      if (!trimmed || trimmed === currentName) return;
      params.onUpdateCurrentChat({ name: trimmed });
    };
    promptWechatAction('修改群聊名称', currentName, applyNextName);
  };
  const groupMemberOptions = [
    { id: 'me', name: params.user.name?.trim() || '我' },
    ...(currentChat.memberIds || [])
      .map((memberId) => params.contacts.find(contact => contact.id === memberId))
      .filter(Boolean)
      .map((member) => ({ id: (member as Contact).id, name: (member as Contact).remark?.trim() || (member as Contact).name }))
  ];
  const groupRelations = Array.isArray(currentChat.groupRelations) ? currentChat.groupRelations : [];
  const currentMode = currentChat.chatMode || 'online';
  const descriptionAvailability = resolveDescriptionComposerAvailability(currentChat);
  const descriptionFeatureEnabled = descriptionAvailability.featureEnabled;
  const descriptionSayEnabled = descriptionAvailability.sayEnabled;
  const descriptionDoEnabled = descriptionAvailability.doEnabled;

  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader title="群聊详情" onBack={params.goBackSubView} />
      <div className="flex-1 overflow-y-auto">
        <div className="render-bg-secondary px-4 py-3 border-b render-border-subtle">
          <div className="text-[13px] text-gray-400 mb-2">群聊名称</div>
          <button className="w-full text-left" onClick={handleEditGroupName}>
            <div className="text-[16px] font-medium">{currentChat.name}（{(currentChat.memberIds?.length || 0) + 1}）</div>
            <div className="text-[12px] text-gray-400 mt-1">点击可修改</div>
          </button>
        </div>
        <SectionDivider label="群成员" />
        <div className="render-bg-secondary p-4 grid grid-cols-5 gap-4">
          <div className="flex flex-col items-center">
            {params.user.avatar.startsWith('icon:') ? (
              <div className="w-12 h-12 rounded-md icon-bg-blue text-white flex items-center justify-center"><i className={`fa-solid ${params.user.avatar.replace('icon:', '')}`}></i></div>
            ) : (
              <img src={params.user.avatar} className="w-12 h-12 rounded-md object-cover" />
            )}
            <span className="text-[11px] text-gray-500 mt-1 truncate max-w-[56px] text-center">{params.user.name?.trim() || '我'}</span>
          </div>
          {(currentChat.memberIds || []).map(memberId => {
            const member = params.contacts.find(contact => contact.id === memberId);
            if (!member) return null;
            const displayName = member.remark?.trim() || member.name;
            return (
              <div key={memberId} className="flex flex-col items-center cursor-pointer" onClick={() => params.onOpenGroupMemberProfile(memberId)}>
                {member.avatar.startsWith('icon:') ? (
                  <div className="w-12 h-12 rounded-md icon-bg-blue text-white flex items-center justify-center"><i className={`fa-solid ${member.avatar.replace('icon:', '')}`}></i></div>
                ) : (
                  <img src={member.avatar} className="w-12 h-12 rounded-md object-cover" />
                )}
                <span className="text-[11px] text-gray-500 mt-1 truncate max-w-[56px] text-center">{displayName}</span>
              </div>
            );
          })}
        </div>
        <SectionDivider />
        <div className="render-bg-secondary">
          <InlineSwitchRow label="置顶聊天" active={!!currentChat.isPinned} onChange={() => params.onUpdateCurrentChat({ isPinned: !currentChat.isPinned })} />
          <InlineActionRow label="设置当前聊天背景" onClick={() => params.pushSubView('chatBgSettings')} />
        </div>

        <SectionDivider label="聊天模式" />
        <ChatModeSection
          currentMode={currentMode}
          descriptionFeatureEnabled={descriptionFeatureEnabled}
          descriptionSayEnabled={descriptionSayEnabled}
          descriptionDoEnabled={descriptionDoEnabled}
          onSetChatMode={(mode) => params.onUpdateCurrentChat({ chatMode: mode })}
          onSetDescriptionFeatureEnabled={(enabled) => params.onUpdateCurrentChat({ descriptionFeatureEnabled: enabled })}
          onSetDescriptionSayEnabled={(enabled) => params.onUpdateCurrentChat({ descriptionSayEnabled: enabled })}
          onSetDescriptionDoEnabled={(enabled) => params.onUpdateCurrentChat({ descriptionDoEnabled: enabled })}
        />

        <SectionDivider label="世界书" />
        <div className="render-bg-secondary p-4 space-y-2">
          {params.worldBooks.map(book => {
            const selected = (currentChat.worldBookIds || []).includes(book.id);
            return (
              <InlineChoiceRow
                key={book.id}
                label={book.name}
                desc={buildWorldBookChoiceDescription(book)}
                checked={selected}
                onChange={(checked) => {
                  const base = currentChat.worldBookIds || [];
                  const next = checked ? [...base, book.id] : base.filter(id => id !== book.id);
                  params.onUpdateCurrentChat({ worldBookIds: next });
                }}
              />
            );
          })}
          {params.worldBooks.length === 0 && <SharedEmptyState className="py-2 text-xs">暂无世界书，请先在设置中添加</SharedEmptyState>}
        </div>

        <SectionDivider label="HTML" />
        <div className="render-bg-secondary p-4 space-y-2">
          {params.htmlTemplates.filter(t => t.enabled).map(tpl => {
            const selected = (currentChat.htmlTemplateIds || []).includes(tpl.id);
            return (
              <InlineChoiceRow
                key={tpl.id}
                label={tpl.name}
                desc={buildHtmlTemplateChoiceDescription(tpl)}
                checked={selected}
                onChange={(checked) => {
                  const base = currentChat.htmlTemplateIds || [];
                  const next = checked ? [...base, tpl.id] : base.filter(id => id !== tpl.id);
                  params.onUpdateCurrentChat({ htmlTemplateIds: next });
                }}
              />
            );
          })}
          {params.htmlTemplates.filter(t => t.enabled).length === 0 && <SharedEmptyState className="py-2 text-xs">暂无HTML，请先在设置中添加</SharedEmptyState>}
        </div>

        <SectionDivider label="我的面具" />
        <div className="render-bg-secondary p-4 space-y-2">
          <InlineChoiceRow
            label="默认面具（基于个人信息）"
            type="radio"
            name={`group-mask-${currentChat.id}`}
            checked={!currentChat.selectedMaskId}
            onChange={() => params.onUpdateCurrentChat({ selectedMaskId: undefined })}
          />
          {params.masks.map(mask => (
            <InlineChoiceRow
              key={mask.id}
              label={mask.name}
              type="radio"
              name={`group-mask-${currentChat.id}`}
              checked={currentChat.selectedMaskId === mask.id}
              onChange={() => params.onUpdateCurrentChat({ selectedMaskId: mask.id })}
            />
          ))}
          {params.masks.length === 0 && <SharedEmptyState className="py-2 text-xs">暂无自定义面具，可在个人信息中添加</SharedEmptyState>}
        </div>

        <SectionDivider label="群聊预设" />
        <TextareaFieldBlock
          label="群聊预设"
          desc="该预设会追加到群聊系统提示词中，用于约束群聊整体风格与规则。"
          value={currentChat.groupPreset || ''}
          placeholder="输入群聊专属预设（会注入到群聊提示词）"
          rowsClassName="min-h-[88px] resize-none"
          onChange={(value) => params.onUpdateCurrentChat({ groupPreset: value })}
        />

        <SectionDivider label="关系设置" />
        <div className="render-bg-secondary p-4 space-y-3">
          {groupRelations.map((item, idx) => (
            <div key={`rel-${idx}`} className="app-surface-panel space-y-2">
              <div className="app-list-item">
                <div className="app-list-item-main max-w-[7rem]">
                  <div className="app-list-item-title">主语</div>
                </div>
                <div className="app-list-item-side flex-1">
                  <select
                    className="app-field-select app-list-item-input app-list-item-select text-[14px] render-text-primary"
                    value={item.subjectId || 'me'}
                    onChange={(e) => {
                      const next = [...groupRelations];
                      next[idx] = { ...next[idx], subjectId: e.target.value };
                      params.onUpdateCurrentChatGroupRelations(next);
                    }}
                  >
                    {groupMemberOptions.map((option) => <option key={`sub-${option.id}`} value={option.id}>{option.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="px-4 -mt-2 text-[11px] text-gray-400">
                {(groupMemberOptions.find((option) => option.id === (item.subjectId || 'me'))?.name) || '我'} 是 {(groupMemberOptions.find((option) => option.id === (item.objectId || 'me'))?.name) || '我'} 的
              </div>
              <div className="app-list-item">
                <div className="app-list-item-main max-w-[7rem]">
                  <div className="app-list-item-title">宾语</div>
                </div>
                <div className="app-list-item-side flex-1">
                  <select
                    className="app-field-select app-list-item-input app-list-item-select text-[14px] render-text-primary"
                    value={item.objectId || 'me'}
                    onChange={(e) => {
                      const next = [...groupRelations];
                      next[idx] = { ...next[idx], objectId: e.target.value };
                      params.onUpdateCurrentChatGroupRelations(next);
                    }}
                  >
                    {groupMemberOptions.map((option) => <option key={`obj-${option.id}`} value={option.id}>{option.name}</option>)}
                  </select>
                </div>
              </div>
              <InlineFieldRow
                label="关系"
                value={item.relation || ''}
                placeholder="例如：朋友、同事"
                onChange={(value) => {
                  const next = [...groupRelations];
                  next[idx] = { ...next[idx], relation: value };
                  params.onUpdateCurrentChatGroupRelations(next);
                }}
              />
              <div className="px-4 pb-1">
                <button
                  type="button"
                  className="app-button app-button-danger w-full"
                  onClick={() => params.onUpdateCurrentChatGroupRelations(groupRelations.filter((_, relationIdx) => relationIdx !== idx))}
                >
                  删除这条关系
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="app-button app-button-muted w-full"
            onClick={() => {
              const baseId = groupMemberOptions[0]?.id || 'me';
              const next = [...groupRelations, { subjectId: baseId, objectId: baseId, relation: '' }];
              params.onUpdateCurrentChatGroupRelations(next);
            }}
          >
            新增关系
          </button>
        </div>

        <SectionDivider />
        <div className="render-bg-secondary">
          <InlineActionRow label="清空聊天记录" danger onClick={() => params.onConfirmClearCurrentChatMessages(true)} />
          <InlineActionRow label="退出群聊" danger onClick={params.onConfirmExitCurrentGroup} />
        </div>
      </div>
    </div>
  );
};

const renderNormalChatDetails = (params: ChatDetailsSubViewParams) => {
  if (!params.currentChat) return null;
  const currentChat = params.currentChat;
  const handleRenameIfLine = () => {
    if (!currentChat.isIfLine) return;
    const currentLabel = String(currentChat.ifLineLabel || '').trim() || 'if线';
    const applyNextLabel = (nextLabel?: string) => {
      if (nextLabel === undefined) return;
      const trimmed = nextLabel.trim();
      if (!trimmed || trimmed === currentLabel) return;
      params.onUpdateCurrentChat({ ifLineLabel: trimmed });
    };
    promptWechatAction('重命名if线', currentLabel, applyNextLabel);
  };

  return (
    <ChatDetailsView
      contact={currentChat}
      isPinned={!!currentChat.isPinned}
      onBack={params.goBackSubView}
      onTogglePin={() => params.onUpdateCurrentChat({ isPinned: !currentChat.isPinned })}
      onSetBg={() => params.pushSubView('chatBgSettings')}
      onClear={() => params.onConfirmClearCurrentChatMessages(false)}
      onSetChatMode={(mode) => params.onUpdateCurrentChat({ chatMode: mode })}
      onSetDescriptionFeatureEnabled={(enabled) => params.onUpdateCurrentChat({ descriptionFeatureEnabled: enabled })}
      onSetDescriptionSayEnabled={(enabled) => params.onUpdateCurrentChat({ descriptionSayEnabled: enabled })}
      onSetDescriptionDoEnabled={(enabled) => params.onUpdateCurrentChat({ descriptionDoEnabled: enabled })}
      onSetSentenceRange={(range: SentenceRange) => params.onUpdateCurrentChat({ sentenceRange: range })}
      onSetReplyLimit={(limit) => params.onUpdateCurrentChat({ replyLimit: limit })}
      onSetInnerVoiceLimit={(limit) => params.onUpdateCurrentChat({ innerVoiceLimit: Math.max(1, Number(limit) || resolveInnerVoiceLimit(currentChat)) })}
      onSetActionDescLimit={(limit) => params.onUpdateCurrentChat({ actionDescLimit: Math.max(1, Number(limit) || resolveActionDescLimit(currentChat)) })}
      onSetMaxContextMessages={(limit) => {
        const nextLimit = clampContextMessageLimit(limit);
        if (shouldWarnOnContextLimitIncrease(currentChat.maxContextMessages || 0, nextLimit)) {
          params.onHighContextLimitWarning?.(nextLimit);
        }
        params.onUpdateCurrentChat({ maxContextMessages: nextLimit });
      }}
      onSetMemorySummaryThreshold={(count) => params.onUpdateCurrentChat({ memorySummaryThreshold: normalizePositiveLimit(count, 1) })}
      onSetWorldBooks={(ids) => params.onUpdateCurrentChat({ worldBookIds: ids })}
      onSetUseCustomWorldBooks={(enabled) => params.onUpdateCurrentChat({ useCustomWorldBooks: enabled })}
      worldBooks={params.worldBooks}
      htmlTemplates={params.htmlTemplates}
      onSetHtmlTemplates={(ids) => params.onUpdateCurrentChat({ htmlTemplateIds: ids })}
      onSetUseCustomHtmlTemplates={(enabled) => params.onUpdateCurrentChat({ useCustomHtmlTemplates: enabled })}
      imageLibraryGroups={params.imageLibraryGroups}
      onSetImageLibraryGroups={(ids) => params.onUpdateCurrentChat({ imageLibraryGroupIds: ids })}
      onSetUseCustomImageLibraryGroups={(enabled) => params.onUpdateCurrentChat({ useCustomImageLibraryGroups: enabled })}
      onAvatarClick={params.onOpenCurrentChatProfile}
      onSetStatus={(status) => params.onUpdateCurrentChat({ status })}
      onSetProactiveChatEnabled={(enabled) => params.onUpdateCurrentChat({ proactiveChatEnabled: enabled, lastProactiveChatAt: enabled ? Date.now() : undefined })}
      onSetProactiveChatWindowMinutes={(minutes) => params.onUpdateCurrentChat({ proactiveChatWindowMinutes: normalizePositiveLimit(minutes, 1) })}
      onSetIdleChatEnabled={(enabled) => params.onUpdateCurrentChat({ idleChatEnabled: enabled, lastIdleChatAt: enabled ? Date.now() : undefined })}
      onSetIdleChatTimeoutSeconds={(seconds) => params.onUpdateCurrentChat({ idleChatTimeoutSeconds: Math.max(5, seconds) })}
      onRenameIfLine={currentChat.isIfLine ? handleRenameIfLine : undefined}
      masks={params.masks}
      onSetMask={(maskId) => params.onUpdateCurrentChat({ selectedMaskId: maskId })}
      onSetUserPersona={(persona) => params.onUpdateCurrentChat({ userPersona: persona })}
      onDeleteContact={params.onConfirmDeleteCurrentContact}
    />
  );
};

export const renderChatDetailsSubView = (params: ChatDetailsSubViewParams) => {
  if (!params.currentChat) return null;
  if (params.currentChat.isGroup) return renderGroupDetails(params);
  return renderNormalChatDetails(params);
};

export const ChatDetailsSubViewRouter: React.FC<ChatDetailsSubViewParams> = (params) => renderChatDetailsSubView(params);
