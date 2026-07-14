import type { GroupRelation } from '../types';

export const sanitizeGroupRelations = (relations: GroupRelation[]) => {
  return relations
    .map((item) => ({
      subjectId: String(item.subjectId || '').trim(),
      objectId: String(item.objectId || '').trim(),
      relation: String(item.relation || '').trim()
    }))
    .filter((item) => item.subjectId && item.objectId)
    .slice(0, 30);
};

export const normalizePositiveLimit = (value: string | number, min = 1) => {
  return Math.max(min, Number(value) || min);
};
