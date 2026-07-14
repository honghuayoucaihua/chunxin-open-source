import { isFullAppSnapshotPayload } from '../appStateNormalizeUtils.ts';

export type TruthOrDareTheme = {
  id: string;
  name: string;
  questions: string[];
  challenges: string[];
  updatedAt: number;
};

export type TruthOrDareRuntimeState = {
  active: boolean;
  round: number;
  theme: TruthOrDareTheme | null;
  updatedAt: number;
};

export type TruthOrDareRuntimeMap = Record<string, TruthOrDareRuntimeState>;

export const TRUTH_DARE_THEMES_STORAGE_KEY = 'xushuo_truth_or_dare_themes_v1';
export const TRUTH_DARE_RUNTIME_STORAGE_KEY = 'xushuo_truth_or_dare_runtime_v1';

export const createDefaultTruthOrDareThemes = (): TruthOrDareTheme[] => [{
  id: 'classic',
  name: '经典局',
  questions: ['你最近一次心动是因为什么？', '你最想重来的一次决定是什么？', '你有过最社死的一次经历是什么？'],
  challenges: ['给对方发一条夸夸消息', '学一种动物叫声持续5秒', '用三个词形容你此刻的心情'],
  updatedAt: Date.now()
}];

const safeParseJson = (raw: string | null): any => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const readStorageJson = (key: string): any => {
  try {
    return safeParseJson(localStorage.getItem(key));
  } catch {
    return null;
  }
};

const writeStorageJson = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 本地存储不可用时不阻断主聊天流程。
  }
};

export const normalizeTruthOrDareTheme = (item: any, fallbackId = ''): TruthOrDareTheme | null => {
  if (!item || typeof item !== 'object') return null;
  const id = String(item.id || fallbackId || '').trim();
  if (!id) return null;
  return {
    id,
    name: String(item.name || '').trim(),
    questions: Array.isArray(item.questions) ? item.questions.map((q: any) => String(q || '').trim()).filter(Boolean) : [],
    challenges: Array.isArray(item.challenges) ? item.challenges.map((c: any) => String(c || '').trim()).filter(Boolean) : [],
    updatedAt: Number(item.updatedAt || Date.now())
  };
};

export const normalizeTruthOrDareThemes = (list: any, fallbackToDefault = false): TruthOrDareTheme[] => {
  if (!Array.isArray(list)) return fallbackToDefault ? createDefaultTruthOrDareThemes() : [];
  const normalized = list
    .map((item, idx) => normalizeTruthOrDareTheme(item, `theme-${idx}`))
    .filter((item): item is TruthOrDareTheme => !!item);
  return normalized.length > 0 ? normalized : (fallbackToDefault ? createDefaultTruthOrDareThemes() : []);
};

export const readTruthOrDareThemes = (): TruthOrDareTheme[] => {
  return normalizeTruthOrDareThemes(readStorageJson(TRUTH_DARE_THEMES_STORAGE_KEY), true);
};

export const writeTruthOrDareThemes = (themes: TruthOrDareTheme[]): void => {
  writeStorageJson(TRUTH_DARE_THEMES_STORAGE_KEY, normalizeTruthOrDareThemes(themes));
};

export const normalizeTruthOrDareRuntimeMap = (value: any): TruthOrDareRuntimeMap => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const next: TruthOrDareRuntimeMap = {};
  Object.entries(value).forEach(([contactId, raw]) => {
    if (!contactId || !raw || typeof raw !== 'object') return;
    const current = raw as any;
    const theme = normalizeTruthOrDareTheme(current.theme);
    next[String(contactId)] = {
      active: current.active === true,
      round: Math.max(0, Number(current.round || 0)),
      theme,
      updatedAt: Number(current.updatedAt || Date.now())
    };
  });
  return next;
};

export const readTruthOrDareRuntimeMap = (): TruthOrDareRuntimeMap => {
  return normalizeTruthOrDareRuntimeMap(readStorageJson(TRUTH_DARE_RUNTIME_STORAGE_KEY));
};

export const writeTruthOrDareRuntimeMap = (map: TruthOrDareRuntimeMap): void => {
  writeStorageJson(TRUTH_DARE_RUNTIME_STORAGE_KEY, normalizeTruthOrDareRuntimeMap(map));
};

export const saveTruthOrDareRuntime = (contactId: string, state: TruthOrDareRuntimeState): void => {
  if (!contactId) return;
  const map = readTruthOrDareRuntimeMap();
  map[contactId] = state;
  writeTruthOrDareRuntimeMap(map);
};

export const loadTruthOrDareRuntime = (contactId: string): TruthOrDareRuntimeState | null => {
  if (!contactId) return null;
  return readTruthOrDareRuntimeMap()[contactId] || null;
};

export const clearTruthOrDareRuntime = (contactId: string): void => {
  if (!contactId) return;
  const map = readTruthOrDareRuntimeMap();
  if (!map[contactId]) return;
  delete map[contactId];
  writeTruthOrDareRuntimeMap(map);
};

export const collectTruthOrDarePersistedState = (): {
  truthDareThemes: TruthOrDareTheme[];
  truthDareRuntime: TruthOrDareRuntimeMap;
} => ({
  truthDareThemes: normalizeTruthOrDareThemes(readStorageJson(TRUTH_DARE_THEMES_STORAGE_KEY)),
  truthDareRuntime: readTruthOrDareRuntimeMap()
});

const mergeTruthOrDareThemes = (existing: TruthOrDareTheme[], incoming: TruthOrDareTheme[]): TruthOrDareTheme[] => {
  const byId = new Map<string, TruthOrDareTheme>();
  existing.forEach((theme) => byId.set(theme.id, theme));
  incoming.forEach((theme) => {
    const current = byId.get(theme.id);
    if (!current || Number(theme.updatedAt || 0) >= Number(current.updatedAt || 0)) {
      byId.set(theme.id, theme);
    }
  });
  return Array.from(byId.values());
};

const mergeTruthOrDareRuntime = (existing: TruthOrDareRuntimeMap, incoming: TruthOrDareRuntimeMap): TruthOrDareRuntimeMap => {
  const next: TruthOrDareRuntimeMap = { ...existing };
  Object.entries(incoming).forEach(([contactId, state]) => {
    const current = next[contactId];
    if (!current || Number(state.updatedAt || 0) >= Number(current.updatedAt || 0)) {
      next[contactId] = state;
    }
  });
  return next;
};

export const applyTruthOrDarePersistedState = (data: any, mode: 'merge' | 'overwrite'): void => {
  if (!data || typeof data !== 'object') return;
  const source = data as Record<string, unknown>;
  const hasThemes = Object.prototype.hasOwnProperty.call(source, 'truthDareThemes');
  const hasRuntime = Object.prototype.hasOwnProperty.call(source, 'truthDareRuntime');
  const isFullSnapshot = isFullAppSnapshotPayload(source);
  if (!hasThemes && !hasRuntime && !isFullSnapshot) return;

  if (mode === 'merge') {
    if (Array.isArray(source.truthDareThemes)) {
      const incomingThemes = normalizeTruthOrDareThemes(source.truthDareThemes);
      writeTruthOrDareThemes(mergeTruthOrDareThemes(collectTruthOrDarePersistedState().truthDareThemes, incomingThemes));
    }
    if (source.truthDareRuntime && typeof source.truthDareRuntime === 'object') {
      const incomingRuntime = normalizeTruthOrDareRuntimeMap(source.truthDareRuntime);
      writeTruthOrDareRuntimeMap(mergeTruthOrDareRuntime(readTruthOrDareRuntimeMap(), incomingRuntime));
    }
    return;
  }

  writeTruthOrDareThemes(hasThemes ? normalizeTruthOrDareThemes(source.truthDareThemes) : []);
  writeTruthOrDareRuntimeMap(hasRuntime ? normalizeTruthOrDareRuntimeMap(source.truthDareRuntime) : {});
};
