import React from 'react';
import { CollapsibleSection } from '../../CommonCollapsible';
import { AppearanceSettings, BubbleTemplate, DIYThemePreset, SubView } from '../../types';
import { BUILT_IN_RENDER_SKINS, type AppRenderConfig } from '../../render-schema';
import { cloneRenderConfig } from '../skinThemeUtils';
import { COLOR_KEYS, META_TEXT_COLOR_KEYS } from '../skinConstants';
import { AppSwitch } from '../../utils/UtilsContactFormPrimitives';
import { SkinColorOverrideCard, SkinNoticeCard, SkinPreviewCard, SkinRangeField, SkinSectionCard, SkinSelectField, SkinTextOverrideCard } from './SkinPanelPrimitives';

const BUBBLE_COLOR_KEYS = new Set(['bubbleMe', 'bubbleOther', 'bubbleTextMe', 'bubbleTextOther']);
const buildPreviewMixColor = (color: string, opacityPercent: number): string => {
  const safeColor = String(color || '').trim();
  const safeOpacity = Math.max(0, Math.min(100, opacityPercent));
  if (!safeColor) return '';
  if (safeOpacity >= 100) return safeColor;
  return `color-mix(in srgb, ${safeColor} ${safeOpacity}%, transparent)`;
};

export const ChatTab: React.FC<{
  settings: AppearanceSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppearanceSettings>>;
  bubbleTemplates?: BubbleTemplate[];
  pushSubView?: (sub: SubView) => void;
}> = ({ settings, setSettings, bubbleTemplates = [], pushSubView }) => {
  const currentCfg: AppRenderConfig = settings.renderConfig || BUILT_IN_RENDER_SKINS[settings.renderSkinId];

  const enabledBubbleTemplates = bubbleTemplates.filter((t) => t.enabled);
  const bubbleWorkshopActive = enabledBubbleTemplates.length > 0;

  const safeBubbleOpacity = Number.isFinite(Number(settings.bubbleOpacity)) ? Math.max(0, Math.min(1, Number(settings.bubbleOpacity))) : 1;
  const safeBubbleBlur = Number.isFinite(Number(settings.bubbleBlur)) ? Math.max(0, Math.min(24, Number(settings.bubbleBlur))) : 0;

  const updateSettings = (patch: Partial<AppearanceSettings>) => {
    setSettings((prev: AppearanceSettings) => ({ ...prev, ...patch }));
  };

  const createMixThemeFrom = (prev: AppearanceSettings, name?: string) => {
    const now = Date.now();
    const id = `diy-${now}`;
    const cfg = prev.renderConfig || BUILT_IN_RENDER_SKINS[prev.renderSkinId];
    const preset: DIYThemePreset = {
      id,
      name: name || `混搭·${cfg.skinName || '当前皮肤'}`,
      baseSkinId: prev.renderSkinId,
      renderConfig: cloneRenderConfig(cfg),
      customCSS: prev.customCSS || '',
      headerImage: prev.headerImage || '',
      footerImage: prev.footerImage || '',
      iconImageMap: { ...(prev.iconImageMap || {}) },
      createdAt: now,
      updatedAt: now
    };
    return preset;
  };

  const updateRenderConfig = (updater: (cfg: AppRenderConfig) => AppRenderConfig) => {
    setSettings((prev: AppearanceSettings) => {
      const baseCfg = prev.renderConfig || BUILT_IN_RENDER_SKINS[prev.renderSkinId];
      let activeId = prev.activeCustomThemeId || '';
      let themes = [...(prev.customThemes || [])];

      if (!activeId) {
        const autoTheme = createMixThemeFrom(prev, '自动混搭');
        activeId = autoTheme.id;
        themes = [...themes, autoTheme];
      }

      const nextCfg = updater(cloneRenderConfig(baseCfg));
      const now = Date.now();
      themes = themes.map((t) => (t.id === activeId ? { ...t, renderConfig: cloneRenderConfig(nextCfg), updatedAt: now } : t));

      return {
        ...prev,
        activeCustomThemeId: activeId,
        customThemes: themes,
        renderConfig: nextCfg
      };
    });
  };

  const bubbleWorkshopSummary = bubbleWorkshopActive
    ? `已启用 ${enabledBubbleTemplates.length} 个模板`
    : (bubbleTemplates.length > 0 ? `已添加 ${bubbleTemplates.length} 个模板` : '未添加模板');

  const bubbleColorItems = COLOR_KEYS.filter((item) => BUBBLE_COLOR_KEYS.has(String(item.key)));

  const noticeColorOverrideCount = META_TEXT_COLOR_KEYS.filter((item) => String(settings[item.key] || '').trim().length > 0).length;
  const noticeTextOverrideCount = [
    settings.innerVoicePrefix,
    settings.actionDescPrefix,
    settings.narrationPrefix,
    settings.readStatusTextOverride
  ].filter((value) => String(value || '').trim().length > 0).length;
  const systemNoticeBackgroundStyle = settings.systemNoticeBackgroundStyle || 'auto';
  const systemNoticeBackgroundOpacity = Number.isFinite(Number(settings.systemNoticeBackgroundOpacity))
    ? Math.max(0, Math.min(100, Number(settings.systemNoticeBackgroundOpacity)))
    : 36;
  const systemNoticeBlur = Number.isFinite(Number(settings.systemNoticeBlur))
    ? Math.max(0, Math.min(20, Number(settings.systemNoticeBlur)))
    : 10;
  const systemNoticeBorderOpacity = Number.isFinite(Number(settings.systemNoticeBorderOpacity))
    ? Math.max(0, Math.min(100, Number(settings.systemNoticeBorderOpacity)))
    : 30;
  const safeNotificationTextSize = Number.isFinite(Number(settings.notificationTextSize))
    ? Math.max(10, Math.min(24, Number(settings.notificationTextSize)))
    : 12;
  const systemNoticeOverrideCount = [
    settings.systemNoticeTextColor,
    settings.systemNoticeBorderColor
  ].filter((value) => String(value || '').trim().length > 0).length
    + (systemNoticeBackgroundStyle !== 'auto' ? 1 : 0)
    + (settings.systemNoticeBorderEnabled ? 1 : 0);
  const previewNoticeBaseStyle: React.CSSProperties = (() => {
    const style: React.CSSProperties = {
      padding: '4px 12px',
      borderRadius: '999px',
      fontSize: `${safeNotificationTextSize}px`,
      textAlign: 'center'
    };
    const resolvedTextColor = String(settings.systemNoticeTextColor || '').trim();
    if (resolvedTextColor) {
      style.color = resolvedTextColor;
    } else if (systemNoticeBackgroundStyle === 'auto') {
      style.color = 'var(--text-tertiary)';
    } else {
      style.color = '#ffffff';
    }

    if (systemNoticeBackgroundStyle === 'auto') {
      style.backgroundColor = 'rgba(0,0,0,0.06)';
    } else if (systemNoticeBackgroundStyle === 'glass') {
      style.backgroundColor = buildPreviewMixColor('#000000', systemNoticeBackgroundOpacity) || 'rgba(0,0,0,0.36)';
      style.backdropFilter = `blur(${systemNoticeBlur}px)`;
      style.WebkitBackdropFilter = `blur(${systemNoticeBlur}px)`;
    } else {
      style.backgroundColor = buildPreviewMixColor('#000000', systemNoticeBackgroundOpacity) || 'rgba(0,0,0,0.56)';
    }

    if (settings.systemNoticeBorderEnabled) {
      const borderColor = buildPreviewMixColor(String(settings.systemNoticeBorderColor || '').trim() || '#ffffff', systemNoticeBorderOpacity) || 'rgba(255,255,255,0.3)';
      style.border = `1px solid ${borderColor}`;
    }
    return style;
  })();
  const previewInnerNoticeStyle: React.CSSProperties = {
    ...previewNoticeBaseStyle,
    ...(String(settings.innerNoticeTextColor || '').trim() ? { color: settings.innerNoticeTextColor } : {})
  };

  return (
    <>
      <CollapsibleSection
        storageKey="skinSettings:chatTab:bubbleWorkshop"
        title="气泡工坊"
        summary={bubbleWorkshopSummary}
        defaultExpanded
      >
        <div className="space-y-2">
          <SkinNoticeCard>
            气泡工坊用于自定义气泡 CSS，启用后优先级最高。
          </SkinNoticeCard>
          <button
            type="button"
            className="w-full py-2 rounded-lg text-[13px] font-medium text-white active:opacity-90"
            style={{ backgroundColor: 'var(--app-accent-color)' }}
            onClick={() => pushSubView?.('bubbleTemplates')}
          >
            进入气泡工坊
          </button>
          {bubbleWorkshopActive ? (
            <SkinNoticeCard tone="info">
              当前已启用 {enabledBubbleTemplates.length} 个模板：气泡外观优先由工坊控制。
            </SkinNoticeCard>
          ) : null}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        storageKey="skinSettings:chatTab:bubbleLayout"
        title="气泡（布局）"
        summary={`宽度 ${currentCfg.chat.bubble.maxWidthPercent}% · 圆角 ${currentCfg.chat.bubble.radius}px`}
        defaultExpanded={false}
      >
        {bubbleWorkshopActive ? (
          <div className="mb-3">
            <SkinNoticeCard tone="info">
              气泡工坊已启用：为避免混用，这里的气泡外观参数已禁用（可在工坊 CSS 中自行控制）。
            </SkinNoticeCard>
          </div>
        ) : null}

        <div className="space-y-3">
          <SkinRangeField
            label="消息最大宽度"
            value={currentCfg.chat.bubble.maxWidthPercent}
            min={60}
            max={95}
            onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, chat: { ...cfg.chat, bubble: { ...cfg.chat.bubble, maxWidthPercent: v } } }))}
          />

          <SkinRangeField
            label="气泡圆角"
            value={currentCfg.chat.bubble.radius}
            min={0}
            max={28}
            disabled={bubbleWorkshopActive}
            onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, chat: { ...cfg.chat, bubble: { ...cfg.chat.bubble, radius: v } } }))}
          />
          <SkinRangeField
            label="气泡X内边距"
            value={currentCfg.chat.bubble.paddingX}
            min={6}
            max={24}
            disabled={bubbleWorkshopActive}
            onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, chat: { ...cfg.chat, bubble: { ...cfg.chat.bubble, paddingX: v } } }))}
          />
          <SkinRangeField
            label="气泡Y内边距"
            value={currentCfg.chat.bubble.paddingY}
            min={4}
            max={20}
            disabled={bubbleWorkshopActive}
            onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, chat: { ...cfg.chat, bubble: { ...cfg.chat.bubble, paddingY: v } } }))}
          />
          <SkinRangeField
            label="气泡边框宽度"
            value={currentCfg.chat.bubble.borderWidth}
            min={0}
            max={4}
            disabled={bubbleWorkshopActive}
            onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, chat: { ...cfg.chat, bubble: { ...cfg.chat.bubble, borderWidth: v } } }))}
          />
          <SkinRangeField
            label="气泡透明度"
            value={safeBubbleOpacity}
            min={0.2}
            max={1}
            step={0.05}
            disabled={bubbleWorkshopActive}
            onChange={(v) => updateSettings({ bubbleOpacity: Number(v.toFixed(2)) })}
          />
          <SkinRangeField
            label="气泡模糊"
            value={safeBubbleBlur}
            min={0}
            max={24}
            disabled={bubbleWorkshopActive}
            onChange={(v) => updateSettings({ bubbleBlur: Math.round(v) })}
          />
          <SkinRangeField
            label="尾巴尺寸"
            value={currentCfg.chat.bubble.tailSize}
            min={0}
            max={16}
            disabled={bubbleWorkshopActive}
            onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, chat: { ...cfg.chat, bubble: { ...cfg.chat.bubble, tailSize: v } } }))}
          />
          <SkinRangeField
            label="尾巴圆角"
            value={currentCfg.chat.bubble.tailRoundness}
            min={0}
            max={10}
            disabled={bubbleWorkshopActive}
            onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, chat: { ...cfg.chat, bubble: { ...cfg.chat.bubble, tailRoundness: v } } }))}
          />

          <label className={`app-list-item app-list-item--interactive p-0${bubbleWorkshopActive ? ' opacity-40 pointer-events-none' : ''}`}>
            <span className="app-list-item-title">显示气泡尾巴</span>
            <AppSwitch
              active={currentCfg.chat.bubble.hasTail}
              onChange={() => updateRenderConfig((cfg) => ({ ...cfg, chat: { ...cfg.chat, bubble: { ...cfg.chat.bubble, hasTail: !cfg.chat.bubble.hasTail } } }))}
            />
          </label>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        storageKey="skinSettings:chatTab:bubbleColors"
        title="气泡（配色）"
        summary={bubbleWorkshopActive ? '由气泡工坊接管' : '我方/对方/文字'}
        defaultExpanded={false}
      >
        {bubbleWorkshopActive ? (
          <div className="mb-3">
            <SkinNoticeCard tone="info">
              气泡工坊已启用：气泡配色优先由工坊 CSS 控制。
            </SkinNoticeCard>
          </div>
        ) : null}
        <div className={`grid grid-cols-2 gap-2${bubbleWorkshopActive ? ' opacity-40 pointer-events-none' : ''}`}>
          {bubbleColorItems.map((item) => (
            <SkinColorOverrideCard
              key={String(item.key)}
              label={item.label}
              value={currentCfg.colors[item.key as keyof AppRenderConfig['colors']]}
              fallback={currentCfg.colors[item.key as keyof AppRenderConfig['colors']]}
              hideReset
              onChange={(value) => updateRenderConfig((cfg) => ({ ...cfg, colors: { ...cfg.colors, [item.key]: value } }))}
              onReset={() => {}}
            />
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        storageKey="skinSettings:chatTab:chatMeta"
        title="聊天信息（头像/已读/时间）"
        summary={`已读 ${currentCfg.chat.meta.showReadStatus ? '开' : '关'} · 头像 ${currentCfg.chat.meta.showAvatar ? '开' : '关'} · 时间 ${currentCfg.chat.meta.showTimestamp}`}
        defaultExpanded={false}
      >
        <div className="space-y-3">
          <label className="app-list-item app-list-item--interactive p-0">
            <span className="app-list-item-title">显示已读状态</span>
            <AppSwitch
              active={currentCfg.chat.meta.showReadStatus}
              onChange={() => updateRenderConfig((cfg) => ({ ...cfg, chat: { ...cfg.chat, meta: { ...cfg.chat.meta, showReadStatus: !cfg.chat.meta.showReadStatus } } }))}
            />
          </label>
          <label className="app-list-item app-list-item--interactive p-0">
            <span className="app-list-item-title">显示头像</span>
            <AppSwitch
              active={currentCfg.chat.meta.showAvatar}
              onChange={() => updateRenderConfig((cfg) => ({ ...cfg, chat: { ...cfg.chat, meta: { ...cfg.chat.meta, showAvatar: !cfg.chat.meta.showAvatar } } }))}
            />
          </label>
          <label className="app-list-item app-list-item--interactive p-0">
            <span className="app-list-item-title">群聊显示发送者</span>
            <AppSwitch
              active={currentCfg.chat.meta.groupShowSenderName}
              onChange={() => updateRenderConfig((cfg) => ({ ...cfg, chat: { ...cfg.chat, meta: { ...cfg.chat.meta, groupShowSenderName: !cfg.chat.meta.groupShowSenderName } } }))}
            />
          </label>
          <label className="app-list-item app-list-item--interactive p-0">
            <span className="app-list-item-title">时间在气泡内</span>
            <AppSwitch
              active={currentCfg.chat.meta.timestampInBubble}
              onChange={() => updateRenderConfig((cfg) => ({ ...cfg, chat: { ...cfg.chat, meta: { ...cfg.chat.meta, timestampInBubble: !cfg.chat.meta.timestampInBubble } } }))}
            />
          </label>
          <label className="app-list-item app-list-item--interactive p-0">
            <span className="app-list-item-title">时间轴样式</span>
            <AppSwitch
              active={currentCfg.chat.meta.timestampAsTimeline}
              onChange={() => updateRenderConfig((cfg) => ({ ...cfg, chat: { ...cfg.chat, meta: { ...cfg.chat.meta, timestampAsTimeline: !cfg.chat.meta.timestampAsTimeline } } }))}
            />
          </label>

          <SkinSelectField
            label="时间显示模式"
            value={currentCfg.chat.meta.showTimestamp}
            onChange={(value) => updateRenderConfig((cfg) => ({ ...cfg, chat: { ...cfg.chat, meta: { ...cfg.chat.meta, showTimestamp: value as any } } }))}
            options={[
              { value: 'auto', label: '自动' },
              { value: 'always', label: '总是' },
              { value: 'hidden', label: '隐藏' }
            ]}
          />

          <SkinSelectField
            label="头像形状"
            value={currentCfg.chat.meta.avatarShape}
            onChange={(value) => updateRenderConfig((cfg) => ({ ...cfg, chat: { ...cfg.chat, meta: { ...cfg.chat.meta, avatarShape: value as any } } }))}
            options={[
              { value: 'rounded', label: '圆角' },
              { value: 'circle', label: '圆形' },
              { value: 'square', label: '方形' }
            ]}
          />
          <SkinRangeField
            label="头像圆角"
            value={currentCfg.chat.meta.avatarRadius}
            min={0}
            max={20}
            onChange={(v) => updateRenderConfig((cfg) => ({ ...cfg, chat: { ...cfg.chat, meta: { ...cfg.chat.meta, avatarRadius: v } } }))}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        storageKey="skinSettings:chatTab:systemNotice"
        title="系统通知"
        summary={`外观 ${systemNoticeOverrideCount} 项 · 文案 ${noticeColorOverrideCount + noticeTextOverrideCount} 项`}
        defaultExpanded={false}
      >
        <div className="space-y-3">
          <SkinNoticeCard>
            用于系统消息、通话提示，以及心声 / 动作 / 旁白这类通知胶囊。该组独立于气泡工坊，不会被气泡模板接管。
          </SkinNoticeCard>

          <SkinPreviewCard title="效果预览">
            <div className="flex justify-center">
              <div style={previewNoticeBaseStyle}>系统消息 · 语音通话 00:32</div>
            </div>
            <div className="flex justify-center">
              <div style={previewInnerNoticeStyle}>
                {(settings.innerVoicePrefix || '') + '这是心声提示效果'}
              </div>
            </div>
          </SkinPreviewCard>

          <SkinSectionCard title="通知外观">
            <SkinColorOverrideCard
              label="文字颜色（可选覆盖）"
              value={String(settings.systemNoticeTextColor || '')}
              fallback="#666666"
              resetLabel="跟随当前样式"
              onChange={(value) => updateSettings({ systemNoticeTextColor: value })}
              onReset={() => updateSettings({ systemNoticeTextColor: '' })}
            />

              <SkinSelectField
                label="背景样式"
                value={systemNoticeBackgroundStyle}
                onChange={(value) => updateSettings({ systemNoticeBackgroundStyle: value as AppearanceSettings['systemNoticeBackgroundStyle'] })}
                options={[
                  { value: 'auto', label: '自动（保持现状）' },
                  { value: 'glass', label: '玻璃胶囊' },
                  { value: 'solid', label: '纯色胶囊' }
                ]}
              />

            {systemNoticeBackgroundStyle !== 'auto' ? (
              <SkinRangeField
                label="背景透明度"
                value={systemNoticeBackgroundOpacity}
                min={0}
                max={100}
                onChange={(v) => updateSettings({ systemNoticeBackgroundOpacity: Math.round(v) })}
              />
            ) : null}

            {systemNoticeBackgroundStyle === 'glass' ? (
              <SkinRangeField
                label="模糊强度"
                value={systemNoticeBlur}
                min={0}
                max={20}
                onChange={(v) => updateSettings({ systemNoticeBlur: Math.round(v) })}
              />
            ) : null}

            <SkinSectionCard className="p-2">
              <label className="app-list-item app-list-item--interactive p-0">
                <span className="app-list-item-title">显示边框</span>
                <AppSwitch
                  active={!!settings.systemNoticeBorderEnabled}
                  onChange={() => updateSettings({ systemNoticeBorderEnabled: !settings.systemNoticeBorderEnabled })}
                />
              </label>

              {settings.systemNoticeBorderEnabled ? (
                <>
                  <SkinColorOverrideCard
                    label="边框颜色（可选覆盖）"
                    value={String(settings.systemNoticeBorderColor || '')}
                    fallback="#ffffff"
                    resetLabel="跟随当前样式"
                    onChange={(value) => updateSettings({ systemNoticeBorderColor: value })}
                    onReset={() => updateSettings({ systemNoticeBorderColor: '' })}
                  />
                  <SkinRangeField
                    label="边框透明度"
                    value={systemNoticeBorderOpacity}
                    min={0}
                    max={100}
                    onChange={(v) => updateSettings({ systemNoticeBorderOpacity: Math.round(v) })}
                  />
                </>
              ) : null}
            </SkinSectionCard>
          </SkinSectionCard>

          <SkinSectionCard title="通知文案">
            <div className="grid grid-cols-2 gap-2">
              {META_TEXT_COLOR_KEYS.map((item) => {
                const current = (settings[item.key] as string | undefined) || '';
                return (
                  <SkinColorOverrideCard
                    key={String(item.key)}
                    label={item.label}
                    value={current}
                    fallback={item.fallback}
                    resetLabel="默认"
                    onChange={(value) => updateSettings({ [item.key]: value } as Partial<AppearanceSettings>)}
                    onReset={() => updateSettings({ [item.key]: undefined } as Partial<AppearanceSettings>)}
                  />
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-2">
              <SkinTextOverrideCard
                label="心声前缀（可留空）"
                value={String(settings.innerVoicePrefix || '')}
                placeholder="例如：心声："
                onChange={(value) => updateSettings({ innerVoicePrefix: value })}
              />
              <SkinTextOverrideCard
                label="动作前缀（可留空）"
                value={String(settings.actionDescPrefix || '')}
                placeholder="例如：动作："
                onChange={(value) => updateSettings({ actionDescPrefix: value })}
              />
              <SkinTextOverrideCard
                label="旁白前缀（可留空）"
                value={String(settings.narrationPrefix || '')}
                placeholder="例如：旁白："
                onChange={(value) => updateSettings({ narrationPrefix: value })}
              />
              <SkinTextOverrideCard
                label="已读文字（可覆盖默认）"
                value={String(settings.readStatusTextOverride || '')}
                placeholder="留空则跟随皮肤默认"
                onChange={(value) => updateSettings({ readStatusTextOverride: value })}
              />
            </div>
          </SkinSectionCard>
        </div>
      </CollapsibleSection>
    </>
  );
};
