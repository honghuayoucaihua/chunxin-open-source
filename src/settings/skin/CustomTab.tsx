import React from 'react';
import { CollapsibleSection } from '../../CommonCollapsible';
import { AppearanceSettings, DIYThemePreset } from '../../types';
import { BUILT_IN_RENDER_SKINS, type BuiltInSkinId, type AppRenderConfig } from '../../render-schema';
import { COLOR_KEYS, THEME_COLOR_PRESETS } from '../skinConstants';
import { cloneRenderConfig, upsertTheme } from '../skinThemeUtils';
import { hasTransparency, mixColor, mixColorKeepingAlpha, normalizeHexColor } from './colorMixUtils';
import { SkinActionToolbar, SkinColorField, SkinColorPresetButton, SkinEmptyState, SkinPanelCard, SkinSectionCard, SkinThemeRow } from './SkinPanelPrimitives';

const buildPresetColorBundle = (accent: string, current: AppRenderConfig['colors']): AppRenderConfig['colors'] => {
  const safeAccent = normalizeHexColor(accent, current.accent || '#2b8cff');
  const preserveSurfaceAlpha = [current.bgSecondary, current.bgTertiary, current.border].some(hasTransparency);
  const mixSurfaceColor = preserveSurfaceAlpha ? mixColorKeepingAlpha : mixColor;

  return {
    ...current,
    accent: safeAccent,
    bgPrimary: mixColor(current.bgPrimary || '#f3f6fd', safeAccent, 0.04, '#f3f6fd', '#2b8cff'),
    bgSecondary: mixSurfaceColor(current.bgSecondary || '#ffffff', safeAccent, 0.03, '#ffffff', '#2b8cff'),
    bgTertiary: mixSurfaceColor(current.bgTertiary || '#e7edf9', safeAccent, 0.06, '#e7edf9', '#2b8cff'),
    textPrimary: mixColor(current.textPrimary || '#111827', safeAccent, 0.06, '#111827', '#2b8cff'),
    textSecondary: mixColor(current.textSecondary || '#475569', safeAccent, 0.1, '#475569', '#2b8cff'),
    textTertiary: mixColor(current.textTertiary || '#64748b', safeAccent, 0.12, '#64748b', '#2b8cff'),
    border: mixSurfaceColor(current.border || '#b9c6dd', safeAccent, 0.22, '#b9c6dd', '#2b8cff')
  };
};

export const CustomTab: React.FC<{
  settings: AppearanceSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppearanceSettings>>;
  importThemeInputRef: React.RefObject<HTMLInputElement | null>;
}> = ({ settings, setSettings, importThemeInputRef }) => {
  const [showCreateMixModal, setShowCreateMixModal] = React.useState(false);
  const [mixNameDraft, setMixNameDraft] = React.useState('');
  const [mixBaseSkinId, setMixBaseSkinId] = React.useState<BuiltInSkinId>('wechat');

  const currentCfg = settings.renderConfig || BUILT_IN_RENDER_SKINS[settings.renderSkinId];
  const customThemes = settings.customThemes || [];

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

  const applyThemeColorPreset = (accent: string) => {
    updateRenderConfig((cfg) => ({
      ...cfg,
      colors: buildPresetColorBundle(accent, cfg.colors)
    }));
  };

  const openCreateMixModal = () => {
    setMixNameDraft('');
    setMixBaseSkinId(settings.renderSkinId);
    setShowCreateMixModal(true);
  };

  const createMixAndMatch = (baseSkinId: BuiltInSkinId, name?: string) => {
    setSettings((prev: AppearanceSettings) => {
      const now = Date.now();
      const baseConfig = cloneRenderConfig(BUILT_IN_RENDER_SKINS[baseSkinId]);
      const preset: DIYThemePreset = {
        id: `diy-${now}`,
        name: (name || '').trim() || `混搭·${BUILT_IN_RENDER_SKINS[baseSkinId].skinName}`,
        baseSkinId,
        renderConfig: baseConfig,
        customCSS: '',
        headerImage: prev.headerImage || '',
        footerImage: prev.footerImage || '',
        iconImageMap: { ...(prev.iconImageMap || {}) },
        createdAt: now,
        updatedAt: now
      };
      return {
        ...prev,
        customThemes: [...(prev.customThemes || []), preset],
        activeCustomThemeId: preset.id,
        renderSkinId: preset.baseSkinId,
        renderConfig: cloneRenderConfig(preset.renderConfig),
        customCSS: preset.customCSS || '',
        headerImage: preset.headerImage || '',
        footerImage: preset.footerImage || ''
      };
    });
    setShowCreateMixModal(false);
  };

  const saveCurrentAsCustomTheme = () => {
    const now = Date.now();
    const name = settings.activeCustomThemeId
      ? `保存·${(customThemes.find((t) => t.id === settings.activeCustomThemeId)?.name || '当前混搭')}`
      : `自定义主题 ${new Date().toLocaleDateString('zh-CN')}`;
    setSettings((prev: AppearanceSettings) => {
      const list = [...(prev.customThemes || [])];
      const activeId = prev.activeCustomThemeId;
      const idx = activeId ? list.findIndex((t) => t.id === activeId) : -1;
      const next: DIYThemePreset = {
        id: idx >= 0 ? list[idx].id : `diy-${now}`,
        name,
        baseSkinId: prev.renderSkinId,
        renderConfig: cloneRenderConfig(prev.renderConfig || BUILT_IN_RENDER_SKINS[prev.renderSkinId]),
        customCSS: prev.customCSS || '',
        headerImage: prev.headerImage || '',
        footerImage: prev.footerImage || '',
        iconImageMap: { ...(prev.iconImageMap || {}) },
        createdAt: idx >= 0 ? list[idx].createdAt : now,
        updatedAt: now
      };
      const themes = upsertTheme(list, next);
      return { ...prev, customThemes: themes, activeCustomThemeId: next.id };
    });
  };

  const applyCustomTheme = (themeId: string) => {
    const target = customThemes.find((t) => t.id === themeId);
    if (!target) return;
    setSettings((prev: AppearanceSettings) => ({
      ...prev,
      activeCustomThemeId: target.id,
      renderSkinId: target.baseSkinId,
      renderConfig: cloneRenderConfig(target.renderConfig),
      customCSS: target.customCSS || '',
      headerImage: target.headerImage || '',
      footerImage: target.footerImage || '',
      iconImageMap: { ...(target.iconImageMap || {}) }
    }));
  };

  const deleteCustomTheme = (themeId: string) => {
    setSettings((prev: AppearanceSettings) => ({
      ...prev,
      customThemes: (prev.customThemes || []).filter((t) => t.id !== themeId),
      activeCustomThemeId: prev.activeCustomThemeId === themeId ? '' : prev.activeCustomThemeId
    }));
  };

  const exportCurrentTheme = () => {
    const active = customThemes.find((t) => t.id === settings.activeCustomThemeId);
    const snapshot: DIYThemePreset = active || {
      id: `diy-export-${Date.now()}`,
      name: `导出主题·${currentCfg.skinName}`,
      baseSkinId: settings.renderSkinId,
      renderConfig: cloneRenderConfig(currentCfg),
      customCSS: settings.customCSS || '',
      headerImage: settings.headerImage || '',
      footerImage: settings.footerImage || '',
      iconImageMap: { ...(settings.iconImageMap || {}) },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snapshot.name.replace(/[\\/:*?"<>|]/g, '_') || 'diy-theme'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeTheme = settings.activeCustomThemeId
    ? customThemes.find((t) => t.id === settings.activeCustomThemeId)
    : undefined;
  const globalColorItems = COLOR_KEYS.filter((item) => !['bubbleMe', 'bubbleOther', 'bubbleTextMe', 'bubbleTextOther'].includes(item.key));

  return (
    <>
      <CollapsibleSection
        storageKey="skinSettings:customTab:workshop"
        title="主题工坊"
        summary={activeTheme ? `使用中：${activeTheme.name}` : (customThemes.length > 0 ? `已保存 ${customThemes.length} 个混搭` : '还没有自定义主题')}
        defaultExpanded
      >
        <SkinPanelCard>
          <SkinActionToolbar
            actions={[
              { key: 'create', label: '创建混搭', variant: 'primary', onClick: openCreateMixModal },
              { key: 'export', label: '导出', onClick: exportCurrentTheme },
              { key: 'import', label: '导入', onClick: () => importThemeInputRef.current?.click() },
              { key: 'save', label: '保存当前', onClick: saveCurrentAsCustomTheme }
            ]}
          />

          {customThemes.length > 0 ? (
            <div className="mt-3 border-t render-border-subtle">
              {customThemes.map((theme) => {
                const isActive = settings.activeCustomThemeId === theme.id;
                return (
                  <SkinThemeRow
                    key={theme.id}
                    title={theme.name}
                    subtitle={`基于 ${BUILT_IN_RENDER_SKINS[theme.baseSkinId]?.skinName || theme.baseSkinId}`}
                    active={isActive}
                    activeLabel="使用中"
                    inactiveLabel="应用"
                    onApply={() => applyCustomTheme(theme.id)}
                    onDelete={() => deleteCustomTheme(theme.id)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="mt-3">
              <SkinEmptyState message="还没有自定义主题，先创建混搭。" />
            </div>
          )}
        </SkinPanelCard>
      </CollapsibleSection>

      <CollapsibleSection
        storageKey="skinSettings:customTab:themePresets"
        title="主题色预设"
        summary={`共 ${THEME_COLOR_PRESETS.length} 套`}
        defaultExpanded={false}
      >
        <SkinPanelCard>
          <div className="grid grid-cols-4 gap-2">
            {THEME_COLOR_PRESETS.map((preset) => {
              const active = currentCfg.colors.accent === preset.accent;
              return (
                <SkinColorPresetButton
                  key={preset.name}
                  title={preset.name}
                  accent={preset.accent}
                  secondary={mixColor('#ffffff', preset.accent, 0.18, '#ffffff', '#2b8cff')}
                  active={active}
                  onClick={() => applyThemeColorPreset(preset.accent)}
                />
              );
            })}
          </div>
        </SkinPanelCard>
      </CollapsibleSection>

      <CollapsibleSection
        storageKey="skinSettings:customTab:globalColors"
        title="全局配色"
        summary="主题色、背景、文字、边框"
        defaultExpanded={false}
      >
        <SkinPanelCard>
          <div className="grid grid-cols-2 gap-2">
            {globalColorItems.map((item) => (
              <SkinColorField
                key={item.key}
                label={item.label}
                value={currentCfg.colors[item.key]}
                onChange={(value) => updateRenderConfig((cfg) => ({ ...cfg, colors: { ...cfg.colors, [item.key]: value } }))}
              />
            ))}
          </div>
        </SkinPanelCard>
      </CollapsibleSection>

      {showCreateMixModal && (
        <div className="fixed inset-0 z-[320] bg-black/40 flex items-center justify-center p-4" onClick={() => setShowCreateMixModal(false)}>
          <div className="w-full max-w-[360px] app-surface-panel app-skin-panel-card shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b render-border-subtle text-sm font-semibold render-text-primary">创建混搭</div>
            <div className="p-4">
              <SkinSectionCard>
                <label className="block">
                  <div className="text-xs render-text-secondary mb-1">混搭名称（可选）</div>
                  <input
                    className="app-field-input"
                    placeholder="例如：深色高对比版"
                    value={mixNameDraft}
                    onChange={(e) => setMixNameDraft(e.target.value)}
                  />
                </label>
                <label className="block">
                  <div className="text-xs render-text-secondary mb-1">基于皮肤</div>
                  <select
                    value={mixBaseSkinId}
                    onChange={(e) => setMixBaseSkinId(e.target.value as BuiltInSkinId)}
                    className="app-field-select"
                  >
                    {(Object.keys(BUILT_IN_RENDER_SKINS) as BuiltInSkinId[]).map((id) => (
                      <option key={id} value={id}>{BUILT_IN_RENDER_SKINS[id].skinName}</option>
                    ))}
                  </select>
                </label>
              </SkinSectionCard>
            </div>
            <div className="px-4 py-3 border-t render-border-subtle flex justify-end gap-2">
              <button className="app-button app-button-muted" onClick={() => setShowCreateMixModal(false)}>取消</button>
              <button className="app-button app-button-primary" onClick={() => createMixAndMatch(mixBaseSkinId, mixNameDraft)}>创建</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
