export type TeamNoticePreview = {
  title: string;
  createdAt: number;
};

const normalizeCreatedAt = (raw: unknown): number | null => {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  // 兼容秒级时间戳
  if (n < 1_000_000_000_000) return n * 1000;
  return n;
};

export const pickTeamNoticePreview = (notices: unknown): TeamNoticePreview | null => {
  if (!Array.isArray(notices) || notices.length === 0) return null;
  let best: TeamNoticePreview | null = null;
  for (const item of notices) {
    const title = String((item as any)?.title || '').trim();
    const createdAt = normalizeCreatedAt((item as any)?.createdAt);
    if (!title || createdAt === null) continue;
    if (!best || createdAt > best.createdAt) {
      best = { title, createdAt };
    }
  }
  return best;
};

export const countUnreadTeamNotices = (notices: unknown, lastReadAt: unknown): number => {
  if (!Array.isArray(notices) || notices.length === 0) return 0;
  const normalizedLastReadAt = normalizeCreatedAt(lastReadAt) ?? 0;
  let count = 0;
  for (const item of notices) {
    const createdAt = normalizeCreatedAt((item as any)?.createdAt);
    if (createdAt === null) continue;
    if (createdAt > normalizedLastReadAt) count += 1;
  }
  return count;
};
