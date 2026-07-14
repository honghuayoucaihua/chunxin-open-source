const ENCRYPTION_VERSION = 'xushuo-encrypted-export-v1';
const ENCRYPTION_ALGORITHM = 'xor-base64-v1';
const ENCRYPTION_MARK = 'XUSHUO_EXPORT_DATA';
// 注意：此密钥用于社区分享内容的客户端混淆，不是安全加密。真正的传输保护由 HTTPS 提供。
// 自建用户可通过构建工具替换此值。
const ENCRYPTION_SECRET = 'xushuo-lite-export-secret';

export const COMMUNITY_UPLOAD_PAYLOAD_LIMIT_BYTES = 96 * 1024;
export const COMMUNITY_COVER_IMAGE_MAX_BYTES = 200 * 1024;
export const COMMUNITY_COVER_IMAGE_MAX_SIZE_KB = Math.floor(COMMUNITY_COVER_IMAGE_MAX_BYTES / 1024);
export const COMMUNITY_COVER_IMAGE_MAX_WIDTH = 1200;
const COMMUNITY_CONTACT_TEXT_FIELD_LIMIT_BYTES = 16 * 1024;
const COMMUNITY_CONTACT_DATA_URL_LIMIT_BYTES = 12 * 1024;
const COMMUNITY_CONTACT_AVATAR_LIMIT_BYTES = 64 * 1024;
const COMMUNITY_CONTACT_GENERIC_ARRAY_LIMIT = 64;

const CONTACT_RUNTIME_KEYS = [
  'lastMessage',
  'lastTime',
  'unreadCount',
  'isPinned',
  'proactiveDrafts',
  'lastProactiveChatAt',
  'lastIdleChatAt',
  'balance'
];

const CONTACT_SHARE_EXCLUDED_KEYS = new Set([
  'encryptedHiddenRaw',
  'messages',
  'wallpaper',
  'wallpaperOpacity',
  'chatBg',
  'signatureImage',
  'stampImage',
  'longtermMemory',
  'storyContext',
  'context',
  'innerVoice',
  'hasUnreadMessages',
  'lastMemoryTime'
]);

const CONTACT_ALLOWED_ARRAY_KEYS = new Set([
  'worldBookIds',
  'htmlTemplateIds',
  'imageLibraryGroupIds',
  'memberIds',
  'groupRelations'
]);

const COMMUNITY_SCOPE_BY_TYPE = {
  contact: 'contacts',
  worldbook: 'worldbooks',
  htmltemplate: 'htmltemplates',
  bubbleworkshop: 'bubbletemplates'
};

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const byteLength = (value) => new TextEncoder().encode(String(value ?? '')).length;

export const getBase64DataUrlByteLength = (value) => {
  const match = String(value || '').match(/^data:[^;]+;base64,(.+)$/);
  if (!match) return 0;
  const base64 = match[1];
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
};

const bytesToBase64 = (bytes) => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
};

const base64ToBytes = (base64) => {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const xorCipher = (source, key) => {
  const output = new Uint8Array(source.length);
  for (let index = 0; index < source.length; index += 1) {
    output[index] = source[index] ^ key[index % key.length];
  }
  return output;
};

const buildCipherKey = (scope) => new TextEncoder().encode(`${ENCRYPTION_SECRET}:${scope}`);

const isEncryptedExportEnvelope = (value, expectedScope = '') =>
  isRecord(value)
  && value.encrypted === true
  && typeof value.scope === 'string'
  && typeof value.payload === 'string'
  && (!expectedScope || value.scope === expectedScope);

export const encryptCommunityExportEnvelope = (payload, scope, rawEnvelope = null) => {
  const jsonText = JSON.stringify(payload);
  const plainText = `${ENCRYPTION_MARK}:${scope}:${jsonText}`;
  const sourceBytes = new TextEncoder().encode(plainText);
  const cipherBytes = xorCipher(sourceBytes, buildCipherKey(scope));
  return {
    version: rawEnvelope?.version || ENCRYPTION_VERSION,
    encrypted: true,
    algorithm: rawEnvelope?.algorithm || ENCRYPTION_ALGORITHM,
    scope,
    exportedAt: Number(rawEnvelope?.exportedAt || Date.now()),
    lockOnImport: true,
    payload: bytesToBase64(cipherBytes)
  };
};

export const decryptCommunityExportEnvelope = (rawEnvelope) => {
  if (!isEncryptedExportEnvelope(rawEnvelope)) return null;
  const scope = String(rawEnvelope.scope || '').trim();
  const payloadBase64 = String(rawEnvelope.payload || '').trim();
  if (!scope || !payloadBase64) return null;
  const cipherBytes = base64ToBytes(payloadBase64);
  const plainBytes = xorCipher(cipherBytes, buildCipherKey(scope));
  const plainText = new TextDecoder().decode(plainBytes);
  const prefix = `${ENCRYPTION_MARK}:${scope}:`;
  if (!plainText.startsWith(prefix)) return null;
  return {
    scope,
    envelope: rawEnvelope,
    data: JSON.parse(plainText.slice(prefix.length))
  };
};

const tryParseJson = (value) => {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (!text) return value;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
};

export const sanitizeContactForCommunity = (contact) => {
  const cleaned = { ...(isRecord(contact) ? contact : {}) };
  for (const key of CONTACT_RUNTIME_KEYS) {
    delete cleaned[key];
  }
  for (const key of CONTACT_SHARE_EXCLUDED_KEYS) {
    delete cleaned[key];
  }

  for (const [key, value] of Object.entries(cleaned)) {
    if (value === undefined) {
      delete cleaned[key];
      continue;
    }

    if (typeof value === 'string') {
      const maxBytes = key === 'avatar'
        ? COMMUNITY_CONTACT_AVATAR_LIMIT_BYTES
        : value.startsWith('data:')
        ? COMMUNITY_CONTACT_DATA_URL_LIMIT_BYTES
        : COMMUNITY_CONTACT_TEXT_FIELD_LIMIT_BYTES;
      if (byteLength(value) > maxBytes) {
        delete cleaned[key];
        continue;
      }
    }

    if (Array.isArray(value) && !CONTACT_ALLOWED_ARRAY_KEYS.has(key) && value.length > COMMUNITY_CONTACT_GENERIC_ARRAY_LIMIT) {
      delete cleaned[key];
      continue;
    }
  }

  return cleaned;
};

export const sanitizeCommunityPayloadObject = (type, payload) => {
  const record = isRecord(payload) ? { ...payload } : {};
  if (type === 'contact') {
    const contacts = Array.isArray(record.contacts)
      ? record.contacts.map(sanitizeContactForCommunity)
      : [];
    return {
      contacts,
      messages: {}
    };
  }
  return record;
};

export const prepareCommunityPayloadForStorage = (type, rawPayload, isEncrypted = false) => {
  const scope = COMMUNITY_SCOPE_BY_TYPE[type] || '';
  const parsedPayload = tryParseJson(rawPayload);
  const shouldDecrypt = scope && (isEncrypted || isEncryptedExportEnvelope(parsedPayload, scope));

  if (shouldDecrypt) {
    const decrypted = decryptCommunityExportEnvelope(parsedPayload);
    if (!decrypted || decrypted.scope !== scope) {
      throw new Error('加密分享内容结构无效');
    }
    const sanitized = sanitizeCommunityPayloadObject(type, decrypted.data);
    const encryptedPayload = encryptCommunityExportEnvelope(sanitized, scope, decrypted.envelope);
    const payloadString = JSON.stringify(encryptedPayload);
    return {
      payload: encryptedPayload,
      payloadString,
      bytes: byteLength(payloadString)
    };
  }

  const sanitized = sanitizeCommunityPayloadObject(type, parsedPayload);
  const payloadString = JSON.stringify(sanitized);
  return {
    payload: sanitized,
    payloadString,
    bytes: byteLength(payloadString)
  };
};

export const buildCommunityPayloadTooLargeMessage = (bytes) =>
  `分享内容过大（${Math.ceil(bytes / 1024)}KB），请移除聊天记录或大图后重试`;

export const buildCommunityCoverTooLargeMessage = (bytes) =>
  `封面图片过大（${Math.ceil(bytes / 1024)}KB），请压缩后重试`;
