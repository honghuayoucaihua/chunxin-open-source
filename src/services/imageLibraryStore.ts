import { isFullAppSnapshotPayload } from '../appStateNormalizeUtils.ts';

export type ImageLibraryGroup = {
  id: string;
  name: string;
  order: number;
  createdAt: number;
  updatedAt: number;
};

export type ImageLibraryItem = {
  id: string;
  groupId: string;
  url: string;
  desc: string;
  createdAt: number;
};

export type ImageLibraryPersistedState = {
  imageLibraryGroups: ImageLibraryGroup[];
  imageLibraryItems: ImageLibraryItem[];
};

const IMAGE_LIBRARY_GROUPS_KEY = 'xushuo_image_library_groups';
const IMAGE_LIBRARY_ITEMS_KEY = 'xushuo_image_library_items';

type ImageLibraryWindowState = Window & {
  imageLibraryGroups?: unknown;
  imageLibraryItems?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export const normalizeImageLibraryGroups = (raw: unknown): ImageLibraryGroup[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      const source = isRecord(item) ? item : {};
      return {
        id: String(source.id || '').trim(),
        name: String(source.name || '').trim(),
        order: Number.isFinite(Number(source.order)) ? Number(source.order) : index,
        createdAt: Number.isFinite(Number(source.createdAt)) ? Number(source.createdAt) : Date.now(),
        updatedAt: Number.isFinite(Number(source.updatedAt)) ? Number(source.updatedAt) : Date.now()
      };
    })
    .filter((item) => item.id && item.name)
    .sort((a, b) => a.order - b.order);
};

export const normalizeImageLibraryItems = (raw: unknown): ImageLibraryItem[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const source = isRecord(item) ? item : {};
      return {
        id: String(source.id || '').trim(),
        groupId: String(source.groupId || '').trim(),
        url: String(source.url || '').trim(),
        desc: String(source.desc || '').trim(),
        createdAt: Number.isFinite(Number(source.createdAt)) ? Number(source.createdAt) : Date.now()
      };
    })
    .filter((item) => item.id && item.groupId && item.url);
};

const readStorage = (key: string): unknown[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStorage = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

const getImageLibraryWindow = (): ImageLibraryWindowState | null =>
  typeof window === 'undefined' ? null : window as ImageLibraryWindowState;

const applyWindowState = (groups: ImageLibraryGroup[], items: ImageLibraryItem[]): void => {
  const target = getImageLibraryWindow();
  if (!target) return;
  target.imageLibraryGroups = groups;
  target.imageLibraryItems = items;
};

export const getImageLibraryState = (): { groups: ImageLibraryGroup[]; items: ImageLibraryItem[] } => {
  const source = getImageLibraryWindow();
  const groups = normalizeImageLibraryGroups(source?.imageLibraryGroups || readStorage(IMAGE_LIBRARY_GROUPS_KEY));
  const items = normalizeImageLibraryItems(source?.imageLibraryItems || readStorage(IMAGE_LIBRARY_ITEMS_KEY));
  applyWindowState(groups, items);
  return { groups, items };
};

export const saveImageLibraryState = (groups: ImageLibraryGroup[], items: ImageLibraryItem[]): void => {
  const normalizedGroups = normalizeImageLibraryGroups(groups);
  const normalizedItems = normalizeImageLibraryItems(items);
  applyWindowState(normalizedGroups, normalizedItems);
  writeStorage(IMAGE_LIBRARY_GROUPS_KEY, normalizedGroups);
  writeStorage(IMAGE_LIBRARY_ITEMS_KEY, normalizedItems);
};

export const getImageLibraryGroups = (): ImageLibraryGroup[] => getImageLibraryState().groups;

export const collectImageLibraryPersistedState = (): ImageLibraryPersistedState => {
  const state = getImageLibraryState();
  return {
    imageLibraryGroups: state.groups,
    imageLibraryItems: state.items
  };
};

const mergeImageLibraryGroups = (existing: ImageLibraryGroup[], incoming: ImageLibraryGroup[]): ImageLibraryGroup[] => {
  const byId = new Map<string, ImageLibraryGroup>();
  existing.forEach((group) => byId.set(group.id, group));
  incoming.forEach((group) => {
    const current = byId.get(group.id);
    if (!current || Number(group.updatedAt || 0) >= Number(current.updatedAt || 0)) {
      byId.set(group.id, group);
    }
  });
  return Array.from(byId.values()).sort((a, b) => a.order - b.order);
};

const mergeImageLibraryItems = (existing: ImageLibraryItem[], incoming: ImageLibraryItem[]): ImageLibraryItem[] => {
  const byId = new Map<string, ImageLibraryItem>();
  existing.forEach((item) => byId.set(item.id, item));
  incoming.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values()).sort((a, b) => a.createdAt - b.createdAt);
};

export const applyImageLibraryPersistedState = (
  data: unknown,
  mode: 'merge' | 'overwrite'
): void => {
  if (!isRecord(data)) return;
  const hasGroups = Object.prototype.hasOwnProperty.call(data, 'imageLibraryGroups');
  const hasItems = Object.prototype.hasOwnProperty.call(data, 'imageLibraryItems');
  const isFullSnapshot = isFullAppSnapshotPayload(data);
  if (!hasGroups && !hasItems && !isFullSnapshot) return;
  const incomingGroups = normalizeImageLibraryGroups(data.imageLibraryGroups);
  const incomingItems = normalizeImageLibraryItems(data.imageLibraryItems);
  if (mode === 'merge') {
    const current = getImageLibraryState();
    saveImageLibraryState(
      mergeImageLibraryGroups(current.groups, incomingGroups),
      mergeImageLibraryItems(current.items, incomingItems)
    );
    return;
  }
  const current = getImageLibraryState();
  saveImageLibraryState(
    hasGroups || isFullSnapshot ? incomingGroups : current.groups,
    hasItems || isFullSnapshot ? incomingItems : current.items
  );
};
