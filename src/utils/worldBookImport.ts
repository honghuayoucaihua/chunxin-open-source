import type { WorldBook, WorldBookEntry } from '../types';

const cleanText = (value: unknown): string => String(value ?? '').trim();

const normalizeImportedWorldBookEntries = (entries: unknown): WorldBookEntry[] | null => {
  if (!Array.isArray(entries)) return null;
  const ids = new Set<string>();
  const normalized = entries
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => {
      const source = entry as Record<string, unknown>;
      const id = cleanText(source.id);
      const text = cleanText(source.text);
      if (!id || !text || ids.has(id)) return null;
      ids.add(id);
      return { id, text };
    })
    .filter(Boolean) as WorldBookEntry[];
  return normalized;
};

export const normalizeImportedWorldBooks = (input: unknown): WorldBook[] => {
  if (!Array.isArray(input)) return [];
  return input
    .filter((book) => book && typeof book === 'object')
    .map((book) => {
      const source = book as Record<string, unknown>;
      const id = cleanText(source.id);
      const name = cleanText(source.name);
      const entries = normalizeImportedWorldBookEntries(source.entries);
      if (!id || !name || typeof source.enabled !== 'boolean' || !entries) return null;
      return {
        ...source,
        id,
        name,
        description: cleanText(source.description),
        enabled: source.enabled,
        entries
      } as WorldBook;
    })
    .filter(Boolean) as WorldBook[];
};
