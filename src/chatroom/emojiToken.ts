import type { EmojiGroup, EmojiItem } from '../types';

type EmojiLike = {
  id: string;
  url: string;
  desc: string;
  groupId?: string;
};

type EmojiTokenPayload = {
  raw: string;
  id?: string;
  groupId?: string;
  desc?: string;
  isStructured: boolean;
};

const normalizeText = (value: unknown): string => String(value || '').trim();

const normalizeTokenField = (value: unknown): string => (
  normalizeText(value)
    .replace(/[;\]]/g, '')
    .replace(/\s+/g, ' ')
);

const normalizeTokenDesc = (value: unknown): string => (
  normalizeText(value)
    .replace(/[;\]]/g, (match) => (match === ';' ? '；' : '］'))
    .replace(/\s+/g, ' ')
);

const normalizeDescKey = (value: unknown): string => normalizeText(value).toLowerCase();

const sortGroups = (groups: EmojiGroup[]): EmojiGroup[] => (
  [...groups].sort((left, right) => {
    const orderDiff = Number(left?.order || 0) - Number(right?.order || 0);
    if (orderDiff !== 0) return orderDiff;
    return String(left?.name || left?.id || '').localeCompare(String(right?.name || right?.id || ''), 'zh-CN');
  })
);

const buildFallbackGroupOrder = (
  emojiGroups: EmojiGroup[],
  groupEmojis: Record<string, EmojiItem[]>
): string[] => {
  const orderedGroups = sortGroups(Array.isArray(emojiGroups) ? emojiGroups : []);
  const enabledIds = orderedGroups.filter((group) => group.enabled !== false).map((group) => String(group.id));
  const disabledIds = orderedGroups.filter((group) => group.enabled === false).map((group) => String(group.id));
  const knownIds = new Set([...enabledIds, ...disabledIds]);
  const orphanIds = Object.keys(groupEmojis || {})
    .map((groupId) => String(groupId))
    .filter((groupId) => !knownIds.has(groupId))
    .sort((left, right) => left.localeCompare(right, 'zh-CN'));
  return [...enabledIds, ...disabledIds, ...orphanIds];
};

const findEmojiById = (
  emojiId: string,
  customEmojis: EmojiLike[],
  groupEmojis: Record<string, EmojiItem[]>,
  groupId?: string
): EmojiLike | null => {
  const normalizedId = normalizeText(emojiId);
  if (!normalizedId) return null;
  const normalizedGroupId = normalizeText(groupId);

  if (normalizedGroupId) {
    const scopedGroupList = Array.isArray(groupEmojis?.[normalizedGroupId]) ? groupEmojis[normalizedGroupId] : [];
    const scopedMatched = scopedGroupList.find((item) => normalizeText(item?.id) === normalizedId);
    if (scopedMatched) return scopedMatched;
  }

  const customMatched = customEmojis.find((item) => normalizeText(item?.id) === normalizedId);
  if (customMatched) return customMatched;

  for (const list of Object.values(groupEmojis || {})) {
    const matched = (Array.isArray(list) ? list : []).find((item) => normalizeText(item?.id) === normalizedId);
    if (matched) return matched;
  }
  return null;
};

const findEmojiByDescWithinGroup = (
  desc: string,
  groupId: string,
  groupEmojis: Record<string, EmojiItem[]>
): EmojiLike | null => {
  const normalizedDesc = normalizeDescKey(desc);
  if (!normalizedDesc || !normalizeText(groupId)) return null;
  const scopedGroupList = Array.isArray(groupEmojis?.[groupId]) ? groupEmojis[groupId] : [];
  return scopedGroupList.find((item) => normalizeDescKey(item?.desc) === normalizedDesc) || null;
};

const findEmojiByDescriptionFallback = (
  desc: string,
  customEmojis: EmojiLike[],
  emojiGroups: EmojiGroup[],
  groupEmojis: Record<string, EmojiItem[]>
): EmojiLike | null => {
  const normalizedDesc = normalizeDescKey(desc);
  if (!normalizedDesc) return null;

  const customMatched = customEmojis.find((item) => normalizeDescKey(item?.desc) === normalizedDesc);
  if (customMatched) return customMatched;

  const orderedGroupIds = buildFallbackGroupOrder(emojiGroups, groupEmojis);
  for (const groupId of orderedGroupIds) {
    const matched = findEmojiByDescWithinGroup(desc, groupId, groupEmojis);
    if (matched) return matched;
  }
  return null;
};

export const buildEmojiToken = (emoji: { id: string; desc?: string; groupId?: string }): string => {
  const safeId = normalizeTokenField(emoji?.id);
  const safeGroupId = normalizeTokenField(emoji?.groupId);
  const safeDesc = normalizeTokenDesc(emoji?.desc);
  const parts = [
    safeId ? `id=${safeId}` : '',
    safeGroupId ? `group=${safeGroupId}` : '',
    safeDesc ? `desc=${safeDesc}` : ''
  ].filter(Boolean);
  const body = parts.length > 0 ? parts.join(';') : safeDesc;
  return `[emoji:${body}]`;
};

export const parseEmojiTokenPayload = (value: string): EmojiTokenPayload => {
  const raw = normalizeText(value);
  if (!raw) {
    return { raw: '', isStructured: false };
  }

  const segments = raw.split(';').map((segment) => normalizeText(segment)).filter(Boolean);
  const kvPairs = segments
    .map((segment) => {
      const separatorIndex = segment.indexOf('=');
      if (separatorIndex <= 0) return null;
      return {
        key: segment.slice(0, separatorIndex).trim().toLowerCase(),
        value: segment.slice(separatorIndex + 1).trim()
      };
    })
    .filter(Boolean) as Array<{ key: string; value: string }>;

  const isStructured = kvPairs.some((pair) => pair.key === 'id' || pair.key === 'group' || pair.key === 'groupid' || pair.key === 'desc');
  if (!isStructured) {
    return {
      raw,
      desc: raw,
      isStructured: false
    };
  }

  const payload: EmojiTokenPayload = {
    raw,
    isStructured: true
  };

  kvPairs.forEach((pair) => {
    if (!pair.value) return;
    if (pair.key === 'id') {
      payload.id = pair.value;
      return;
    }
    if (pair.key === 'group' || pair.key === 'groupid') {
      payload.groupId = pair.value;
      return;
    }
    if (pair.key === 'desc' || pair.key === 'name') {
      payload.desc = pair.value;
    }
  });

  if (!payload.desc && !payload.id && segments.length === 1) {
    payload.desc = raw;
    payload.isStructured = false;
  }

  return payload;
};

export const resolveEmojiTokenValue = (
  tokenValue: string,
  customEmojis: EmojiLike[],
  emojiGroups: EmojiGroup[],
  groupEmojis: Record<string, EmojiItem[]>
): EmojiLike | null => {
  const payload = parseEmojiTokenPayload(tokenValue);

  if (payload.id) {
    const exactMatched = findEmojiById(payload.id, customEmojis, groupEmojis, payload.groupId);
    if (exactMatched) return exactMatched;
    if (payload.groupId && payload.desc) {
      const sameGroupMatched = findEmojiByDescWithinGroup(payload.desc, payload.groupId, groupEmojis);
      if (sameGroupMatched) return sameGroupMatched;
    }
    return null;
  }

  if (payload.desc) {
    return findEmojiByDescriptionFallback(payload.desc, customEmojis, emojiGroups, groupEmojis);
  }

  return null;
};
