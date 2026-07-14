import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';

const createMockDb = (versionRow: any) => ({
  prepare(sql: string) {
    return {
      bind() {
        return {
          async first() {
            return null;
          },
          async run() {
            return { success: true };
          },
          async all() {
            if (sql.includes('SELECT id, version, versionCode, apkUrl, apkSize, updateLog, forceUpdate, minVersion, created_at FROM apk_versions ORDER BY versionCode DESC, created_at DESC')) {
              return { results: versionRow ? [versionRow] : [] };
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
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/app/check-update?versionCode=300', {
      method: 'GET'
    }),
    env: {
      APP_DB: createMockDb({
        id: 'apk_1',
        version: '1.0.320',
        versionCode: 320,
        apkUrl: 'https://example.com/app.apk',
        apkSize: 123456,
        updateLog: '更新日志',
        forceUpdate: 0,
        minVersion: 310,
        created_at: 1
      })
    }
  } as any);

  assert.equal(response.status, 200, '检查更新接口应返回 200');
  const body = await response.json();
  assert.equal(body.hasUpdate, true);
  assert.equal(body.forceUpdate, true, '当前版本低于最低支持版本时应自动标记为强制更新');
  assert.equal(body.minVersion, 310);
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/app/check-update?versionCode=315', {
      method: 'GET'
    }),
    env: {
      APP_DB: createMockDb({
        id: 'apk_1',
        version: '1.0.320',
        versionCode: 320,
        apkUrl: 'https://example.com/app.apk',
        apkSize: 123456,
        updateLog: '更新日志',
        forceUpdate: 0,
        minVersion: 310,
        created_at: 1
      })
    }
  } as any);

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.hasUpdate, true);
  assert.equal(body.forceUpdate, false, '当前版本已达到最低支持版本时，不应仅因 minVersion 而强更');
}

console.log('测试通过：check-update 接口会根据最低支持版本自动判定强制更新。');
