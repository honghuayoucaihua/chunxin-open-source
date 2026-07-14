import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';

const createMockDb = () => ({
  prepare() {
    return {
      bind() {
        return {
          async run() {
            return { success: true };
          },
          async first() {
            return null;
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
    request: new Request('https://example.com/api/community/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': 'client-1'
      },
      body: JSON.stringify({
        type: 'contact',
        name: '测试分享',
        payload: { contacts: [], messages: {} },
        author_name: '',
        author_password: ''
      })
    }),
    env: {
      APP_DB: createMockDb()
    }
  } as any);

  assert.equal(response.status, 400, '缺少作者名和密码时应直接拒绝上传');
  const body = await response.json();
  assert.equal(body.error, '请提供作者名和密码');
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/community/delete/cs_1', {
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
      APP_DB: {
        prepare(sql: string) {
          return {
            bind() {
              return {
                async first() {
                  if (sql.includes('SELECT * FROM community_shares WHERE id = ? LIMIT 1')) {
                    return {
                      id: 'cs_1',
                      author_name: '作者',
                      author_password_hash: 'non-empty',
                      cover_object_key: ''
                    };
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

  assert.equal(response.status, 400, '缺少作者名和密码时应直接拒绝删除');
  const body = await response.json();
  assert.equal(body.error, '请提供作者名和密码');
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/community/delete/cs_legacy', {
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
      APP_DB: {
        prepare(sql: string) {
          return {
            bind() {
              return {
                async first() {
                  if (sql.includes('SELECT * FROM community_shares WHERE id = ? LIMIT 1')) {
                    return {
                      id: 'cs_legacy',
                      author_name: '',
                      author_password_hash: '',
                      cover_object_key: ''
                    };
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

  assert.equal(response.status, 200, '旧空作者数据应仍可删除');
  const body = await response.json();
  assert.equal(body.ok, true);
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/community/like/cs_1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'like' })
    }),
    env: {
      APP_DB: createMockDb()
    }
  } as any);

  assert.equal(response.status, 400, '缺少客户端标识时应拒绝点赞');
  const body = await response.json();
  assert.equal(body.error, '缺少客户端标识');
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/community/report/cs_1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: '{}'
    }),
    env: {
      APP_DB: createMockDb()
    }
  } as any);

  assert.equal(response.status, 400, '缺少客户端标识时应拒绝举报');
  const body = await response.json();
  assert.equal(body.error, '缺少客户端标识');
}

console.log('测试通过：社区上传、删除、点赞与举报的关键边界已收口。');
