import { DIYThemePreset } from '../types';
import { BUILT_IN_RENDER_SKINS, type BuiltInSkinId, type AppRenderConfig } from '../render-schema';

export const cloneRenderConfig = (cfg: AppRenderConfig): AppRenderConfig => JSON.parse(JSON.stringify(cfg));

export const parseCssFromAIText = (raw: string): string => {
  const text = String(raw || '').trim();
  if (!text) return '';

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && typeof parsed.css === 'string') return parsed.css.trim();
  } catch {
    // ignore
  }

  const codeBlockMatch = text.match(/```(?:css|json|text)?\s*([\s\S]*?)```/i);
  const candidate = codeBlockMatch?.[1] ? codeBlockMatch[1].trim() : text;

  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === 'object' && typeof parsed.css === 'string') return parsed.css.trim();
  } catch {
    // ignore
  }

  return candidate;
};

export const upsertTheme = (themes: DIYThemePreset[], theme: DIYThemePreset): DIYThemePreset[] => {
  const idx = themes.findIndex((t) => t.id === theme.id);
  if (idx < 0) return [...themes, theme];
  const next = [...themes];
  next[idx] = theme;
  return next;
};

export const normalizeImportedTheme = (raw: any, fallbackSkinId: BuiltInSkinId): DIYThemePreset | null => {
  if (!raw || typeof raw !== 'object' || !raw.renderConfig) return null;
  const now = Date.now();
  const safeBaseSkinId = BUILT_IN_RENDER_SKINS[raw.baseSkinId as BuiltInSkinId] ? raw.baseSkinId as BuiltInSkinId : fallbackSkinId;
  return {
    id: `diy-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: String(raw.name || `导入主题 ${new Date(now).toLocaleDateString('zh-CN')}`),
    baseSkinId: safeBaseSkinId,
    renderConfig: cloneRenderConfig(raw.renderConfig as AppRenderConfig),
    customCSS: String(raw.customCSS || ''),
    headerImage: String(raw.headerImage || ''),
    footerImage: String(raw.footerImage || ''),
    iconImageMap: raw.iconImageMap && typeof raw.iconImageMap === 'object' ? { ...raw.iconImageMap } : {},
    createdAt: now,
    updatedAt: now
  };
};
