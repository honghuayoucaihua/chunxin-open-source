import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveApkReleaseMeta } from '../scripts/resolveApkReleaseMeta.js';

{
  const meta = await resolveApkReleaseMeta({
    env: {},
    fetchImpl: undefined as any
  });

  assert.equal(meta.baseVersion, '1.0.258', '没有远端元数据时应读取 package.json 当前版本');
  assert.equal(meta.baseBuildNumber, 10258, '没有远端元数据时应读取 package.json 当前 buildNumber');
  assert.equal(meta.versionName, '1.0.259', '应按 gx 规则只做 patch + 1');
  assert.equal(meta.buildNumber, 10259, '应按 gx 规则只做 buildNumber + 1');
  assert.equal(meta.apkName, 'xushuo-v10259.apk', 'APK 文件名应跟随新的 buildNumber');
}

{
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apk-meta-'));
  const metadataPath = path.join(tempDir, 'latest.json');
  fs.writeFileSync(metadataPath, JSON.stringify({
    version: '1.0.260',
    versionCode: 10260
  }));

  const meta = await resolveApkReleaseMeta({
    env: {
      APK_PREVIOUS_METADATA_PATH: metadataPath,
      R2_PUBLIC_BASE_URL: 'https://r2.xushuo.cc'
    },
    fetchImpl: (async () => {
      throw new Error('有本地元数据文件时不应再请求公网地址');
    }) as unknown as typeof fetch
  });

  assert.equal(meta.baseVersion, '1.0.260', '有本地元数据文件且版本更新时应优先使用文件中的版本');
  assert.equal(meta.baseBuildNumber, 10260, '有本地元数据文件且构建号更新时应优先使用文件中的 buildNumber');
  assert.equal(meta.versionName, '1.0.261', '文件中的版本号仍应继续做 patch + 1');
  assert.equal(meta.buildNumber, 10261, '文件中的 buildNumber 仍应继续做 +1');
}

{
  const meta = await resolveApkReleaseMeta({
    env: {
      R2_PUBLIC_BASE_URL: 'https://r2.xushuo.cc'
    },
    fetchImpl: (async () => ({
      ok: true,
      async json() {
        return {
          version: '1.0.261',
          versionCode: 10261
        };
      }
    })) as unknown as typeof fetch
  });

  assert.equal(meta.baseVersion, '1.0.261', '有远端元数据且版本更新时应优先使用当前线上版本');
  assert.equal(meta.baseBuildNumber, 10261, '有远端元数据且构建号更新时应优先使用当前线上 buildNumber');
  assert.equal(meta.versionName, '1.0.262', '线上已有版本时应继续做 patch + 1');
  assert.equal(meta.buildNumber, 10262, '线上已有 buildNumber 时应继续做 +1');
  assert.equal(meta.apkName, 'xushuo-v10262.apk', 'APK 文件名应与新的 buildNumber 一致');
}

{
  const meta = await resolveApkReleaseMeta({
    env: {
      APK_BUILD_SEQUENCE: '4',
      APK_PREVIOUS_METADATA_URL: 'https://r2.xushuo.cc/apk/candidates/latest.json'
    },
    fetchImpl: (async () => ({
      ok: false
    })) as unknown as typeof fetch
  });

  assert.equal(meta.baseVersion, '1.0.261', '远端元数据不可用时应使用 GitHub 运行序号继续推进版本');
  assert.equal(meta.baseBuildNumber, 10261, 'GitHub 第 4 次运行应以 package buildNumber + 3 作为基准');
  assert.equal(meta.versionName, '1.0.262', '兜底版本号仍应按 patch + 1 生成');
  assert.equal(meta.buildNumber, 10262, '兜底构建号应随 GitHub 运行序号递增，避免重复 10259');
}

{
  const meta = await resolveApkReleaseMeta({
    env: {
      APK_BUILD_SEQUENCE: '4',
      APK_PREVIOUS_METADATA_URL: 'https://r2.xushuo.cc/apk/candidates/latest.json'
    },
    fetchImpl: (async () => ({
      ok: true,
      async json() {
        return {
          version: '1.0.259',
          versionCode: 10259,
          source: 'github-actions'
        };
      }
    })) as unknown as typeof fetch
  });

  assert.equal(meta.baseVersion, '1.0.261', 'R2 候选元数据停在旧版本时，仍应按本次构建序号继续推进');
  assert.equal(meta.baseBuildNumber, 10261, '构建序号应优先避免旧候选元数据卡住版本号');
  assert.equal(meta.versionName, '1.0.262', '旧候选元数据不应导致版本号重复');
  assert.equal(meta.buildNumber, 10262, '旧候选元数据不应导致构建号重复');
  assert.equal(meta.metadataSource, 'build-sequence', '应能看出本次版本来自稳定构建序号');
}

console.log('测试通过：APK 发布版本号会按 gx 规则基于当前最新版本只加 1。');
