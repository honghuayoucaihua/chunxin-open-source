import assert from 'node:assert/strict';
import { pickTeamNoticePreview, countUnreadTeamNotices } from '../src/utils/teamNoticePreview.ts';

{
  const preview = pickTeamNoticePreview([
    { id: 'n1', title: '旧公告', createdAt: 1700000000 }, // 秒级
    { id: 'n2', title: '新公告', createdAt: 1700000000000 }, // 毫秒级
    { id: 'n3', title: '无时间' },
    { id: 'n4', title: '无标题', createdAt: 1800000000000 }
  ]);
  assert.deepEqual(preview, { title: '无标题', createdAt: 1800000000000 }, '应选择 createdAt 最大的有效公告，并将秒级时间戳转换为毫秒');
}

{
  const preview = pickTeamNoticePreview([{ title: '只有一个', createdAt: 1700000000 }]);
  assert.deepEqual(preview, { title: '只有一个', createdAt: 1700000000 * 1000 }, '秒级 createdAt 应转换为毫秒');
}

{
  assert.equal(pickTeamNoticePreview([]), null, '空列表应返回 null');
  assert.equal(pickTeamNoticePreview(null), null, '非数组应返回 null');
}

console.log('测试通过：关于叙说公告预览选择逻辑符合预期。');

{
  // 复现：旧版没有未读计算，导致“关于叙说”新公告无法显示未读徽标
  // 期望：当公告 createdAt（兼容秒/毫秒）大于 lastReadAt 时，判定为未读
  const notices = [
    { id: 'n1', title: '旧公告', createdAt: 1700000000 }, // 秒级 => 1700000000000
    { id: 'n2', title: '新公告', createdAt: 1700000001000 }, // 毫秒级
    { id: 'n3', title: '更早公告', createdAt: 1600000000000 },
    { id: 'n4', title: '无时间' },
    { id: 'n5', title: '时间无效', createdAt: -1 }
  ];

  assert.equal(countUnreadTeamNotices(notices, 1700000000), 1, 'lastReadAt 为秒级时应按毫秒比较，只有 1700000001000 属于未读');
  assert.equal(countUnreadTeamNotices(notices, 1700000000000), 1, 'lastReadAt 为毫秒级时应保持不变');
  assert.equal(countUnreadTeamNotices(notices, 1800000000000), 0, 'lastReadAt 大于所有公告时间时应无未读');
  assert.equal(countUnreadTeamNotices(notices, null), 3, 'lastReadAt 无效时应视为 0，统计所有有效 createdAt 的公告为未读');
  assert.equal(countUnreadTeamNotices([], 0), 0, '空列表应无未读');
  assert.equal(countUnreadTeamNotices(null, 0), 0, '非数组应无未读');
}

console.log('测试通过：关于叙说公告未读数量计算逻辑符合预期。');
