import type { BubbleTemplate, Contact, WorldBook } from '../types';
import type { HtmlTemplate } from '../types/htmlTemplate';

const decodeBase64Utf8 = (base64: string): string => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
};

const parseHiddenRawObject = (encoded: unknown): Record<string, unknown> | null => {
  const raw = String(encoded || '').trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeBase64Utf8(raw));
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
};

export const resolveEncryptedHiddenRawObject = (encoded: unknown): Record<string, unknown> | null =>
  parseHiddenRawObject(encoded);

export const resolveContactForAI = (contact: Contact): Contact => {
  if (!contact?.encryptedReadOnly) return contact;
  const hidden = parseHiddenRawObject(contact.encryptedHiddenRaw);
  return hidden ? { ...contact, ...hidden, encryptedReadOnly: true, encryptedHiddenRaw: contact.encryptedHiddenRaw } as Contact : contact;
};

export const resolveWorldBookForAI = (book: WorldBook): WorldBook => {
  const sanitizeForAI = (value: WorldBook): WorldBook => ({
    ...value,
    description: undefined
  });

  if (!book?.encryptedReadOnly) return sanitizeForAI(book);
  const hidden = parseHiddenRawObject(book.encryptedHiddenRaw);
  return hidden
    ? sanitizeForAI({ ...book, ...hidden, encryptedReadOnly: true, encryptedHiddenRaw: book.encryptedHiddenRaw } as WorldBook)
    : sanitizeForAI(book);
};

export const resolveHtmlTemplateForAI = (tpl: HtmlTemplate): HtmlTemplate => {
  if (!tpl?.encryptedReadOnly) return tpl;
  const hidden = parseHiddenRawObject(tpl.encryptedHiddenRaw);
  return hidden
    ? { ...tpl, ...hidden, encryptedReadOnly: true, encryptedHiddenRaw: tpl.encryptedHiddenRaw } as HtmlTemplate
    : tpl;
};

export const resolveBubbleTemplateForStyle = (tpl: BubbleTemplate): BubbleTemplate => {
  if (!tpl?.encryptedReadOnly) return tpl;
  const hidden = parseHiddenRawObject(tpl.encryptedHiddenRaw);
  return hidden
    ? { ...tpl, ...hidden, encryptedReadOnly: true, encryptedHiddenRaw: tpl.encryptedHiddenRaw } as BubbleTemplate
    : tpl;
};
