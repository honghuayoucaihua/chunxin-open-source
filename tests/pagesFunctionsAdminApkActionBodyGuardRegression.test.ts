import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';

{
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response('{}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  try {
    const response = await handleApiRequest({
      request: new Request('https://example.com/api/admin/apk/publish-candidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'secret'
        },
        body: '{'
      }),
      env: {
        ADMIN_KEY: 'secret',
        APP_DB: {
          prepare() {
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
                    return { results: [] };
                  }
                };
              },
              async run() {
                return { success: true };
              }
            };
          }
        },
        APK_R2_CANDIDATE_METADATA_URL: 'https://r2.example.com/apk/candidates/latest.json'
      }
    } as any);

    assert.equal(response.status, 400, '候选发布接口遇到非法 JSON 时应直接返回 400');
    const body = await response.json();
    assert.equal(body.error, '请求格式错误');
    assert.equal(fetchCalls, 0, '非法 JSON 不应继续请求候选元数据');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

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
      body: '{'
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
                        { id: 'apk_3', version: '1.0.3', versionCode: 3, apkUrl: 'https://example.com/3.apk', created_at: 3 },
                        { id: 'apk_2', version: '1.0.2', versionCode: 2, apkUrl: 'https://example.com/2.apk', created_at: 2 },
                        { id: 'apk_1', version: '1.0.1', versionCode: 1, apkUrl: 'https://example.com/1.apk', created_at: 1 }
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

  assert.equal(response.status, 400, '版本清理接口遇到非法 JSON 时应直接返回 400');
  const body = await response.json();
  assert.equal(body.error, '请求格式错误');
  assert.equal(listed, 0, '非法 JSON 不应继续读取版本列表');
  assert.equal(deleted, 0, '非法 JSON 不应触发任何版本删除');
}

console.log('测试通过：后台 APK 发布与清理操作会拦截非法 JSON，避免误触发管理动作。');
