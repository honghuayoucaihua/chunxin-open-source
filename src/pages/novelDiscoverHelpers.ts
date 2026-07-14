import { isFullAppSnapshotPayload } from '../appStateNormalizeUtils.ts';
import { normalizeGeneratedNonSystemEventText } from '../utils/generatedVisibleText.ts';

export type GeneratedNovel = {
  id: string;
  title: string;
  author: string;
  tags: string[];
  wordCount: string;
  favorites: string;
  rating: string;
  description: string;
};

export type NovelChapter = {
  index: number;
  title: string;
  summary: string;
  goal?: string;
  cliffhanger?: string;
  content?: string;
};

export type NovelStoryBible = {
  premise: string;
  coreConflict: string;
  heroineArc: string;
  relationArc: string;
  worldRules: string[];
  writingStyle: string;
  readerDirectives: string[];
};

export type NovelMeta = {
  intro: string;
  storyBible: NovelStoryBible;
  chapters: NovelChapter[];
};

export type PublishProjectDraft = {
  projectName: string;
  genre: string;
  era: string;
  worldCore: string;
  coreTheme: string;
  protagonist: string;
  keyRoles: string;
  powerRule: string;
  conflictLine: string;
  relationLine: string;
  styleTone: string;
  chapterPlan: string;
  endingDirection: string;
  mustHaveScenes: string;
};

export type ChapterComment = {
  id: string;
  name: string;
  content: string;
  likes: number;
  isUser?: boolean;
};

export type BookshelfEntry = {
  book: GeneratedNovel;
  meta: NovelMeta | null;
  lastReadChapterIndex: number;
  updatedAt: number;
};

export const STORAGE_KEY = 'novel-discover-preference-v2';
const HOME_CACHE_KEY = 'novel-discover-home-cache-v1';
const BOOKSHELF_KEY = 'novel-discover-bookshelf-v1';
export const READER_APPEARANCE_KEY = 'novel-reader-appearance-v1';
export const PAGE_SIZE = 8;
export const CHAPTER_BATCH_SIZE = 10;

const cleanGeneratedNovelInline = (value: unknown): string =>
  normalizeGeneratedNonSystemEventText(value, { collapseWhitespace: true });

const cleanGeneratedNovelBlock = (value: unknown): string =>
  normalizeGeneratedNonSystemEventText(value, { joinWith: '\n' });

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

export type NovelReaderAppearance = {
  background: 'paper' | 'dark' | 'green';
  fontSize: number;
  lineHeight: number;
};

export type NovelPreference = {
  guided: boolean;
  genre: string;
};

export const DEFAULT_READER_APPEARANCE: NovelReaderAppearance = { background: 'paper', fontSize: 16, lineHeight: 2 };

const safeLocalStorageGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeLocalStorageSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 本地缓存不可用时，不能中断已经完成的 AI 生成或恢复流程。
  }
};

export const COPY = {
  searchPlaceholder: '',
  channelTabs: ['推荐', '小说', '经典', '知识', '听书', '看剧', '视频', '漫画'] as const,
  rankTabs: ['推荐榜', '完本榜', '巅峰榜', '口碑榜'] as const,
  bottomTabs: ['书城', '书架', '我的'] as const,
  genres: ['现代言情', '古代言情', '治愈成长', '悬疑言情', '女频', '出版'] as const,
  publishGenres: ['现代言情', '古代言情', '治愈成长', '悬疑言情', '奇幻言情', '都市群像'] as const,
  publishEras: ['当代都市', '古代架空', '近未来都市', '学院时代', '末世重建', '异世界'] as const,
  publishStyles: ['高张力快节奏', '细腻治愈慢热', '悬疑反转驱动', '强剧情群像'] as const,
  publishEndings: ['HE治愈收束', '开放式高余韵', '反转后圆满', '现实向克制'] as const
};

export const getCoverPalette = (title: string): [string, string] => {
  const palettes: Array<[string, string]> = [
    ['#4f46e5', '#7c3aed'],
    ['#be123c', '#f97316'],
    ['#0f766e', '#0ea5e9'],
    ['#ca8a04', '#ef4444'],
    ['#2563eb', '#9333ea'],
    ['#059669', '#3b82f6']
  ];
  let hash = 0;
  for (let index = 0; index < title.length; index += 1) hash = (hash * 31 + title.charCodeAt(index)) >>> 0;
  return palettes[hash % palettes.length];
};

export const getCoverLabel = (title: string): string => {
  const compact = String(title || '').replace(/[，。！？、“”《》【】（）()\s]/g, '');
  return compact.slice(0, 4) || '小说';
};

export const parseMetric = (value: string): number => {
  const matched = String(value || '').match(/(\d+(?:\.\d+)?)/);
  if (!matched) return 0;
  const num = Number(matched[1]);
  if (!Number.isFinite(num)) return 0;
  if (value.includes('亿')) return num * 100000000;
  if (value.includes('万')) return num * 10000;
  return num;
};

export const normalizeNovelList = (raw: unknown, pageSeed: number): GeneratedNovel[] => {
  const parsed = (raw as { books?: unknown[] }) || {};
  const sourceBooks = Array.isArray(parsed.books) ? parsed.books : [];
  const normalized: GeneratedNovel[] = [];
  for (let index = 0; index < sourceBooks.length; index += 1) {
    const item = (sourceBooks[index] || {}) as Record<string, unknown>;
    const title = cleanGeneratedNovelInline(item.title);
    const author = cleanGeneratedNovelInline(item.author);
    const wordCount = cleanGeneratedNovelInline(item.wordCount);
    const favorites = cleanGeneratedNovelInline(item.favorites);
    const rating = cleanGeneratedNovelInline(item.rating);
    const description = cleanGeneratedNovelInline(item.description);
    const tags = Array.isArray(item.tags) ? item.tags.map((tag) => cleanGeneratedNovelInline(tag)).filter(Boolean).slice(0, 3) : [];
    if (!title || !author || !wordCount || !favorites || !rating || !description || tags.length === 0) continue;
    const id = String(item.id || '').trim() || `${Date.now()}-${pageSeed}-${index}-${title}`;
    normalized.push({ id, title, author, tags, wordCount, favorites, rating, description });
  }
  return normalized;
};

export const normalizeMeta = (raw: unknown): NovelMeta => {
  const parsed = (raw as { intro?: unknown; storyBible?: unknown; chapters?: unknown[] }) || {};
  const intro = cleanGeneratedNovelBlock(parsed.intro);
  const storyRow = (parsed.storyBible || {}) as Record<string, unknown>;
  const storyBible: NovelStoryBible = {
    premise: cleanGeneratedNovelInline(storyRow.premise),
    coreConflict: cleanGeneratedNovelInline(storyRow.coreConflict),
    heroineArc: cleanGeneratedNovelInline(storyRow.heroineArc),
    relationArc: cleanGeneratedNovelInline(storyRow.relationArc),
    worldRules: Array.isArray(storyRow.worldRules)
      ? storyRow.worldRules.map((item) => cleanGeneratedNovelInline(item)).filter(Boolean).slice(0, 4)
      : [],
    writingStyle: cleanGeneratedNovelInline(storyRow.writingStyle),
    readerDirectives: Array.isArray(storyRow.readerDirectives)
      ? storyRow.readerDirectives.map((item) => cleanGeneratedNovelInline(item)).filter(Boolean).slice(0, 8)
      : []
  };
  const source = Array.isArray(parsed.chapters) ? parsed.chapters : [];
  const chapters = source
    .map((item, idx) => {
      const chapter = (item || {}) as Record<string, unknown>;
      const title = cleanGeneratedNovelInline(chapter.title);
      const summary = cleanGeneratedNovelInline(chapter.summary);
      const goal = cleanGeneratedNovelInline(chapter.goal);
      const cliffhanger = cleanGeneratedNovelInline(chapter.cliffhanger);
      const content = cleanGeneratedNovelBlock(chapter.content);
      return { index: idx + 1, title, summary, goal, cliffhanger, content: content || undefined };
    })
    .filter((item) => Boolean(item.title && item.summary))
    .slice(0, 200);
  return { intro, storyBible, chapters };
};

export const normalizeAdditionalChapters = (raw: unknown, startIndex: number): NovelChapter[] => {
  const parsed = (raw as { chapters?: unknown[] }) || {};
  const source = Array.isArray(parsed.chapters) ? parsed.chapters : [];
  return source
    .map((item, idx) => {
      const chapter = (item || {}) as Record<string, unknown>;
      const title = cleanGeneratedNovelInline(chapter.title);
      const summary = cleanGeneratedNovelInline(chapter.summary);
      const goal = cleanGeneratedNovelInline(chapter.goal);
      const cliffhanger = cleanGeneratedNovelInline(chapter.cliffhanger);
      return { index: startIndex + idx + 1, title, summary, goal, cliffhanger };
    })
    .filter((item) => Boolean(item.title && item.summary));
};

export const normalizeGeneratedChapterComments = (
  raw: unknown,
  now: number = Date.now(),
  createLikes: () => number = () => Math.floor(Math.random() * 90) + 10
): ChapterComment[] => {
  if (!isRecord(raw) || !Array.isArray(raw.comments)) return [];
  const comments = raw.comments
    .map((item, index) => {
      if (!isRecord(item)) return null;
      const name = cleanGeneratedNovelInline(item.name);
      const content = cleanGeneratedNovelInline(item.content);
      if (!name || !content) return null;
      return { id: `${now}-${index}`, name, content, likes: createLikes() };
    })
    .filter((item): item is ChapterComment => Boolean(item));
  return comments.length >= 3 && comments.length <= 8 ? comments : [];
};

export const normalizeGeneratedChapterCommentReply = (
  raw: unknown,
  now: number = Date.now(),
  createLikes: () => number = () => Math.floor(Math.random() * 40) + 1
): ChapterComment | null => {
  if (!isRecord(raw)) return null;
  const name = cleanGeneratedNovelInline(raw.name);
  const reply = cleanGeneratedNovelInline(raw.reply);
  if (!name || !reply) return null;
  return { id: `${now}-ai`, name, content: reply, likes: createLikes() };
};

export const isUsableGeneratedNovelMeta = (meta: NovelMeta | null | undefined): boolean => {
  return Boolean(
    meta?.intro
    && meta.storyBible.premise
    && meta.storyBible.coreConflict
    && meta.storyBible.heroineArc
    && meta.storyBible.relationArc
    && meta.storyBible.writingStyle
    && meta.storyBible.worldRules.length > 0
    && meta.chapters.length > 0
  );
};

export const loadPreference = (): NovelPreference => {
  try {
    const raw = safeLocalStorageGetItem(STORAGE_KEY);
    if (!raw) return { guided: false, genre: '' };
    const parsed = JSON.parse(raw);
    return { guided: Boolean(parsed?.guided), genre: String(parsed?.genre || '').trim() };
  } catch {
    return { guided: false, genre: '' };
  }
};

export const savePreference = (genre: string): void => {
  safeLocalStorageSetItem(STORAGE_KEY, JSON.stringify({ guided: true, genre }));
};

export const saveNovelPreference = (preference: NovelPreference): void => {
  safeLocalStorageSetItem(STORAGE_KEY, JSON.stringify({
    guided: Boolean(preference.guided),
    genre: String(preference.genre || '').trim()
  }));
};

export const loadHomeCache = (): { genre: string; books: GeneratedNovel[] } => {
  try {
    const raw = safeLocalStorageGetItem(HOME_CACHE_KEY);
    if (!raw) return { genre: '', books: [] };
    const parsed = JSON.parse(raw) as { genre?: unknown; books?: unknown[] };
    return {
      genre: String(parsed.genre || '').trim(),
      books: normalizeNovelList({ books: Array.isArray(parsed.books) ? parsed.books : [] }, 0)
    };
  } catch {
    return { genre: '', books: [] };
  }
};

export const saveHomeCache = (genre: string, books: GeneratedNovel[]): void => {
  safeLocalStorageSetItem(HOME_CACHE_KEY, JSON.stringify({ genre, books }));
};

const normalizeBookshelfEntryRows = (raw: unknown): BookshelfEntry[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = (item || {}) as Record<string, unknown>;
    const book = normalizeNovelList({ books: [row.book] }, 0)[0];
    const meta = row.meta ? normalizeMeta(row.meta || {}) : null;
    if (!book) return null;
    return {
      book,
      meta,
      lastReadChapterIndex: Number(row.lastReadChapterIndex || 0),
      updatedAt: Number(row.updatedAt || Date.now())
    };
  }).filter((item): item is BookshelfEntry => Boolean(item));
};

export const loadBookshelf = (): BookshelfEntry[] => {
  try {
    const raw = safeLocalStorageGetItem(BOOKSHELF_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return normalizeBookshelfEntryRows(parsed);
  } catch {
    return [];
  }
};

export const saveBookshelf = (entries: BookshelfEntry[]): void => {
  safeLocalStorageSetItem(BOOKSHELF_KEY, JSON.stringify(entries));
};

export const normalizeNovelReaderAppearance = (raw: unknown): NovelReaderAppearance => {
  const source = (raw || {}) as Partial<NovelReaderAppearance>;
  return {
    background: source.background === 'dark' || source.background === 'green' ? source.background : DEFAULT_READER_APPEARANCE.background,
    fontSize: Math.min(22, Math.max(14, Number(source.fontSize || DEFAULT_READER_APPEARANCE.fontSize))),
    lineHeight: Math.min(2.6, Math.max(1.6, Number(source.lineHeight || DEFAULT_READER_APPEARANCE.lineHeight)))
  };
};

export const loadReaderAppearance = (): NovelReaderAppearance => {
  try {
    const raw = safeLocalStorageGetItem(READER_APPEARANCE_KEY);
    if (!raw) return DEFAULT_READER_APPEARANCE;
    return normalizeNovelReaderAppearance(JSON.parse(raw));
  } catch {
    return DEFAULT_READER_APPEARANCE;
  }
};

export const saveReaderAppearance = (appearance: NovelReaderAppearance): void => {
  safeLocalStorageSetItem(READER_APPEARANCE_KEY, JSON.stringify(normalizeNovelReaderAppearance(appearance)));
};

export const normalizeBookshelfEntries = (raw: unknown): BookshelfEntry[] => {
  return normalizeBookshelfEntryRows(raw);
};

export const collectNovelPersistedState = (): { novelBookshelf: BookshelfEntry[]; novelReaderAppearance: NovelReaderAppearance; novelPreference: NovelPreference } => ({
  novelBookshelf: loadBookshelf(),
  novelReaderAppearance: loadReaderAppearance(),
  novelPreference: loadPreference()
});

const mergeBookshelfEntries = (existing: BookshelfEntry[], incoming: BookshelfEntry[]): BookshelfEntry[] => {
  const keyOf = (entry: BookshelfEntry) => String(entry.book.id || entry.book.title || '').trim();
  const byKey = new Map<string, BookshelfEntry>();
  existing.forEach((entry) => {
    const key = keyOf(entry);
    if (key) byKey.set(key, entry);
  });
  incoming.forEach((entry) => {
    const key = keyOf(entry);
    if (!key) return;
    const current = byKey.get(key);
    if (!current || Number(entry.updatedAt || 0) >= Number(current.updatedAt || 0)) {
      byKey.set(key, {
        ...entry,
        lastReadChapterIndex: Math.max(Number(current?.lastReadChapterIndex || 0), Number(entry.lastReadChapterIndex || 0)),
        meta: entry.meta || current?.meta || null
      });
    }
  });
  return Array.from(byKey.values()).sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
};

export const applyNovelPersistedState = (data: unknown, mode: 'merge' | 'overwrite'): void => {
  const source = (data || {}) as { novelBookshelf?: unknown; novelReaderAppearance?: unknown; novelPreference?: unknown };
  const hasBookshelf = Object.prototype.hasOwnProperty.call(source, 'novelBookshelf');
  const hasReaderAppearance = Object.prototype.hasOwnProperty.call(source, 'novelReaderAppearance');
  const hasPreference = Object.prototype.hasOwnProperty.call(source, 'novelPreference');
  const isFullSnapshot = isFullAppSnapshotPayload(source);
  if (!hasBookshelf && !hasReaderAppearance && !hasPreference && !isFullSnapshot) return;
  if (hasBookshelf || (mode !== 'merge' && isFullSnapshot)) {
    const incoming = normalizeBookshelfEntries(source.novelBookshelf);
    if (mode === 'merge') {
      saveBookshelf(mergeBookshelfEntries(loadBookshelf(), incoming));
    } else {
      saveBookshelf(incoming);
    }
  }
  if ((hasReaderAppearance && source.novelReaderAppearance && typeof source.novelReaderAppearance === 'object') || (mode !== 'merge' && isFullSnapshot && !hasReaderAppearance)) {
    saveReaderAppearance(normalizeNovelReaderAppearance(source.novelReaderAppearance));
  }
  if ((hasPreference && source.novelPreference && typeof source.novelPreference === 'object') || (mode !== 'merge' && isFullSnapshot && !hasPreference)) {
    const incoming = (source.novelPreference && typeof source.novelPreference === 'object'
      ? source.novelPreference
      : {}) as Partial<NovelPreference>;
    const next = {
      guided: Boolean(incoming.guided),
      genre: String(incoming.genre || '').trim()
    };
    if (mode !== 'merge' || next.guided || next.genre) {
      saveNovelPreference(next);
    }
  }
};

export const upsertBookshelfEntry = (
  current: BookshelfEntry[],
  payload: { book: GeneratedNovel; meta: NovelMeta | null; lastReadChapterIndex?: number }
): BookshelfEntry[] => {
  const existsIndex = current.findIndex((item) => item.book.id === payload.book.id || item.book.title === payload.book.title);
  const baseMeta = payload.meta || null;
  if (existsIndex < 0) {
    const created: BookshelfEntry = {
      book: payload.book,
      meta: baseMeta,
      lastReadChapterIndex: Number(payload.lastReadChapterIndex || 0),
      updatedAt: Date.now()
    };
    return [created, ...current].sort((a, b) => b.updatedAt - a.updatedAt);
  }
  const currentEntry = current[existsIndex];
  const merged: BookshelfEntry = {
    book: payload.book,
    meta: baseMeta || currentEntry.meta,
    lastReadChapterIndex: Math.max(currentEntry.lastReadChapterIndex || 0, Number(payload.lastReadChapterIndex || 0)),
    updatedAt: Date.now()
  };
  const next = current.slice();
  next.splice(existsIndex, 1, merged);
  return next.sort((a, b) => b.updatedAt - a.updatedAt);
};

const appendNovelPromptLine = (lines: string[], label: string, value: unknown): void => {
  const normalized = String(value || '').trim();
  if (!normalized) return;
  lines.push(`${label}${normalized}`);
};

const joinNovelPromptList = (items: string[]): string => items.map((item) => String(item || '').trim()).filter(Boolean).join('；');

export const buildListInstruction = (genre: string, existingTitles: string[]): string => {
  const titleLines = existingTitles.map((title) => String(title || '').trim()).filter(Boolean);
  const lines = [`你是“番茄小说女频编辑”。围绕「${genre}」生成书单。
目标：产出“会被点开”的女频书单，每本书都要有明确冲突和情绪钩子。
要求：
1) 只输出 JSON 对象，不要任何解释文本；
2) books 长度 ${PAGE_SIZE}；
3) 字段：title、author、tags(2-3个)、wordCount、favorites、rating、description；
4) title 必须有平台感，避免模板化词组堆叠，避免与已有书名重复；
5) description 不是空泛介绍，必须落到“人物 + 冲突 + 代价/抉择”，可有一句钩子；
6) 整体风格偏女性向，强调情绪张力、关系推进、成长弧线；
7) 标签需和冲突场景匹配，避免泛标签（如“好看”“精彩”）；`];
  if (titleLines.length > 0) {
    lines.push(`8) 避免以下书名：${titleLines.join('、')}。`);
  }
  lines.push('JSON格式：{"books":[{"title":"","author":"","tags":["",""],"wordCount":"","favorites":"","rating":"","description":""}]}');
  return lines.join('\n');
};

export const buildMetaInstruction = (book: GeneratedNovel): string => `你是小说编辑，请为小说生成阅读页基础信息，只输出 JSON。
小说信息：书名《${book.title}》；作者：${book.author}；标签：${book.tags.join('、')}；简介：${book.description}。
输出格式：{"intro":"简介","storyBible":{"premise":"","coreConflict":"","heroineArc":"","relationArc":"","worldRules":[""],"writingStyle":"","readerDirectives":[""]},"chapters":[{"title":"第1章 标题","summary":"","goal":"","cliffhanger":""}]}
要求：
1) chapters 生成${CHAPTER_BATCH_SIZE}章；
2) 章节结构必须有递进：开场钩子 -> 冲突升级 -> 关系反转 -> 阶段性爆点；
3) 每章 summary 要体现“本章推进了什么”，避免空泛；
4) 至少2章设置章节结尾悬念（钩子）；
5) 女性向风格，重视人物情感与行动逻辑；
6) 同一人物称谓保持一致，时间线连续；
7) storyBible 要可执行，能直接指导后续章节写作。`;

export const buildExpandChaptersInstruction = (meta: NovelMeta, batchSize: number = CHAPTER_BATCH_SIZE): string => {
  const lastChapter = meta.chapters[meta.chapters.length - 1];
  const recentSummary = meta.chapters.slice(-3).map((item) => `第${item.index}章:${item.summary}`).join('；');
  const lines = [
    '你是小说总编剧，请基于现有章节继续生成后续章节规划，只输出 JSON。',
    `当前总章数：${meta.chapters.length}`
  ];
  appendNovelPromptLine(lines, '最近剧情：', recentSummary);
  appendNovelPromptLine(lines, '最后一章：', lastChapter?.title);
  appendNovelPromptLine(lines, '结尾钩子：', lastChapter?.cliffhanger);
  lines.push('全局设定：');
  appendNovelPromptLine(lines, '- premise:', meta.storyBible.premise);
  appendNovelPromptLine(lines, '- coreConflict:', meta.storyBible.coreConflict);
  appendNovelPromptLine(lines, '- heroineArc:', meta.storyBible.heroineArc);
  appendNovelPromptLine(lines, '- relationArc:', meta.storyBible.relationArc);
  appendNovelPromptLine(lines, '- worldRules:', joinNovelPromptList(meta.storyBible.worldRules));
  appendNovelPromptLine(lines, '- writingStyle:', meta.storyBible.writingStyle);
  appendNovelPromptLine(lines, '- readerDirectives:', joinNovelPromptList(meta.storyBible.readerDirectives));
  lines.push(`输出格式：{"chapters":[{"title":"第N章 标题","summary":"","goal":"","cliffhanger":""}]}
要求：
1) 续写后续${batchSize}章；
2) 章序连续推进，不回头重写；
3) 每章都有明确推进与钩子；
4) 与既有剧情和人物称谓保持一致；
5) 仅输出 JSON。`);
  return lines.join('\n');
};

export const buildChapterInstruction = (book: GeneratedNovel, chapter: NovelChapter, meta: NovelMeta, historySummary: string, transientDirectives: string[] = []): string => {
  const lines = [`你是小说作者，请写正文，只输出 JSON。
小说：${book.title}；作者：${book.author}；标签：${book.tags.join('、')}。
全局设定：`];
  appendNovelPromptLine(lines, '- premise: ', meta.storyBible.premise);
  appendNovelPromptLine(lines, '- coreConflict: ', meta.storyBible.coreConflict);
  appendNovelPromptLine(lines, '- heroineArc: ', meta.storyBible.heroineArc);
  appendNovelPromptLine(lines, '- relationArc: ', meta.storyBible.relationArc);
  appendNovelPromptLine(lines, '- worldRules: ', joinNovelPromptList(meta.storyBible.worldRules));
  appendNovelPromptLine(lines, '- writingStyle: ', meta.storyBible.writingStyle);
  appendNovelPromptLine(lines, '- readerDirectives: ', joinNovelPromptList(meta.storyBible.readerDirectives));
  appendNovelPromptLine(lines, '- transientDirectives: ', joinNovelPromptList(transientDirectives));
  lines.push(`章节总览：${meta.chapters.map((item) => `第${item.index}章${item.title}`).join(' / ')}
已发生剧情摘要：${historySummary || '这是开篇章节，需建立人物关系和核心冲突。'}
当前章节：${chapter.title}
本章推进：${chapter.summary}
本章目标：${chapter.goal || '推进关系与冲突'}
本章钩子：${chapter.cliffhanger || '结尾给出新的悬念或情绪转折'}
输出：{"content":"章节正文"}
要求：
1) 字数自由发挥，但内容必须完整、可读、不断章；
2) 女性向叙事，情绪细节与人物动机明确；
3) 开头前20%必须出现可感知的事件或冲突，不能慢热空转；
4) 使用“展示而非讲述”，多用动作、对话、细节推进，少抽象总结；
5) 章内至少有一次关系/信息变化，让读者感到推进；
6) 结尾要有轻悬念或情绪钩子，引导读下一章；
7) 分段自然，对话和叙述交替，避免流水账；
8) 保持与已发生剧情一致，不得改写已确定设定；
9) 不要输出任何解释文本，只输出 JSON。`);
  return lines.join('\n');
};

export const buildPublishProjectInstruction = (draft: PublishProjectDraft): string => {
  const lines = [
    '你是“长篇小说项目主编 + 世界观设计师”，请把用户草案扩展成可持续连载的完整小说项目，只输出 JSON。',
    '用户草案：'
  ];
  appendNovelPromptLine(lines, '- 项目名：', draft.projectName);
  appendNovelPromptLine(lines, '- 题材：', draft.genre);
  appendNovelPromptLine(lines, '- 时代：', draft.era);
  appendNovelPromptLine(lines, '- 世界核心：', draft.worldCore);
  appendNovelPromptLine(lines, '- 核心主题：', draft.coreTheme);
  appendNovelPromptLine(lines, '- 主角设定：', draft.protagonist);
  appendNovelPromptLine(lines, '- 关键角色：', draft.keyRoles);
  appendNovelPromptLine(lines, '- 能力/规则：', draft.powerRule);
  appendNovelPromptLine(lines, '- 主线冲突：', draft.conflictLine);
  appendNovelPromptLine(lines, '- 关系线：', draft.relationLine);
  appendNovelPromptLine(lines, '- 文风节奏：', draft.styleTone);
  appendNovelPromptLine(lines, '- 章节规模：', draft.chapterPlan);
  appendNovelPromptLine(lines, '- 结局倾向：', draft.endingDirection);
  appendNovelPromptLine(lines, '- 必须出现的名场面：', draft.mustHaveScenes);
  lines.push(`输出格式：
{
  "book": {"title":"","author":"","tags":["",""],"wordCount":"","favorites":"","rating":"","description":""},
  "meta": {
    "intro":"",
    "storyBible": {
      "premise":"",
      "coreConflict":"",
      "heroineArc":"",
      "relationArc":"",
      "worldRules":[""],
      "writingStyle":"",
      "readerDirectives":[""]
    },
    "chapters":[{"title":"第1章 标题","summary":"","goal":"","cliffhanger":""}]
  },
  "project": {
    "worldSetting":"",
    "factions":[""],
    "characterCards":[""],
    "mainLineStages":[""],
    "sideLineDesign":[""],
    "longTermHooks":[""]
  }
}

硬性要求：
1) 这是一个“小说项目”，不是短文生成；所有字段要互相一致；
2) 章节数量先给8章可读起步盘，但要在 mainLineStages 里体现更长线推进；
3) 每章都要有明确推进目标与章节钩子；
4) 世界规则可落地，不要空泛设定；
5) 角色关系要形成可持续冲突，不要一章解决；
6) 只输出 JSON，不要解释。`);
  return lines.join('\n');
};

export const buildChapterCommentsInstruction = (title: string, summary: string, excerpt: string): string => {
  const lines = [
    '你是女频小说读者社区运营，请生成章节讨论评论，只输出 JSON。',
    `章节标题：${title}`,
    `章节摘要：${summary}`
  ];
  appendNovelPromptLine(lines, '章节片段：', excerpt);
  lines.push(`输出：{"comments":[{"name":"昵称","content":"评论内容"}]}
要求：
1) 评论条数 3-8 条，由你自由决定；
2) 昵称必须由你原创生成，禁止使用占位符或模板名；
3) 评论内容长度不限制，自由发挥；
4) 评论风格真实自然，可夸、可吐槽、可猜剧情；
5) 仅输出 JSON，不要额外解释。`);
  return lines.join('\n');
};

export const buildCommentReplyInstruction = (title: string, summary: string, userComment: string): string => `你是章节讨论区读者，请回复用户评论，只输出 JSON。
章节：${title}
摘要：${summary}
用户评论：${userComment}
输出：{"name":"昵称","reply":"回复内容"}
要求：
1) 昵称必须由你原创生成；
2) 回复长度不限制，自由发挥；
3) 语气自然，像真实读者互动；
4) 可讨论剧情猜测或情绪共鸣；
5) 仅输出 JSON。`;
