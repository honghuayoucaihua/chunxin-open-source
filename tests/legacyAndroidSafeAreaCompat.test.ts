import assert from 'node:assert/strict';
import { resolveLegacyAndroidSafeAreaCompat } from '../src/services/nativeSafeAreaCompat.ts';

{
  const result = resolveLegacyAndroidSafeAreaCompat({ isNativeAndroid: true, versionCode: 10187 });
  assert.deepEqual(
    result,
    { legacy: true, safeTopCapPx: 59, safeBottomCapPx: 16 },
    '旧版 Android APK 应放宽顶部安全区上限，避免状态栏与内容重叠'
  );
}

{
  const result = resolveLegacyAndroidSafeAreaCompat({ isNativeAndroid: true, versionCode: 10188 });
  assert.equal(result.legacy, false, '修复基线及之后的 Android APK 不应启用旧版安全区兼容分支');
}

{
  const result = resolveLegacyAndroidSafeAreaCompat({ isNativeAndroid: false, versionCode: 10100 });
  assert.equal(result.legacy, false, '非 Android 原生环境不应启用旧版安全区兼容分支');
}

console.log('测试通过：旧版 Android 安全区兼容判定符合预期。');
