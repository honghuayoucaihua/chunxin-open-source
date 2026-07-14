import assert from 'node:assert/strict';
import { adaptLegacyBackupData } from '../src/appStateMigrationUtils.ts';

const migrated = adaptLegacyBackupData({
  contacts: [],
  settings: [
    {
      key: 'userProfile',
      value: JSON.stringify({
        name: '旧用户',
        wechatId: 'old-id',
        balance: 88,
        avatar: '/old-avatar.png'
      })
    },
    {
      key: 'aiConfig',
      value: JSON.stringify({
        provider: 'gemini',
        apiKey: 'gemini-key',
        model: 'gemini-2.5-pro',
        baseUrl: 'https://generativelanguage.googleapis.com',
        enableSentenceSend: true,
        timeAware: true
      })
    },
    {
      key: 'appearanceConfig',
      value: JSON.stringify({
        theme: 'dark',
        fontSize: 1.2,
        chatBackground: '/old-bg.png'
      })
    }
  ]
});

assert.equal(migrated.user.name, '旧用户', '旧版 userProfile JSON 字符串应迁移为用户名');
assert.equal(migrated.user.wechatId, 'old-id', '旧版 userProfile JSON 字符串应迁移为微信号');
assert.equal(migrated.user.balance, 88, '旧版 userProfile JSON 字符串应迁移余额');
assert.equal(migrated.aiSettings.provider, 'gemini', '旧版 aiConfig JSON 字符串应迁移 AI 服务商');
assert.equal(migrated.aiSettings.model, 'gemini-2.5-pro', '旧版 aiConfig JSON 字符串应迁移模型');
assert.equal(migrated.settings.themeMode, 'dark', '旧版 appearanceConfig JSON 字符串应迁移主题');
assert.equal(migrated.settings.chatBg, '/old-bg.png', '旧版 appearanceConfig JSON 字符串应迁移聊天背景');

console.log('测试通过：旧版 settings 仓里的 JSON 字符串配置会被解析并迁移。');
