import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';

const createMockDb = () => ({
  prepare(sql: string) {
    return {
      bind(...params: any[]) {
        return {
          async first() {
            if (sql.includes('SELECT value FROM app_settings WHERE key = ? LIMIT 1')) {
              return null;
            }
            return null;
          },
          async run() {
            return { success: true, meta: { changes: 1 } };
          },
          async all() {
            if (sql.includes('SELECT id, version, versionCode, apkUrl, apkSize, updateLog, forceUpdate, minVersion, created_at FROM apk_versions ORDER BY versionCode DESC, created_at DESC')) {
              return { results: [] };
            }
            return { results: [] };
          }
        };
      },
      async run() {
        return { success: true };
      }
    };
  }
});

{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    version: '1.0.300',
    versionCode: 10300,
    apkUrl: 'https://r2.example.com/apk/xushuo-v10300.apk',
    apkSize: 345678,
    updateLog: '候选包日志',
    forceUpdate: true,
    minVersion: 10250,
    createdAt: 1747000000000
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  try {
    const response = await handleApiRequest({
      request: new Request('https://example.com/api/admin/apk/publish-candidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'secret'
        },
        body: JSON.stringify({})
      }),
      env: {
        ADMIN_KEY: 'secret',
        APP_DB: createMockDb(),
        APK_R2_CANDIDATE_METADATA_URL: 'https://r2.example.com/apk/candidates/latest.json'
      }
    } as any);

    assert.equal(response.status, 200, '直接发布候选包应返回 200');
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.version.version, '1.0.300');
    assert.equal(body.version.versionCode, 10300);
    assert.equal(body.version.forceUpdate, true, '未显式传参时应继承候选包的强更标记');
    assert.equal(body.version.minVersion, 10250, '未显式传参时应继承候选包的最小支持版本');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    version: '1.0.301',
    versionCode: 10301,
    apkUrl: 'https://r2.example.com/apk/xushuo-v10301.apk',
    apkSize: 456789,
    updateLog: '候选包日志',
    forceUpdate: true,
    minVersion: 10260,
    createdAt: 1747000001000
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  try {
    const response = await handleApiRequest({
      request: new Request('https://example.com/api/admin/apk/publish-candidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'secret'
        },
        body: JSON.stringify({
          forceUpdate: false,
          minVersion: 10100
        })
      }),
      env: {
        ADMIN_KEY: 'secret',
        APP_DB: createMockDb(),
        APK_R2_CANDIDATE_METADATA_URL: 'https://r2.example.com/apk/candidates/latest.json'
      }
    } as any);

    assert.equal(response.status, 200, '显式覆盖候选发布参数时应返回 200');
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.version.forceUpdate, false, '显式传入 forceUpdate 时应覆盖候选值');
    assert.equal(body.version.minVersion, 10100, '显式传入 minVersion 时应覆盖候选值');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log('测试通过：发布候选 APK 时会默认继承候选元数据，并允许显式覆盖强更与最低版本。');
