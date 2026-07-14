export type UrlImportItem = {
  url: string;
  desc: string;
};

export const URL_IMPORT_MAX_LINKS = 60;

export const isValidEmojiUrl = (url: string): boolean => {
  const value = url.trim();
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:image');
};

export const resolveEmojiUrlsFromText = (
  rawText: string,
  maxLinks: number = URL_IMPORT_MAX_LINKS
): { urls: string[]; total: number; truncated: boolean } => {
  const limit = Math.max(0, Math.floor(Number(maxLinks) || URL_IMPORT_MAX_LINKS));
  const seen = new Set<string>();
  const urls: string[] = [];
  let total = 0;
  rawText
    .split('\n')
    .map(item => item.trim())
    .forEach((item) => {
      if (!item || !isValidEmojiUrl(item) || seen.has(item)) return;
      seen.add(item);
      total += 1;
      if (urls.length < limit) urls.push(item);
    });
  return { urls, total, truncated: total > urls.length };
};

export const parseEmojiUrlsFromText = (
  rawText: string,
  maxLinks: number = URL_IMPORT_MAX_LINKS
): string[] => resolveEmojiUrlsFromText(rawText, maxLinks).urls;

export const convertEmojiUrlsToData = async (
  urls: string[],
  concurrency: number,
  fetcher: (url: string) => Promise<string>
): Promise<UrlImportItem[]> => {
  if (urls.length === 0) return [];
  const converted: Array<UrlImportItem | null> = new Array(urls.length).fill(null);
  let cursor = 0;
  const worker = async () => {
    while (cursor < urls.length) {
      const taskIndex = cursor;
      cursor += 1;
      try {
        const dataUrl = await fetcher(urls[taskIndex]);
        converted[taskIndex] = { url: dataUrl, desc: '' };
      } catch {
        converted[taskIndex] = null;
      }
    }
  };
  const workerCount = Math.min(concurrency, urls.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return converted.filter(Boolean) as UrlImportItem[];
};
