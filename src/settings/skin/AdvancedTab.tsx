import React from 'react';
import { CollapsibleSection } from '../../CommonCollapsible';
import { AppearanceSettings } from '../../types';
import { BUILT_IN_RENDER_SKINS, type AppRenderConfig } from '../../render-schema';
import { ADVANCED_COLOR_KEYS } from '../skinConstants';
import { cloneRenderConfig } from '../skinThemeUtils';
import { AppSwitch } from '../../utils/UtilsContactFormPrimitives';
import { SkinCodeBlock, SkinColorOverrideCard, SkinGuideList, SkinNoticeCard, SkinRangeField, SkinSectionCard, SkinSelectField } from './SkinPanelPrimitives';

const CUSTOM_CSS_HELPER_PROMPT = `你是前端样式助手。请根据我的需求输出一段可直接粘贴的全局 CSS，用于本项目的「自定义 CSS」功能。

## 渲染环境（建议优先使用）
- 主题变量：--app-accent-color, --bg-primary, --bg-secondary, --bg-tertiary, --text-primary, --text-secondary, --text-tertiary, --border-color
- 排版变量：--app-font-size, --app-font-line-height, --app-letter-spacing, --app-font-family
- 布局变量：--header-height, --render-tab-height, --render-input-height, --render-input-radius
- 常用类名：.render-bg-primary/.render-bg-secondary/.render-bg-tertiary/.render-text-primary/.render-text-secondary/.render-text-tertiary/.render-border/.render-chatroom-header/.render-chat-footer/.render-tab-bar/.wechat-cell

## 重要说明
1. 只输出 CSS 代码，不要代码围栏，不要解释
2. 兼容浅色/深色（尽量使用上述变量，避免大量写死颜色）
3. 非必要不要使用 !important（尽量少）

我的需求是：[在这里描述你想要的整体风格]`;

export const AdvancedTab: React.FC<{
  settings: AppearanceSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppearanceSettings>>;
}> = ({ settings, setSettings }) => {
  const [promptCopied, setPromptCopied] = React.useState(false);
  const currentCfg: AppRenderConfig = settings.renderConfig || BUILT_IN_RENDER_SKINS[settings.renderSkinId];

  const updateSettings = (patch: Partial<AppearanceSettings>) => {
    setSettings((prev: AppearanceSettings) => ({ ...prev, ...patch }));
  };

  const updateRenderConfig = (updater: (cfg: AppRenderConfig) => AppRenderConfig) => {
    setSettings((prev: AppearanceSettings) => {
      const baseCfg = prev.renderConfig || BUILT_IN_RENDER_SKINS[prev.renderSkinId];
      return {
        ...prev,
        renderConfig: updater(cloneRenderConfig(baseCfg))
      };
    });
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(CUSTOM_CSS_HELPER_PROMPT).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = CUSTOM_CSS_HELPER_PROMPT;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    });
  };

  return (
    <>
      <CollapsibleSection
        storageKey="skinSettings:advancedTab:layout"
        title="布局与尺寸"
        summary="消息间距、头部、底栏、输入区"
        defaultExpanded
      >
        <div className="space-y-3">
          <SkinRangeField label="消息间距" value={currentCfg.chat.messageSpacing} min={8} max={32} onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, chat: { ...cfg.chat, messageSpacing: v } }))} />
          <SkinRangeField label="输入区高度" value={currentCfg.chat.composerHeight} min={36} max={72} onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, chat: { ...cfg.chat, composerHeight: v } }))} />
          <SkinRangeField label="头部高度" value={currentCfg.header.height} min={40} max={72} onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, header: { ...cfg.header, height: v } }))} />
          <SkinRangeField label="底栏高度" value={currentCfg.tabs.height} min={44} max={72} onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, tabs: { ...cfg.tabs, height: v } }))} />
          <SkinRangeField label="底栏图标尺寸" value={currentCfg.tabs.iconSize} min={16} max={30} onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, tabs: { ...cfg.tabs, iconSize: v } }))} />
          <SkinRangeField label="底栏文字尺寸" value={currentCfg.tabs.labelSize} min={8} max={16} onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, tabs: { ...cfg.tabs, labelSize: v } }))} />
          <SkinRangeField label="列表项最小高度" value={currentCfg.list.itemMinHeight} min={44} max={90} onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, list: { ...cfg.list, itemMinHeight: v } }))} />
          <SkinRangeField label="列表项Y内边距" value={currentCfg.list.itemPaddingY} min={4} max={20} onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, list: { ...cfg.list, itemPaddingY: v } }))} />
          <SkinRangeField label="输入框高度" value={currentCfg.input.height} min={32} max={56} onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, input: { ...cfg.input, height: v } }))} />
          <SkinRangeField label="输入框圆角" value={currentCfg.input.radius} min={0} max={30} onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, input: { ...cfg.input, radius: v } }))} />
          <SkinRangeField label="输入按钮尺寸" value={currentCfg.input.actionButtonSize} min={20} max={52} onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, input: { ...cfg.input, actionButtonSize: v } }))} />
          <SkinRangeField label="桌面侧栏宽度" value={currentCfg.desktopSidebar.width} min={56} max={110} onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, desktopSidebar: { ...cfg.desktopSidebar, width: v } }))} />
          <SkinRangeField label="桌面头像尺寸" value={currentCfg.desktopSidebar.avatarSize} min={28} max={64} onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, desktopSidebar: { ...cfg.desktopSidebar, avatarSize: v } }))} />
          <SkinRangeField label="桌面图标尺寸" value={currentCfg.desktopSidebar.iconSize} min={16} max={36} onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, desktopSidebar: { ...cfg.desktopSidebar, iconSize: v } }))} />
          <SkinRangeField label="卡片圆角" value={currentCfg.radius.card} min={0} max={24} onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, radius: { ...cfg.radius, card: v } }))} />
          <SkinRangeField label="按钮圆角" value={currentCfg.radius.button} min={0} max={24} onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, radius: { ...cfg.radius, button: v } }))} />
          <SkinRangeField label="输入圆角（全局）" value={currentCfg.radius.input} min={0} max={24} onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, radius: { ...cfg.radius, input: v } }))} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        storageKey="skinSettings:advancedTab:switches"
        title="结构开关"
        summary="底栏文字、列表分割线、头部与布局模式"
        defaultExpanded={false}
      >
        <div className="space-y-3">
          <label className="app-list-item app-list-item--interactive p-0"><span className="app-list-item-title">底栏显示文字</span><AppSwitch active={currentCfg.tabs.showLabel} onChange={() => updateRenderConfig((cfg) => ({ ...cfg, tabs: { ...cfg.tabs, showLabel: !cfg.tabs.showLabel } }))} /></label>
          <label className="app-list-item app-list-item--interactive p-0"><span className="app-list-item-title">列表分割线</span><AppSwitch active={currentCfg.list.showDivider} onChange={() => updateRenderConfig((cfg) => ({ ...cfg, list: { ...cfg.list, showDivider: !cfg.list.showDivider } }))} /></label>
          <label className="app-list-item app-list-item--interactive p-0"><span className="app-list-item-title">输入框边框</span><AppSwitch active={currentCfg.input.showBorder} onChange={() => updateRenderConfig((cfg) => ({ ...cfg, input: { ...cfg.input, showBorder: !cfg.input.showBorder } }))} /></label>
          <label className="app-list-item app-list-item--interactive p-0"><span className="app-list-item-title">头部透明</span><AppSwitch active={currentCfg.header.transparent} onChange={() => updateRenderConfig((cfg) => ({ ...cfg, header: { ...cfg.header, transparent: !cfg.header.transparent } }))} /></label>
          <label className="app-list-item app-list-item--interactive p-0"><span className="app-list-item-title">显示返回按钮</span><AppSwitch active={currentCfg.header.showBackButton} onChange={() => updateRenderConfig((cfg) => ({ ...cfg, header: { ...cfg.header, showBackButton: !cfg.header.showBackButton } }))} /></label>
          <label className="app-list-item app-list-item--interactive p-0"><span className="app-list-item-title">显示副标题</span><AppSwitch active={currentCfg.header.showSubtitle} onChange={() => updateRenderConfig((cfg) => ({ ...cfg, header: { ...cfg.header, showSubtitle: !cfg.header.showSubtitle } }))} /></label>
          <label className="app-list-item app-list-item--interactive p-0"><span className="app-list-item-title">头部显示头像</span><AppSwitch active={currentCfg.header.showAvatar} onChange={() => updateRenderConfig((cfg) => ({ ...cfg, header: { ...cfg.header, showAvatar: !cfg.header.showAvatar } }))} /></label>
          <label className="app-list-item app-list-item--interactive p-0"><span className="app-list-item-title">Telegram 侧边栏布局</span><AppSwitch active={currentCfg.layout.telegramSidebar} onChange={() => updateRenderConfig((cfg) => ({ ...cfg, layout: { ...cfg.layout, telegramSidebar: !cfg.layout.telegramSidebar } }))} /></label>
          <label className="app-list-item app-list-item--interactive p-0"><span className="app-list-item-title">WhatsApp 顶部导航</span><AppSwitch active={currentCfg.layout.whatsappTopNav} onChange={() => updateRenderConfig((cfg) => ({ ...cfg, layout: { ...cfg.layout, whatsappTopNav: !cfg.layout.whatsappTopNav } }))} /></label>
          <label className="app-list-item app-list-item--interactive p-0"><span className="app-list-item-title">设置页卡片模式</span><AppSwitch active={currentCfg.layout.settingsCardMode} onChange={() => updateRenderConfig((cfg) => ({ ...cfg, layout: { ...cfg.layout, settingsCardMode: !cfg.layout.settingsCardMode } }))} /></label>
          <label className="app-list-item app-list-item--interactive p-0"><span className="app-list-item-title">资料页 Hero 卡片</span><AppSwitch active={currentCfg.layout.profileHeroCard} onChange={() => updateRenderConfig((cfg) => ({ ...cfg, layout: { ...cfg.layout, profileHeroCard: !cfg.layout.profileHeroCard } }))} /></label>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        storageKey="skinSettings:advancedTab:selects"
        title="对齐与样式模式"
        summary="标题对齐、底栏位置、搜索框样式"
        defaultExpanded={false}
      >
        <div className="space-y-3">
          <SkinSelectField
            label="头部标题对齐"
            value={currentCfg.header.titleAlign}
            onChange={(value) => updateRenderConfig((cfg) => ({ ...cfg, header: { ...cfg.header, titleAlign: value as any } }))}
            options={[
              { value: 'left', label: '左对齐' },
              { value: 'center', label: '居中' },
              { value: 'right', label: '右对齐' }
            ]}
          />
          <SkinSelectField
            label="头部头像对齐"
            value={currentCfg.header.avatarAlign}
            onChange={(value) => updateRenderConfig((cfg) => ({ ...cfg, header: { ...cfg.header, avatarAlign: value as any } }))}
            options={[
              { value: 'left', label: '左对齐' },
              { value: 'center', label: '居中' },
              { value: 'right', label: '右对齐' }
            ]}
          />
          <SkinSelectField
            label="底栏位置"
            value={currentCfg.tabs.position}
            onChange={(value) => updateRenderConfig((cfg) => ({ ...cfg, tabs: { ...cfg.tabs, position: value as any } }))}
            options={[
              { value: 'bottom', label: '底部' },
              { value: 'top', label: '顶部' }
            ]}
          />
          <SkinSelectField
            label="搜索框样式"
            value={currentCfg.layout.searchBarStyle}
            onChange={(value) => updateRenderConfig((cfg) => ({ ...cfg, layout: { ...cfg.layout, searchBarStyle: value as any } }))}
            options={[
              { value: 'rounded', label: '圆角' },
              { value: 'capsule', label: '胶囊' },
              { value: 'system', label: '系统' }
            ]}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        storageKey="skinSettings:advancedTab:colors"
        title="高级覆盖色"
        summary={`已覆盖 ${ADVANCED_COLOR_KEYS.filter((item) => Boolean(settings[item.key])).length} 项`}
        defaultExpanded={false}
      >
        <div className="mb-3">
          <SkinNoticeCard>
            高级覆盖色优先级高于普通主题色，适合做局部微调；如果出现样式冲突，优先回退这里排查。
          </SkinNoticeCard>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ADVANCED_COLOR_KEYS.map((item) => {
            const current = (settings[item.key] as string | undefined) || '';
            return (
              <SkinColorOverrideCard
                key={String(item.key)}
                label={item.label}
                value={current}
                fallback={item.fallback}
                onChange={(value) => updateSettings({ [item.key]: value } as Partial<AppearanceSettings>)}
                onReset={() => updateSettings({ [item.key]: undefined } as Partial<AppearanceSettings>)}
              />
            );
          })}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        storageKey="skinSettings:advancedTab:css"
        title="自定义 CSS"
        summary={(settings.customCSSEnabled !== false && String(settings.customCSS || '').trim()) ? '已启用' : '未启用'}
        defaultExpanded={false}
      >
        <div className="mb-3">
          <SkinNoticeCard tone="warning">
            自定义 CSS 优先级较高，可能覆盖普通主题设置；如出现异常，建议先暂时关闭这里排查。
          </SkinNoticeCard>
        </div>
        <textarea
          className="w-full min-h-[180px] rounded border render-border px-3 py-2 text-sm render-bg-primary"
          value={settings.customCSS || ''}
          onChange={(e) => {
            const value = e.target.value;
            updateSettings({ customCSS: value, customCSSEnabled: value.trim().length > 0 });
          }}
          placeholder="输入自定义 CSS（输入即启用）"
        />

        <div className="mt-3">
          <SkinGuideList
            title="建议优先修改（更稳定）："
            items={[
              '1) 主题色：`--app-accent-color`',
              '2) 页面层级：`--bg-primary / --bg-secondary / --text-primary / --border-color`',
              '3) 字体排版：`--app-font-size / --app-font-line-height / --app-letter-spacing`',
              '4) 结构模块：`.render-chatroom-header / .render-chat-footer / .render-tab-bar / .wechat-cell`',
              '气泡样式请使用「气泡工坊」，避免与这里的全局 CSS 混用。'
            ]}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        storageKey="skinSettings:advancedTab:promptHelper"
        title="提示词帮手"
        summary="复制提示词，让 AI 帮你写 CSS"
        defaultExpanded={false}
      >
        <SkinSectionCard>
          <div className="text-[13px] render-text-secondary">仅提供提示词，不在应用内直接生成</div>
          <SkinCodeBlock>{CUSTOM_CSS_HELPER_PROMPT}</SkinCodeBlock>
          <button
            type="button"
            className="mt-2 w-full py-2 rounded-lg text-[13px] font-medium text-white active:opacity-90"
            style={{ backgroundColor: 'var(--app-accent-color)' }}
            onClick={handleCopyPrompt}
          >
            {promptCopied ? '已复制到剪贴板' : '复制提示词'}
          </button>
        </SkinSectionCard>
      </CollapsibleSection>
    </>
  );
};
