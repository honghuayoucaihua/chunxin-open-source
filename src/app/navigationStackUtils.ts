import type { SubView } from '../types';

export const GO_BACK_DEBOUNCE_MS = 300;

export type PopStackResult = {
  newStack: SubView[];
  nextView: SubView;
};

export const appendSubViewStack = (stack: SubView[], next: SubView): SubView[] => {
  const last = stack[stack.length - 1] || 'none';
  if (last === next) return stack;
  return [...stack, next];
};

export const replaceTopSubViewStack = (stack: SubView[], next: SubView): SubView[] => {
  if (stack.length === 0) return [next];
  const cloned = [...stack];
  cloned[cloned.length - 1] = next;
  return cloned;
};

export const popSubViewStack = (stack: SubView[]): PopStackResult => {
  if (stack.length <= 1) {
    return {
      newStack: ['none'],
      nextView: 'none'
    };
  }
  const newStack = stack.slice(0, -1);
  return {
    newStack,
    nextView: newStack[newStack.length - 1] || 'none'
  };
};

export const isGoBackDebounced = (lastTimestamp: number, nowTimestamp: number): boolean =>
  nowTimestamp - lastTimestamp < GO_BACK_DEBOUNCE_MS;
