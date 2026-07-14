import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';
import { updateAdminCommunityShare, uploadCommunityShare } from '../cloudflare/pages-functions/data.js';

const createMockDb = (hooks: { onRun?: (sql: string) => void; communityRow?: Record<string, unknown> | null } = {}) => ({
  prepare(sql: string) {
    return {
      bind() {
        return {
          async first() {
            if (sql.includes('SELECT * FROM community_shares WHERE id = ? LIMIT 1')) {
              return hooks.communityRow || null;
            }
            return null;
          },
          async run() {
            hooks.onRun?.(sql);
            return { success: true };
          },
          async all() {
            return { results: [] };
          }
        };
      },
      async run() {
        hooks.onRun?.(sql);
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
        name: '   ',
        payload: { contacts: [], messages: {} },
        author_name: '作者',
        author_password: '密码'
      })
    }),
    env: {
      APP_DB: createMockDb()
    }
  } as any);

  assert.equal(response.status, 400, '社区上传名称只有空白时应直接拒绝');
  const body = await response.json();
  assert.equal(body.error, '缺少必要参数');
}

{
  await assert.rejects(
    () => uploadCommunityShare({
      APP_DB: createMockDb()
    } as any, {
      type: 'contact',
      name: '   ',
      payload: { contacts: [], messages: {} },
      author_name: '作者',
      author_password: '密码'
    }, 'client-1'),
    /名称不能为空/,
    '数据层上传分享时也应拒绝空白名称'
  );
}

{
  let updated = false;
  const response = await handleApiRequest({
    request: new Request('https://example.com/api/admin/community/cs_1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': 'secret'
      },
      body: JSON.stringify({
        name: '   '
      })
    }),
    env: {
      ADMIN_KEY: 'secret',
      APP_DB: createMockDb({
        communityRow: {
          id: 'cs_1',
          name: '原始名称',
          description: '',
          cover_image: '',
          cover_object_key: '',
          like_count: 0,
          download_count: 0,
          report_count: 0
        },
        onRun(sql) {
          if (sql.includes('UPDATE community_shares')) {
            updated = true;
          }
        }
      })
    }
  } as any);

  assert.equal(response.status, 400, '管理端更新空白名称时应返回 400 而不是误报服务器错误');
  const body = await response.json();
  assert.equal(body.error, '名称不能为空');
  assert.equal(updated, false, '空白名称更新不应继续写入数据库');
}

{
  let updated = false;
  await assert.rejects(
    () => updateAdminCommunityShare({
      APP_DB: createMockDb({
        communityRow: {
          id: 'cs_1',
          name: '原始名称',
          description: '',
          cover_image: '',
          cover_object_key: '',
          like_count: 0,
          download_count: 0,
          report_count: 0
        },
        onRun(sql) {
          if (sql.includes('UPDATE community_shares')) {
            updated = true;
          }
        }
      })
    } as any, 'cs_1', { name: '   ' }),
    /名称不能为空/,
    '数据层管理更新时也应拒绝空白名称'
  );
  assert.equal(updated, false, '数据层拦截空白名称后不应执行更新 SQL');
}

console.log('测试通过：社区上传和管理编辑都已拒绝空白名称，且不会把脏数据写入 D1。');
