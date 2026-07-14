import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';
import { updateApkVersion } from '../cloudflare/pages-functions/data.js';

const existingVersionRow = {
  id: 'apk_1',
  version: '1.2.3',
  versionCode: 123,
  apkUrl: 'https://example.com/app.apk',
  apkSize: 456789,
  updateLog: '旧日志',
  forceUpdate: 1,
  minVersion: 120,
  created_at: 1710000000000
};

{
  const updates: Array<any[]> = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...params: any[]) {
          return {
            async first() {
              if (sql.includes('SELECT id, version, versionCode, apkUrl, apkSize, updateLog, forceUpdate, minVersion FROM apk_versions WHERE id = ? LIMIT 1')) {
                return existingVersionRow;
              }
              if (sql.includes('UPDATE apk_versions') && sql.includes('RETURNING id')) {
                updates.push(params);
                return { id: 'apk_1' };
              }
              return null;
            },
            async run() {
              return { success: true };
            },
            async all() {
              return { results: [] };
            }
          };
        },
        async run() {
          return { success: true };
        }
      };
    }
  };

  const result = await updateApkVersion({ APP_DB: db } as any, 'apk_1', {
    updateLog: '新日志'
  });

  assert.deepEqual(result, {
    id: 'apk_1',
    version: '1.2.3',
    versionCode: 123,
    apkUrl: 'https://example.com/app.apk',
    apkSize: 456789,
    updateLog: '新日志',
    forceUpdate: true,
    minVersion: 120
  }, '版本部分更新时应保留未传字段，而不是把已有版本信息清空');
  assert.equal(updates.length, 1, '版本部分更新时应只执行一次数据库更新');
  assert.equal(updates[0][0], '1.2.3');
  assert.equal(updates[0][1], 123);
  assert.equal(updates[0][2], 'https://example.com/app.apk');
  assert.equal(updates[0][3], 456789);
  assert.equal(updates[0][4], '新日志');
  assert.equal(updates[0][5], 1);
  assert.equal(updates[0][6], 120);
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/versions/apk_1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: JSON.stringify({
        updateLog: '只改日志'
      })
    }),
    env: {
      ADMIN_KEY: 'secret',
      APP_DB: {
        prepare(sql: string) {
          return {
            bind(...params: any[]) {
              return {
                async first() {
                  if (sql.includes('SELECT id, version, versionCode, apkUrl, apkSize, updateLog, forceUpdate, minVersion FROM apk_versions WHERE id = ? LIMIT 1')) {
                    return existingVersionRow;
                  }
                  if (sql.includes('UPDATE apk_versions') && sql.includes('RETURNING id')) {
                    return { id: 'apk_1' };
                  }
                  return null;
                },
                async run() {
                  return { success: true };
                },
                async all() {
                  return { results: [] };
                }
              };
            },
            async run() {
              return { success: true };
            }
          };
        }
      }
    }
  } as any);

  assert.equal(response.status, 200, '版本部分更新应返回 200');
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.version.updateLog, '只改日志');
  assert.equal(body.version.version, '1.2.3');
  assert.equal(body.version.versionCode, 123);
  assert.equal(body.version.apkUrl, 'https://example.com/app.apk');
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/versions/apk_1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: JSON.stringify({
        apkUrl: ''
      })
    }),
    env: {
      ADMIN_KEY: 'secret',
      APP_DB: {
        prepare(sql: string) {
          return {
            bind() {
              return {
                async first() {
                  if (sql.includes('SELECT id, version, versionCode, apkUrl, apkSize, updateLog, forceUpdate, minVersion FROM apk_versions WHERE id = ? LIMIT 1')) {
                    return existingVersionRow;
                  }
                  return null;
                },
                async run() {
                  return { success: true };
                },
                async all() {
                  return { results: [] };
                }
              };
            },
            async run() {
              return { success: true };
            }
          };
        }
      }
    }
  } as any);

  assert.equal(response.status, 400, '显式清空 APK 地址这类关键字段时应返回 400');
  const body = await response.json();
  assert.equal(body.error, '版本号、版本代码、APK 地址不能为空');
}

console.log('测试通过：APK 版本部分更新会保留旧字段，关键字段显式传空时会稳定返回 400。');
