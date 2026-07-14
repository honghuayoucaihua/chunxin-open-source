import assert from 'node:assert/strict';
import { adaptLegacyBackupData } from '../src/appStateMigrationUtils.ts';

const migrated = adaptLegacyBackupData({
  contacts: [{
    id: 'c1',
    name: '旧联系人',
    avatar: '/avatar.png'
  }],
  settings: [
    {
      key: 'worldBooks',
      value: JSON.stringify([{
        id: 'wb-1',
        name: '旧世界书',
        content: '旧设定内容',
        contactId: 'c1'
      }])
    },
    {
      key: 'worldBookConfig',
      value: JSON.stringify({
        activeBookIds: ['wb-1']
      })
    }
  ]
});

assert.deepEqual(
  migrated.worldBooks,
  [{
    id: 'wb-1',
    name: '旧世界书',
    enabled: true,
    entries: [{ id: 'wb-1-e-0', text: '旧设定内容' }]
  }],
  '旧版 settings 仓里的世界书 JSON 字符串应迁移为新版世界书'
);
assert.deepEqual(
  migrated.contacts[0].worldBookIds,
  ['wb-1'],
  '旧版世界书联系人关联应迁移到联系人 worldBookIds'
);

console.log('测试通过：旧版世界书 JSON 字符串和联系人关联会被迁移。');
