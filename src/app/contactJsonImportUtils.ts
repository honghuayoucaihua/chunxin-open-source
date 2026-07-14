import type { ContactFormData } from '../utils/UtilsSubPages';
import { toContactFormPatch, type UnknownRecord } from './contactFormPatchUtils.ts';

type ContactJsonImportResult = {
  patch: Partial<ContactFormData>;
  source: 'single' | 'contacts';
};

const isRecord = (value: unknown): value is UnknownRecord => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const looksLikeExportedContact = (value: UnknownRecord): boolean => {
  return 'sentenceRange' in value
    || 'unreadCount' in value
    || 'worldBookIds' in value
    || 'chatMode' in value
    || 'isAi' in value;
};

const normalizeImportContact = (value: UnknownRecord): UnknownRecord => {
  const normalized = { ...value };
  if (looksLikeExportedContact(normalized) && !normalized.personalityTraits) {
    delete normalized.personality;
  }
  return normalized;
};

const resolveImportContact = (value: unknown): ContactJsonImportResult => {
  if (!isRecord(value)) {
    throw new Error('JSON 顶层必须是对象');
  }

  if (Array.isArray(value.contacts)) {
    if (value.contacts.length === 0) {
      throw new Error('contacts 数组为空，无法导入');
    }
    const first = value.contacts[0];
    if (!isRecord(first)) {
      throw new Error('contacts[0] 不是有效联系人对象');
    }
    return { patch: toContactFormPatch(normalizeImportContact(first)), source: 'contacts' };
  }

  return { patch: toContactFormPatch(normalizeImportContact(value)), source: 'single' };
};

export const parseContactJsonImport = (text: string): ContactJsonImportResult => {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    throw new Error('请先粘贴 JSON 内容');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('JSON 格式不正确，请检查后重试');
  }

  const result = resolveImportContact(parsed);
  if (!result.patch.name?.trim()) {
    throw new Error('导入失败：缺少联系人姓名');
  }
  return result;
};
