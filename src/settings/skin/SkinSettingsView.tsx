import React from 'react';
import { MobileHeader } from '../../Common';
import { AppearanceSettings, AISettings, BubbleTemplate, DIYThemePreset, SubView, UserProfile } from '../../types';
import { BUILT_IN_RENDER_SKINS, type BuiltInSkinId } from '../../render-schema';
import { cloneRenderConfig, normalizeImportedTheme } from '../skinThemeUtils';
import { PresetTab } from './PresetTab';
import { CustomTab } from './CustomTab';
import { ChatTab } from './ChatTab';
import { AdvancedTab } from './AdvancedTab';
import { IconTab } from './IconTab';
import { SkinEmptyState, SkinLivePreviewCard, SkinTabNav } from './SkinPanelPrimitives';

type EditorTab = 'theme' | 'chat' | 'icon' | 'advanced';

export const SkinSettingsView: React.FC<{
  onBack: () => void;
  settings?: AppearanceSettings;
  setSettings?: (updater: any) => void;
  aiSettings?: AISettings;
  user?: UserProfile;
  setUser?: React.Dispatch<React.SetStateAction<UserProfile>>;
  bubbleTemplates?: BubbleTemplate[];
  setBubbleTemplates?: React.Dispatch<React.SetStateAction<BubbleTemplate[]>>;
  pushSubView?: (sub: SubView) => void;
  onEditBubbleTemplate?: (id: string) => void;
}> = ({ onBack, settings, setSettings, aiSettings, user, setUser, bubbleTemplates, pushSubView }) => {
  const [tab, setTab] = React.useState<EditorTab>('theme');
  const importThemeInputRef = React.useRef<HTMLInputElement>(null);

  if (!settings || !setSettings) {
    return (
      <div className="flex flex-col h-full render-bg-primary">
        <MobileHeader title="皮肤设置" onBack={onBack} />
        <div className="p-4">
          <SkinEmptyState message="配置不可用" />
        </div>
      </div>
    );
  }

  const currentCfg = settings.renderConfig || BUILT_IN_RENDER_SKINS[settings.renderSkinId];

  const importThemes = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const parsed = JSON.parse(text);
        const listRaw = Array.isArray(parsed) ? parsed : [parsed];
        const imported = listRaw
          .map((item) => normalizeImportedTheme(item, settings.renderSkinId))
          .filter(Boolean) as DIYThemePreset[];

        if (imported.length === 0) {
          alert('未识别到有效主题数据');
          return;
        }

        setSettings((prev: AppearanceSettings) => {
          const merged = [...(prev.customThemes || []), ...imported];
          const first = imported[0];
          return {
            ...prev,
            customThemes: merged,
            activeCustomThemeId: first.id,
            renderSkinId: first.baseSkinId,
            renderConfig: cloneRenderConfig(first.renderConfig),
            customCSS: first.customCSS || '',
            headerImage: first.headerImage || '',
            footerImage: first.footerImage || '',
            iconImageMap: { ...(first.iconImageMap || {}) }
          };
        });
      } catch {
        alert('导入失败，文件格式不正确');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const tabs: Array<{ key: EditorTab; label: string }> = [
    { key: 'theme', label: '主题' },
    { key: 'chat', label: '聊天' },
    { key: 'icon', label: '图标DIY' },
    { key: 'advanced', label: '高级' }
  ];

  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader title="皮肤设置" onBack={onBack} />

      <input
        ref={importThemeInputRef}
        type="file"
        className="hidden"
        accept="application/json,.json"
        onChange={(e) => {
          importThemes(e.target.files?.[0]);
          if (e.target) e.target.value = '';
        }}
      />

      <div className="px-3 pt-3 pb-2 border-b render-border-subtle render-bg-secondary sticky top-[calc(var(--safe-top)+var(--header-height,48px))] z-20">
        <SkinLivePreviewCard
          title="实时预览"
          subtitle={currentCfg.skinName}
          bubbleRadius={currentCfg.chat.bubble.radius}
          colors={{
            bgPrimary: currentCfg.colors.bgPrimary,
            bgTertiary: currentCfg.colors.bgTertiary,
            textSecondary: currentCfg.colors.textSecondary,
            border: currentCfg.colors.border,
            bubbleOther: currentCfg.colors.bubbleOther,
            bubbleTextOther: currentCfg.colors.bubbleTextOther,
            bubbleMe: currentCfg.colors.bubbleMe,
            bubbleTextMe: currentCfg.colors.bubbleTextMe
          }}
          footerItems={[
            `字号 ${currentCfg.typography.fontSize}px`,
            `宽度 ${currentCfg.chat.bubble.maxWidthPercent}%`,
            settings.activeCustomThemeId ? '混搭中' : '预设模式'
          ]}
        />
      </div>

      <div className="px-2 pt-2 pb-1 border-b render-border-subtle render-bg-primary sticky top-[calc(var(--safe-top)+var(--header-height,48px)+190px)] z-20">
        <SkinTabNav items={tabs} activeKey={tab} onChange={(key) => setTab(key as EditorTab)} />
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-8">
        {tab === 'theme' && (
          <>
            <PresetTab settings={settings} setSettings={setSettings} user={user} setUser={setUser} />
            <CustomTab settings={settings} setSettings={setSettings} importThemeInputRef={importThemeInputRef} />
          </>
        )}
        {tab === 'chat' && (
          <ChatTab
            settings={settings}
            setSettings={setSettings}
            bubbleTemplates={bubbleTemplates}
            pushSubView={pushSubView}
          />
        )}
        {tab === 'icon' && <IconTab settings={settings} setSettings={setSettings} />}
        {tab === 'advanced' && <AdvancedTab settings={settings} setSettings={setSettings} />}
      </div>
    </div>
  );
};
