import React from 'react';
import { SubView } from '../types';
import { MobileHeader, SectionDivider } from '../Common';
import { DisplaySettingsView } from './DisplaySettingsView';
import { AISettingsView } from './AISettingsView';
import { SkinSettingsView } from './SkinSettingsView';
import { SoundSettingsView } from './SoundSettingsView';
import { ChatBgSettingsView } from './ChatBgSettingsView';
import { StorageSettingsView } from './StorageSettingsView';
import { WorldBooksView, WorldBookEditView, PromptRuleTreeView } from './WorldBookViews';
import { HtmlTemplatesView, HtmlTemplateEditView } from './HtmlTemplateViews';
import { BubbleWorkshopListView, BubbleWorkshopEditView } from './BubbleWorkshopViews';
import { ChatDetailsView } from './ChatDetailsView';
import { InlineActionRow } from '../utils/UtilsContactFormPrimitives';

export {
  DisplaySettingsView,
  AISettingsView,
  SkinSettingsView,
  SoundSettingsView,
  ChatBgSettingsView,
  StorageSettingsView,
  WorldBooksView,
  WorldBookEditView,
  PromptRuleTreeView,
  HtmlTemplatesView,
  HtmlTemplateEditView,
  BubbleWorkshopListView,
  BubbleWorkshopEditView,
  ChatDetailsView
};

export const SettingsView: React.FC<{
  onBack: () => void;
  setSub: (s: SubView) => void;
}> = ({ onBack, setSub }) => (
  <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200 render-settings-root">
    <MobileHeader title="设置" onBack={onBack} className="render-settings-header" />
    <div className="flex-1 overflow-y-auto">
      <div className="render-bg-secondary">
        <InlineActionRow label="皮肤与DIY" rightText="预设/混搭/DIY/CSS" onClick={() => setSub('skinSettings')} />
        <InlineActionRow label="显示设置" rightText="字体/排版/密度" onClick={() => setSub('displaySettings')} />
        <InlineActionRow label="背景图片" onClick={() => setSub('chatBgSettings')} />
        <InlineActionRow label="声音与震动" onClick={() => setSub('soundSettings')} />
        <InlineActionRow label="AI 配置" rightText="延迟回复/分句发送" onClick={() => setSub('aiSettings')} />
        <InlineActionRow label="存储管理" rightText="备份/恢复/统计" onClick={() => setSub('storageSettings')} />
        <InlineActionRow label="世界书" rightText="故事背景" onClick={() => setSub('worldBooks')} />
        <InlineActionRow label="HTML" onClick={() => setSub('htmlTemplates')} />
      </div>
      <SectionDivider />
    </div>
  </div>
);
