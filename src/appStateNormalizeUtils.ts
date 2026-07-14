import type { Contact, ContactMemories, ContactMemoryEntry, Message, GroupRelation, SoundVibrationSettings } from './types/index.ts';
import { DEFAULT_SOUND_VIBRATION_SETTINGS } from './constants.ts';
import { selectContactMemoriesForPrompt } from './services/contactMemoryService.ts';
import { buildStatusTemporalHintText } from './utils/prompt/userStatusTemporalHint.ts';
export const normalizeSoundVibrationSettings = (value?: Partial<SoundVibrationSettings> | null): SoundVibrationSettings => {
  const source = value || {};
  return {
    sendSoundEnabled: source.sendSoundEnabled !== false,
    receiveSoundEnabled: source.receiveSoundEnabled !== false,
    sendSoundSrc: String(source.sendSoundSrc || DEFAULT_SOUND_VIBRATION_SETTINGS.sendSoundSrc),
    receiveSoundSrc: String(source.receiveSoundSrc || DEFAULT_SOUND_VIBRATION_SETTINGS.receiveSoundSrc),
    vibrationEnabled: source.vibrationEnabled !== false,
    notificationEnabled: source.notificationEnabled !== false,
    notificationTitleTemplate: String(source.notificationTitleTemplate || DEFAULT_SOUND_VIBRATION_SETTINGS.notificationTitleTemplate),
    notificationBodyTemplate: String(source.notificationBodyTemplate || DEFAULT_SOUND_VIBRATION_SETTINGS.notificationBodyTemplate),
    keepAliveInBackgroundEnabled: source.keepAliveInBackgroundEnabled === true,
    keepAliveNotificationTitle: String(source.keepAliveNotificationTitle || DEFAULT_SOUND_VIBRATION_SETTINGS.keepAliveNotificationTitle),
    keepAliveNotificationBody: String(source.keepAliveNotificationBody || DEFAULT_SOUND_VIBRATION_SETTINGS.keepAliveNotificationBody)
  };
};
export const normalizeLegacyContacts = (raw: any): Contact[] => {
  if (!Array.isArray(raw)) return [];
  const fallbackAvatar = '/assets/image/user.png';
  const usedIds = new Set<string>();
  return raw.map((item: any, idx: number) => {
    const rawId = String(item?.id ?? '').trim();
    let id = rawId || `legacy-${Date.now()}-${idx}`;
    if (usedIds.has(id)) id = `${id}-${idx}`;
    usedIds.add(id);
    const nameRaw = String(item?.name ?? item?.nickname ?? item?.nickName ?? '').trim();
    const name = nameRaw || `联系人${idx + 1}`;
    const pinyinRaw = String(item?.pinyin ?? '').trim();
    const avatarRaw = typeof item?.avatar === 'string' ? item.avatar.trim() : '';
    const unreadCount = Number.isFinite(Number(item?.unreadCount)) ? Math.max(0, Number(item.unreadCount)) : 0;
    const isGroup = !!item?.isGroup;
    const normalized: Contact = {
      ...item,
      id,
      name,
      pinyin: pinyinRaw || name.charAt(0).toUpperCase(),
      avatar: avatarRaw || fallbackAvatar,
      unreadCount,
      isPinned: typeof item?.isPinned === 'boolean' ? item.isPinned : !!item?.pinned,
      isAi: typeof item?.isAi === 'boolean'
        ? item.isAi
        : (typeof item?.isBot === 'boolean' ? item.isBot : (!isGroup && id !== 'officialAccounts' && id !== '__xushuo_team__'))
    };
    if (Array.isArray(item?.memberIds)) {
      normalized.memberIds = item.memberIds.map((memberId: any) => String(memberId || '').trim()).filter(Boolean);
    }
    if (Array.isArray(item?.groupRelations)) {
      const allowedIds = new Set(['me', ...(normalized.memberIds || [])]);
      normalized.groupRelations = item.groupRelations
        .map((entry: any) => ({
          subjectId: String(entry?.subjectId || '').trim(),
          objectId: String(entry?.objectId || '').trim(),
          relation: String(entry?.relation || '').trim()
        }))
        .filter((entry: GroupRelation) =>
          entry.subjectId
          && entry.objectId
          && entry.relation
          && allowedIds.has(entry.subjectId)
          && allowedIds.has(entry.objectId)
        )
        .slice(0, 30);
    }
    if (!normalized.wechatId) {
      normalized.wechatId = id;
    }
    return normalized;
  });
};
export const formatGroupRelationText = (group: Contact | undefined, contacts: Contact[], userName: string) => {
  const relations = Array.isArray(group?.groupRelations) ? group.groupRelations : [];
  if (relations.length === 0) return '';
  const memberIds = new Set(['me', ...((group?.memberIds || []).filter(Boolean))]);
  const idToName = new Map<string, string>();
  idToName.set('me', String(userName || '我').trim() || '我');
  contacts.forEach((contact) => {
    if (!memberIds.has(contact.id)) return;
    idToName.set(contact.id, contact.remark?.trim() || contact.name || contact.id);
  });
  const lines = relations
    .filter((entry) => memberIds.has(entry.subjectId) && memberIds.has(entry.objectId) && String(entry.relation || '').trim())
    .map((entry) => `${idToName.get(entry.subjectId) || entry.subjectId}是${idToName.get(entry.objectId) || entry.objectId}的${String(entry.relation || '').trim()}`);
  return lines.join('\n');
};
export const formatDetailedContactProfile = (contact: Contact) => {
  const fields = [
    ['昵称', contact.remark?.trim() || contact.name],
    ['微信号', contact.wechatId || contact.id],
    ['性别', contact.gender === 'male' ? '男' : contact.gender === 'female' ? '女' : contact.gender === 'other' ? '其他' : ''],
    ['年龄', contact.age || ''],
    ['地区', contact.region || ''],
    ['职业', contact.occupation || ''],
    ['星座', contact.constellation || ''],
    ['MBTI', contact.mbti || ''],
    ['关系', contact.relationship || ''],
    ['性格特征', contact.personalityTraits || ''],
    ['兴趣爱好', contact.hobbies || ''],
    ['签名', contact.signature || ''],
    ['状态', contact.status || ''],
    ['状态时效', buildStatusTemporalHintText(contact.status, '角色').replace(/^状态时效：/, '')],
    ['回复语言', contact.language || ''],
    ['中文翻译', contact.language && contact.language !== '普通话' ? (contact.translateToChinese ? '需要' : '不需要') : ''],
    ['钱包余额', Number.isFinite(Number(contact.balance)) ? `¥${Number(contact.balance).toFixed(2)}` : ''],
    ['语音能力', contact.minimaxTTS?.enabled && String(contact.minimaxTTS.voiceId || '').trim() ? `已开启（voiceId=${String(contact.minimaxTTS.voiceId || '').trim()}）` : ''],
    ['拍一拍', contact.patDesc || ''],
    ['口头禅', contact.catchphrase || ''],
    ['核心人设', contact.persona || contact.personality || ''],
    ['背景故事', contact.background || ''],
    ['表达风格', contact.expressionStyle || ''],
    ['详细描述', contact.description || '']
  ]
    .map(([label, value]) => [label, String(value || '').trim()] as const)
    .filter(([, value]) => value);
  return fields.map(([label, value]) => `${label}：${value}`).join('；');
};
export const formatMemberMemoryLines = (memoryMap: ContactMemories, contactId: string, limit = 6) => {
  const sourceLabel: Record<'user' | 'model' | 'system', string> = {
    user: '用户',
    model: '该成员',
    system: '系统'
  };
  const getStateHint = (item: ContactMemoryEntry): string => {
    if (item.status === 'corrected') return '；状态已修正';
    if (item.status === 'ended') return '；状态已结束';
    if (item.temporalType === 'short_term' || item.temporalType === 'one_time') return '；短期状态';
    return '';
  };
  const selection = selectContactMemoriesForPrompt(memoryMap, contactId, limit);
  const memoryLines = [...selection.coreMemories, ...selection.relatedMemories]
    .map((item) => `[${sourceLabel[item.source] || '系统'}${getStateHint(item)}] ${String(item.text || '').trim()}`);
  const lines = memoryLines.filter(Boolean).slice(0, Math.max(1, Number(limit || 6)));
  if (lines.length === 0) return '';
  return lines
    .map((line, idx) => `${idx + 1}. ${line}`)
    .join('\n');
};
const isLikelyModernContact = (value: any): boolean => {
  if (!value || typeof value !== 'object') return false;
  return typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.avatar === 'string';
};
export const maybeNormalizeContacts = (raw: any): Contact[] | null => {
  if (!Array.isArray(raw)) return null;
  if (raw.every(isLikelyModernContact)) return raw as Contact[];
  return normalizeLegacyContacts(raw);
};
export const shouldSkipImportedContact = (contact: Partial<Contact> | null | undefined): boolean => {
  const id = String(contact?.id || '').trim();
  const name = String(contact?.name || '').trim();
  return id === '__xushuo_team__' || name === '关于叙说' || name.includes('主题酱');
};
const parseStructuredLegacyMessageText = (rawContent: string) => {
  const trimmed = String(rawContent || '').trim();
  if (!trimmed.startsWith('{')) return '';
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object') return '';
    return String((parsed as any).text ?? (parsed as any).content ?? '').trim();
  } catch {
    return '';
  }
};
export const normalizeLegacyMessagePayload = (input: {
  content: any;
  typeRaw?: string;
  explicitInner?: any;
  explicitAction?: any;
}) => {
  const rawContent = String(input.content ?? '');
  const structuredText = parseStructuredLegacyMessageText(rawContent);
  const strippedContent = rawContent
    .replace(/<inner>[\s\S]*?<\/inner>/gi, '')
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<action>[\s\S]*?<\/action>/gi, '')
    .trim();
  const normalizedType = String(input.typeRaw || '').toLowerCase().trim();
  const explicitInner = String(input.explicitInner || '').trim();
  const explicitAction = String(input.explicitAction || '').trim();
  const content = (normalizedType === 'action' ? '' : (structuredText || strippedContent)).trim();
  const normalizeForCompare = (value: string) => String(value || '').replace(/\s+/g, ' ').trim();
  const innerVoiceRaw = explicitInner;
  const actionRaw = explicitAction
    || (normalizedType === 'action' ? (structuredText || strippedContent || rawContent).trim() : '');
  const contentForCompare = normalizeForCompare(content);
  const innerVoice = innerVoiceRaw && contentForCompare && normalizeForCompare(innerVoiceRaw) === contentForCompare
    ? undefined
    : (innerVoiceRaw || undefined);
  const actionDesc = actionRaw && contentForCompare && normalizeForCompare(actionRaw) === contentForCompare
    ? undefined
    : (actionRaw || undefined);
  return { content, innerVoice, actionDesc };
};
export const normalizeLegacyMessages = (raw: any, contacts: Contact[]): Record<string, Message[]> => {
  if (!raw || typeof raw !== 'object') return {};
  const validIds = new Set((contacts || []).map(c => String(c.id)));
  const normalized: Record<string, Message[]> = {};
  Object.entries(raw).forEach(([key, list]) => {
    const contactId = String(key || '').trim();
    if (!contactId || !Array.isArray(list)) return;
    if (validIds.size > 0 && !validIds.has(contactId)) return;
    normalized[contactId] = list
      .map((msg: any, idx: number) => {
        const senderIdRaw = String(msg?.senderId ?? '').trim();
        const senderId = senderIdRaw || contactId;
        const timestamp = Number.isFinite(Number(msg?.timestamp)) ? Number(msg.timestamp) : Date.now();
        const typeRaw = String(msg?.type || 'text').toLowerCase().trim();
        const allowedTypes = new Set(['text', 'image', 'voice', 'redpacket', 'transfer', 'location', 'miniprogram', 'truthdare', 'system', 'call']);
        const normalizedType = (allowedTypes.has(typeRaw) ? typeRaw : 'text') as Message['type'];
        const payload = normalizeLegacyMessagePayload({
          content: msg?.content,
          typeRaw,
          explicitInner: msg?.innerVoice ?? msg?.thought,
          explicitAction: msg?.actionDesc ?? msg?.action
        });
        if (!payload.content && !payload.innerVoice && !payload.actionDesc && normalizedType !== 'system') return null;
        return {
          ...msg,
          id: String(msg?.id ?? `${contactId}-${timestamp}-${idx}`),
          senderId,
          content: payload.content,
          timestamp,
          type: normalizedType,
          innerVoice: payload.innerVoice,
          actionDesc: payload.actionDesc,
          quotedMsg: msg?.quotedMsg
            ? {
                ...msg.quotedMsg,
                id: String(msg.quotedMsg.id ?? `q-${contactId}-${timestamp}-${idx}`),
                senderId: String(msg.quotedMsg.senderId ?? contactId),
                content: String(msg.quotedMsg.content ?? ''),
                timestamp: Number.isFinite(Number(msg.quotedMsg.timestamp)) ? Number(msg.quotedMsg.timestamp) : timestamp,
                type: msg.quotedMsg.type || 'text'
              }
            : undefined
        } as Message;
      })
      .filter(Boolean) as Message[];
  });
  return normalized;
};
const isLikelyModernMessages = (raw: any): raw is Record<string, Message[]> => {
  if (!raw || typeof raw !== 'object') return false;
  const entries = Object.entries(raw);
  if (entries.length === 0) return true;
  const sample = entries.slice(0, 12);
  return sample.every(([_, list]) => {
    if (!Array.isArray(list)) return false;
    if (list.length === 0) return true;
    const item = list[0] as any;
    return !!item
      && typeof item.id === 'string'
      && typeof item.senderId === 'string'
      && typeof item.content === 'string'
      && typeof item.timestamp === 'number'
      && typeof item.type === 'string';
  });
};
export const maybeNormalizeMessages = (raw: any, contacts: Contact[]): Record<string, Message[]> => {
  if (isLikelyModernMessages(raw)) return raw as Record<string, Message[]>;
  return normalizeLegacyMessages(raw, contacts);
};
const SNAPSHOT_CORE_KEYS = [
  'contacts',
  'user',
  'messages',
  'moments',
  'favorites',
  'settings',
  'aiSettings',
  'worldBooks',
  'masks',
  'htmlTemplates',
  'bubbleTemplates',
  'inboxLetters',
  'sentLetters',
  'forums',
  'mailboxTheme',
  'musicState',
  'anonymousChatSettings',
  'anonymousChatHistory',
  'anonymousHasUnfinishedSession',
  'anonymousUnfinishedSession',
  'divinationHistory',
  'truthDareThemes',
  'truthDareRuntime',
  'imageLibraryGroups',
  'imageLibraryItems',
  'novelBookshelf',
  'novelReaderAppearance',
  'novelPreference',
  'aiProviderPresets',
  'aiProviderConfigs'
] as const;

const PARTIAL_EXPORT_VERSION_PREFIXES = [
  'contacts-export-',
  'worldbooks-export-',
  'htmltemplates-export-',
  'desktop-settings-export-',
  'emoji-export-zip-',
  'image-library-groups-export-'
] as const;

const FULL_SNAPSHOT_ANCHOR_KEYS = [
  'contacts',
  'user',
  'messages',
  'moments',
  'favorites',
  'settings',
  'aiSettings',
  'worldBooks'
] as const;
export const scoreSnapshotShape = (value: any): number => {
  if (!value || typeof value !== 'object') return 0;
  return SNAPSHOT_CORE_KEYS.reduce((score, key) => (key in value ? score + 1 : score), 0);
};

export const isFullAppSnapshotPayload = (value: unknown): boolean => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const source = value as Record<string, unknown>;
  const version = typeof source.version === 'string' ? source.version : '';
  if (PARTIAL_EXPORT_VERSION_PREFIXES.some((prefix) => version.startsWith(prefix))) {
    return false;
  }
  const anchorCount = FULL_SNAPSHOT_ANCHOR_KEYS.reduce(
    (count, key) => (Object.prototype.hasOwnProperty.call(source, key) ? count + 1 : count),
    0
  );
  return anchorCount >= 2;
};

export const unwrapImportedBackupData = (raw: any): any => {
  const candidates = [
    raw,
    raw?.data,
    raw?.snapshot,
    raw?.payload,
    raw?.state,
    raw?.appState,
    raw?.backup,
    raw?.backupData,
    raw?.result?.data
  ].filter(Boolean);
  let best = raw;
  let bestScore = scoreSnapshotShape(raw);
  candidates.forEach((candidate) => {
    const score = scoreSnapshotShape(candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  });
  return best;
};
