import type { DesktopIcon, DesktopWidget } from '../types';

export const DESKTOP_PAGE_MIN = 1;
export const DESKTOP_PAGE_MAX = 5;
type DesktopPageItem = { pageIndex?: number };
type DesktopStatusBarLayout = 'default' | 'center' | 'minimal' | null | undefined;
type DesktopPositionedItem = DesktopPageItem & { id: string; row: number; col: number };
type DesktopSizedItem = DesktopPositionedItem & { width: number; height: number };

export const getItemPage = (item: DesktopPageItem | null | undefined): number => {
  const raw = Number(item?.pageIndex ?? 0);
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.floor(raw));
};

export const mergeDesktopItemsForPage = <T extends DesktopPageItem>(
  allItems: T[] | null | undefined,
  currentPage: number,
  pageItems: T[] | null | undefined
): T[] => {
  const safePage = getItemPage({ pageIndex: currentPage });
  const otherPages = Array.isArray(allItems) ? allItems.filter((item) => getItemPage(item) !== safePage) : [];
  const normalizedPageItems = Array.isArray(pageItems)
    ? pageItems.map((item) => ({ ...item, pageIndex: safePage }))
    : [];
  return [...otherPages, ...normalizedPageItems];
};

export const shouldUseFloatingDesktopEditToolbar = (
  showDesktopStatusBar: boolean,
  statusBarLayout: DesktopStatusBarLayout
): boolean => {
  return !showDesktopStatusBar || statusBarLayout === 'minimal';
};

export const getDesktopDragSwitchPageTarget = (
  clientX: number,
  viewportWidth: number,
  currentPage: number,
  totalPages: number,
  edgeThreshold: number = 56
): number | null => {
  const safeViewportWidth = Math.max(0, Math.floor(viewportWidth));
  const safeThreshold = Math.max(0, Math.floor(edgeThreshold));
  const safeCurrentPage = getItemPage({ pageIndex: currentPage });
  const safeTotalPages = Math.max(DESKTOP_PAGE_MIN, Math.floor(totalPages || 0));
  if (safeViewportWidth <= 0 || safeTotalPages <= 1) return null;
  if (clientX <= safeThreshold && safeCurrentPage > 0) {
    return safeCurrentPage - 1;
  }
  if (clientX >= safeViewportWidth - safeThreshold && safeCurrentPage < safeTotalPages - 1) {
    return safeCurrentPage + 1;
  }
  return null;
};

export const canPlaceDesktopAreaOnPage = (
  icons: Array<Pick<DesktopIcon, 'id' | 'row' | 'col' | 'pageIndex'>> | null | undefined,
  widgets: Array<Pick<DesktopWidget, 'id' | 'row' | 'col' | 'width' | 'height' | 'pageIndex'>> | null | undefined,
  pageIndex: number,
  row: number,
  col: number,
  width: number,
  height: number,
  excludeId?: string
): boolean => {
  const safePage = getItemPage({ pageIndex });
  for (const icon of Array.isArray(icons) ? icons : []) {
    if (icon.id === excludeId || getItemPage(icon) !== safePage) continue;
    if (row <= icon.row && icon.row < row + height && col <= icon.col && icon.col < col + width) {
      return false;
    }
  }
  for (const widget of Array.isArray(widgets) ? widgets : []) {
    if (widget.id === excludeId || getItemPage(widget) !== safePage) continue;
    const noOverlap =
      row + height <= widget.row ||
      widget.row + widget.height <= row ||
      col + width <= widget.col ||
      widget.col + widget.width <= col;
    if (!noOverlap) {
      return false;
    }
  }
  return true;
};

export const moveDesktopPagedItem = <T extends DesktopPositionedItem>(
  items: T[] | null | undefined,
  itemId: string,
  nextPageIndex: number,
  row: number,
  col: number
): T[] => {
  const safePage = getItemPage({ pageIndex: nextPageIndex });
  return Array.isArray(items)
    ? items.map((item) => (
      item.id === itemId ? { ...item, pageIndex: safePage, row, col } : item
    ))
    : [];
};

export const getDesktopContentPageCount = (
  icons?: DesktopIcon[] | null,
  widgets?: DesktopWidget[] | null
): number => {
  const iconPages = Array.isArray(icons) ? icons.map((item) => getItemPage(item) + 1) : [];
  const widgetPages = Array.isArray(widgets) ? widgets.map((item) => getItemPage(item) + 1) : [];
  return Math.max(DESKTOP_PAGE_MIN, ...iconPages, ...widgetPages, DESKTOP_PAGE_MIN);
};

export const normalizeDesktopPageCount = (
  pageCount: unknown,
  icons?: DesktopIcon[] | null,
  widgets?: DesktopWidget[] | null
): number => {
  const contentPages = getDesktopContentPageCount(icons, widgets);
  const parsed = Number(pageCount);
  if (!Number.isFinite(parsed)) return Math.max(DESKTOP_PAGE_MIN, contentPages);
  return Math.max(contentPages, Math.min(DESKTOP_PAGE_MAX, Math.max(DESKTOP_PAGE_MIN, Math.floor(parsed))));
};
