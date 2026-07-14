import React from 'react';
import { CollapsibleSection } from '../../CommonCollapsible';
import { AppearanceSettings, UserProfile } from '../../types';
import { BUILT_IN_RENDER_SKINS, type BuiltInSkinId } from '../../render-schema';
import { cloneRenderConfig } from '../skinThemeUtils';
import { SkinNumberRow, SkinPanelGridCard, SkinPresetButton, SkinRowsPanel, SkinSectionBody, SkinSectionSummary, SkinSliderCard } from './SkinPanelPrimitives';

const DEFAULT_GLOBAL_BG_BY_SKIN: Partial<Record<BuiltInSkinId, string>> = {
  noir: '/assets/image/gt.jpg'
};

const DEFAULT_GLOBAL_BG_OVERLAY_OPACITY = 0.2;
const DEFAULT_GLOBAL_BG_BLUR = 10;

const DEFAULT_GLOBAL_BG_OVERLAY_OPACITY_BY_SKIN: Partial<Record<BuiltInSkinId, number>> = {
  noir: 0.1
};

const DEFAULT_GLOBAL_BG_BLUR_BY_SKIN: Partial<Record<BuiltInSkinId, number>> = {
  noir: 0
};

const DEFAULT_FONT_BY_SKIN: Partial<Record<BuiltInSkinId, AppearanceSettings['fontFamily']>> = {
  noir: 'serif'
};

const parseNonNegativeNumber = (value: string): number => {
  const digits = value.replace(/\D+/g, '');
  if (!digits) return 0;
  return Math.max(0, Number.parseInt(digits, 10) || 0);
};

export const PresetTab: React.FC<{
  settings: AppearanceSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppearanceSettings>>;
  user?: UserProfile;
  setUser?: React.Dispatch<React.SetStateAction<UserProfile>>;
}> = ({ settings, setSettings, user, setUser }) => {
  const applySkin = (skinId: BuiltInSkinId) => {
    const cfg = BUILT_IN_RENDER_SKINS[skinId];
    if (!cfg) return;
    setSettings((prev: AppearanceSettings) => ({
      ...prev,
      renderSkinId: skinId,
      renderConfig: cloneRenderConfig(cfg),
      globalBg: skinId === 'noir' ? (DEFAULT_GLOBAL_BG_BY_SKIN.noir || '') : '',
      globalBgOverlayOpacity: DEFAULT_GLOBAL_BG_OVERLAY_OPACITY_BY_SKIN[skinId] ?? DEFAULT_GLOBAL_BG_OVERLAY_OPACITY,
      globalBgBlur: DEFAULT_GLOBAL_BG_BLUR_BY_SKIN[skinId] ?? DEFAULT_GLOBAL_BG_BLUR,
      fontFamily: DEFAULT_FONT_BY_SKIN[skinId] || 'system',
      activeCustomThemeId: ''
    }));
  };
  const isQQPresetActive = settings.renderSkinId === 'qq' && !settings.activeCustomThemeId;
  const isPixelPresetActive = settings.renderSkinId === 'pixel' && !settings.activeCustomThemeId;
  const currentSkinName = BUILT_IN_RENDER_SKINS[settings.renderSkinId]?.skinName || settings.renderSkinId;
  const setQQField = (key: 'qqLevel' | 'qqLikes' | 'qqVisitors', rawValue: string) => {
    if (!setUser) return;
    const next = parseNonNegativeNumber(rawValue);
    setUser((prev: UserProfile) => ({ ...prev, [key]: next }));
  };

  return (
    <>
      <CollapsibleSection
        storageKey="skinSettings:presetTab:skins"
        title="预设皮肤"
        summary={settings.activeCustomThemeId ? `混搭中 · 基于 ${currentSkinName}` : `当前：${currentSkinName}`}
        defaultExpanded
      >
        <SkinPanelGridCard className="p-0">
          <div className="grid grid-cols-3 gap-2 p-3">
            {(Object.keys(BUILT_IN_RENDER_SKINS) as BuiltInSkinId[]).map((id) => {
              const skin = BUILT_IN_RENDER_SKINS[id];
              const active = settings.renderSkinId === id && !settings.activeCustomThemeId;
              return (
                <SkinPresetButton
                  key={id}
                  title={skin.skinName}
                  accent={skin.colors.accent}
                  bubbleMe={skin.colors.bubbleMe}
                  bubbleOther={skin.colors.bubbleOther}
                  active={active}
                  onClick={() => applySkin(id)}
                />
              );
            })}
          </div>
        </SkinPanelGridCard>
      </CollapsibleSection>
      {isQQPresetActive && (
        <CollapsibleSection
          storageKey="skinSettings:presetTab:qqProfile"
          title="QQ资料参数"
          summary="仅 QQ 皮肤生效"
          defaultExpanded
        >
          <SkinSectionBody dense>
            <SkinSectionSummary
              title="资料映射"
              summary="仅影响 QQ 皮肤资料展示"
              meta="3 项"
            />
            <SkinRowsPanel>
              <SkinNumberRow
                label="QQ等级"
                value={Math.max(0, Math.floor(user?.qqLevel || 0))}
                onChange={(value) => setQQField('qqLevel', value)}
              />
              <SkinNumberRow
                label="名片点赞数"
                value={Math.max(0, Math.floor(user?.qqLikes || 0))}
                onChange={(value) => setQQField('qqLikes', value)}
              />
              <SkinNumberRow
                label="空间访客数"
                value={Math.max(0, Math.floor(user?.qqVisitors || 0))}
                onChange={(value) => setQQField('qqVisitors', value)}
              />
            </SkinRowsPanel>
          </SkinSectionBody>
        </CollapsibleSection>
      )}
      {isPixelPresetActive && (
        <CollapsibleSection
          storageKey="skinSettings:presetTab:pixelEffects"
          title="像素特效"
          summary="仅像素皮肤生效"
          defaultExpanded
        >
          <SkinSectionBody>
            <SkinSectionSummary
              title="显示强度"
              summary="调整像素网格和 CRT 覆盖层"
              meta="2 项"
            />
            <SkinSliderCard
              label="格子透明度"
              valueText={`${Math.max(0, Math.min(100, Number(settings.pixelGridOpacity ?? 22)))}%`}
              value={Math.max(0, Math.min(100, Number(settings.pixelGridOpacity ?? 22)))}
              onChange={(value) => {
                const next = Math.max(0, Math.min(100, value));
                setSettings((prev: AppearanceSettings) => ({ ...prev, pixelGridOpacity: next }));
              }}
            />
            <SkinSliderCard
              label="CRT透明度"
              valueText={`${Math.max(0, Math.min(100, Number(settings.pixelCrtOpacity ?? 22)))}%`}
              value={Math.max(0, Math.min(100, Number(settings.pixelCrtOpacity ?? 22)))}
              onChange={(value) => {
                const next = Math.max(0, Math.min(100, value));
                setSettings((prev: AppearanceSettings) => ({ ...prev, pixelCrtOpacity: next }));
              }}
            />
          </SkinSectionBody>
        </CollapsibleSection>
      )}
    </>
  );
};
