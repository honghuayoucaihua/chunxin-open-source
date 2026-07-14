import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';

{
  let listed = 0;
  let deleted = 0;
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/versions/cleanup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: JSON.stringify({
        keepCount: 'abc'
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
                  if (sql.includes('DELETE FROM apk_versions WHERE id = ? RETURNING id')) {
                    deleted += 1;
                    return { id: 'apk_deleted' };
                  }
                  return null;
                },
                async run() {
                  return { success: true };
                },
                async all() {
                  if (sql.includes('SELECT id, version, versionCode, apkUrl, apkSize, updateLog, forceUpdate, minVersion, created_at FROM apk_versions ORDER BY versionCode DESC, created_at DESC')) {
                    listed += 1;
                    return {
                      results: [
                        { id: 'apk_4', version: '1.0.4', versionCode: 4, apkUrl: 'https://example.com/4.apk', forceUpdate: 0, minVersion: null, created_at: 4 },
                        { id: 'apk_3', version: '1.0.3', versionCode: 3, apkUrl: 'https://example.com/3.apk', forceUpdate: 0, minVersion: null, created_at: 3 },
                        { id: 'apk_2', version: '1.0.2', versionCode: 2, apkUrl: 'https://example.com/2.apk', forceUpdate: 0, minVersion: null, created_at: 2 },
                        { id: 'apk_1', version: '1.0.1', versionCode: 1, apkUrl: 'https://example.com/1.apk', forceUpdate: 0, minVersion: null, created_at: 1 }
                      ]
                    };
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
      }
    }
  } as any);

  assert.equal(response.status, 400, '非法 keepCount 应返回 400，而不是继续清理版本');
  const body = await response.json();
  assert.equal(body.error, '保留数量格式错误');
  assert.equal(listed, 0, '非法 keepCount 不应继续读取版本列表');
  assert.equal(deleted, 0, '非法 keepCount 不应触发任何版本删除');
}

{
  let deletedIds: string[] = [];
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/versions/cleanup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: JSON.stringify({
        keepCount: 2
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
                  if (sql.includes('DELETE FROM apk_versions WHERE id = ? RETURNING id')) {
                    deletedIds.push(String(params[0] || ''));
                    return { id: String(params[0] || '') };
                  }
                  return null;
                },
                async run() {
                  return { success: true };
                },
                async all() {
                  if (sql.includes('SELECT id, version, versionCode, apkUrl, apkSize, updateLog, forceUpdate, minVersion, created_at FROM apk_versions ORDER BY versionCode DESC, created_at DESC')) {
                    return {
                      results: [
                        { id: 'apk_4', version: '1.0.4', versionCode: 4, apkUrl: 'https://example.com/4.apk', forceUpdate: 0, minVersion: null, created_at: 4 },
                        { id: 'apk_3', version: '1.0.3', versionCode: 3, apkUrl: 'https://example.com/3.apk', forceUpdate: 0, minVersion: null, created_at: 3 },
                        { id: 'apk_2', version: '1.0.2', versionCode: 2, apkUrl: 'https://example.com/2.apk', forceUpdate: 0, minVersion: null, created_at: 2 },
                        { id: 'apk_1', version: '1.0.1', versionCode: 1, apkUrl: 'https://example.com/1.apk', forceUpdate: 0, minVersion: null, created_at: 1 }
                      ]
                    };
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
      }
    }
  } as any);

  assert.equal(response.status, 200, '合法 keepCount 应继续正常清理');
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.removedCount, 2);
  assert.deepEqual(deletedIds, ['apk_2', 'apk_1'], '应只删除保留数量之后的旧版本');
}

console.log('测试通过：版本清理接口会拦截非法 keepCount，并只按合法保留数量删除旧版本。');
