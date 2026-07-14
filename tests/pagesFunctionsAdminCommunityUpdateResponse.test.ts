import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';

const updatedItem = {
  id: 'cs_1',
  type: 'htmltemplate',
  name: '更新后的分享',
  description: '更新后的描述',
  avatar: '',
  cover_image: '/api/community/assets/community%2Fcovers%2Fcs_1%2Fcover.png',
  author_name: '作者',
  is_anonymous: 0,
  is_encrypted: 0,
  like_count: 12,
  download_count: 34,
  report_count: 1,
  created_at: 1710000000000
};

const response = await handleApiRequest({
  request: new Request('https://example.com/api/admin/community/cs_1', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': 'secret'
    },
    body: JSON.stringify({
      name: '更新后的分享'
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
                    ...updatedItem,
                    cover_object_key: 'community/covers/cs_1/cover.png',
                    status: 'active'
                  };
                }
                if (sql.includes('SELECT id, type, name, description, avatar, cover_image, author_name, is_anonymous, is_encrypted, like_count, download_count, report_count, created_at')
                  && sql.includes('FROM community_shares')
                  && sql.includes('WHERE id = ?')) {
                  return updatedItem;
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

assert.equal(response.status, 200, '管理端更新成功应返回 200');
const body = await response.json();
assert.equal(body.success, true);
assert.deepEqual(body.item, updatedItem, '管理端更新成功后应返回服务端最新条目');

console.log('测试通过：管理端社区更新接口会返回服务端最新条目。');
