import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';
import { updateAdminCommunityShare } from '../cloudflare/pages-functions/data.js';

const invalidCover = 'data:image/png;base64,%%%';

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
        description: '坏封面',
        author_name: '作者',
        author_password: '密码',
        cover_image: invalidCover,
        payload: { contacts: [], messages: {} }
      })
    }),
    env: {
      APP_DB: createMockDb(),
      COMMUNITY_BUCKET: {
        async put() {
          throw new Error('不应写入 R2');
        }
      }
    }
  } as any);

  assert.equal(response.status, 400, '社区上传坏封面格式时应返回 400');
  const body = await response.json();
  assert.equal(body.error, '封面图片格式无效');
}

{
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/community/cs_1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: JSON.stringify({
        cover_image: invalidCover
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
        async put() {
          throw new Error('不应写入 R2');
        }
      }
    }
  } as any);

  assert.equal(response.status, 400, '管理端更换坏封面格式时应返回 400');
  const body = await response.json();
  assert.equal(body.error, '封面图片格式无效');
}

{
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
        async put() {
          throw new Error('不应写入 R2');
        }
      }
    } as any, 'cs_1', { cover_image: invalidCover }),
    /封面图片格式无效/,
    '数据层更新社区封面时也应拒绝坏格式的 data:image'
  );
}

console.log('测试通过：社区上传和管理端更换封面遇到坏图片格式时会稳定返回 400。');
