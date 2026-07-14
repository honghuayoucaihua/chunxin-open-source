export const MESSAGE_LIST_EDGE_THRESHOLD = 120;

export type MessageHistoryScrollSnapshot = Readonly<{
  scrollHeight: number;
  scrollTop: number;
}>;

type NextRenderCountInput = Readonly<{
  current: number;
  total: number;
  pageSize: number;
}>;

export const captureMessageHistoryScrollSnapshot = (
  container: HTMLDivElement | null
): MessageHistoryScrollSnapshot | null => {
  if (!container) {
    return null;
  }

  return {
    scrollHeight: container.scrollHeight,
    scrollTop: container.scrollTop
  };
};

export const restoreMessageHistoryScrollSnapshot = (
  container: HTMLDivElement | null,
  snapshot: MessageHistoryScrollSnapshot | null
): number | null => {
  if (!container || !snapshot) {
    return null;
  }

  const scrollDelta = container.scrollHeight - snapshot.scrollHeight;
  const nextScrollTop = Math.max(0, snapshot.scrollTop + scrollDelta);
  container.scrollTop = nextScrollTop;
  return nextScrollTop;
};

export const getNextMessageRenderCount = ({
  current,
  total,
  pageSize
}: NextRenderCountInput): number => {
  return Math.min(total, current + pageSize);
};
