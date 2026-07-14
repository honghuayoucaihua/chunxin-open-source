import assert from 'node:assert/strict';
import { deleteCommunityShareByAuthor, reportCommunityShare, updateAdminCommunityShare } from '../cloudflare/pages-functions/data.js';
import { sha256Hex } from '../cloudflare/pages-functions/security.js';

const createDeleteDb = (row: Record<string, any>) => ({
  deleted: [] as string[],
  prepare(sql: string) {
    const self = this as any;
    return {
      async run() {
        if (sql.includes('CREATE TABLE IF NOT EXISTS') || sql.includes('CREATE INDEX IF NOT EXISTS')) {
          return { success: true };
        }
        if (sql.includes('DELETE FROM community_shares WHERE id = ?')) {
          self.deleted.push(sql);
          throw new Error('db delete failed');
        }
        return { success: true };
      },
      bind(...params: any[]) {
        return {
          async first() {
            if (sql.includes('SELECT * FROM community_shares WHERE id = ? LIMIT 1')) {
              return row;
            }
            return null;
          },
          async run() {
            if (sql.includes('DELETE FROM community_shares WHERE id = ?')) {
              self.deleted.push(`${sql} :: ${JSON.stringify(params)}`);
              throw new Error('db delete failed');
            }
            return { success: true };
          },
          async all() {
            return { results: [] };
          }
        };
      }
    };
  },
  async exec(sql: string) {
    return [{ columns: [], values: [] }];
  }
});

const createUpdateDb = (row: Record<string, any>) => ({
  updates: [] as string[],
  prepare(sql: string) {
    const self = this as any;
    return {
      async run() {
        if (sql.includes('CREATE TABLE IF NOT EXISTS') || sql.includes('CREATE INDEX IF NOT EXISTS')) {
          return { success: true };
        }
        return { success: true };
      },
      bind(...params: any[]) {
        return {
          async first() {
            if (sql.includes('SELECT * FROM community_shares WHERE id = ? LIMIT 1')) {
              return row;
            }
            return null;
          },
          async run() {
            if (sql.includes('UPDATE community_shares')) {
              self.updates.push(`${sql} :: ${JSON.stringify(params)}`);
              throw new Error('update failed');
            }
            return { success: true };
          },
          async all() {
            return { results: [] };
          }
        };
      }
    };
  }
});

{
  const row = {
    id: 'cs_1',
    author_name: '作者',
    author_password_hash: await sha256Hex('作者\n密码'),
    cover_object_key: 'community/covers/old.png'
  };
  const removed: string[] = [];
  const db = createDeleteDb(row);

  await assert.rejects(
    () => deleteCommunityShareByAuthor({
      APP_DB: db,
      COMMUNITY_BUCKET: {
        async delete(key: string) {
          removed.push(key);
        }
      }
    } as any, 'cs_1', '作者', '密码'),
    /db delete failed/
  );

  assert.deepEqual(removed, [], '数据库删除失败时不应先删除旧封面');
}

{
  const row = {
    id: 'cs_1',
    cover_image: '/api/community/assets/community%2Fcovers%2Fold.png',
    cover_object_key: 'community/covers/old.png',
    name: '旧分享',
    description: '',
    like_count: 0,
    download_count: 0,
    report_count: 0
  };
  const uploaded: string[] = [];
  const removed: string[] = [];
  const db = createUpdateDb(row);

  await assert.rejects(
    () => updateAdminCommunityShare({
      APP_DB: db,
      COMMUNITY_BUCKET: {
        async put(key: string) {
          uploaded.push(key);
        },
        async delete(key: string) {
          removed.push(key);
        }
      }
    } as any, 'cs_1', { cover_image: 'data:image/png;base64,AAAA' }),
    /update failed/
  );

  assert.equal(uploaded.length, 1, '替换封面前应先上传新图');
  assert.equal(removed.length, 1, '更新失败后应只回滚新封面');
  assert.notEqual(removed[0], row.cover_object_key, '更新失败后不应删除旧封面');
  assert.match(removed[0], /^community\/covers\/cs_1\/cover_/, '新封面应使用独立对象键');
}

console.log('测试通过：社区删除与封面替换的资源回滚顺序已收口。');

{
  const row = {
    id: 'cs_1',
    status: 'active',
    type: 'contact',
    name: '测试分享',
    description: '',
    avatar: '',
    cover_image: '',
    cover_object_key: '',
    author_name: '作者',
    is_anonymous: 0,
    is_encrypted: 0,
    like_count: 0,
    download_count: 0,
    report_count: 4,
    created_at: 1710000000000
  };
  const db = {
    prepare(sql: string) {
      const self = this as any;
      return {
        bind(...params: any[]) {
          return {
            async first() {
              if (sql.includes('SELECT * FROM community_shares WHERE id = ? LIMIT 1')) {
                return row;
              }
              if (sql.includes('INSERT INTO community_share_reports')) {
                return { post_id: 'cs_1' };
              }
              if (sql.includes('UPDATE community_shares SET report_count = report_count + 1')) {
                return { report_count: 5 };
              }
              return null;
            },
            async run() {
              if (sql.includes('DELETE FROM community_shares WHERE id = ?')) {
                throw new Error(`db delete failed :: ${JSON.stringify(params)}`);
              }
              return { success: true };
            },
            async all() {
              return { results: [] };
            }
          };
        },
        async run() {
          if (sql.includes('DELETE FROM community_shares WHERE id = ?')) {
            throw new Error('db delete failed');
          }
          return { success: true };
        }
      };
    },
    async exec(sql: string) {
      return [{ columns: [], values: [] }];
    }
  };

  await assert.rejects(
    () => reportCommunityShare({ APP_DB: db } as any, 'cs_1', 'client-1'),
    /db delete failed/,
    '举报达到删除阈值但删除记录失败时，应整体失败，避免留下已加举报但未删除的半成状态'
  );
}

console.log('测试通过：社区举报达到阈值后的删除失败会整体回滚。');
