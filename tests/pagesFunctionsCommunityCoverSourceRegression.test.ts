import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';
import { updateAdminCommunityShare, uploadCommunityShare } from '../cloudflare/pages-functions/data.js';

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
        description: '外链封面',
        author_name: '作者',
        author_password: '密码',
        cover_image: 'https://example.com/cover.png',
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

  assert.equal(response.status, 400, '社区上传不应接受新的外链封面');
  const body = await response.json();
  assert.equal(body.error, '封面图片来源无效');
}

{
  await assert.rejects(
    () => uploadCommunityShare({
      APP_DB: createMockDb(),
      COMMUNITY_BUCKET: {
        async put() {
          throw new Error('不应写入 R2');
        }
      }
    } as any, {
      type: 'contact',
      name: '测试分享',
      description: '',
      author_name: '作者',
      author_password: '密码',
      cover_image: 'https://example.com/cover.png',
      payload: { contacts: [], messages: {} }
    }, 'client-1'),
    /封面图片来源无效/,
    '数据层上传也应拒绝新的外链封面'
  );
}

{
  const currentCover = '/api/community/assets/community%2Fcovers%2Fcs_1%2Fcover.png';
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/community/cs_1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: JSON.stringify({
        cover_image: currentCover
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
                  if (sql.includes('SELECT * FROM community_shares WHERE id = ? LIMIT 1')) {
                    return {
                      id: 'cs_1',
                      name: '原始名称',
                      description: '',
                      cover_image: currentCover,
                      cover_object_key: 'community/covers/cs_1/cover.png',
                      like_count: 0,
                      download_count: 0,
                      report_count: 0
                    };
                  }
                  if (sql.includes('SELECT id, type, name, description, avatar, cover_image, author_name, is_anonymous, is_encrypted, like_count, download_count, report_count, created_at')) {
                    return {
                      id: 'cs_1',
                      type: 'contact',
                      name: '原始名称',
                      description: '',
                      avatar: '',
                      cover_image: currentCover,
                      author_name: '作者',
                      is_anonymous: 0,
                      is_encrypted: 0,
                      like_count: 0,
                      download_count: 0,
                      report_count: 0,
                      created_at: 1710000000000
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
      },
      COMMUNITY_BUCKET: {
        async put() {
          throw new Error('不应重复上传 R2');
        }
      }
    }
  } as any);

  assert.equal(response.status, 200, '管理端保留当前已有封面时应允许保存');
  const body = await response.json();
  assert.equal(body.success, true);
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
        cover_image: 'https://example.com/new-cover.png'
      })
    }),
    env: {
      ADMIN_KEY: 'secret',
      APP_DB: createMockDb({
        id: 'cs_1',
        name: '原始名称',
        description: '',
        cover_image: '/api/community/assets/community%2Fcovers%2Fcs_1%2Fold.png',
        cover_object_key: 'community/covers/cs_1/old.png',
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

  assert.equal(response.status, 400, '管理端不应写入新的任意外链封面');
  const body = await response.json();
  assert.equal(body.error, '封面图片来源无效');
}

{
  await assert.rejects(
    () => updateAdminCommunityShare({
      APP_DB: createMockDb({
        id: 'cs_1',
        name: '原始名称',
        description: '',
        cover_image: '/api/community/assets/community%2Fcovers%2Fcs_1%2Fold.png',
        cover_object_key: 'community/covers/cs_1/old.png',
        like_count: 0,
        download_count: 0,
        report_count: 0
      }),
      COMMUNITY_BUCKET: {
        async put() {
          throw new Error('不应写入 R2');
        }
      }
    } as any, 'cs_1', { cover_image: 'https://example.com/new-cover.png' }),
    /封面图片来源无效/,
    '数据层管理更新也应拒绝新的任意外链封面'
  );
}

console.log('测试通过：社区封面来源已收紧为本地受控资源，不再接受新的任意外链或脏字符串。');
