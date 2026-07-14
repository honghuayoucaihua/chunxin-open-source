import type { MutableRefObject } from 'react';
import { createNumericVersionGuard } from './taskGuard';

export type ReplyTaskVersionRef = MutableRefObject<Record<string, number>>;
export type ReplyTaskVersionRefLike = ReplyTaskVersionRef | undefined;

const readVersion = (ref: ReplyTaskVersionRefLike, chatId: string): number => {
  if (!ref) return 0;
  return Number(ref.current[chatId] || 0);
};

export const bumpReplyTaskVersion = (
  ref: ReplyTaskVersionRefLike,
  chatId: string
): number => {
  if (!ref) return 0;
  const nextVersion = readVersion(ref, chatId) + 1;
  ref.current = {
    ...ref.current,
    [chatId]: nextVersion
  };
  return nextVersion;
};

export const isReplyTaskVersionCurrent = (
  ref: ReplyTaskVersionRefLike,
  chatId: string,
  version: number
): boolean => {
  if (!ref) return true;
  return readVersion(ref, chatId) === version;
};

export const createReplyTaskGuard = (
  ref: ReplyTaskVersionRefLike,
  chatId: string,
  options: { bump?: boolean } = {}
) => {
  const version = options.bump ? bumpReplyTaskVersion(ref, chatId) : readVersion(ref, chatId);
  return createNumericVersionGuard(() => readVersion(ref, chatId), version);
};
