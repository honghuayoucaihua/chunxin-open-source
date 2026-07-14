import assert from 'node:assert/strict';
import { adaptLegacyBackupData } from '../src/appStateMigrationUtils.ts';
import { DEFAULT_SOUND_VIBRATION_SETTINGS } from '../src/constants.ts';

const migrated = adaptLegacyBackupData({
  contacts: [],
  messages: {},
  user: { id: 'me', name: '我', balance: 0 },
  localStorage: {
    soundSettings: JSON.stringify({ enabled: false })
  }
});

assert.equal(
  migrated.soundVibrationSettings?.sendSoundEnabled,
  false,
  '已有新版根状态时，也应迁移旧版发送声音开关'
);
assert.equal(
  migrated.soundVibrationSettings?.receiveSoundEnabled,
  false,
  '已有新版根状态时，也应迁移旧版接收声音开关'
);
assert.equal(
  migrated.soundVibrationSettings?.sendSoundSrc,
  DEFAULT_SOUND_VIBRATION_SETTINGS.sendSoundSrc,
  '旧版声音设置迁移应补齐默认发送音效'
);

console.log('测试通过：已有新版根状态时仍会迁移旧版 localStorage 声音设置。');
