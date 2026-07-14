import { DEFAULT_APPEARANCE_SETTINGS, DEFAULT_SOUND_VIBRATION_SETTINGS, INITIAL_USER } from './constants.ts';
import { DEFAULT_MINIMAX_GLOBAL_TTS } from './appBootstrapUtils.ts';
import { normalizeLegacyMessagePayload } from './appStateNormalizeUtils.ts';

export {
  formatDetailedContactProfile,
  formatGroupRelationText,
  formatMemberMemoryLines,
  maybeNormalizeContacts,
  maybeNormalizeMessages,
  normalizeLegacyContacts,
  normalizeLegacyMessages,
  isFullAppSnapshotPayload,
  normalizeSoundVibrationSettings,
  scoreSnapshotShape,
  shouldSkipImportedContact,
  unwrapImportedBackupData
} from './appStateNormalizeUtils.ts';

export const adaptLegacyBackupData = (raw: any): any => {
  if (!raw || typeof raw !== 'object') return raw;

  const contacts = Array.isArray(raw.contacts) ? raw.contacts : [];
  const settingsEntries = Array.isArray(raw.settingsFull)
    ? raw.settingsFull
    : Array.isArray(raw.settings)
      ? raw.settings
      : [];
  const pickSettingValue = (key: string): any => {
    const hit = settingsEntries.find((item: any) => String(item?.key || '').trim() === key);
    return hit?.value;
  };

  const parseLegacyJson = (value: any): any => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  };
  const pickParsedSettingValue = (key: string): any => parseLegacyJson(pickSettingValue(key));
  const legacyUserProfile = parseLegacyJson(raw.userProfile) || pickParsedSettingValue('userProfile');
  const legacyAiConfig = parseLegacyJson(raw.aiConfig) || pickParsedSettingValue('aiConfig');
  const legacyAppearanceConfig = parseLegacyJson(raw.appearanceConfig) || pickParsedSettingValue('appearanceConfig');
  const legacyWorldBookConfig = parseLegacyJson(raw.worldBookConfig) || pickParsedSettingValue('worldBookConfig');
  const parsedSettingWorldBooks = pickParsedSettingValue('worldBooks');
  const legacyWorldBooks = Array.isArray(raw.worldBooks)
    ? raw.worldBooks
    : (Array.isArray(parsedSettingWorldBooks) ? parsedSettingWorldBooks : []);
  const legacySoundSettingCandidates = [
    raw.soundVibrationSettings,
    raw.soundSettings,
    raw?.localStorage?.soundSettings,
    raw?.localStorageCompat?.soundSettings,
    pickSettingValue('soundSettings'),
    pickSettingValue('soundVibrationSettings')
  ];
  const parsedLegacySoundSettings = legacySoundSettingCandidates
    .map(parseLegacyJson)
    .find((item) => item && typeof item === 'object');
  const mappedSoundVibrationSettings = raw.soundVibrationSettings || (
    parsedLegacySoundSettings && typeof parsedLegacySoundSettings === 'object'
      ? {
          sendSoundEnabled: parsedLegacySoundSettings.enabled !== false,
          receiveSoundEnabled: parsedLegacySoundSettings.enabled !== false,
          sendSoundSrc: DEFAULT_SOUND_VIBRATION_SETTINGS.sendSoundSrc,
          receiveSoundSrc: DEFAULT_SOUND_VIBRATION_SETTINGS.receiveSoundSrc,
          vibrationEnabled: true
        }
      : undefined
  );
  const hasNestedContactMessages = contacts.some((c: any) => Array.isArray(c?.messages));
  const shouldAdaptV2 =
    !raw.messages &&
    (
      hasNestedContactMessages
      || legacyUserProfile
      || legacyAiConfig
      || legacyAppearanceConfig
      || Array.isArray(raw.dynamics)
      || settingsEntries.length > 0
    );

  if (!shouldAdaptV2) {
    return mappedSoundVibrationSettings && !raw.soundVibrationSettings
      ? { ...raw, soundVibrationSettings: mappedSoundVibrationSettings }
      : raw;
  }

  const normalizeMaybeBase64Image = (value: any, fallback: string): string => {
    const rawValue = String(value || '').trim();
    if (!rawValue) return fallback;
    if (/^data:image\/[a-zA-Z0-9+.-]+;base64,/i.test(rawValue)) return rawValue;
    if (/^https?:\/\//i.test(rawValue) || /^blob:/i.test(rawValue) || rawValue.startsWith('/')) return rawValue;
    const looksLikeBase64 = /^[A-Za-z0-9+/=]+$/.test(rawValue) && rawValue.length > 24;
    if (looksLikeBase64) return `data:image/png;base64,${rawValue}`;
    return rawValue;
  };

  const mappedMessages: Record<string, any[]> = {};
  contacts.forEach((contact: any) => {
    const contactId = String(contact?.id || '').trim();
    if (!contactId || !Array.isArray(contact?.messages)) return;
    mappedMessages[contactId] = contact.messages
      .map((msg: any, idx: number) => {
        const t = msg?.timestamp;
        const parsedTs =
          typeof t === 'string'
            ? Date.parse(t)
            : Number.isFinite(Number(t))
              ? Number(t)
              : Date.now();
        const timestamp = Number.isFinite(parsedTs) ? parsedTs : Date.now();
        const typeRaw = String(msg?.type || '').toLowerCase().trim();
        const senderRaw = String(msg?.sender || '').trim();
        const senderId = typeRaw === 'user' || senderRaw === 'user' || senderRaw === 'me' ? 'me' : contactId;

        // 明确跳过当前不支持的消息类型（如礼物/商城道具）
        if (['gift', 'shopitem', 'shop_item', 'inventory_item', 'item'].includes(typeRaw)) {
          return null;
        }

        const payload = normalizeLegacyMessagePayload({
          content: msg?.content,
          typeRaw,
          explicitInner: msg?.innerVoice ?? msg?.thought,
          explicitAction: msg?.actionDesc ?? msg?.action
        });

        const quoted = msg?.quote
          ? {
              id: String(msg.quote.id || `q-${contactId}-${idx}`),
              senderId: String(msg.quote.sender || contactId),
              content: String(msg.quote.content || ''),
              timestamp: Number.isFinite(Date.parse(String(msg.quote.timestamp || '')))
                ? Date.parse(String(msg.quote.timestamp || ''))
                : timestamp,
              type: 'text'
            }
          : undefined;

        return {
          id: String(msg?.id || `${contactId}-${timestamp}-${idx}`),
          senderId,
          content: payload.content,
          timestamp,
          type: 'text',
          innerVoice: payload.innerVoice,
          actionDesc: payload.actionDesc,
          quotedMsg: quoted
        };
      })
      .filter((msg: any) => {
        if (!msg) return false;
        const text = String(msg?.content || '').trim();
        const inner = String(msg?.innerVoice || '').trim();
        const action = String(msg?.actionDesc || '').trim();
        return !!(text || inner || action);
      });
  });

  const mappedUser = raw.user || (legacyUserProfile
    ? {
        id: 'me',
        avatar: normalizeMaybeBase64Image(legacyUserProfile.avatar, INITIAL_USER.avatar),
        name: legacyUserProfile.name || legacyUserProfile.nickname || INITIAL_USER.name,
        wechatId: legacyUserProfile.wechatId || INITIAL_USER.wechatId,
        signature: legacyUserProfile.signature || '',
        region: legacyUserProfile.region || '',
        balance: Number.isFinite(Number(legacyUserProfile.balance)) ? Number(legacyUserProfile.balance) : 0,
        age: legacyUserProfile.age || '',
        gender: legacyUserProfile.gender || 'other',
        occupation: legacyUserProfile.occupation || '',
        personality: legacyUserProfile.personality || '',
        hobbies: legacyUserProfile.interests || legacyUserProfile.hobbies || '',
        description: legacyUserProfile.background || '',
        goals: legacyUserProfile.goals || ''
      }
    : undefined);

  const mappedAiSettings = raw.aiSettings || (legacyAiConfig
    ? {
        provider: ['builtin', 'siliconflow', 'deepseek', 'gemini', 'zhipu', 'anthropic', 'custom'].includes(String(legacyAiConfig.provider || ''))
          ? legacyAiConfig.provider
          : 'builtin',
        apiKey: legacyAiConfig.apiKey || '',
        model: legacyAiConfig.customModel || legacyAiConfig.model || '',
        baseUrl: legacyAiConfig.baseUrl || legacyAiConfig.apiUrl || '',
        responseFormat: legacyAiConfig.responseFormat === 'response' || legacyAiConfig.responseFormat === 'anthropic'
          ? legacyAiConfig.responseFormat
          : 'openai',
        enableImageGeneration: false,
        imageResponseFormat: 'openai',
        imageModel: '',
        imageBaseUrl: '',
        imageApiKey: '',
        enableDelayReply: true,
        enableSentenceSend: !!legacyAiConfig.enableSentenceSend,
        enableTimeAwareness: !!legacyAiConfig.timeAware,
        minimaxTTS: DEFAULT_MINIMAX_GLOBAL_TTS
      }
    : undefined);

  const mappedSettings = (
    raw.settings && typeof raw.settings === 'object' && !Array.isArray(raw.settings)
      ? raw.settings
      : undefined
  ) || (legacyAppearanceConfig
    ? {
        ...DEFAULT_APPEARANCE_SETTINGS,
        themeMode: legacyAppearanceConfig.theme || DEFAULT_APPEARANCE_SETTINGS.themeMode,
        uiScale: Number.isFinite(Number(legacyAppearanceConfig.fontSize))
          ? Number(legacyAppearanceConfig.fontSize)
          : DEFAULT_APPEARANCE_SETTINGS.uiScale,
        chatBg: legacyAppearanceConfig.chatBackground || ''
      }
    : undefined);

  const mappedCustomEmojis = Array.isArray(raw.customEmojis)
    ? raw.customEmojis
    : Array.isArray(raw.emojis)
      ? raw.emojis
        .map((item: any, idx: number) => {
          const url = normalizeMaybeBase64Image(item?.url || item?.imageData, '');
          if (!url) return null;
          return {
            id: String(item?.id || `legacy-emoji-${idx}`),
            url,
            desc: String(item?.desc || item?.caption || item?.name || `表情${idx + 1}`)
          };
        })
        .filter(Boolean)
      : undefined;

  const activeWorldBookIds = new Set(
    Array.isArray(legacyWorldBookConfig?.activeBookIds)
      ? legacyWorldBookConfig.activeBookIds.map((id: any) => String(id || '').trim()).filter(Boolean)
      : []
  );

  const mappedWorldBooks = Array.isArray(legacyWorldBooks)
    ? legacyWorldBooks
      .map((book: any, idx: number) => {
        const bookId = String(book?.id || `legacy-wb-${idx}`).trim();
        if (!bookId) return null;

        const rawEntries = Array.isArray(book?.entries)
          ? book.entries
          : [];

        const entries = rawEntries.length > 0
          ? rawEntries
            .map((entry: any, entryIdx: number) => ({
              id: String(entry?.id || `${bookId}-e-${entryIdx}`).trim(),
              text: String(entry?.text || '').trim()
            }))
            .filter((entry: any) => entry.id && entry.text)
          : (() => {
              const text = String(book?.content || '').trim();
              return text
                ? [{ id: `${bookId}-e-0`, text }]
                : [];
            })();

        return {
          id: bookId,
          name: String(book?.name || `世界书${idx + 1}`).trim() || `世界书${idx + 1}`,
          enabled: typeof book?.enabled === 'boolean'
            ? book.enabled
            : (activeWorldBookIds.size > 0 ? activeWorldBookIds.has(bookId) : true),
          entries
        };
      })
      .filter(Boolean)
    : [];

  const contactBookMap = new Map<string, string[]>();
  if (Array.isArray(legacyWorldBooks) && legacyWorldBooks.length > 0) {
    legacyWorldBooks.forEach((book: any, idx: number) => {
      const bookId = String(book?.id || `legacy-wb-${idx}`).trim();
      const contactId = String(book?.contactId || '').trim();
      if (!bookId || !contactId) return;
      const list = contactBookMap.get(contactId) || [];
      if (!list.includes(bookId)) list.push(bookId);
      contactBookMap.set(contactId, list);
    });
  }
  const mappedWorldBookIdSet = new Set(mappedWorldBooks.map((book: any) => String(book?.id || '').trim()).filter(Boolean));

  const mappedContacts = contacts.map((contact: any) => {
    const contactId = String(contact?.id || '').trim();
    const existingIds = Array.isArray(contact?.worldBookIds)
      ? contact.worldBookIds.map((id: any) => String(id || '').trim()).filter(Boolean)
      : [];
    if (existingIds.length > 0) return contact;

    const relatedIds = (contactBookMap.get(contactId) || [])
      .filter((bookId) => mappedWorldBookIdSet.has(bookId))
      .filter((bookId) => activeWorldBookIds.size === 0 || activeWorldBookIds.has(bookId));

    if (relatedIds.length === 0) return contact;
    return {
      ...contact,
      worldBookIds: relatedIds
    };
  });

  return {
    ...raw,
    contacts: mappedContacts,
    user: mappedUser,
    aiSettings: mappedAiSettings,
    settings: mappedSettings,
    messages: raw.messages || mappedMessages,
    moments: raw.moments || raw.dynamics || [],
    favorites: raw.favorites || [],
    worldBooks: mappedWorldBooks,
    customEmojis: mappedCustomEmojis,
    soundVibrationSettings: mappedSoundVibrationSettings,
    hasAgreedTerms: typeof raw.hasAgreedTerms === 'boolean' ? raw.hasAgreedTerms : true
  };
};

