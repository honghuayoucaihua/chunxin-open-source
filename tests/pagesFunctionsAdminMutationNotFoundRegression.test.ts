import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';

const createMockDb = () => ({
  prepare(sql: string) {
    return {
      bind() {
        return {
          async first() {
            if (sql.includes('DELETE FROM passphrases WHERE id = ? RETURNING id')) {
              return null;
            }
            if (sql.includes('DELETE FROM team_notices WHERE id = ? RETURNING id')) {
              return null;
            }
            if (sql.includes('UPDATE donors SET') && sql.includes('RETURNING id')) {
              return null;
            }
            if (sql.includes('DELETE FROM donors WHERE id = ? RETURNING id')) {
              return null;
            }
            if (sql.includes('UPDATE apk_versions') && sql.includes('RETURNING id')) {
              return null;
            }
            if (sql.includes('DELETE FROM apk_versions WHERE id = ? RETURNING id')) {
              return null;
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
});

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/passphrases/pp_missing', {
      method: 'DELETE',
      headers: {
        'x-admin-key': 'secret'
      }
    }),
    env: {
      ADMIN_KEY: 'secret',
      APP_DB: createMockDb()
    }
  } as any);

  assert.equal(response.status, 404, '删除不存在的口令应返回 404');
  const body = await response.json();
  assert.equal(body.error, '口令不存在');
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/notices/notice_missing', {
      method: 'DELETE',
      headers: {
        'x-admin-key': 'secret'
      }
    }),
    env: {
      ADMIN_KEY: 'secret',
      APP_DB: createMockDb()
    }
  } as any);

  assert.equal(response.status, 404, '删除不存在的通知应返回 404');
  const body = await response.json();
  assert.equal(body.error, '通知不存在');
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/donors/donor_missing', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: JSON.stringify({
        name: '不存在的赞赏者',
        amount: '66'
      })
    }),
    env: {
      ADMIN_KEY: 'secret',
      APP_DB: createMockDb()
    }
  } as any);

  assert.equal(response.status, 404, '更新不存在的赞赏者应返回 404');
  const body = await response.json();
  assert.equal(body.error, '赞赏记录不存在');
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/donors/donor_missing', {
      method: 'DELETE',
      headers: {
        'x-admin-key': 'secret'
      }
    }),
    env: {
      ADMIN_KEY: 'secret',
      APP_DB: createMockDb()
    }
  } as any);

  assert.equal(response.status, 404, '删除不存在的赞赏者应返回 404');
  const body = await response.json();
  assert.equal(body.error, '赞赏记录不存在');
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/versions/apk_missing', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: JSON.stringify({
        version: '1.2.3',
        versionCode: 123,
        apkUrl: 'https://example.com/app.apk'
      })
    }),
    env: {
      ADMIN_KEY: 'secret',
      APP_DB: createMockDb()
    }
  } as any);

  assert.equal(response.status, 404, '更新不存在的 APK 版本应返回 404');
  const body = await response.json();
  assert.equal(body.error, '版本不存在');
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/versions/apk_missing', {
      method: 'DELETE',
      headers: {
        'x-admin-key': 'secret'
      }
    }),
    env: {
      ADMIN_KEY: 'secret',
      APP_DB: createMockDb()
    }
  } as any);

  assert.equal(response.status, 404, '删除不存在的 APK 版本应返回 404');
  const body = await response.json();
  assert.equal(body.error, '版本不存在');
}

console.log('测试通过：后台单条维护接口在记录不存在时会稳定返回 404，而不是伪造 success。');
