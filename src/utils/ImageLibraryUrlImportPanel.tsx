import React, { useMemo, useState } from 'react';
import { MobileHeader } from '../Common';
import { resolveEmojiUrlsFromText, URL_IMPORT_MAX_LINKS } from '../chatroom/emojiUrlImportUtils';

type UrlImageItem = {
  url: string;
  desc: string;
};

type ImageLibraryUrlImportPanelProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (items: UrlImageItem[]) => void;
  toDataUrl: (url: string) => Promise<string>;
  onImportError?: (error: unknown) => void;
  onImportNotice?: (message: string) => void;
};

const URL_IMPORT_CONCURRENCY = 4;
const URL_IMPORT_PAGE_SIZE = 20;

const ImageLibraryUrlImportPanel: React.FC<ImageLibraryUrlImportPanelProps> = ({
  visible,
  onClose,
  onConfirm,
  toDataUrl,
  onImportError,
  onImportNotice
}) => {
  const [input, setInput] = useState('');
  const [items, setItems] = useState<UrlImageItem[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [page, setPage] = useState(1);
  const urlImportState = useMemo(() => resolveEmojiUrlsFromText(input), [input]);
  const urls = urlImportState.urls;

  const totalPages = Math.max(1, Math.ceil(items.length / URL_IMPORT_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * URL_IMPORT_PAGE_SIZE;
    return items.slice(start, start + URL_IMPORT_PAGE_SIZE);
  }, [items, currentPage]);

  const reset = () => {
    setInput('');
    setItems([]);
    setPage(1);
    setIsParsing(false);
    onClose();
  };

  const parseUrls = async () => {
    if (urls.length === 0) return;
    setIsParsing(true);
    try {
      if (urlImportState.truncated) {
        onImportNotice?.(`一次最多处理 ${URL_IMPORT_MAX_LINKS} 个链接，已忽略后续链接`);
      }
      const results: Array<UrlImageItem | null> = new Array(urls.length).fill(null);
      let cursor = 0;
      const worker = async () => {
        while (cursor < urls.length) {
          const index = cursor;
          cursor += 1;
          try {
            const dataUrl = await toDataUrl(urls[index]);
            results[index] = { url: dataUrl, desc: '' };
          } catch (error) {
            onImportError?.(error);
            results[index] = null;
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(URL_IMPORT_CONCURRENCY, urls.length) }, () => worker()));
      const valid = results.filter((item): item is UrlImageItem => !!item && !!item.url);
      setItems(valid);
      setPage(1);
    } finally {
      setIsParsing(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[620] render-bg-primary flex flex-col">
      <MobileHeader
        title="批量URL导入"
        onBack={reset}
        actions={items.length > 0 ? (
          <button
            className="app-button app-button-primary px-3 py-1 text-sm font-bold disabled:opacity-50"
            onClick={() => onConfirm(items)}
          >
            添加({items.length})
          </button>
        ) : null}
      />
      {items.length === 0 ? (
        <div className="flex-1 p-4">
          <div className="text-sm render-text-secondary mb-2">每行输入一个图片 URL：</div>
          <textarea
            className="app-field-textarea w-full h-48 text-sm"
            placeholder="https://example.com/a.jpg&#10;https://example.com/b.png"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            className="app-button app-button-primary w-full mt-4 h-11 font-semibold disabled:opacity-50"
            disabled={!input.trim() || isParsing}
            onClick={() => void parseUrls()}
          >
            {isParsing ? '解析中...' : `解析链接 (${urls.length})`}
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {pagedItems.map((item, i) => {
            const globalIndex = (currentPage - 1) * URL_IMPORT_PAGE_SIZE + i;
            return (
              <div key={`${item.url}-${globalIndex}`} className="app-surface-panel p-4 flex space-x-4">
                <img src={item.url} loading="lazy" decoding="async" className="w-20 h-20 object-cover rounded-lg border render-border flex-shrink-0" />
                <div className="flex-1 flex flex-col justify-center">
                  <span className="text-xs render-text-secondary mb-2">图片描述</span>
                  <input
                    className="app-field-input bg-transparent border-b render-border pb-2 rounded-none px-0"
                    placeholder="输入图片描述"
                    value={item.desc}
                    onChange={(e) => {
                      const next = [...items];
                      next[globalIndex].desc = e.target.value;
                      setItems(next);
                    }}
                  />
                </div>
              </div>
            );
          })}
          {items.length > URL_IMPORT_PAGE_SIZE && (
            <div className="sticky bottom-0 pt-2">
              <div className="app-surface-panel h-10 px-2 flex items-center justify-between text-xs">
                <button className="app-button app-button-muted px-2 h-7 disabled:opacity-40" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>上一页</button>
                <span className="render-text-secondary">第 {currentPage}/{totalPages} 页</span>
                <button className="app-button app-button-muted px-2 h-7 disabled:opacity-40" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>下一页</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageLibraryUrlImportPanel;
