import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';

const createMockDb = () => ({
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
});

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/notices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: JSON.stringify({
        title: '   ',
        content: '   ',
        type: 'notice'
      })
    }),
    env: {
      ADMIN_KEY: 'secret',
      APP_DB: createMockDb()
    }
  } as any);

  assert.equal(response.status, 400, '空白通知标题和内容应返回 400');
  const body = await response.json();
  assert.equal(body.error, '标题和内容不能为空');
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/versions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: JSON.stringify({
        version: '   ',
        versionCode: 123,
        apkUrl: 'https://example.com/app.apk'
      })
    }),
    env: {
      ADMIN_KEY: 'secret',
      APP_DB: createMockDb()
    }
  } as any);

  assert.equal(response.status, 400, '空白版本号应返回 400，而不是 500');
  const body = await response.json();
  assert.equal(body.error, '版本号、版本代码、APK 地址不能为空');
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/versions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: JSON.stringify({
        version: '1.2.3',
        versionCode: 'abc',
        apkUrl: 'https://example.com/app.apk'
      })
    }),
    env: {
      ADMIN_KEY: 'secret',
      APP_DB: createMockDb()
    }
  } as any);

  assert.equal(response.status, 400, '非法版本代码应返回 400，而不是 500');
  const body = await response.json();
  assert.equal(body.error, '版本号、版本代码、APK 地址不能为空');
}

console.log('测试通过：后台新增通知与 APK 版本会稳定拦截空白或非法关键字段。');
