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
  const uploaded: string[] = [];
  const removed: string[] = [];
  const db = {
    updates: [] as Array<any[]>,
    prepare(sql: string) {
      const self = this as any;
      return {
        bind(...params: any[]) {
          return {
            async first() {
              if (sql.includes('SELECT * FROM community_shares WHERE id = ? LIMIT 1')) {
                return existingRow;
              }
              if (sql.includes('SELECT id, type, name, description, avatar, cover_image, author_name, is_anonymous, is_encrypted, like_count, download_count, report_count, created_at')) {
                return null;
              }
              return null;
            },
            async run() {
              if (sql.includes('UPDATE community_shares')) {
                self.updates.push(params);
                return {
                  success: true,
                  meta: {
                    changes: 0
                  }
                };
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
      async put(key: string) {
        uploaded.push(key);
      },
      async delete(key: string) {
        removed.push(key);
      }
    }
  } as any, 'cs_1', { cover_image: 'data:image/png;base64,AAAA' });

  assert.equal(result, null, '管理端更新时若分享已被并发删除，应按未找到处理');
  assert.equal(db.updates.length, 1, '并发删除前仍会尝试一次数据库更新');
  assert.equal(uploaded.length, 1, '替换封面前应先上传新封面');
  assert.deepEqual(removed, uploaded, '数据库未更新到任何行时应回滚刚上传的新封面，避免孤儿对象');
  assert.notDeepEqual(removed, ['community/covers/cs_1/old.png'], '并发删除时不应误删旧封面对象');
}

console.log('测试通过：管理端更换社区封面遇到并发删除时会回滚新资源并返回未找到。');
