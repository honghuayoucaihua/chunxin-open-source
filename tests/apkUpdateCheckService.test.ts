import assert from 'node:assert/strict';
import { normalizeUpdateInfo } from '../src/services/apkUpdateNormalization.ts';

{
  const info = normalizeUpdateInfo('https://example.com', {
    version: '1.0.300',
    versionCode: 300,
    apkUrl: '/apk/app.apk',
    apkSize: '123456',
    updateLog: '更新内容',
    forceUpdate: 'false'
  } as any, 299);

  assert.equal(info.hasUpdate, true, '新版本号高于当前版本时应识别为有更新');
  assert.equal(info.apkUrl, 'https://example.com/apk/app.apk', '相对 APK 地址应补全为绝对地址');
  assert.equal(info.forceUpdate, false, '字符串 false 不应被误判为强制更新');
}

{
  const info = normalizeUpdateInfo('https://example.com', {
    version: '1.0.301',
    versionCode: 301,
    apkUrl: 'https://cdn.example.com/app.apk',
    forceUpdate: 'true'
  } as any, 300);

  assert.equal(info.forceUpdate, true, '字符串 true 应被识别为强制更新');
}

{
  const info = normalizeUpdateInfo('https://example.com', {
    version: '1.0.300',
    versionCode: 300,
    apkUrl: 'https://cdn.example.com/app.apk',
    minVersion: 320,
    forceUpdate: true
  } as any, 300);

  assert.equal(info.hasUpdate, false, '相同版本号不应判定为更新');
  assert.equal(info.forceUpdate, false, '没有更新时即使服务端标记强更也不应展示强更');
}

{
  const info = normalizeUpdateInfo('https://example.com', {
    version: '1.0.320',
    versionCode: 320,
    apkUrl: 'https://cdn.example.com/app.apk',
    minVersion: 310,
    forceUpdate: false
  } as any, 300);

  assert.equal(info.hasUpdate, true, '服务端版本更高时应识别为更新');
  assert.equal(info.forceUpdate, true, '当前版本低于最低支持版本时应自动按强更处理');
}

console.log('测试通过：APK 更新检查会稳定解析强更标记，并避免把字符串 false 误判为强更。');
