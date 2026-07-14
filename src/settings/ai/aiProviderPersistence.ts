import { AI_PROVIDER_OPTIONS } from '../aiSettingsConstants.ts';
import { isFullAppSnapshotPayload } from '../../appStateNormalizeUtils.ts';

export const AI_PROVIDER_PRESETS_STORAGE_KEY = 'aiProviderPresets';
export const AI_PROVIDER_CONFIG_STORAGE_PREFIX = 'aiProviderConfig:';

export type AiProviderConfigMap = Record<string, Record<string, unknown>>;

export interface AiProviderPersistedState {
  aiProviderPresets: Record<string, unknown>[];
  aiProviderConfigs: AiProviderConfigMap;
}

type AiProviderRestoreMode = 'merge' | 'overwrite' | 'desktop-only';

const KNOWN_PROVIDER_KEYS = AI_PROVIDER_OPTIONS.map((provider) => provider.key);

const parseJson = (raw: string | null): unknown => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getStorage = (): Storage | null => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};

const normalizePresetList = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item));
};

const normalizeProviderConfigs = (value: unknown): AiProviderConfigMap => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const normalized: AiProviderConfigMap = {};
  for (const providerKey of KNOWN_PROVIDER_KEYS) {
    const config = (value as Record<string, unknown>)[providerKey];
    if (config && typeof config === 'object' && !Array.isArray(config)) {
      normalized[providerKey] = config as Record<string, unknown>;
    }
  }
  return normalized;
};

const mergePresets = (
  current: Record<string, unknown>[],
  incoming: Record<string, unknown>[]
): Record<string, unknown>[] => {
  const seen = new Set<string>();
  const buildKey = (preset: Record<string, unknown>) => {
    const id = typeof preset.id === 'string' ? preset.id.trim() : '';
    if (id) return `id:${id}`;
    return `named:${String(preset.provider || '')}:${String(preset.name || '')}`;
  };
  const merged: Record<string, unknown>[] = [];
  [...incoming, ...current].forEach((preset) => {
    const key = buildKey(preset);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(preset);
  });
  return merged;
};

export const collectAiProviderPersistedState = (): AiProviderPersistedState => {
  const storage = getStorage();
  if (!storage) {
    return {
      aiProviderPresets: [],
      aiProviderConfigs: {}
    };
  }

  const aiProviderConfigs: AiProviderConfigMap = {};
  for (const providerKey of KNOWN_PROVIDER_KEYS) {
    const parsed = parseJson(storage.getItem(`${AI_PROVIDER_CONFIG_STORAGE_PREFIX}${providerKey}`));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      aiProviderConfigs[providerKey] = parsed as Record<string, unknown>;
    }
  }

  return {
    aiProviderPresets: normalizePresetList(parseJson(storage.getItem(AI_PROVIDER_PRESETS_STORAGE_KEY))),
    aiProviderConfigs
  };
};

export const applyAiProviderPersistedState = (data: unknown, mode: AiProviderRestoreMode = 'overwrite'): void => {
  const storage = getStorage();
  if (!storage || !data || typeof data !== 'object') return;

  const source = data as Record<string, unknown>;
  const hasPresets = Object.prototype.hasOwnProperty.call(source, 'aiProviderPresets');
  const hasConfigs = Object.prototype.hasOwnProperty.call(source, 'aiProviderConfigs');
  const isFullSnapshot = isFullAppSnapshotPayload(source);
  if (!hasPresets && !hasConfigs && !isFullSnapshot) return;

  if (hasPresets || (mode !== 'merge' && isFullSnapshot)) {
    const incomingPresets = normalizePresetList(source.aiProviderPresets);
    const nextPresets = mode === 'merge'
      ? mergePresets(
        normalizePresetList(parseJson(storage.getItem(AI_PROVIDER_PRESETS_STORAGE_KEY))),
        incomingPresets
      )
      : incomingPresets;
    storage.setItem(AI_PROVIDER_PRESETS_STORAGE_KEY, JSON.stringify(nextPresets));
  }

  if (hasConfigs || (mode !== 'merge' && isFullSnapshot)) {
    const incomingConfigs = normalizeProviderConfigs(source.aiProviderConfigs);
    if (mode !== 'merge') {
      const removableKeys = isFullSnapshot
        ? KNOWN_PROVIDER_KEYS
        : Object.keys(incomingConfigs);
      removableKeys.forEach((providerKey) => {
        storage.removeItem(`${AI_PROVIDER_CONFIG_STORAGE_PREFIX}${providerKey}`);
      });
    }
    for (const [providerKey, config] of Object.entries(incomingConfigs)) {
      const storageKey = `${AI_PROVIDER_CONFIG_STORAGE_PREFIX}${providerKey}`;
      const current = mode === 'merge'
        ? parseJson(storage.getItem(storageKey))
        : null;
      const nextConfig = current && typeof current === 'object' && !Array.isArray(current)
        ? { ...(current as Record<string, unknown>), ...config }
        : config;
      storage.setItem(storageKey, JSON.stringify(nextConfig));
    }
  }
};
