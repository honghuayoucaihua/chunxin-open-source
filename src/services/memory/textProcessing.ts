import type { ContactMemoryEntry } from '../../types/index.ts';

export type MemoryCategory = 'identity' | 'preference' | 'relationship' | 'event' | 'emotion' | 'habit' | 'health' | 'other';

const normalizeText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'bigint') return String(value);
  return '';
};

export const cleanText = (value: string) => (value || '').replace(/\s+/g, ' ').trim();

export const normalizeForDedup = (value: string) =>
  cleanText(value)
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '');

export const memoryCategoryBoost = (category: MemoryCategory) => {
  switch (category) {
    case 'identity':
    case 'relationship':
      return 0.6;
    case 'preference':
    case 'habit':
      return 0.45;
    case 'event':
    case 'emotion':
    case 'health':
      return 0.25;
    default:
      return 0;
  }
};

export const getMemoryCategory = (entry: ContactMemoryEntry): MemoryCategory => {
  const category = normalizeText(entry.category);
  if (
    category === 'identity'
    || category === 'preference'
    || category === 'relationship'
    || category === 'event'
    || category === 'emotion'
    || category === 'habit'
    || category === 'health'
    || category === 'other'
  ) {
    return category;
  }
  return 'other';
};

export const formatDate = (timestamp: number) => {
  const d = new Date(timestamp);
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${m}-${day}`;
};

export const extractJsonArrayFromText = (text: string) => {
  const trimmed = String(text || '').trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    throw new Error('AI 返回必须是完整 JSON 数组');
  }
  const parsed = JSON.parse(trimmed);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('AI 返回的记忆数组为空');
  }
  return parsed as Array<{ text: string; source: string; weight: number; confidence?: number }>;
};
