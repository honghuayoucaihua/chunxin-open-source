import assert from 'node:assert/strict';
import {
  applyCommunityImportResult,
  applyCommunityLikeResult,
  applyCommunityReportResult,
  createCommunityDetailActionState
} from '../src/community/communityDetailState.ts';
import type { CommunityShareItem } from '../src/community/communityTypes.ts';

const baseDetail: CommunityShareItem = {
  id: 'share_1',
  type: 'contact',
  name: '测试分享',
  description: '测试描述',
  avatar: '',
  cover_image: '',
  author_name: '作者',
  is_anonymous: 0,
  is_encrypted: 0,
  like_count: 3,
  download_count: 7,
  report_count: 1,
  created_at: 1710000000000
};

const initialState = createCommunityDetailActionState(baseDetail, false, false);

const likedState = applyCommunityLikeResult(initialState, 4);
assert.equal(likedState.liked, true, '点赞成功后应立即切换为已点赞');
assert.equal(likedState.detail.like_count, 4, '点赞成功后详情里的点赞数应立即同步');
assert.equal(initialState.detail.like_count, 3, '点赞状态更新不应污染旧对象');

const unlikedState = applyCommunityLikeResult(likedState, 2);
assert.equal(unlikedState.liked, false, '取消点赞后应立即切换为未点赞');
assert.equal(unlikedState.detail.like_count, 2, '取消点赞后详情里的点赞数应立即同步');

const reportedState = applyCommunityReportResult(initialState, 2);
assert.equal(reportedState.reported, true, '举报成功后应立即标记为已举报');
assert.equal(reportedState.detail.report_count, 2, '举报成功后详情里的举报数应立即同步');
assert.equal(reportedState.detail.like_count, initialState.detail.like_count, '举报成功不应误改点赞数');

const importedState = applyCommunityImportResult(initialState);
assert.equal(importedState.detail.download_count, 8, '导入成功后详情里的下载数应立即加一');
assert.equal(importedState.liked, initialState.liked, '导入成功不应误改点赞状态');
assert.equal(importedState.reported, initialState.reported, '导入成功不应误改举报状态');

console.log('测试通过：社区详情页的点赞、举报、下载本地状态会与成功操作立即保持一致。');
