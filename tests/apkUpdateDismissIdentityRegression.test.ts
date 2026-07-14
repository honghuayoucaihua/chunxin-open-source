import assert from 'node:assert/strict';
import { buildApkUpdateIdentity } from '../src/appBootstrapUtils.ts';

{
  const normal = buildApkUpdateIdentity({
    version: '1.0.320',
    versionCode: 320,
    forceUpdate: false,
    minVersion: undefined
  } as any);
  const forced = buildApkUpdateIdentity({
    version: '1.0.320',
    versionCode: 320,
    forceUpdate: true,
    minVersion: undefined
  } as any);

  assert.notEqual(forced, normal, '同一版本切换为强制更新后，忽略标识应变化，避免沿用旧的“稍后再说”状态');
}

{
  const lowerFloor = buildApkUpdateIdentity({
    version: '1.0.320',
    versionCode: 320,
    forceUpdate: false,
    minVersion: 300
  } as any);
  const higherFloor = buildApkUpdateIdentity({
    version: '1.0.320',
    versionCode: 320,
    forceUpdate: false,
    minVersion: 310
  } as any);

  assert.notEqual(higherFloor, lowerFloor, '同一版本调整最低支持版本后，忽略标识也应变化');
}

console.log('测试通过：APK 更新忽略标识会区分强更状态和最低支持版本。');
