import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const storageSource = readFileSync(new URL('../src/services/storage.ts', import.meta.url), 'utf8');

for (const legacyStore of [
  'shopItems.length > 0',
  'inventory.length > 0',
  'musicCache.length > 0',
  'fonts.length > 0'
]) {
  assert.ok(storageSource.includes(legacyStore), `旧版迁移判定应覆盖历史对象仓：${legacyStore}`);
}

for (const localSetting of [
  '!!localSyshuoLimitBoostRaw',
  '!!localCustomCodeConfigRaw'
]) {
  assert.ok(storageSource.includes(localSetting), `旧版迁移判定应覆盖本地配置：${localSetting}`);
}

console.log('测试通过：旧版数据迁移发现条件覆盖历史对象仓和本地配置。');
