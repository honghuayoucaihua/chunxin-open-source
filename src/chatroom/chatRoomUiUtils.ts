const COMPOSER_MIN_HEIGHT = 36;
const COMPOSER_MAX_HEIGHT = 160;
const composerAdjustFrameMap = new WeakMap<HTMLTextAreaElement, number>();

export type PaginationState = {
  totalPages: number;
  currentPage: number;
};

export type MessageMenuAnchorRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type MessageMenuLayout = {
  left: number;
  top: number;
  arrowLeft: number;
  placeAboveAnchor: boolean;
};

type ElementRectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type HTMLElementLike = {
  offsetLeft?: number;
  offsetTop?: number;
  offsetWidth?: number;
  offsetHeight?: number;
  offsetParent?: HTMLElementLike | null;
  scrollLeft?: number;
  scrollTop?: number;
  getBoundingClientRect?: () => ElementRectLike;
};

export const adjustComposerTextareaHeight = (element: HTMLTextAreaElement | null): void => {
  if (!element) return;
  element.style.height = 'auto';
  const nextHeight = Math.min(Math.max(element.scrollHeight, COMPOSER_MIN_HEIGHT), COMPOSER_MAX_HEIGHT);
  const nextHeightValue = `${nextHeight}px`;
  const nextOverflowValue = element.scrollHeight > COMPOSER_MAX_HEIGHT ? 'auto' : 'hidden';
  if (element.style.height !== nextHeightValue) {
    element.style.height = nextHeightValue;
  }
  if (element.style.overflowY !== nextOverflowValue) {
    element.style.overflowY = nextOverflowValue;
  }
};

export const scheduleComposerTextareaHeightAdjust = (element: HTMLTextAreaElement | null): void => {
  if (!element) return;

  const requestFrame = globalThis.requestAnimationFrame;
  if (typeof requestFrame !== 'function') {
    adjustComposerTextareaHeight(element);
    return;
  }

  const pendingFrameId = composerAdjustFrameMap.get(element);
  if (typeof pendingFrameId === 'number' && typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(pendingFrameId);
  }

  const frameId = requestFrame(() => {
    composerAdjustFrameMap.delete(element);
    adjustComposerTextareaHeight(element);
  });
  composerAdjustFrameMap.set(element, frameId);
};

export const resolvePaginationState = (
  totalItems: number,
  page: number,
  pageSize: number
): PaginationState => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  return { totalPages, currentPage };
};

export const getPageSlice = <T>(list: T[], currentPage: number, pageSize: number): T[] => {
  const start = (currentPage - 1) * pageSize;
  return list.slice(start, start + pageSize);
};

export const resolveAnchorRectWithinContainer = (
  target: HTMLElementLike | null,
  container: HTMLElementLike | null
): MessageMenuAnchorRect | null => {
  if (!target) return null;

  const targetRect = target.getBoundingClientRect?.();
  const width = Math.max(0, Number(targetRect?.width ?? target.offsetWidth ?? 0));
  const height = Math.max(0, Number(targetRect?.height ?? target.offsetHeight ?? 0));

  if (!container) {
    return {
      left: Math.max(0, Number(targetRect?.left ?? 0)),
      top: Math.max(0, Number(targetRect?.top ?? 0)),
      width,
      height
    };
  }

  let contentLeft = 0;
  let contentTop = 0;
  let node: HTMLElementLike | null = target;

  while (node && node !== container) {
    contentLeft += Number(node.offsetLeft ?? 0);
    contentTop += Number(node.offsetTop ?? 0);
    node = node.offsetParent ?? null;
  }

  if (node === container) {
    return {
      left: Math.max(0, contentLeft - Number(container.scrollLeft ?? 0)),
      top: Math.max(0, contentTop - Number(container.scrollTop ?? 0)),
      width,
      height
    };
  }

  const containerRect = container.getBoundingClientRect?.();
  return {
    left: Math.max(0, Number(targetRect?.left ?? 0) - Number(containerRect?.left ?? 0)),
    top: Math.max(0, Number(targetRect?.top ?? 0) - Number(containerRect?.top ?? 0)),
    width,
    height
  };
};

export const resolveMessageMenuLayout = (params: {
  containerWidth: number;
  containerHeight: number;
  scrollTop: number;
  anchorRect: MessageMenuAnchorRect;
  menuWidth?: number;
  menuHeight?: number;
  edgeGap?: number;
  anchorGap?: number;
  arrowSize?: number;
}): MessageMenuLayout => {
  const menuWidth = params.menuWidth ?? 256;
  const menuHeight = params.menuHeight ?? 170;
  const edgeGap = params.edgeGap ?? 10;
  const anchorGap = params.anchorGap ?? 8;
  const arrowSize = params.arrowSize ?? 16;

  const maxLeft = Math.max(edgeGap, params.containerWidth - menuWidth - edgeGap);
  const anchorCenterX = params.anchorRect.left + params.anchorRect.width / 2;
  const left = Math.min(maxLeft, Math.max(edgeGap, anchorCenterX - menuWidth / 2));

  const visibleTop = params.scrollTop + edgeGap;
  const visibleBottom = params.scrollTop + params.containerHeight - menuHeight - edgeGap;
  const anchorTop = params.anchorRect.top + params.scrollTop;
  const anchorBottom = anchorTop + params.anchorRect.height;
  const preferredAboveTop = anchorTop - menuHeight - anchorGap - arrowSize / 2;
  const preferredBelowTop = anchorBottom + anchorGap + arrowSize / 2;
  const canPlaceAbove = preferredAboveTop >= visibleTop;
  const placeAboveAnchor = canPlaceAbove || preferredBelowTop > visibleBottom;
  const top = placeAboveAnchor
    ? Math.max(visibleTop, preferredAboveTop)
    : Math.min(visibleBottom, preferredBelowTop);

  const arrowLeft = Math.min(
    menuWidth - arrowSize - 12,
    Math.max(12, anchorCenterX - left - arrowSize / 2)
  );

  return { left, top, arrowLeft, placeAboveAnchor };
};
