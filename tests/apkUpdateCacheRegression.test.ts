import assert from 'node:assert/strict';
import {
  APK_UPDATE_CACHE_DIR,
  buildApkCachePath,
  isApkCacheEntry,
  listApkCacheDeletionPaths
} from '../src/services/apkUpdateCachePolicy.ts';

{
  assert.equal(APK_UPDATE_CACHE_DIR, 'updates', 'APK 更新缓存目录应固定在 updates，避免散落多处');
  assert.equal(buildApkCachePath('xushuo-v10258.apk'), 'updates/xushuo-v10258.apk');
}

{
  assert.equal(isApkCacheEntry({ name: 'xushuo-v10258.apk', type: 'file' }), true, 'APK 文件应被识别为缓存清理候选');
  assert.equal(isApkCacheEntry({ name: 'notes.txt', type: 'file' }), false, '非 APK 文件不应被误删');
  assert.equal(isApkCacheEntry({ name: 'nested', type: 'directory' }), false, '目录项不应被当成 APK 文件清理');
}

{
  const deletionPaths = listApkCacheDeletionPaths([
    { name: 'xushuo-v10256.apk', type: 'file' },
    { name: 'xushuo-v10257.apk', type: 'file' },
    { name: 'readme.txt', type: 'file' },
    { name: 'images', type: 'directory' }
  ]);

  assert.deepEqual(
    deletionPaths,
    ['updates/xushuo-v10256.apk', 'updates/xushuo-v10257.apk'],
    '清理缓存时应只删除旧 APK 文件，不应误伤其他缓存内容'
  );
}

{
  const deletionPaths = listApkCacheDeletionPaths([
    { name: 'xushuo-v10257.apk', type: 'file' },
    { name: 'xushuo-v10258.apk', type: 'file' }
  ], ['xushuo-v10258.apk']);

  assert.deepEqual(
    deletionPaths,
    ['updates/xushuo-v10257.apk'],
    '需要保留当前安装包时，不应把它一起删掉'
  );
}

console.log('测试通过：APK 缓存清理策略会只删除旧 APK，并保留需要继续使用的当前安装包。');
