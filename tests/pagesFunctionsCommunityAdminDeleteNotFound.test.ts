import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';

const createMockDb = () => ({
  prepare(sql: string) {
    return {
      bind() {
        return {
          async first() {
            if (sql.includes('SELECT * FROM community_shares WHERE id = ? LIMIT 1')) {
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

const response = await handleApiRequest({
  request: new Request('https://example.com/api/admin/community/cs_missing', {
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

assert.equal(response.status, 404, '删除不存在的社区分享应返回 404');
const body = await response.json();
assert.equal(body.error, '未找到该分享');

console.log('测试通过：管理端删除不存在的社区分享会明确返回 404。');
