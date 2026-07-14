import React from 'react';
import type { AISettings, SubView } from '../types';
import { getGeminiChatReply } from '../services/geminiServiceLoader';
import { captureRuntimeResetEpoch, isRuntimeResetEpochStale } from '../services/runtimeResetGuard.ts';
import { extractStrictJsonObject } from '../utils/chatHelpers';
import { normalizeGeneratedNonSystemEventText } from '../utils/generatedVisibleText.ts';
import {
  leaveBooleanGuard,
  leaveKeyedGuard,
  tryEnterBooleanGuard,
  tryEnterKeyedGuard
} from '../utils/requestGuards.ts';
import { usePullRefresh } from '../moments/hooks/usePullRefresh';
import { NovelMinePanel } from './NovelMinePanel';
import {
  buildChapterCommentsInstruction,
  buildChapterInstruction,
  buildCommentReplyInstruction,
  buildExpandChaptersInstruction,
  buildListInstruction,
  buildMetaInstruction,
  buildPublishProjectInstruction,
  CHAPTER_BATCH_SIZE,
  COPY,
  getCoverPalette,
  loadBookshelf,
  loadPreference,
  loadReaderAppearance,
  isUsableGeneratedNovelMeta,
  normalizeGeneratedChapterCommentReply,
  normalizeGeneratedChapterComments,
  normalizeMeta,
  normalizeNovelList,
  normalizeAdditionalChapters,
  PAGE_SIZE,
  parseMetric,
  DEFAULT_READER_APPEARANCE,
  saveBookshelf,
  savePreference,
  saveReaderAppearance,
  STORAGE_KEY,
  upsertBookshelfEntry,
  type BookshelfEntry,
  type ChapterComment,
  type GeneratedNovel,
  type NovelChapter,
  type NovelMeta,
  type NovelReaderAppearance,
  type PublishProjectDraft
} from './novelDiscoverHelpers';

type NovelDiscoverViewProps = {
  onBack: () => void;
  aiSettings: AISettings;
  showToast?: (message: string) => void;
  subView?: SubView;
  pushSubView?: (sub: SubView) => void;
  goBackSubView?: (source?: 'app' | 'history', steps?: number) => void;
};

const TOP_GENRE_TABS = ['推荐', '穿越', '系统', '现代言情', '都市', '玄幻', '古代言情', '重生', '架空', '东方玄幻', '奇幻仙侠', '打脸', '玄幻脑洞', '科幻末世', '衍生', '都市脑洞'] as const;
type TopGenreTab = (typeof TOP_GENRE_TABS)[number];
const GENRE_BOOKS_CACHE_KEY = 'novel-discover-genre-books-v1';

type ReaderSettingDraft = {
  pace: string;
  conflict: string;
  perspective: string;
  dialogueDensity: string;
  addCharacter: string;
  addSetting: string;
  mustKeep: string;
  avoid: string;
  extra: string;
};

const cleanGeneratedNovelInline = (value: unknown): string =>
  normalizeGeneratedNonSystemEventText(value, { collapseWhitespace: true });

const cleanGeneratedNovelBlock = (value: unknown): string =>
  normalizeGeneratedNonSystemEventText(value, { joinWith: '\n' });

const parseRequiredJsonObject = (raw: string, errorMessage: string): Record<string, unknown> => {
  const parsed = extractStrictJsonObject(raw || '');
  if (!parsed) throw new Error(errorMessage);
  return parsed;
};

const loadGenreBooksCache = (): Record<string, GeneratedNovel[]> => {
  try {
    const raw = localStorage.getItem(GENRE_BOOKS_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next: Record<string, GeneratedNovel[]> = {};
    Object.keys(parsed || {}).forEach((genre) => {
      const rows = Array.isArray(parsed[genre]) ? (parsed[genre] as unknown[]) : [];
      next[genre] = normalizeNovelList({ books: rows }, 0);
    });
    return next;
  } catch {
    return {};
  }
};

const saveGenreBooksCache = (map: Record<string, GeneratedNovel[]>): void => {
  try {
    localStorage.setItem(GENRE_BOOKS_CACHE_KEY, JSON.stringify(map));
  } catch {
    // 缓存失败不影响已经生成出的书单展示。
  }
};

type RankTab = (typeof COPY.rankTabs)[number];
type BottomTab = (typeof COPY.bottomTabs)[number];

const TextCover: React.FC<{ title: string; tall?: boolean }> = ({ title, tall = false }) => {
  const [startColor, endColor] = getCoverPalette(title);
  const plain = String(title || '').replace(/[，。！？、“”《》【】（）()\s]/g, '');
  const maxLen = tall ? 8 : 6;
  const label = plain.length > maxLen ? `${plain.slice(0, maxLen)}…` : (plain || '小说');
  return (
    <div className={`rounded-lg flex items-end ${tall ? 'h-[245px]' : 'h-[74px] w-[54px] flex-shrink-0'}`} style={{ background: `linear-gradient(140deg, ${startColor} 0%, ${endColor} 100%)` }}>
      <div className="p-2 text-white font-semibold leading-tight break-words" style={{ fontSize: tall ? 18 : 11 }}>{label}</div>
    </div>
  );
};

const SkeletonBlock: React.FC<{ h: string }> = ({ h }) => <div className={`bg-[#ececec] rounded-lg animate-pulse ${h}`}></div>;

const GuideLayer: React.FC<{ onPick: (genre: string) => void }> = ({ onPick }) => (
  <div className="absolute inset-0 z-30 flex items-end bg-black/40 p-4">
    <div className="w-full rounded-2xl bg-white p-4">
      <div className="text-[18px] font-semibold text-[#111]">选择你想看的小说类型</div>
      <div className="mt-1 text-[13px] text-[#888]">仅首次出现，后续可手动切换</div>
      <div className="mt-4 grid grid-cols-3 gap-2">{COPY.genres.map((genre) => <button type="button" key={genre} onClick={() => onPick(genre)} className="rounded-lg bg-[#f5f5f5] py-2 text-[14px] text-[#222]">{genre}</button>)}</div>
    </div>
  </div>
);

const PublishLayer: React.FC<{ draft: PublishProjectDraft; setDraft: React.Dispatch<React.SetStateAction<PublishProjectDraft>>; onClose: () => void; onSubmit: () => void; isLoading: boolean }> = ({ draft, setDraft, onClose, onSubmit, isLoading }) => (
  <div className="absolute inset-0 z-30 bg-black/40 p-4 flex items-end">
    <div className="w-full max-h-[86%] overflow-y-auto rounded-2xl bg-white p-4">
      <div className="flex items-center justify-between"><div className="text-[18px] font-semibold">从0创建小说项目</div><button type="button" onClick={onClose}><i className="fa-solid fa-xmark"></i></button></div>
      <div className="mt-1 text-[12px] text-[#888]">先定义世界、角色、主线，再由 AI 生成完整可连载项目</div>
      <div className="mt-3 space-y-3 text-[13px]">
        <InputRow title="项目名" value={draft.projectName} placeholder="例如：雾港遗书" onChange={(value) => setDraft((prev) => ({ ...prev, projectName: value }))} />
        <OptionRow title="题材" options={COPY.publishGenres} value={draft.genre} onPick={(value) => setDraft((prev) => ({ ...prev, genre: value }))} />
        <OptionRow title="时代背景" options={COPY.publishEras} value={draft.era} onPick={(value) => setDraft((prev) => ({ ...prev, era: value }))} />
        <InputRow title="世界核心" value={draft.worldCore} placeholder="这个世界最特别、最残酷或最迷人的规则" onChange={(value) => setDraft((prev) => ({ ...prev, worldCore: value }))} multiline />
        <InputRow title="核心主题" value={draft.coreTheme} placeholder="例如：爱与控制、自由与代价" onChange={(value) => setDraft((prev) => ({ ...prev, coreTheme: value }))} />
        <InputRow title="主角设定" value={draft.protagonist} placeholder="身份、执念、弱点、秘密" onChange={(value) => setDraft((prev) => ({ ...prev, protagonist: value }))} multiline />
        <InputRow title="关键角色" value={draft.keyRoles} placeholder="反派、盟友、导师、情感对象" onChange={(value) => setDraft((prev) => ({ ...prev, keyRoles: value }))} multiline />
        <InputRow title="能力/规则系统" value={draft.powerRule} placeholder="例如：契约代价、门派禁律、科技限制" onChange={(value) => setDraft((prev) => ({ ...prev, powerRule: value }))} multiline />
        <InputRow title="主线冲突" value={draft.conflictLine} placeholder="谁和谁冲突，代价是什么" onChange={(value) => setDraft((prev) => ({ ...prev, conflictLine: value }))} multiline />
        <InputRow title="关系线设计" value={draft.relationLine} placeholder="感情线/亲情线/同盟线如何推进" onChange={(value) => setDraft((prev) => ({ ...prev, relationLine: value }))} multiline />
        <OptionRow title="文风节奏" options={COPY.publishStyles} value={draft.styleTone} onPick={(value) => setDraft((prev) => ({ ...prev, styleTone: value }))} />
        <InputRow title="章节规模" value={draft.chapterPlan} placeholder="例如：第一季30章，三季完结" onChange={(value) => setDraft((prev) => ({ ...prev, chapterPlan: value }))} />
        <OptionRow title="结局倾向" options={COPY.publishEndings} value={draft.endingDirection} onPick={(value) => setDraft((prev) => ({ ...prev, endingDirection: value }))} />
        <InputRow title="名场面要求" value={draft.mustHaveScenes} placeholder="必须出现的高光桥段" onChange={(value) => setDraft((prev) => ({ ...prev, mustHaveScenes: value }))} multiline />
      </div>
      <button type="button" onClick={onSubmit} disabled={isLoading} className="mt-4 w-full rounded-xl bg-[#ff7a30] py-2.5 text-white text-[14px] font-semibold disabled:opacity-60">{isLoading ? '正在构建小说项目...' : 'AI 构建完整小说项目'}</button>
    </div>
  </div>
);

const OptionRow: React.FC<{ title: string; options: readonly string[]; value: string; onPick: (value: string) => void }> = ({ title, options, value, onPick }) => (
  <div>
    <div className="text-[#666] mb-1">{title}</div>
    <div className="flex flex-wrap gap-2">{options.map((option) => <button key={option} type="button" onClick={() => onPick(option)} className={`rounded-lg px-3 py-1.5 ${value === option ? 'bg-[#ffefe5] text-[#ff7a30]' : 'bg-[#f3f3f3] text-[#666]'}`}>{option}</button>)}</div>
  </div>
);

const InputRow: React.FC<{ title: string; value: string; placeholder: string; onChange: (value: string) => void; multiline?: boolean }> = ({ title, value, placeholder, onChange, multiline }) => (
  <div>
    <div className="text-[#666] mb-1">{title}</div>
    {multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} className="w-full min-h-[72px] rounded-lg bg-[#f6f6f6] px-3 py-2 text-[13px] outline-none" placeholder={placeholder} /> : <input value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-lg bg-[#f6f6f6] px-3 text-[13px] outline-none" placeholder={placeholder} />}
  </div>
);

const parseReaderDraft = (directives: string[]): ReaderSettingDraft => {
  const pick = (prefix: string): string => directives.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() || '';
  return {
    pace: pick('节奏:') || '正常推进',
    conflict: pick('冲突强度:') || '中强度冲突',
    perspective: pick('叙事视角:') || '第三人称贴近',
    dialogueDensity: pick('对话密度:') || '平衡',
    addCharacter: pick('新增人物:'),
    addSetting: pick('新增设定:'),
    mustKeep: pick('必须保留:'),
    avoid: pick('避免元素:'),
    extra: pick('额外要求:')
  };
};

const buildReaderDirectives = (draft: ReaderSettingDraft): string[] => {
  const list = [
    `节奏:${draft.pace || '正常推进'}`,
    `冲突强度:${draft.conflict || '中强度冲突'}`,
    `叙事视角:${draft.perspective || '第三人称贴近'}`,
    `对话密度:${draft.dialogueDensity || '平衡'}`,
    draft.addCharacter.trim() ? `新增人物:${draft.addCharacter.trim()}` : '',
    draft.addSetting.trim() ? `新增设定:${draft.addSetting.trim()}` : '',
    draft.mustKeep.trim() ? `必须保留:${draft.mustKeep.trim()}` : '',
    draft.avoid.trim() ? `避免元素:${draft.avoid.trim()}` : '',
    draft.extra.trim() ? `额外要求:${draft.extra.trim()}` : ''
  ];
  return list.filter(Boolean);
};

export const NovelDiscoverView: React.FC<NovelDiscoverViewProps> = ({ onBack, aiSettings, showToast, subView, pushSubView, goBackSubView }) => {
  const [selectedGenre, setSelectedGenre] = React.useState('');
  const [showGuide, setShowGuide] = React.useState(false);
  const [showPublish, setShowPublish] = React.useState(false);
  const [books, setBooks] = React.useState<GeneratedNovel[]>([]);
  const [activeChannel, setActiveChannel] = React.useState<TopGenreTab>('推荐');
  const [activeRankTab, setActiveRankTab] = React.useState<RankTab>(COPY.rankTabs[0]);
  const [activeBottomTab, setActiveBottomTab] = React.useState<BottomTab>(COPY.bottomTabs[0]);
  const [detailBook, setDetailBook] = React.useState<GeneratedNovel | null>(null);
  const [detailMeta, setDetailMeta] = React.useState<NovelMeta | null>(null);
  const [detailFromTab, setDetailFromTab] = React.useState<BottomTab>('书城');
  const [resumeChapterIndex, setResumeChapterIndex] = React.useState(0);
  const [chapterReading, setChapterReading] = React.useState<NovelChapter | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isLoadingMeta, setIsLoadingMeta] = React.useState(false);
  const [isLoadingChapter, setIsLoadingChapter] = React.useState(false);
  const [isLoadingMoreChapters, setIsLoadingMoreChapters] = React.useState(false);
  const [isPrimingFirstChapter, setIsPrimingFirstChapter] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [showComments, setShowComments] = React.useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = React.useState(false);
  const [showChapterSettings, setShowChapterSettings] = React.useState(false);
  const [isLoadingComments, setIsLoadingComments] = React.useState(false);
  const [isSendingComment, setIsSendingComment] = React.useState(false);
  const [commentInput, setCommentInput] = React.useState('');
  const [globalReaderDraft, setGlobalReaderDraft] = React.useState<ReaderSettingDraft>({
    pace: '正常推进',
    conflict: '中强度冲突',
    perspective: '第三人称贴近',
    dialogueDensity: '平衡',
    addCharacter: '',
    addSetting: '',
    mustKeep: '',
    avoid: '',
    extra: ''
  });
  const [chapterReaderDraft, setChapterReaderDraft] = React.useState<ReaderSettingDraft>({
    pace: '正常推进',
    conflict: '中强度冲突',
    perspective: '第三人称贴近',
    dialogueDensity: '平衡',
    addCharacter: '',
    addSetting: '',
    mustKeep: '',
    avoid: '',
    extra: ''
  });
  const [chapterComments, setChapterComments] = React.useState<Record<string, ChapterComment[]>>({});
  const [bookshelf, setBookshelf] = React.useState<BookshelfEntry[]>([]);
  const [genreBooksMap, setGenreBooksMap] = React.useState<Record<string, GeneratedNovel[]>>({});
  const [readerAppearance, setReaderAppearance] = React.useState<NovelReaderAppearance>(DEFAULT_READER_APPEARANCE);
  const [publishDraft, setPublishDraft] = React.useState<PublishProjectDraft>({
    projectName: '',
    genre: COPY.publishGenres[0],
    era: COPY.publishEras[0],
    worldCore: '',
    coreTheme: '',
    protagonist: '',
    keyRoles: '',
    powerRule: '',
    conflictLine: '',
    relationLine: '',
    styleTone: COPY.publishStyles[0],
    chapterPlan: '第一季30章，可扩展连载',
    endingDirection: COPY.publishEndings[0],
    mustHaveScenes: ''
  });
  const [errorMessage, setErrorMessage] = React.useState('');
  const initializedRef = React.useRef(false);
  const generatingRef = React.useRef(false);
  const chapterGeneratingRef = React.useRef(new Set<string>());
  const moreChaptersGeneratingRef = React.useRef(false);
  const detailGeneratingRef = React.useRef(new Set<string>());
  const commentsGeneratingRef = React.useRef(new Set<string>());
  const commentReplyGeneratingRef = React.useRef(false);
  const publishingRef = React.useRef(false);
  const runtimeResetEpochRef = React.useRef(captureRuntimeResetEpoch());

  const wrappedGoBack = React.useCallback((source?: 'app' | 'history', steps?: number) => {
    if (showComments) { setShowComments(false); return; }
    if (showGlobalSettings) { setShowGlobalSettings(false); return; }
    if (showChapterSettings) { setShowChapterSettings(false); return; }
    if (showGuide) { setShowGuide(false); return; }
    if (showPublish) { setShowPublish(false); return; }
    if (goBackSubView) { goBackSubView(source, steps); return; }
    onBack();
  }, [showComments, showGlobalSettings, showChapterSettings, showGuide, showPublish, goBackSubView, onBack]);

  const captureActiveRuntimeEpoch = React.useCallback(() => {
    const epoch = captureRuntimeResetEpoch();
    runtimeResetEpochRef.current = epoch;
    return epoch;
  }, []);

  const isActiveRuntimeEpochStale = React.useCallback((epoch: number): boolean => {
    if (isRuntimeResetEpochStale(epoch)) return true;
    return runtimeResetEpochRef.current !== epoch;
  }, []);

  React.useEffect(() => {
    runtimeResetEpochRef.current = captureRuntimeResetEpoch();
  });

  const getChapterKey = (bookId: string, chapterIndex: number): string => `${bookId}-${chapterIndex}`;
  const upsertShelf = React.useCallback((book: GeneratedNovel, meta: NovelMeta | null, lastReadChapterIndex: number) => {
    setBookshelf((prev) => {
      const next = upsertBookshelfEntry(prev, { book, meta, lastReadChapterIndex });
      saveBookshelf(next);
      return next;
    });
  }, []);

  const removeShelfBook = (bookId: string) => {
    setBookshelf((prev) => {
      const next = prev.filter((item) => item.book.id !== bookId);
      saveBookshelf(next);
      return next;
    });
  };
  const parseComments = (raw: string): ChapterComment[] => {
    const parsed = parseRequiredJsonObject(raw, '章评生成格式无效，请重试');
    const comments = normalizeGeneratedChapterComments(parsed);
    if (comments.length === 0) throw new Error('章评生成格式无效，请重试');
    return comments;
  };

  const buildHistorySummary = (meta: NovelMeta, targetIndex: number): string => {
    const previous = meta.chapters.filter((item) => item.index < targetIndex);
    if (previous.length === 0) return '';
    const recent = previous.slice(Math.max(0, previous.length - 3));
    return recent
      .map((item) => {
        const contentSnippet = String(item.content || '').replace(/\s+/g, ' ').slice(0, 120);
        const summary = item.summary || '';
        return `第${item.index}章：${summary}${contentSnippet ? `；正文要点：${contentSnippet}` : ''}`;
      })
      .join(' | ');
  };

  const fetchBooks = React.useCallback(async (genre: string, mode: 'replace' | 'append') => {
    if (!genre || generatingRef.current) return;
    const runtimeEpoch = captureActiveRuntimeEpoch();
    generatingRef.current = true;
    mode === 'replace' ? setIsLoadingInitial(true) : setIsLoadingMore(true);
    try {
      const baseBooks = genreBooksMap[genre] || [];
      const raw = await getGeminiChatReply([{ role: 'user', text: `请生成${genre}类型小说书单` }], buildListInstruction(genre, baseBooks.map((book) => book.title)), aiSettings);
      if (isActiveRuntimeEpochStale(runtimeEpoch)) return;
      const nextBooks = normalizeNovelList(parseRequiredJsonObject(raw, '书单生成格式无效，请重试'), mode === 'append' ? books.length : 0);
      if (nextBooks.length < PAGE_SIZE) throw new Error('生成结果不足，请重试');
      const mergedBooks = mode === 'append' ? [...baseBooks, ...nextBooks] : nextBooks;
      setGenreBooksMap((prev) => ({ ...prev, [genre]: mergedBooks }));
      if (selectedGenre === genre) setBooks(mergedBooks);
    } catch (error: any) {
      const message = error?.message || '生成失败，请稍后重试';
      setErrorMessage(message);
      showToast?.(message);
    } finally {
      if (!isActiveRuntimeEpochStale(runtimeEpoch)) {
        setIsLoadingInitial(false);
        setIsLoadingMore(false);
      }
      generatingRef.current = false;
    }
  }, [aiSettings, books.length, captureActiveRuntimeEpoch, genreBooksMap, isActiveRuntimeEpochStale, selectedGenre, showToast]);

  React.useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    setBookshelf(loadBookshelf());
    const cachedMap = loadGenreBooksCache();
    setGenreBooksMap(cachedMap);
    const pref = loadPreference();
    if (!pref.guided) {
      setShowGuide(true);
      return;
    }
    const genre = pref.genre || '现代言情';
    setSelectedGenre(genre);
    if (cachedMap[genre]?.length) {
      setBooks(cachedMap[genre]);
      return;
    }
    void fetchBooks(genre, 'replace');
  }, [fetchBooks]);

  React.useEffect(() => {
    saveGenreBooksCache(genreBooksMap);
  }, [genreBooksMap]);

  React.useEffect(() => {
    setReaderAppearance(loadReaderAppearance());
  }, []);

  React.useEffect(() => {
    saveReaderAppearance(readerAppearance);
  }, [readerAppearance]);

  const pullRefresh = usePullRefresh({
    onRefresh: async () => {
      if (activeBottomTab !== '书城' || !selectedGenre) return;
      await fetchBooks(selectedGenre, 'replace');
    }
  });

  React.useEffect(() => {
    const listEl = pullRefresh.scrollRef.current;
    if (!listEl || !selectedGenre || activeBottomTab !== '书城') return;
    const onScroll = () => {
      if (generatingRef.current || isLoadingInitial || isLoadingMore) return;
      if (listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight < 240) void fetchBooks(selectedGenre, 'append');
    };
    listEl.addEventListener('scroll', onScroll, { passive: true });
    return () => listEl.removeEventListener('scroll', onScroll);
  }, [activeBottomTab, fetchBooks, isLoadingInitial, isLoadingMore, pullRefresh.scrollRef, selectedGenre]);

  const rankingBooks = React.useMemo(() => {
    const copied = books.slice();
    if (activeRankTab === '完本榜') return copied.sort((a, b) => parseMetric(b.wordCount) - parseMetric(a.wordCount)).slice(0, 8);
    if (activeRankTab === '巅峰榜') return copied.sort((a, b) => parseMetric(b.favorites) - parseMetric(a.favorites)).slice(0, 8);
    if (activeRankTab === '口碑榜') return copied.sort((a, b) => parseMetric(b.rating) - parseMetric(a.rating)).slice(0, 8);
    return copied.slice(0, 8);
  }, [activeRankTab, books]);

  const pickGenre = (genre: string) => {
    setActiveBottomTab('书城');
    setSelectedGenre(genre);
    savePreference(genre);
    setShowGuide(false);
    const cached = genreBooksMap[genre] || [];
    if (cached.length > 0) {
      setBooks(cached);
      return;
    }
    void fetchBooks(genre, 'replace');
  };

  const generateChapterContent = React.useCallback(async (book: GeneratedNovel, chapter: NovelChapter, silent: boolean, metaSource?: NovelMeta | null, transientDirectives: string[] = [], persistReadProgress = true): Promise<NovelChapter | null> => {
    const key = `${book.id}-${chapter.index}`;
    if (!tryEnterKeyedGuard(chapterGeneratingRef.current, key)) return null;
    const runtimeEpoch = captureActiveRuntimeEpoch();
    if (!silent) setIsLoadingChapter(true);
    try {
      const sourceMeta = metaSource || detailMeta;
      if (!sourceMeta) throw new Error('章节上下文缺失，无法生成连贯正文');
      const historySummary = buildHistorySummary(sourceMeta, chapter.index);
      const raw = await getGeminiChatReply(
        [{ role: 'user', text: `请写《${book.title}》${chapter.title}` }],
        buildChapterInstruction(book, chapter, sourceMeta, historySummary, transientDirectives),
        aiSettings
      );
      if (isActiveRuntimeEpochStale(runtimeEpoch)) return null;
      const parsed = parseRequiredJsonObject(raw, '章节正文生成格式无效，请重试');
      const content = cleanGeneratedNovelBlock(parsed.content);
      if (!content) throw new Error('章节正文为空，请重试');
      const next = { ...chapter, content };
      const updatedMeta = { ...sourceMeta, chapters: sourceMeta.chapters.map((item) => (item.index === chapter.index ? next : item)) };
      setDetailMeta(updatedMeta);
      upsertShelf(book, updatedMeta, persistReadProgress ? chapter.index : 0);
      return next;
    } catch (error: any) {
      if (!silent) showToast?.(error?.message || '章节加载失败');
      return null;
    } finally {
      leaveKeyedGuard(chapterGeneratingRef.current, key);
      if (!silent && !isActiveRuntimeEpochStale(runtimeEpoch)) setIsLoadingChapter(false);
    }
  }, [aiSettings, captureActiveRuntimeEpoch, detailMeta, isActiveRuntimeEpochStale, showToast, upsertShelf]);

  const generateMoreChapters = React.useCallback(async (book: GeneratedNovel, meta: NovelMeta, silent: boolean = false): Promise<NovelMeta | null> => {
    if (isLoadingMoreChapters || !tryEnterBooleanGuard(moreChaptersGeneratingRef)) return null;
    const runtimeEpoch = captureActiveRuntimeEpoch();
    setIsLoadingMoreChapters(true);
    try {
      const raw = await getGeminiChatReply(
        [{ role: 'user', text: `请继续生成《${book.title}》后续章节` }],
        buildExpandChaptersInstruction(meta, CHAPTER_BATCH_SIZE),
        aiSettings
      );
      if (isActiveRuntimeEpochStale(runtimeEpoch)) return null;
      const parsed = parseRequiredJsonObject(raw, '后续章节生成格式无效，请重试');
      const additions = normalizeAdditionalChapters(parsed, meta.chapters.length);
      if (additions.length < CHAPTER_BATCH_SIZE) throw new Error('后续章节生成不足，请重试');
      const nextMeta: NovelMeta = { ...meta, chapters: [...meta.chapters, ...additions] };
      setDetailMeta(nextMeta);
      upsertShelf(book, nextMeta, resumeChapterIndex);
      if (!silent) showToast?.(`已续写后续${CHAPTER_BATCH_SIZE}章`);
      return nextMeta;
    } catch (error: any) {
      if (!silent) showToast?.(error?.message || '续写章节失败');
      return null;
    } finally {
      leaveBooleanGuard(moreChaptersGeneratingRef);
      if (!isActiveRuntimeEpochStale(runtimeEpoch)) setIsLoadingMoreChapters(false);
    }
  }, [aiSettings, captureActiveRuntimeEpoch, isActiveRuntimeEpochStale, isLoadingMoreChapters, resumeChapterIndex, showToast, upsertShelf]);

  const preloadNextChapter = React.useCallback(async (book: GeneratedNovel, chapterIndex: number, metaSource?: NovelMeta | null) => {
    let workingMeta = metaSource || detailMeta;
    if (!workingMeta) return;

    const remaining = workingMeta.chapters.length - chapterIndex;
    if (remaining <= 2) {
      const expanded = await generateMoreChapters(book, workingMeta, true);
      if (expanded) workingMeta = expanded;
    }

    const targets = [chapterIndex + 1, chapterIndex + 2];
    for (let idx = 0; idx < targets.length; idx += 1) {
      const targetIndex = targets[idx];
      const target = workingMeta.chapters.find((item) => item.index === targetIndex);
      if (!target || target.content) continue;
      const generated = await generateChapterContent(book, target, true, workingMeta, [], false);
      if (!generated) continue;
      workingMeta = {
        ...workingMeta,
        chapters: workingMeta.chapters.map((item) => (item.index === generated.index ? generated : item))
      };
    }
  }, [detailMeta, generateChapterContent, generateMoreChapters]);

  const openDetail = async (book: GeneratedNovel) => {
    const detailKey = book.id || book.title;
    if (!tryEnterKeyedGuard(detailGeneratingRef.current, detailKey)) return;
    try {
    setDetailFromTab(activeBottomTab);
    const shelfHit = bookshelf.find((item) => item.book.id === book.id || item.book.title === book.title) || null;
    setDetailBook(book);
    setDetailMeta(shelfHit?.meta || null);
    setResumeChapterIndex(Math.max(0, Number(shelfHit?.lastReadChapterIndex || 0)));
    setGlobalReaderDraft(parseReaderDraft(shelfHit?.meta?.storyBible.readerDirectives || []));
    setChapterReaderDraft(parseReaderDraft(shelfHit?.meta?.storyBible.readerDirectives || []));
    setChapterReading(null);
    pushSubView?.('novelDetail');
    setIsLoadingMeta(!shelfHit?.meta);
    setIsPrimingFirstChapter(Boolean(shelfHit?.meta && !shelfHit.meta.chapters[0]?.content));
    if (shelfHit?.meta) {
      const firstCached = shelfHit.meta.chapters[0];
      if (firstCached && !firstCached.content) {
        const generated = await generateChapterContent(book, firstCached, true, shelfHit.meta, [], false);
        if (generated) preloadNextChapter(book, firstCached.index, { ...shelfHit.meta, chapters: shelfHit.meta.chapters.map((item) => (item.index === firstCached.index ? generated : item)) });
      }
      setIsPrimingFirstChapter(false);
      return;
    }
    setIsPrimingFirstChapter(true);
    try {
      const raw = await getGeminiChatReply([{ role: 'user', text: `请生成《${book.title}》阅读目录` }], buildMetaInstruction(book), aiSettings);
      const parsedMeta = normalizeMeta(parseRequiredJsonObject(raw, '阅读目录生成格式无效，请重试'));
      if (!isUsableGeneratedNovelMeta(parsedMeta)) throw new Error('阅读目录生成格式无效，请重试');
      setDetailMeta(parsedMeta);
      setGlobalReaderDraft(parseReaderDraft(parsedMeta.storyBible.readerDirectives || []));
      setChapterReaderDraft(parseReaderDraft(parsedMeta.storyBible.readerDirectives || []));
      upsertShelf(book, parsedMeta, 0);
      const first = parsedMeta.chapters[0];
      if (first) {
        await generateChapterContent(book, first, true, parsedMeta, [], false);
        preloadNextChapter(book, first.index, parsedMeta);
      }
    } catch (error: any) {
      showToast?.(error?.message || '加载详情失败');
    } finally {
      setIsLoadingMeta(false);
      setIsPrimingFirstChapter(false);
    }
    } finally {
      leaveKeyedGuard(detailGeneratingRef.current, detailKey);
    }
  };

  const openChapter = async (chapter: NovelChapter) => {
    if (!detailBook || !detailMeta) return;
    setShowComments(false);
    const shouldPush = subView === 'novelDetail';
    const cached = detailMeta.chapters.find((item) => item.index === chapter.index);
    if (cached?.content) {
      setChapterReading(cached);
      if (shouldPush) pushSubView?.('novelReader');
      setResumeChapterIndex(cached.index);
      upsertShelf(detailBook, detailMeta, cached.index);
      preloadNextChapter(detailBook, cached.index);
      return;
    }
    const generated = await generateChapterContent(detailBook, chapter, false, detailMeta);
    if (!generated) return;
    setChapterReading(generated);
    if (shouldPush) pushSubView?.('novelReader');
    setResumeChapterIndex(generated.index);
    preloadNextChapter(detailBook, generated.index);
  };

  const startReading = async () => {
    if (!detailBook || !detailMeta || detailMeta.chapters.length === 0) return;
    const targetIndex = resumeChapterIndex > 0 ? resumeChapterIndex : 1;
    const target = detailMeta.chapters.find((item) => item.index === targetIndex) || detailMeta.chapters[0];
    if (!target) return;
    if (target.content) {
      setChapterReading(target);
      pushSubView?.('novelReader');
      setResumeChapterIndex(target.index);
      upsertShelf(detailBook, detailMeta, target.index);
      preloadNextChapter(detailBook, target.index);
      return;
    }
    const generated = await generateChapterContent(detailBook, target, false, detailMeta);
    if (!generated) return;
    setChapterReading(generated);
    pushSubView?.('novelReader');
    setResumeChapterIndex(generated.index);
    preloadNextChapter(detailBook, generated.index);
  };

  const ensureChapterComments = React.useCallback(async (book: GeneratedNovel, chapter: NovelChapter) => {
    const key = getChapterKey(book.id, chapter.index);
    if (chapterComments[key]?.length) return;
    if (!tryEnterKeyedGuard(commentsGeneratingRef.current, key)) return;
    const runtimeEpoch = captureActiveRuntimeEpoch();
    setIsLoadingComments(true);
    try {
      const excerpt = String((chapter.content || '').slice(0, 160));
      const prompt = buildChapterCommentsInstruction(chapter.title, chapter.summary, excerpt);
      const raw = await getGeminiChatReply([{ role: 'user', text: `请生成《${book.title}》${chapter.title}章评` }], prompt, aiSettings);
      if (isActiveRuntimeEpochStale(runtimeEpoch)) return;
      const comments = parseComments(raw);
      setChapterComments((prev) => ({ ...prev, [key]: comments }));
    } catch (error: any) {
      showToast?.(error?.message || '章评加载失败');
    } finally {
      leaveKeyedGuard(commentsGeneratingRef.current, key);
      if (!isActiveRuntimeEpochStale(runtimeEpoch)) setIsLoadingComments(false);
    }
  }, [aiSettings, captureActiveRuntimeEpoch, chapterComments, isActiveRuntimeEpochStale, showToast]);

  const openComments = async () => {
    if (!detailBook || !chapterReading) return;
    setShowComments(true);
    await ensureChapterComments(detailBook, chapterReading);
  };

  const submitComment = async () => {
    if (!detailBook || !chapterReading) return;
    const text = commentInput.trim();
    if (!text) return;
    if (!tryEnterBooleanGuard(commentReplyGeneratingRef)) return;
    const runtimeEpoch = captureActiveRuntimeEpoch();
    const key = getChapterKey(detailBook.id, chapterReading.index);
    const userComment: ChapterComment = { id: `${Date.now()}-me`, name: '我', content: text, likes: 0, isUser: true };
    setChapterComments((prev) => ({ ...prev, [key]: [...(prev[key] || []), userComment] }));
    setCommentInput('');
    setIsSendingComment(true);
    try {
      const raw = await getGeminiChatReply(
        [{ role: 'user', text: `请回复读者评论：${text}` }],
        buildCommentReplyInstruction(chapterReading.title, chapterReading.summary, text),
        aiSettings
      );
      if (isActiveRuntimeEpochStale(runtimeEpoch)) return;
      const parsed = parseRequiredJsonObject(raw, '互动回复生成格式无效，请重试');
      const aiComment = normalizeGeneratedChapterCommentReply(parsed);
      if (!aiComment) throw new Error('互动回复生成格式无效，请重试');
      setChapterComments((prev) => ({ ...prev, [key]: [...(prev[key] || []), aiComment] }));
    } catch (error: any) {
      showToast?.(error?.message || '互动回复失败');
    } finally {
      leaveBooleanGuard(commentReplyGeneratingRef);
      if (!isActiveRuntimeEpochStale(runtimeEpoch)) setIsSendingComment(false);
    }
  };

  const likeComment = (commentId: string) => {
    if (!detailBook || !chapterReading) return;
    const key = getChapterKey(detailBook.id, chapterReading.index);
    setChapterComments((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((comment) => (comment.id === commentId ? { ...comment, likes: comment.likes + 1 } : comment))
    }));
  };

  const saveGlobalSettings = () => {
    if (!detailBook || !detailMeta) return;
    const directives = buildReaderDirectives(globalReaderDraft);
    const nextMeta: NovelMeta = {
      ...detailMeta,
      storyBible: {
        ...detailMeta.storyBible,
        readerDirectives: directives
      }
    };
    setDetailMeta(nextMeta);
    setChapterReaderDraft(parseReaderDraft(directives));
    upsertShelf(detailBook, nextMeta, chapterReading?.index || detailMeta.chapters[0]?.index || 0);
    setShowGlobalSettings(false);
    showToast?.('全局设定已应用');
  };

  const openGlobalSettings = () => {
    if (detailMeta) setGlobalReaderDraft(parseReaderDraft(detailMeta.storyBible.readerDirectives || []));
    setShowGlobalSettings(true);
  };

  const openChapterSettings = () => {
    const source = detailMeta?.storyBible.readerDirectives || [];
    setChapterReaderDraft(parseReaderDraft(source));
    setShowChapterSettings(true);
  };

  const generateNextChapterWithSettings = async () => {
    if (!detailBook || !detailMeta || !chapterReading) return;
    const nextChapter = detailMeta.chapters.find((item) => item.index === chapterReading.index + 1);
    if (!nextChapter) {
      showToast?.('已是最后一章');
      return;
    }
    setShowChapterSettings(false);
    const transientDirectives = buildReaderDirectives(chapterReaderDraft);
    if (nextChapter.content) {
      setChapterReading(nextChapter);
      preloadNextChapter(detailBook, nextChapter.index, detailMeta);
      return;
    }
    const generated = await generateChapterContent(detailBook, nextChapter, false, detailMeta, transientDirectives);
    if (!generated) return;
    setChapterReading(generated);
    preloadNextChapter(detailBook, generated.index, detailMeta);
  };

  const openNextChapter = async () => {
    if (!detailBook || !detailMeta || !chapterReading) return;
    const nextChapter = detailMeta.chapters.find((item) => item.index === chapterReading.index + 1);
    if (nextChapter) {
      await openChapter(nextChapter);
      return;
    }
    const nextMeta = await generateMoreChapters(detailBook, detailMeta);
    if (!nextMeta) return;
    const createdNext = nextMeta.chapters.find((item) => item.index === chapterReading.index + 1);
    if (!createdNext) return;
    if (createdNext.content) {
      setChapterReading(createdNext);
      setResumeChapterIndex(createdNext.index);
      upsertShelf(detailBook, nextMeta, createdNext.index);
      preloadNextChapter(detailBook, createdNext.index, nextMeta);
      return;
    }
    const generated = await generateChapterContent(detailBook, createdNext, false, nextMeta);
    if (!generated) return;
    setChapterReading(generated);
    setResumeChapterIndex(generated.index);
    preloadNextChapter(detailBook, generated.index, nextMeta);
  };

  const publishNovel = async () => {
    if (!tryEnterBooleanGuard(publishingRef)) return;
    const runtimeEpoch = captureActiveRuntimeEpoch();
    setIsPublishing(true);
    try {
      const raw = await getGeminiChatReply([{ role: 'user', text: '请构建完整小说项目' }], buildPublishProjectInstruction(publishDraft), aiSettings);
      if (isActiveRuntimeEpochStale(runtimeEpoch)) return;
      const parsed = parseRequiredJsonObject(raw, '小说项目生成格式无效，请重试');
      const book = normalizeNovelList({ books: [parsed.book] }, books.length)[0];
      if (!book) throw new Error('上架生成失败');
      const meta = parsed.meta ? normalizeMeta(parsed.meta) : null;
      if (meta && !isUsableGeneratedNovelMeta(meta)) throw new Error('小说项目生成格式无效，请重试');
      const project = (parsed as Record<string, unknown>).project as Record<string, unknown> | undefined;
      const projectDirectives = project
        ? [
          cleanGeneratedNovelInline(project.worldSetting) ? `项目世界:${cleanGeneratedNovelInline(project.worldSetting)}` : '',
          Array.isArray(project.factions) ? `主要势力:${project.factions.map((item) => cleanGeneratedNovelInline(item)).filter(Boolean).join('、')}` : '',
          Array.isArray(project.mainLineStages) ? `长线主线:${project.mainLineStages.map((item) => cleanGeneratedNovelInline(item)).filter(Boolean).join('；')}` : ''
        ].filter(Boolean)
        : [];
      const nextMeta = meta ? {
        ...meta,
        storyBible: {
          ...meta.storyBible,
          readerDirectives: [...meta.storyBible.readerDirectives, ...projectDirectives].slice(0, 12)
        }
      } : null;
      setBooks((prev) => [book, ...prev]);
      upsertShelf(book, nextMeta, 0);
      setShowPublish(false);
      showToast?.('小说项目已创建');
    } catch (error: any) {
      showToast?.(error?.message || '上架失败');
    } finally {
      leaveBooleanGuard(publishingRef);
      if (!isActiveRuntimeEpochStale(runtimeEpoch)) setIsPublishing(false);
    }
  };

  const continueFromShelf = async (entry: BookshelfEntry) => {
    setActiveBottomTab('书架');
    setDetailFromTab('书架');
    if (!entry.meta || entry.meta.chapters.length === 0) {
      await openDetail(entry.book);
      return;
    }
    setDetailBook(entry.book);
    setDetailMeta(entry.meta);
    setGlobalReaderDraft(parseReaderDraft(entry.meta.storyBible.readerDirectives || []));
    setChapterReaderDraft(parseReaderDraft(entry.meta.storyBible.readerDirectives || []));
    setChapterReading(null);
    setIsLoadingMeta(false);
    setIsPrimingFirstChapter(false);
    pushSubView?.('novelDetail');
    const target = entry.meta.chapters.find((item) => item.index === entry.lastReadChapterIndex) || entry.meta.chapters[0];
    if (!target) return;
    if (target.content) {
      setChapterReading(target);
      pushSubView?.('novelReader');
      upsertShelf(entry.book, entry.meta, target.index);
      preloadNextChapter(entry.book, target.index, entry.meta);
      return;
    }
    const generated = await generateChapterContent(entry.book, target, false, entry.meta);
    if (!generated) return;
    setChapterReading(generated);
    pushSubView?.('novelReader');
    preloadNextChapter(entry.book, generated.index, entry.meta);
  };

  const mineStats = React.useMemo(() => {
    const totalBooks = bookshelf.length;
    const readBooks = bookshelf.filter((entry) => entry.lastReadChapterIndex > 0).length;
    const cachedChapters = bookshelf.reduce((sum, entry) => {
      const count = (entry.meta?.chapters || []).filter((chapter) => Boolean(chapter.content)).length;
      return sum + count;
    }, 0);
    return { totalBooks, readBooks, cachedChapters };
  }, [bookshelf]);

  const handleContinueLatest = () => {
    const latest = bookshelf[0];
    if (!latest) {
      showToast?.('书架为空');
      return;
    }
    void continueFromShelf(latest);
  };

  const handleClearGenreCache = () => {
    setGenreBooksMap({});
    if (activeBottomTab === '书城') setBooks([]);
    showToast?.('书城缓存已清空');
  };

  const handleClearCommentCache = () => {
    setChapterComments({});
    showToast?.('章评缓存已清空');
  };

  const handleResetGuide = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // 本地存储不可用时，只重置当前页面状态。
    }
    setSelectedGenre('');
    setBooks([]);
    setShowGuide(true);
    showToast?.('已重置类型引导');
  };

  const handleResetReaderAppearance = () => {
    setReaderAppearance(DEFAULT_READER_APPEARANCE);
    showToast?.('阅读样式已恢复默认');
  };

  const showBookCity = activeBottomTab === '书城';
  const showBookshelf = activeBottomTab === '书架';
  const showMine = activeBottomTab === '我的';
  const readerBgClass = readerAppearance.background === 'dark' ? '#1b1b1b' : readerAppearance.background === 'green' ? '#e7f0e6' : '#f8f6ef';

  return (
    <div className="relative flex h-full flex-col" style={{ backgroundColor: '#f5f5f5' }}>
      {showBookCity ? <div style={{ background: 'linear-gradient(180deg, #edf3eb 0%, #f5f5f5 100%)', paddingTop: 'calc(var(--safe-top) + 8px)' }}><div className="px-3 flex items-center gap-2"><button onClick={() => wrappedGoBack()} type="button" className="h-10 w-10 rounded-xl render-bg-secondary render-text-primary"><i className="fa-solid fa-chevron-left"></i></button><div className="h-10 flex-1 rounded-xl px-3 flex items-center gap-2 bg-[#f2f2f2] text-[#8f8f8f]"><i className="fa-solid fa-magnifying-glass text-[13px]"></i><span className="text-[13px] truncate">{COPY.searchPlaceholder}</span></div></div><div className="mt-3 px-3 pb-2 flex gap-6 overflow-x-auto no-scrollbar">{TOP_GENRE_TABS.map((tab) => <button key={tab} type="button" onClick={() => { setActiveChannel(tab); const nextGenre = tab === '推荐' ? (selectedGenre || loadPreference().genre || '现代言情') : tab; pickGenre(nextGenre); }} className={`whitespace-nowrap ${activeChannel === tab ? 'text-[18px] font-bold text-[#111]' : 'text-[16px] text-[#8f8f8f]'}`}>{tab}</button>)}</div></div> : null}

      <div
        ref={pullRefresh.scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar"
        style={{ paddingBottom: 12 }}
        onTouchStart={showBookCity ? pullRefresh.handleTouchStart : undefined}
        onTouchMove={showBookCity ? pullRefresh.handleTouchMove : undefined}
        onTouchEnd={showBookCity ? pullRefresh.handleTouchEnd : undefined}
      >
        {showBookCity && (pullRefresh.pullDistance > 0 || pullRefresh.isRefreshing) ? (
          <div className="px-3 pt-2">
            <div className="h-2 rounded-full bg-[#ececec] overflow-hidden">
              <div className="h-full bg-[#ffb489]" style={{ width: `${Math.max(8, Math.min(100, pullRefresh.isRefreshing ? 100 : pullRefresh.pullDistance))}%`, transition: pullRefresh.isRefreshing ? 'width 0.2s ease' : undefined }}></div>
            </div>
          </div>
        ) : null}
        {showBookCity ? <div className="px-3 pt-1 text-[12px] text-[#999] flex items-center gap-2"><span>当前类型：{selectedGenre || '未选择'}</span><button type="button" className="rounded bg-[#ececec] px-2 py-0.5" onClick={() => setShowGuide(true)}>切换</button></div> : null}
        {showBookCity && isLoadingInitial ? (
          <div className="mx-3 mt-3"><SkeletonBlock h="h-52" /><div className="mt-3 grid grid-cols-2 gap-3">{Array.from({ length: 6 }).map((_, idx) => <SkeletonBlock key={idx} h="h-72" />)}</div></div>
        ) : null}
        {showBookCity && !isLoadingInitial && books.length > 0 ? <div className="mx-3 mt-3 rounded-2xl bg-white p-3"><div className="flex gap-4">{COPY.rankTabs.map((tab) => <button key={tab} type="button" onClick={() => setActiveRankTab(tab)} className={`text-[14px] ${activeRankTab === tab ? 'text-[#111] font-semibold' : 'text-[#9a9a9a]'}`}>{tab}</button>)}</div><div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">{rankingBooks.map((book, idx) => <button key={book.id} type="button" onClick={() => void openDetail(book)} className="flex items-start gap-2 text-left"><TextCover title={book.title} /><div className="min-w-0"><div className="text-[13px] leading-5"><span className="mr-1 text-[#b08b43]">{idx + 1}</span>{book.title}</div><div className="text-[12px] text-[#b7a26b] truncate">{book.favorites}</div></div></button>)}</div></div> : null}
        {showBookCity && !isLoadingInitial && books.length > 0 ? <div className="px-3 mt-3 pb-4 grid grid-cols-2 gap-3">{books.map((book) => <button key={book.id} type="button" onClick={() => void openDetail(book)} className="overflow-hidden rounded-2xl bg-white text-left"><TextCover title={book.title} tall /><div className="p-2"><div className="text-[14px] font-semibold leading-5 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{book.title}</div><div className="mt-1 text-[12px] text-[#8f8f8f] truncate">{book.rating} · {book.author}</div><div className="mt-1 text-[12px] text-[#8f8f8f] overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{book.description}</div></div></button>)}</div> : null}
        {showBookCity && !isLoadingInitial && books.length === 0 ? <div className="mx-3 mt-3 rounded-2xl bg-white p-4 text-center text-[14px] text-[#666]">{errorMessage || '暂时没有可展示的书单'}</div> : null}
        {showBookCity && isLoadingMore ? <div className="px-3 pb-4 grid grid-cols-2 gap-3">{Array.from({ length: 2 }).map((_, idx) => <SkeletonBlock key={idx} h="h-72" />)}</div> : null}

        {showBookshelf ? <div className="px-3 pt-3 pb-4 space-y-2">{bookshelf.length === 0 ? <div className="rounded-2xl bg-white p-5 text-center text-[14px] text-[#777]">书架空空，去书城读一本吧</div> : bookshelf.map((entry) => <div key={entry.book.id} className="rounded-2xl bg-white p-3"><div className="flex gap-2"><TextCover title={entry.book.title} /><div className="min-w-0 flex-1"><div className="text-[14px] text-[#111] font-semibold truncate">{entry.book.title}</div><div className="mt-1 text-[12px] text-[#8f8f8f]">{entry.book.author}</div><div className="mt-1 text-[12px] text-[#8f8f8f]">读到第 {Math.max(1, entry.lastReadChapterIndex)} 章</div></div></div><div className="mt-3 flex gap-2"><button type="button" onClick={() => { void continueFromShelf(entry); }} className="flex-1 rounded-lg bg-[#ff7a30] py-2 text-[13px] text-white">继续阅读</button><button type="button" onClick={() => removeShelfBook(entry.book.id)} className="w-20 rounded-lg bg-[#f3f3f3] py-2 text-[13px] text-[#666]">移除</button></div></div>)}</div> : null}
        {showMine ? (
          <NovelMinePanel
            mineStats={mineStats}
            readerAppearance={readerAppearance}
            onReaderAppearanceChange={setReaderAppearance}
            onContinueLatest={handleContinueLatest}
            onOpenBookshelf={() => setActiveBottomTab('书架')}
            onClearGenreCache={handleClearGenreCache}
            onClearCommentCache={handleClearCommentCache}
            onResetGuide={handleResetGuide}
            onResetReaderAppearance={handleResetReaderAppearance}
            onRefreshCurrentGenre={() => {
              if (selectedGenre) void fetchBooks(selectedGenre, 'replace');
            }}
          />
        ) : null}
      </div>

      {showBookCity ? <button className="absolute right-5 bottom-20 h-12 w-12 rounded-full text-white text-xl shadow-lg" style={{ backgroundColor: '#ff7a30' }} type="button" onClick={() => setShowPublish(true)}><i className="fa-solid fa-feather-pointed"></i></button> : null}
      <div className="border-t border-[#ececec] bg-white/95 px-6" style={{ paddingBottom: 'max(var(--safe-bottom), 8px)' }}><div className="h-14 flex items-center justify-around text-[12px]">{COPY.bottomTabs.map((tab) => <button key={tab} type="button" onClick={() => { setActiveBottomTab(tab); }} className={activeBottomTab === tab ? 'text-[#111]' : 'text-[#a0a0a0]'}>{tab}</button>)}</div></div>

      {showGuide ? <GuideLayer onPick={pickGenre} /> : null}
      {showPublish ? <PublishLayer draft={publishDraft} setDraft={setPublishDraft} onClose={() => setShowPublish(false)} onSubmit={() => { void publishNovel(); }} isLoading={isPublishing} /> : null}
      {(subView === 'novelDetail' || subView === 'novelReader') && detailBook ? <DetailLayer book={detailBook} meta={detailMeta} chapter={chapterReading} loadingMeta={isLoadingMeta} loadingChapter={isLoadingChapter} loadingMoreChapters={isLoadingMoreChapters} primingFirst={isPrimingFirstChapter} hasReadProgress={resumeChapterIndex > 0} readerBg={readerBgClass} readerFontSize={readerAppearance.fontSize} readerLineHeight={readerAppearance.lineHeight} onClose={() => { setDetailBook(null); setDetailMeta(null); setResumeChapterIndex(0); setChapterReading(null); setIsPrimingFirstChapter(false); setIsLoadingMoreChapters(false); setShowComments(false); setShowGlobalSettings(false); setShowChapterSettings(false); wrappedGoBack(); }} onOpenChapter={(chapter) => { void openChapter(chapter); }} onOpenNextChapter={() => { void openNextChapter(); }} onBackToToc={() => { if (detailFromTab === '书架') { setDetailBook(null); setDetailMeta(null); setChapterReading(null); setShowComments(false); setShowChapterSettings(false); setResumeChapterIndex(0); wrappedGoBack('app', 2); return; } setChapterReading(null); setShowComments(false); setShowChapterSettings(false); wrappedGoBack(); }} onStartRead={() => { void startReading(); }} onOpenComments={() => { void openComments(); }} onOpenGlobalSettings={openGlobalSettings} onOpenChapterSettings={openChapterSettings} /> : null}
      {showComments && detailBook && chapterReading ? <CommentsLayer comments={chapterComments[getChapterKey(detailBook.id, chapterReading.index)] || []} isLoading={isLoadingComments} isSending={isSendingComment} input={commentInput} onInputChange={setCommentInput} onClose={() => setShowComments(false)} onSubmit={() => { void submitComment(); }} onLike={likeComment} /> : null}
      {showGlobalSettings && detailBook && detailMeta ? <ReaderSettingsLayer title="全局设置" hint="全局设定会影响整本小说后续所有章节" submitText="保存全局设定" draft={globalReaderDraft} onDraftChange={setGlobalReaderDraft} onClose={() => setShowGlobalSettings(false)} onSave={saveGlobalSettings} /> : null}
      {showChapterSettings && detailBook && detailMeta && chapterReading ? <ReaderSettingsLayer title="下一章设置" hint="仅对下一章生效，不会修改全局设定" submitText="生成下一章" draft={chapterReaderDraft} onDraftChange={setChapterReaderDraft} onClose={() => setShowChapterSettings(false)} onSave={() => { void generateNextChapterWithSettings(); }} /> : null}
    </div>
  );
};

const DetailLayer: React.FC<{ book: GeneratedNovel; meta: NovelMeta | null; chapter: NovelChapter | null; loadingMeta: boolean; loadingChapter: boolean; loadingMoreChapters: boolean; primingFirst: boolean; hasReadProgress: boolean; readerBg: string; readerFontSize: number; readerLineHeight: number; onClose: () => void; onOpenChapter: (chapter: NovelChapter) => void; onOpenNextChapter: () => void; onBackToToc: () => void; onStartRead: () => void; onOpenComments: () => void; onOpenGlobalSettings: () => void; onOpenChapterSettings: () => void }> = ({ book, meta, chapter, loadingMeta, loadingChapter, loadingMoreChapters, primingFirst, hasReadProgress, readerBg, readerFontSize, readerLineHeight, onClose, onOpenChapter, onOpenNextChapter, onBackToToc, onStartRead, onOpenComments, onOpenGlobalSettings, onOpenChapterSettings }) => {
  if (chapter) {
    const nextChapter = (meta?.chapters || []).find((item) => item.index === chapter.index + 1) || null;
    return (
      <div className="absolute inset-0 z-40 flex flex-col" style={{ backgroundColor: readerBg }}>
        <div className="h-12 px-3 flex items-center gap-3 border-b">
          <button type="button" onClick={onBackToToc}><i className="fa-solid fa-chevron-left"></i></button>
          <div className="text-[14px] truncate flex-1">{chapter.title}</div>
          <button type="button" onClick={onOpenComments} className="text-[#666]"><i className="fa-regular fa-comment text-[16px]"></i></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loadingChapter ? <div className="space-y-3">{Array.from({ length: 8 }).map((_, idx) => <div key={idx} className="h-4 bg-[#e5e3dc] rounded animate-pulse"></div>)}</div> : <>
            <div className="whitespace-pre-wrap text-[#2c2c2c]" style={{ fontSize: `${readerFontSize}px`, lineHeight: readerLineHeight }}>{chapter.content}</div>
            <button type="button" onClick={onOpenNextChapter} disabled={loadingMoreChapters} className="mt-6 w-full rounded-xl bg-[#ff7a30] py-2.5 text-[14px] text-white font-semibold disabled:opacity-50">{loadingMoreChapters ? '催更中...' : (nextChapter ? `下一章 · ${nextChapter.title}` : '催更')}</button>
            {nextChapter ? <button type="button" onClick={onOpenChapterSettings} className="mt-3 w-full rounded-xl bg-white border border-[#e7e7e7] py-2.5 text-[14px] text-[#666]">章节设置</button> : null}
          </>}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-40 bg-white flex flex-col">
      <div className="h-12 px-3 flex items-center gap-3 border-b">
        <button type="button" onClick={onClose}><i className="fa-solid fa-chevron-left"></i></button>
        <div className="text-[15px] font-semibold truncate flex-1">{book.title}</div>
        <button type="button" onClick={onOpenGlobalSettings} className="text-[#666]"><i className="fa-solid fa-sliders text-[15px]"></i></button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-3 mt-3 rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #f97316 0%, #fb7185 100%)' }}>
          <div className="min-w-0">
            <div className="text-[18px] font-semibold leading-6">{book.title}</div>
            <div className="text-[13px] mt-2 opacity-90">{book.author}</div>
            <div className="text-[12px] mt-2 opacity-90">{book.wordCount} · {book.favorites} · {book.rating}</div>
            <div className="mt-2 flex flex-wrap gap-1">{book.tags.map((tag) => <span key={tag} className="text-[11px] px-2 py-0.5 rounded bg-white/20">{tag}</span>)}</div>
          </div>
        </div>
        <div className="px-3 mt-3 text-[13px] text-[#666] leading-6">{loadingMeta ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, idx) => <div key={idx} className="h-4 bg-[#ececec] rounded animate-pulse"></div>)}</div> : meta?.intro}</div>
        <div className="mx-3 mt-3 rounded-xl bg-[#f7f7f7] p-3 space-y-2">{(meta?.chapters || []).map((item) => <button key={item.index} type="button" onClick={() => onOpenChapter(item)} className="w-full text-left bg-white rounded-lg px-3 py-2"><div className="text-[14px] text-[#222] flex items-center justify-between"><span>{item.title}</span>{item.content ? <span className="text-[11px] text-[#ff7a30]">已缓存</span> : null}</div><div className="text-[12px] text-[#888] mt-1">{item.summary}</div></button>)}</div>
      </div>
      <div className="p-3 border-t bg-white">
        <button type="button" onClick={onStartRead} disabled={loadingMeta || loadingChapter} className="w-full rounded-xl bg-[#ff7a30] py-2.5 text-[14px] text-white font-semibold disabled:opacity-60">{primingFirst ? '准备首章中...' : (hasReadProgress ? '继续阅读' : '开始阅读')}</button>
      </div>
    </div>
  );
};

const CommentsLayer: React.FC<{ comments: ChapterComment[]; isLoading: boolean; isSending: boolean; input: string; onInputChange: (value: string) => void; onClose: () => void; onSubmit: () => void; onLike: (commentId: string) => void }> = ({ comments, isLoading, isSending, input, onInputChange, onClose, onSubmit, onLike }) => {
  return <div className="absolute inset-0 z-50 bg-black/35 flex items-end"><div className="w-full h-[76%] rounded-t-2xl bg-white flex flex-col"><div className="h-12 px-4 border-b flex items-center justify-between"><div className="text-[15px] font-semibold">章评讨论</div><button type="button" onClick={onClose}><i className="fa-solid fa-xmark"></i></button></div><div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">{isLoading ? Array.from({ length: 6 }).map((_, idx) => <div key={idx} className="h-14 rounded-xl bg-[#f2f2f2] animate-pulse"></div>) : comments.map((comment) => <div key={comment.id} className="rounded-xl bg-[#f7f7f7] px-3 py-2"><div className="text-[12px] text-[#888]">{comment.name}</div><div className="text-[14px] text-[#222] mt-1 leading-6">{comment.content}</div><div className="mt-1 text-[12px]"><button type="button" className="text-[#999]" onClick={() => onLike(comment.id)}><i className="fa-regular fa-heart mr-1"></i>{comment.likes}</button></div></div>)}</div><div className="border-t p-2 flex items-center gap-2"><input value={input} onChange={(event) => onInputChange(event.target.value)} className="h-9 flex-1 rounded-lg bg-[#f5f5f5] px-3 text-[13px] outline-none" placeholder="说点什么..." /><button type="button" onClick={onSubmit} disabled={isSending || !input.trim()} className="h-9 rounded-lg bg-[#ff7a30] px-3 text-white text-[13px] disabled:opacity-60">发送</button></div></div></div>;
};

const ReaderSettingsLayer: React.FC<{ title: string; hint: string; submitText: string; draft: ReaderSettingDraft; onDraftChange: React.Dispatch<React.SetStateAction<ReaderSettingDraft>>; onClose: () => void; onSave: () => void }> = ({ title, hint, submitText, draft, onDraftChange, onClose, onSave }) => {
  const paceOptions = ['正常推进', '加速剧情', '慢节奏铺垫'];
  const conflictOptions = ['低冲突治愈', '中强度冲突', '高冲突反转'];
  const perspectiveOptions = ['第一人称沉浸', '第三人称贴近', '双视角交替'];
  const dialogueOptions = ['对白偏多', '平衡', '描写偏多'];

  return <div className="absolute inset-0 z-50 bg-black/35 flex items-end"><div className="w-full max-h-[88%] overflow-y-auto rounded-t-2xl bg-white p-4"><div className="flex items-center justify-between"><div className="text-[15px] font-semibold">{title}</div><button type="button" onClick={onClose}><i className="fa-solid fa-xmark"></i></button></div><div className="mt-1 text-[12px] text-[#888]">{hint}</div><div className="mt-3"><div className="text-[12px] text-[#888] mb-1">节奏</div><div className="flex flex-wrap gap-2">{paceOptions.map((item) => <button key={item} type="button" onClick={() => onDraftChange((prev) => ({ ...prev, pace: item }))} className={`rounded-lg px-3 py-1.5 text-[13px] ${draft.pace === item ? 'bg-[#ffefe5] text-[#ff7a30]' : 'bg-[#f4f4f4] text-[#666]'}`}>{item}</button>)}</div></div><div className="mt-3"><div className="text-[12px] text-[#888] mb-1">冲突强度</div><div className="flex flex-wrap gap-2">{conflictOptions.map((item) => <button key={item} type="button" onClick={() => onDraftChange((prev) => ({ ...prev, conflict: item }))} className={`rounded-lg px-3 py-1.5 text-[13px] ${draft.conflict === item ? 'bg-[#ffefe5] text-[#ff7a30]' : 'bg-[#f4f4f4] text-[#666]'}`}>{item}</button>)}</div></div><div className="mt-3"><div className="text-[12px] text-[#888] mb-1">叙事视角</div><div className="flex flex-wrap gap-2">{perspectiveOptions.map((item) => <button key={item} type="button" onClick={() => onDraftChange((prev) => ({ ...prev, perspective: item }))} className={`rounded-lg px-3 py-1.5 text-[13px] ${draft.perspective === item ? 'bg-[#ffefe5] text-[#ff7a30]' : 'bg-[#f4f4f4] text-[#666]'}`}>{item}</button>)}</div></div><div className="mt-3"><div className="text-[12px] text-[#888] mb-1">对话密度</div><div className="flex flex-wrap gap-2">{dialogueOptions.map((item) => <button key={item} type="button" onClick={() => onDraftChange((prev) => ({ ...prev, dialogueDensity: item }))} className={`rounded-lg px-3 py-1.5 text-[13px] ${draft.dialogueDensity === item ? 'bg-[#ffefe5] text-[#ff7a30]' : 'bg-[#f4f4f4] text-[#666]'}`}>{item}</button>)}</div></div><div className="mt-3"><div className="text-[12px] text-[#888] mb-1">新增人物</div><input value={draft.addCharacter} onChange={(event) => onDraftChange((prev) => ({ ...prev, addCharacter: event.target.value }))} className="h-9 w-full rounded-lg bg-[#f6f6f6] px-3 text-[13px] outline-none" placeholder="例如：调查记者，和女主有旧怨" /></div><div className="mt-3"><div className="text-[12px] text-[#888] mb-1">新增设定</div><input value={draft.addSetting} onChange={(event) => onDraftChange((prev) => ({ ...prev, addSetting: event.target.value }))} className="h-9 w-full rounded-lg bg-[#f6f6f6] px-3 text-[13px] outline-none" placeholder="例如：每次能力使用都会遗忘一段记忆" /></div><div className="mt-3"><div className="text-[12px] text-[#888] mb-1">必须保留</div><input value={draft.mustKeep} onChange={(event) => onDraftChange((prev) => ({ ...prev, mustKeep: event.target.value }))} className="h-9 w-full rounded-lg bg-[#f6f6f6] px-3 text-[13px] outline-none" placeholder="例如：女主不黑化，男主身份保密到第8章" /></div><div className="mt-3"><div className="text-[12px] text-[#888] mb-1">避免元素</div><input value={draft.avoid} onChange={(event) => onDraftChange((prev) => ({ ...prev, avoid: event.target.value }))} className="h-9 w-full rounded-lg bg-[#f6f6f6] px-3 text-[13px] outline-none" placeholder="例如：避免狗血误会和失忆梗" /></div><div className="mt-3"><div className="text-[12px] text-[#888] mb-1">额外要求</div><input value={draft.extra} onChange={(event) => onDraftChange((prev) => ({ ...prev, extra: event.target.value }))} className="h-9 w-full rounded-lg bg-[#f6f6f6] px-3 text-[13px] outline-none" placeholder="例如：下一章以对峙戏开场并埋新伏笔" /></div><button type="button" onClick={onSave} className="mt-4 h-10 w-full rounded-xl bg-[#ff7a30] text-white text-[14px] font-semibold">{submitText}</button></div></div>;
};

export default NovelDiscoverView;
