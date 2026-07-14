import type { CommunityShareItem } from './communityTypes';

export interface CommunityDetailActionState {
  detail: CommunityShareItem;
  liked: boolean;
  reported: boolean;
}

export const createCommunityDetailActionState = (
  detail: CommunityShareItem,
  liked: boolean,
  reported: boolean
): CommunityDetailActionState => ({
  detail,
  liked,
  reported
});

export const applyCommunityLikeResult = (
  state: CommunityDetailActionState,
  nextLikeCount: number
): CommunityDetailActionState => ({
  detail: {
    ...state.detail,
    like_count: Math.max(0, Math.floor(Number(nextLikeCount) || 0))
  },
  liked: !state.liked,
  reported: state.reported
});

export const applyCommunityReportResult = (
  state: CommunityDetailActionState,
  nextReportCount: number
): CommunityDetailActionState => ({
  detail: {
    ...state.detail,
    report_count: Math.max(0, Math.floor(Number(nextReportCount) || 0))
  },
  liked: state.liked,
  reported: true
});

export const applyCommunityImportResult = (
  state: CommunityDetailActionState
): CommunityDetailActionState => ({
  detail: {
    ...state.detail,
    download_count: Math.max(0, Math.floor(Number(state.detail.download_count) || 0) + 1)
  },
  liked: state.liked,
  reported: state.reported
});
