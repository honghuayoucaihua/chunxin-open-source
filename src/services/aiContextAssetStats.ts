import type { HtmlTemplate, WorldBook, WorldBookEntry } from '../types';
import { extractTemplateLoopMetas } from '../utils/htmlTemplate/templateVarExtractor.ts';
import { resolveEncryptedHiddenRawObject } from '../utils/encryptedReadModel.ts';

const normalizeText = (value: unknown): string => String(value || '');

export const countChars = (value: unknown): number => normalizeText(value).length;

export const formatCharCount = (value: unknown): string => {
  const safeValue = Math.max(0, Number(value) || 0);
  return `${safeValue} 字符`;
};

export const getWorldBookDescriptionChars = (book: Pick<WorldBook, 'description'>): number =>
  countChars(book?.description);

export const getWorldBookEntryChars = (entry: Pick<WorldBookEntry, 'text'>): number =>
  countChars(entry?.text);

export const getWorldBookContentChars = (book: Pick<WorldBook, 'entries'>): number =>
  Array.isArray(book?.entries) ? book.entries.reduce((sum, entry) => sum + getWorldBookEntryChars(entry), 0) : 0;

const resolveWorldBookForContext = (
  book: Pick<WorldBook, 'id' | 'name' | 'description' | 'entries' | 'encryptedHiddenRaw'>
): Pick<WorldBook, 'id' | 'name' | 'description' | 'entries'> => {
  const hidden = resolveEncryptedHiddenRawObject(book?.encryptedHiddenRaw);
  if (!hidden) return book;
  return {
    ...book,
    ...(typeof hidden.id === 'string' ? { id: hidden.id } : {}),
    ...(typeof hidden.name === 'string' ? { name: hidden.name } : {}),
    ...(typeof hidden.description === 'string' ? { description: hidden.description } : {}),
    ...(Array.isArray(hidden.entries) ? { entries: hidden.entries } : {})
  };
};

export const getWorldBookContextText = (book: Pick<WorldBook, 'id' | 'name' | 'description' | 'entries' | 'encryptedHiddenRaw'>): string => {
  const resolved = resolveWorldBookForContext(book);
  const resolvedEntries = Array.isArray(resolved?.entries) && resolved.entries.length > 0
    ? resolved.entries
    : [];
  const entries = resolvedEntries
    .map((entry: any) => normalizeText(entry?.text))
    .filter(Boolean)
    .join('；');
  return entries ? `【${normalizeText(resolved?.name)}】${entries}` : '';
};

export const getWorldBookContextChars = (book: Pick<WorldBook, 'id' | 'name' | 'description' | 'entries' | 'encryptedHiddenRaw'>): number =>
  countChars(getWorldBookContextText(book));

export const buildWorldBookChoiceDescription = (book: Pick<WorldBook, 'id' | 'name' | 'description' | 'entries' | 'encryptedHiddenRaw'>): string => {
  const summary = `AI上下文约 ${formatCharCount(getWorldBookContextChars(book))}`;
  const description = normalizeText(resolveWorldBookForContext(book)?.description).trim();
  return description ? `${summary} · ${description}` : summary;
};

const resolveTemplateUsageNote = (
  template: Pick<HtmlTemplate, 'usageNote' | 'encryptedHiddenRaw'>
): string => {
  const hidden = resolveEncryptedHiddenRawObject(template?.encryptedHiddenRaw);
  if (hidden) {
    if (typeof hidden.usageNote === 'string') return hidden.usageNote;
  }
  return normalizeText(template?.usageNote);
};

const resolveTemplateForContext = (
  template: Pick<HtmlTemplate, 'id' | 'name' | 'description' | 'usageNote' | 'htmlContent' | 'variables' | 'encryptedHiddenRaw'>
): Pick<HtmlTemplate, 'id' | 'name' | 'description' | 'usageNote' | 'htmlContent' | 'variables'> => {
  const hidden = resolveEncryptedHiddenRawObject(template?.encryptedHiddenRaw);
  if (!hidden) return template;
  const hiddenUsageNote = resolveTemplateUsageNote(template);
  return {
    ...template,
    ...(typeof hidden.id === 'string' ? { id: hidden.id } : {}),
    ...(typeof hidden.name === 'string' ? { name: hidden.name } : {}),
    ...(typeof hidden.description === 'string' ? { description: hidden.description } : {}),
    ...(hiddenUsageNote ? { usageNote: hiddenUsageNote } : {}),
    ...(typeof hidden.htmlContent === 'string' ? { htmlContent: hidden.htmlContent } : {}),
    ...(Array.isArray(hidden.variables) ? { variables: hidden.variables } : {})
  };
};

const buildHtmlTemplateContextLines = (template: Pick<HtmlTemplate, 'id' | 'name' | 'description' | 'usageNote' | 'htmlContent' | 'variables' | 'encryptedHiddenRaw'>): string[] => {
  const resolved = resolveTemplateForContext(template);
  const loopMetas = extractTemplateLoopMetas(normalizeText(resolved?.htmlContent));
  const loopFieldMap = new Map(loopMetas.map((item) => [item.listName, item.fields]));
  const loopListNames = new Set(loopMetas.map((item) => item.listName));
  const definedVarNames = new Set((resolved?.variables || []).map((item) => item.name));
  const lines: string[] = [
    `【模板：${normalizeText(resolved?.name)}】(id: ${normalizeText(resolved?.id)})`
  ];

  if (resolved?.description) lines.push(`说明：${resolved.description}`);
  lines.push('变量：');

  (resolved?.variables || []).forEach((variable) => {
    const example = variable.example ? `（例：${variable.example}）` : '';
    const isLoopArray = variable.type === 'array' || loopListNames.has(variable.name);
    if (!isLoopArray) {
      lines.push(`  - ${variable.name}: ${variable.description}${example}`);
      return;
    }
    const fields = loopFieldMap.get(variable.name) || [];
    const fieldHint = fields.length > 0 ? `，字段必须包含：${fields.join('、')}` : '';
    lines.push(`  - ${variable.name}（数组，每项为对象${fieldHint}）: ${variable.description}${example}`);
  });

  loopMetas.forEach((meta) => {
    if (definedVarNames.has(meta.listName)) return;
    const fields = meta.fields || [];
    const fieldHint = fields.length > 0 ? `，字段必须包含：${fields.join('、')}` : '';
    lines.push(`  - ${meta.listName}（数组，每项为对象${fieldHint}）:（模板中检测到循环块，但未在变量定义中列出）`);
  });

  return lines;
};

export const getHtmlTemplateDescriptionChars = (template: Pick<HtmlTemplate, 'description'>): number =>
  countChars(template?.description);

export const getHtmlTemplateUsageNoteChars = (template: Pick<HtmlTemplate, 'usageNote' | 'encryptedHiddenRaw'>): number =>
  countChars(resolveTemplateUsageNote(template));

export const getHtmlTemplateHtmlChars = (template: Pick<HtmlTemplate, 'htmlContent'>): number =>
  countChars(template?.htmlContent);

export const getHtmlTemplateContextChars = (template: Pick<HtmlTemplate, 'id' | 'name' | 'description' | 'usageNote' | 'htmlContent' | 'variables' | 'encryptedHiddenRaw'>): number =>
  buildHtmlTemplateContextLines(template).join('\n').length;

export const buildHtmlTemplateChoiceDescription = (template: Pick<HtmlTemplate, 'id' | 'name' | 'description' | 'usageNote' | 'htmlContent' | 'variables' | 'encryptedHiddenRaw'>): string => {
  const summary = `AI上下文约 ${formatCharCount(getHtmlTemplateContextChars(template))}`;
  const resolved = resolveTemplateForContext(template);
  const description = normalizeText(resolved?.description).trim();
  return description ? `${summary} · ${description}` : summary;
};
