import React, { useMemo, useState } from 'react';
import { MobileHeader } from '../Common';
import { URL_IMPORT_CONCURRENCY, URL_IMPORT_PAGE_SIZE } from './emojiState';
import { convertEmojiUrlsToData, resolveEmojiUrlsFromText, URL_IMPORT_MAX_LINKS } from './emojiUrlImportUtils';
import { fetchImageAsDataUrl } from './emojiImageUtils';
import { getPageSlice, resolvePaginationState } from './chatRoomUiUtils';

type EmojiEntry = { id: string; url: string; desc: string };
type UrlImportEntry = { url: string; desc: string };

type EmojiUrlImportPanelProps = {
  visible: boolean;
  onClose: () => void;
  customEmojis?: EmojiEntry[];
  normalizeCustomEmojis?: (list: any[]) => EmojiEntry[];
  compactEmojiList?: (list: EmojiEntry[]) => Promise<EmojiEntry[]>;
  setCustomEmojis?: React.Dispatch<React.SetStateAction<EmojiEntry[]>>;
  onConfirmData?: (list: UrlImportEntry[]) => Promise<void> | void;
  title?: string;
  confirmPrefix?: string;
  showToast?: (msg: string) => void;
};

const EmojiUrlImportPanel: React.FC<EmojiUrlImportPanelProps> = ({
  visible,
  onClose,
  customEmojis,
  normalizeCustomEmojis,
  compactEmojiList,
  setCustomEmojis,
  onConfirmData,
  title = '从URL导入表情',
  confirmPrefix = '添加',
  showToast
}) => {
  const [urlImportInput, setUrlImportInput] = useState('');
  const [urlImportData, setUrlImportData] = useState<UrlImportEntry[]>([]);
  const [isParsingUrlImport, setIsParsingUrlImport] = useState(false);
  const [urlImportPage, setUrlImportPage] = useState(1);
  const parsedUrlImportState = useMemo(() => resolveEmojiUrlsFromText(urlImportInput), [urlImportInput]);
  const parsedUrlImportLinks = parsedUrlImportState.urls;

  const { totalPages: totalUrlImportPages, currentPage: currentUrlImportPage } = useMemo(
    () => resolvePaginationState(urlImportData.length, urlImportPage, URL_IMPORT_PAGE_SIZE),
    [urlImportData.length, urlImportPage]
  );
  const pagedUrlImportData = useMemo(
    () => getPageSlice(urlImportData, currentUrlImportPage, URL_IMPORT_PAGE_SIZE),
    [urlImportData, currentUrlImportPage]
  );

  const resetPanel = () => {
    setUrlImportInput('');
    setUrlImportData([]);
    setUrlImportPage(1);
    setIsParsingUrlImport(false);
    onClose();
  };

  const handleConfirmAppend = async () => {
    if (onConfirmData) {
      await onConfirmData(urlImportData);
      resetPanel();
      return;
    }
    if (!normalizeCustomEmojis || !compactEmojiList || !setCustomEmojis) return;
    const appended = normalizeCustomEmojis(urlImportData.map((item, i) => ({
      id: `url_${Date.now()}_${i}`,
      url: item.url,
      desc: item.desc
    })));
    const compacted = await compactEmojiList(appended);
    const newEmojis = normalizeCustomEmojis([...(customEmojis || []), ...compacted]);
    setCustomEmojis(newEmojis);
    resetPanel();
  };

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[600] render-bg-primary flex flex-col">
      <MobileHeader
        title={title}
        onBack={resetPanel}
        actions={urlImportData.length > 0 ? (
          <button
            className="app-button app-button-primary px-3 py-1 text-sm font-bold disabled:opacity-50"
            onClick={() => void handleConfirmAppend()}
          >
            {confirmPrefix}({urlImportData.length})
          </button>
        ) : null}
      />

      {urlImportData.length === 0 ? (
        <div className="flex-1 p-4">
          <div className="text-sm render-text-secondary mb-2">每行输入一个图片URL：</div>
          <textarea
            className="app-field-textarea w-full h-48 text-sm"
            placeholder="https://example.com/emoji1.png&#10;https://example.com/emoji2.png&#10;..."
            value={urlImportInput}
            onChange={(e) => setUrlImportInput(e.target.value)}
          />
          <button
            className="app-button app-button-primary w-full mt-4 h-11 font-semibold disabled:opacity-50"
            disabled={!urlImportInput.trim() || isParsingUrlImport}
            onClick={async () => {
              setIsParsingUrlImport(true);
              try {
                if (parsedUrlImportState.truncated) {
                  showToast?.(`一次最多处理 ${URL_IMPORT_MAX_LINKS} 个链接，已忽略后续链接`);
                }
                const data = await convertEmojiUrlsToData(
                  parsedUrlImportLinks,
                  URL_IMPORT_CONCURRENCY,
                  fetchImageAsDataUrl
                );
                const valid = data.filter((item) => item.url);
                setUrlImportData(valid);
                setUrlImportPage(1);
                if (valid.length === 0) {
                  showToast?.('未能下载可用图片，请检查链接或跨域权限');
                } else if (valid.length < parsedUrlImportLinks.length) {
                  showToast?.(`仅成功转换 ${valid.length}/${parsedUrlImportLinks.length} 张图片`);
                }
              } finally {
                setIsParsingUrlImport(false);
              }
            }}
          >
            {isParsingUrlImport ? '转换中...' : `解析链接 (${parsedUrlImportLinks.length})`}
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {pagedUrlImportData.map((item, i) => {
            const globalIndex = (currentUrlImportPage - 1) * URL_IMPORT_PAGE_SIZE + i;
            return (
              <div key={`${item.url}-${globalIndex}`} className="app-surface-panel p-4 flex space-x-4">
                <img src={item.url} loading="lazy" decoding="async" className="w-20 h-20 object-cover rounded-lg border render-border flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = '/assets/image/user.png'; }} />
                <div className="flex-1 flex flex-col justify-center">
                  <span className="text-xs render-text-secondary mb-2">表情描述</span>
                  <input
                    className="app-field-input bg-transparent border-b render-border pb-2 rounded-none px-0"
                    placeholder="给表情取个名字吧..."
                    value={item.desc}
                    onChange={(e) => {
                      setUrlImportData(prev => prev.map((item, idx) =>
                        idx === globalIndex ? { ...item, desc: e.target.value } : item
                      ));
                    }}
                  />
                </div>
              </div>
            );
          })}
          {urlImportData.length > URL_IMPORT_PAGE_SIZE && (
            <div className="sticky bottom-0 pt-2">
              <div className="app-surface-panel h-10 px-2 flex items-center justify-between text-xs">
                <button className="app-button app-button-muted px-2 h-7 disabled:opacity-40" disabled={currentUrlImportPage <= 1} onClick={() => setUrlImportPage((p) => Math.max(1, p - 1))}>上一页</button>
                <span className="render-text-secondary">第 {currentUrlImportPage}/{totalUrlImportPages} 页</span>
                <button className="app-button app-button-muted px-2 h-7 disabled:opacity-40" disabled={currentUrlImportPage >= totalUrlImportPages} onClick={() => setUrlImportPage((p) => Math.min(totalUrlImportPages, p + 1))}>下一页</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmojiUrlImportPanel;
