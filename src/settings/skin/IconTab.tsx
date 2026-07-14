import React from 'react';
import { CollapsibleSection } from '../../CommonCollapsible';
import { AppearanceSettings } from '../../types';
import { compressImage } from '../../services/imageService';
import { ICON_ITEMS, ICON_PAGE_ORDER } from '../skinConstants';
import { SkinAssetList, SkinAssetRow, SkinEmptyState, SkinPanelCard, SkinSearchBar, SkinSectionBody, SkinSectionSummary } from './SkinPanelPrimitives';

export const IconTab: React.FC<{
  settings: AppearanceSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppearanceSettings>>;
}> = ({ settings, setSettings }) => {
  const iconFileInputRef = React.useRef<HTMLInputElement>(null);
  const [pendingIconKey, setPendingIconKey] = React.useState<string>('');
  const [iconQuery, setIconQuery] = React.useState('');

  const groupedIconItems = React.useMemo(() => {
    const groups = ICON_PAGE_ORDER.map((page) => ({ page, items: [] as Array<(typeof ICON_ITEMS)[number]> }));
    ICON_ITEMS.forEach((item) => {
      const idx = ICON_PAGE_ORDER.findIndex((p) => p === item.page);
      if (idx >= 0) groups[idx].items.push(item);
      else groups[0].items.push(item);
    });
    return groups.filter((group) => group.items.length > 0);
  }, []);

  const trimmedIconQuery = iconQuery.trim();
  const filteredIconGroups = React.useMemo(() => {
    if (!trimmedIconQuery) return groupedIconItems;
    const q = trimmedIconQuery.toLowerCase();
    return groupedIconItems
      .map((group) => {
        const page = String(group.page || '');
        const pageMatch = page.toLowerCase().includes(q);
        const items = pageMatch
          ? group.items
          : group.items.filter((item) => item.label.toLowerCase().includes(q) || item.key.toLowerCase().includes(q));
        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);
  }, [groupedIconItems, trimmedIconQuery]);

  const updateIconImageMap = (updater: (prev: Record<string, string>) => Record<string, string>) => {
    setSettings((prev: AppearanceSettings) => {
      const nextMap = updater({ ...(prev.iconImageMap || {}) });
      const now = Date.now();
      const nextThemes = (prev.customThemes || []).map((t) => {
        if (t.id !== prev.activeCustomThemeId) return t;
        return { ...t, iconImageMap: { ...nextMap }, updatedAt: now };
      });
      return {
        ...prev,
        iconImageMap: nextMap,
        customThemes: nextThemes
      };
    });
  };

  const totalSetIconCount = Object.values(settings.iconImageMap || {}).filter(Boolean).length;

  const triggerIconUpload = (iconKey: string) => {
    setPendingIconKey(iconKey);
    iconFileInputRef.current?.click();
  };

  const handleIconFilePicked = async (file?: File) => {
    if (!file || !pendingIconKey) return;
    if (!file.type.startsWith('image/')) {
      alert('仅支持上传图片文件');
      return;
    }
    try {
      const dataUrl = await compressImage(file, { quality: 0.9, maxSizeKB: 260, mimeType: 'image/png' });
      updateIconImageMap((prev) => ({ ...prev, [pendingIconKey]: dataUrl }));
    } catch {
      alert('图标处理失败，请重试');
    }
  };

  return (
    <>
      <input
        ref={iconFileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          handleIconFilePicked(e.target.files?.[0]);
          setPendingIconKey('');
          if (e.target) e.target.value = '';
        }}
      />

      <SkinPanelCard>
        <SkinSectionBody dense>
          <SkinSectionSummary
            title="图标DIY"
            summary="上传后会以本地 DataURL 形式保存"
            meta={`已设置 ${totalSetIconCount}/${ICON_ITEMS.length}`}
          />
          <SkinSearchBar
            value={iconQuery}
            onChange={setIconQuery}
            onClear={() => setIconQuery('')}
            placeholder="搜索图标（名称/页面/类名）"
          />
          <div className="text-[11px] render-text-tertiary leading-relaxed">
            仅允许上传图片文件，图片以 DataURL 形式存储在本地（随设置一起持久化）。
          </div>
        </SkinSectionBody>
      </SkinPanelCard>

      {filteredIconGroups.length === 0 ? (
        <SkinEmptyState message="未找到匹配的图标" />
      ) : trimmedIconQuery ? (
        filteredIconGroups.map((group) => (
          <SkinPanelCard key={group.page}>
            <SkinSectionBody dense>
              <SkinSectionSummary
                title={group.page}
                meta={`${group.items.length} 个`}
                className="text-xs"
              />
              <SkinAssetList>
                {group.items.map((item) => {
                  const mapKey = item.key;
                  const current = settings.iconImageMap?.[mapKey] || '';
                  return (
                    <SkinAssetRow
                      key={mapKey}
                      iconClass={mapKey}
                      preview={current}
                      title={item.label}
                      subtitle={current ? '已设置替换图' : '未设置'}
                      primaryLabel="上传"
                      secondaryLabel="清除"
                      onPrimaryClick={() => triggerIconUpload(mapKey)}
                      onSecondaryClick={() => {
                        updateIconImageMap((prev) => {
                          const next = { ...prev };
                          delete next[mapKey];
                          return next;
                        });
                      }}
                    />
                  );
                })}
              </SkinAssetList>
            </SkinSectionBody>
          </SkinPanelCard>
        ))
      ) : (
        filteredIconGroups.map((group) => {
          const setCount = group.items.filter((item) => Boolean(settings.iconImageMap?.[item.key])).length;
          return (
            <CollapsibleSection
              key={group.page}
              storageKey={`skinSettings:iconTab:${encodeURIComponent(String(group.page))}`}
              title={group.page}
              summary={`共 ${group.items.length} 个 · 已设置 ${setCount} 个`}
              defaultExpanded={false}
            >
              <SkinAssetList>
                {group.items.map((item) => {
                  const mapKey = item.key;
                  const current = settings.iconImageMap?.[mapKey] || '';
                  return (
                    <SkinAssetRow
                      key={mapKey}
                      iconClass={mapKey}
                      preview={current}
                      title={item.label}
                      subtitle={current ? '已设置替换图' : '未设置'}
                      primaryLabel="上传"
                      secondaryLabel="清除"
                      onPrimaryClick={() => triggerIconUpload(mapKey)}
                      onSecondaryClick={() => {
                        updateIconImageMap((prev) => {
                          const next = { ...prev };
                          delete next[mapKey];
                          return next;
                        });
                      }}
                    />
                  );
                })}
              </SkinAssetList>
            </CollapsibleSection>
          );
        })
      )}
    </>
  );
};
