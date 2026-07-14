import type { BubbleTemplate, Contact, HtmlTemplate, WorldBook } from '../../types';

const ENCRYPTION_VERSION = 'xushuo-encrypted-export-v1';
const ENCRYPTION_ALGORITHM = 'xor-base64-v1';
const ENCRYPTION_MARK = 'XUSHUO_EXPORT_DATA';
// 注意：此密钥用于导出数据的客户端混淆，不是安全加密。真正的传输保护由 HTTPS 提供。
// 自建用户可通过构建工具替换此值。
const ENCRYPTION_SECRET = 'xushuo-lite-export-secret';

export type ExportEncryptScope = 'contacts' | 'worldbooks' | 'htmltemplates' | 'bubbletemplates';

type EncryptedExportEnvelope = {
  version: string;
  encrypted: true;
  algorithm: string;
  scope: ExportEncryptScope;
  exportedAt: number;
  lockOnImport: true;
  payload: string;
};

const xorCipher = (source: Uint8Array, key: Uint8Array): Uint8Array => {
  const output = new Uint8Array(source.length);
  for (let index = 0; index < source.length; index += 1) {
    output[index] = source[index] ^ key[index % key.length];
  }
  return output;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
};

const base64ToBytes = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const buildCipherKey = (scope: ExportEncryptScope): Uint8Array => new TextEncoder().encode(`${ENCRYPTION_SECRET}:${scope}`);
const encodeJsonAsBase64 = (value: unknown): string => bytesToBase64(new TextEncoder().encode(JSON.stringify(value)));

export const encryptExportPayload = (payload: unknown, scope: ExportEncryptScope): EncryptedExportEnvelope => {
  const jsonText = JSON.stringify(payload);
  const plainText = `${ENCRYPTION_MARK}:${scope}:${jsonText}`;
  const sourceBytes = new TextEncoder().encode(plainText);
  const cipherBytes = xorCipher(sourceBytes, buildCipherKey(scope));
  return {
    version: ENCRYPTION_VERSION,
    encrypted: true,
    algorithm: ENCRYPTION_ALGORITHM,
    scope,
    exportedAt: Date.now(),
    lockOnImport: true,
    payload: bytesToBase64(cipherBytes)
  };
};

const markReadonlyData = (scope: ExportEncryptScope, data: any): any => {
  if (!data || typeof data !== 'object') return data;
  if (scope === 'contacts') {
    const contacts = Array.isArray(data.contacts)
      ? data.contacts.map((item: Contact) => ({
          ...item,
          remark: '',
          signature: '',
          region: '',
          description: '',
          persona: '',
          background: '',
          expressionStyle: '',
          encryptedReadOnly: true,
          encryptedHiddenRaw: encodeJsonAsBase64(item)
        }))
      : data.contacts;
    const messages = data.messages && typeof data.messages === 'object' ? {} : data.messages;
    return { ...data, contacts, messages };
  }
  if (scope === 'worldbooks') {
    const worldBooks = Array.isArray(data.worldBooks)
      ? data.worldBooks.map((item: WorldBook) => ({
          ...item,
          entries: [],
          encryptedReadOnly: true,
          encryptedHiddenRaw: encodeJsonAsBase64(item)
        }))
      : data.worldBooks;
    return { ...data, worldBooks };
  }
  if (scope === 'htmltemplates') {
    const htmlTemplates = Array.isArray(data.htmlTemplates)
      ? data.htmlTemplates.map((item: HtmlTemplate) => ({
          ...item,
          htmlContent: '',
          variables: [],
          encryptedReadOnly: true,
          encryptedHiddenRaw: encodeJsonAsBase64(item)
        }))
      : data.htmlTemplates;
    return { ...data, htmlTemplates };
  }
  if (scope === 'bubbletemplates') {
    const bubbleTemplates = Array.isArray(data.bubbleTemplates)
      ? data.bubbleTemplates.map((item: BubbleTemplate) => ({
          ...item,
          cssContent: '',
          encryptedReadOnly: true,
          encryptedHiddenRaw: encodeJsonAsBase64(item)
        }))
      : data.bubbleTemplates;
    return { ...data, bubbleTemplates };
  }
  return data;
};

export const decryptImportedPayload = (raw: any): { data: any; wasEncrypted: boolean } => {
  if (!raw || typeof raw !== 'object' || raw.encrypted !== true) {
    return { data: raw, wasEncrypted: false };
  }
  const scope = String(raw.scope || '').trim() as ExportEncryptScope;
  const payloadBase64 = String(raw.payload || '').trim();
  if ((scope !== 'contacts' && scope !== 'worldbooks' && scope !== 'htmltemplates' && scope !== 'bubbletemplates') || !payloadBase64) {
    throw new Error('加密文件结构无效');
  }
  const cipherBytes = base64ToBytes(payloadBase64);
  const plainBytes = xorCipher(cipherBytes, buildCipherKey(scope));
  const plainText = new TextDecoder().decode(plainBytes);
  const prefix = `${ENCRYPTION_MARK}:${scope}:`;
  if (!plainText.startsWith(prefix)) {
    throw new Error('加密文件校验失败');
  }
  const parsed = JSON.parse(plainText.slice(prefix.length));
  return { data: markReadonlyData(scope, parsed), wasEncrypted: true };
};
