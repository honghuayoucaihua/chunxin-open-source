export const KEYBOARD_VISIBLE_THRESHOLD_PX = 100;

const normalizeKeyboardHeight = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
};

export const isKeyboardLayoutVisible = (keyboardHeight: number): boolean => {
  return normalizeKeyboardHeight(keyboardHeight) > KEYBOARD_VISIBLE_THRESHOLD_PX;
};

export const resolveKeyboardLayoutState = (params: {
  windowHeight: number;
  viewportHeight: number;
}): {
  keyboardHeight: number;
  isVisible: boolean;
} => {
  const windowHeight = Number(params.windowHeight);
  const viewportHeight = Number(params.viewportHeight);
  if (!Number.isFinite(windowHeight) || !Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    return { keyboardHeight: 0, isVisible: false };
  }
  const keyboardHeight = normalizeKeyboardHeight(windowHeight - viewportHeight);
  return {
    keyboardHeight,
    isVisible: isKeyboardLayoutVisible(keyboardHeight)
  };
};

/**
 * 计算键盘弹起时需要抬升底部的偏移量。
 * 当前始终返回 0：键盘高度由 CSS `safe-area-inset-bottom` / `--keyboard-height`
 * 变量控制，不再强制抬高壳层整体高度，避免主页和消息页一起位移。
 */
export const resolveKeyboardOffsetBottom = (_params: {
  isNativeAndroid: boolean;
  keyboardHeight: number;
}): number => {
  return 0;
};