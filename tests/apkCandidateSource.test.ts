import assert from 'node:assert/strict';
import {
  __apkCandidateInternals,
  createApkCandidateSource
} from '../cloudflare/pages-functions/apk-candidate.js';

{
  const metadataUrl = __apkCandidateInternals.buildMetadataUrl('https://r2.xushuo.cc/', 'apk/candidates/latest.json');
  assert.equal(metadataUrl, 'https://r2.xushuo.cc/apk/candidates/latest.json', '应正确拼接候选元数据地址');
}

{
  const normalized = __apkCandidateInternals.normalizeMetadataRecord({
    version: '1.0.203',
    versionCode: 10542,
    filename: 'xushuo-v10542.apk',
    apkUrl: 'https://r2.xushuo.cc/apk/xushuo-v10542.apk',
    apkSize: 222222,
    updateLog: 'GitHub Actions 自动构建候选 APK',
    createdAt: 1746439200000
  });

  assert.equal(normalized?.versionCode, 10542, '应保留候选构建号');
  assert.equal(normalized?.apkUrl, 'https://r2.xushuo.cc/apk/xushuo-v10542.apk', '候选 APK 下载地址应指向 R2');
  assert.equal(normalized?.source, 'r2-candidate', '候选源标识应为 r2-candidate');
}

{
  const forced = __apkCandidateInternals.normalizeMetadataRecord({
    version: '1.0.204',
    versionCode: 10543,
    filename: 'xushuo-v10543.apk',
    apkUrl: 'https://r2.xushuo.cc/apk/xushuo-v10543.apk',
    forceUpdate: 'true',
    minVersion: '10500'
  });
  const notForced = __apkCandidateInternals.normalizeMetadataRecord({
    version: '1.0.205',
    versionCode: 10544,
    filename: 'xushuo-v10544.apk',
    apkUrl: 'https://r2.xushuo.cc/apk/xushuo-v10544.apk',
    forceUpdate: 'false',
    minVersion: null
  });

  assert.equal(forced?.forceUpdate, true, '字符串 true 应被识别为强制更新');
  assert.equal(forced?.minVersion, 10500, '字符串最小版本号应正确转为数字');
  assert.equal(notForced?.forceUpdate, false, '字符串 false 不应被误判为强制更新');
}

{
  let fetchCount = 0;
  const source = createApkCandidateSource({
    env: {
      APK_R2_PUBLIC_BASE_URL: 'https://r2.xushuo.cc'
    },
    now: (() => {
      let current = 1000;
      return () => current++;
    })(),
    fetchImpl: (async () => {
      fetchCount += 1;
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            version: '1.0.203',
            versionCode: 10542,
            filename: 'xushuo-v10542.apk',
            apkUrl: 'https://r2.xushuo.cc/apk/xushuo-v10542.apk',
            apkSize: 222222,
            updateLog: 'GitHub Actions 自动构建候选 APK',
            forceUpdate: false,
            minVersion: null,
            createdAt: 1746439200000
          };
        }
      } as Response;
    }) as typeof fetch,
    log: {
      warn() {}
    } as Console
  });

  const latest = await source.getLatestCandidate();
  const cached = await source.getLatestCandidate();

  assert.equal(fetchCount, 1, '缓存生效时不应重复请求候选元数据');
  assert.equal(latest?.versionCode, 10542, '应返回最新候选构建号');
  assert.equal(latest?.apkUrl, 'https://r2.xushuo.cc/apk/xushuo-v10542.apk', '候选包地址应保持为 R2 公网地址');
  assert.deepEqual(cached, latest, '缓存命中结果应一致');
}

{
  let fetchCount = 0;
  const source = createApkCandidateSource({
    env: {
      APK_R2_PUBLIC_BASE_URL: 'https://r2.xushuo.cc'
    },
    now: (() => {
      let current = 2000;
      return () => current++;
    })(),
    fetchImpl: (async () => {
      fetchCount += 1;
      return {
        ok: false,
        status: 404
      } as Response;
    }) as typeof fetch,
    log: {
      warn() {}
    } as Console
  });

  const latest = await source.getLatestCandidate();
  const cached = await source.getLatestCandidate();

  assert.equal(latest, null, '404 候选元数据应被视为当前无候选包');
  assert.equal(cached, null, '空候选结果也应能命中缓存');
  assert.equal(fetchCount, 1, '无候选包时也应缓存空结果，避免反复请求 R2');
}

{
  const safeText = __apkCandidateInternals.formatUpstreamErrorText(
    `api_key=secret-key Authorization: Bearer secret-token ${'x'.repeat(500)}`,
    80
  );

  assert.doesNotMatch(safeText, /secret-key|secret-token/, '候选元数据错误正文不应暴露密钥或令牌');
  assert.ok(safeText.length <= 83, '候选元数据错误正文应被截断，避免透传大段上游内容');
}

console.log('测试通过：候选 APK 源支持读取 R2 元数据并缓存。');
