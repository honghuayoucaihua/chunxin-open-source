import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';
import { updateAdminCommunityShare } from '../cloudflare/pages-functions/data.js';

const hugeCover = `data:image/png;base64,${'A'.repeat(280 * 1024)}`;

const createMockDb = (row: Record<string, unknown> | null = null) => ({
  prepare(sql: string) {
    return {
      bind() {
        return {
          async first() {
            if (sql.includes('SELECT * FROM community_shares WHERE id = ? LIMIT 1')) {
              return row;
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
  const uploaded: string[] = [];
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
        description: '封面过大',
        author_name: '作者',
        author_password: '密码',
        cover_image: hugeCover,
        payload: { contacts: [], messages: {} }
      })
    }),
    env: {
      APP_DB: createMockDb(),
      COMMUNITY_BUCKET: {
        async put(key: string) {
          uploaded.push(key);
        }
      }
    }
  } as any);

  assert.equal(response.status, 400, '社区上传封面过大时应直接拒绝');
  const body = await response.json();
  assert.match(body.error, /封面图片过大/, '社区上传封面过大时应返回明确错误');
  assert.equal(uploaded.length, 0, '封面超限时不应先写入 R2');
}

{
  const uploaded: string[] = [];
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/community/cs_1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: JSON.stringify({
        cover_image: hugeCover
      })
    }),
    env: {
      ADMIN_KEY: 'secret',
      APP_DB: createMockDb({
        id: 'cs_1',
        name: '原始名称',
        description: '',
        cover_image: '',
        cover_object_key: '',
        like_count: 0,
        download_count: 0,
        report_count: 0
      }),
      COMMUNITY_BUCKET: {
        async put(key: string) {
          uploaded.push(key);
        }
      }
    }
  } as any);

  assert.equal(response.status, 400, '管理端更换超大封面时应返回 400');
  const body = await response.json();
  assert.equal(body.error, '封面图片过大（210KB），请压缩后重试');
  assert.equal(uploaded.length, 0, '管理端更换超大封面时不应先写入 R2');
}

{
  const uploaded: string[] = [];
  await assert.rejects(
    () => updateAdminCommunityShare({
      APP_DB: createMockDb({
        id: 'cs_1',
        name: '原始名称',
        description: '',
        cover_image: '',
        cover_object_key: '',
        like_count: 0,
        download_count: 0,
        report_count: 0
      }),
      COMMUNITY_BUCKET: {
        async put(key: string) {
          uploaded.push(key);
        }
      }
    } as any, 'cs_1', { cover_image: hugeCover }),
    /封面图片过大/,
    '数据层更新社区封面时也应拒绝超大图片'
  );
  assert.equal(uploaded.length, 0, '数据层拦截超大封面后不应写入 R2');
}

console.log('测试通过：社区上传和管理端更换封面都会拦截超大图片，并避免额外占用 R2。');
