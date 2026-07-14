import assert from 'node:assert/strict';
import { updateAdminCommunityShare } from '../cloudflare/pages-functions/data.js';

const existingRow = {
  id: 'cs_1',
  status: 'active',
  type: 'contact',
  name: '原始名称',
  description: '原始描述',
  avatar: '',
  cover_image: '/api/community/assets/community%2Fcovers%2Fcs_1%2Fold.png',
  cover_object_key: 'community/covers/cs_1/old.png',
  author_name: '作者',
  is_anonymous: 0,
  is_encrypted: 0,
  like_count: 1,
  download_count: 2,
  report_count: 0,
  created_at: 1710000000000
};

{
  const updates: Array<any[]> = [];
  const removed: string[] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...params: any[]) {
          return {
            async first() {
              if (sql.includes('SELECT * FROM community_shares WHERE id = ? LIMIT 1')) {
                return existingRow;
              }
              if (sql.includes('SELECT id, type, name, description, avatar, cover_image, author_name, is_anonymous, is_encrypted, like_count, download_count, report_count, created_at')) {
                return {
                  ...existingRow,
                  cover_image: '',
                  cover_object_key: ''
                };
              }
              return null;
            },
            async run() {
              if (sql.includes('UPDATE community_shares')) {
                updates.push(params);
              }
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
  };

  const result = await updateAdminCommunityShare({
    APP_DB: db,
    COMMUNITY_BUCKET: {
      async delete(key: string) {
        removed.push(key);
      }
    }
  } as any, 'cs_1', { cover_image: '' });

  assert.ok(result, '清空封面后仍应返回最新分享数据');
  assert.equal(updates.length, 1, '清空封面时应执行一次数据库更新');
  assert.equal(updates[0][5], '', '清空封面时应把 cover_image 置空');
  assert.equal(updates[0][6], '', '清空封面时应同步把 cover_object_key 置空，避免留下脏资源引用');
  assert.deepEqual(removed, ['community/covers/cs_1/old.png'], '清空封面成功后应删除旧 R2 对象');
}

console.log('测试通过：管理端清空社区封面时会同步清空对象键并删除旧资源。');
