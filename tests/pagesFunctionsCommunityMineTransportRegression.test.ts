import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';

const createMockDb = (rows: any[] = []) => ({
  prepare(sql: string) {
    return {
      bind(...values: any[]) {
        return {
          async first() {
            if (sql.includes('SELECT sql FROM sqlite_master')) return null;
            if (sql.includes('SELECT COUNT(*) AS total FROM community_shares')) return { total: 0 };
            return null;
          },
          async all() {
            if (sql.includes('SELECT id, type, name, description, avatar, cover_image, author_name, is_anonymous, is_encrypted, like_count, download_count, created_at')) {
              return { results: rows };
            }
            return { results: [] };
          },
          async run() {
            return { success: true };
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
    request: new Request('https://example.com/api/community/mine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        author_name: '作者',
        author_password: '密码'
      })
    }),
    env: {
      APP_DB: createMockDb([
        {
          id: 'cs_1',
          type: 'contact',
          name: '测试分享',
          description: '描述',
          avatar: '',
          cover_image: '',
          author_name: '作者',
          is_anonymous: 0,
          is_encrypted: 0,
          like_count: 0,
          download_count: 0,
          created_at: 1710000000000
        }
      ])
    }
  } as any);

  assert.equal(response.status, 200, '我的分享应支持通过 POST 请求体提交作者凭据');
  const body = await response.json();
  assert.equal(Array.isArray(body.items), true);
  assert.equal(body.items.length, 1);
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/community/mine?author_name=%E4%BD%9C%E8%80%85&author_password=%E5%AF%86%E7%A0%81', {
      method: 'GET'
    }),
    env: {
      APP_DB: createMockDb()
    }
  } as any);

  assert.equal(response.status, 405, '我的分享不应再接受把作者凭据暴露在 URL 查询串里的 GET 请求');
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/community/mine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        author_name: '',
        author_password: ''
      })
    }),
    env: {
      APP_DB: createMockDb()
    }
  } as any);

  assert.equal(response.status, 400, '缺少作者名和密码时应直接拒绝我的分享查询');
  const body = await response.json();
  assert.equal(body.error, '请提供作者名和密码');
}

console.log('测试通过：社区我的分享接口已改为 POST 请求体传输凭据。');
