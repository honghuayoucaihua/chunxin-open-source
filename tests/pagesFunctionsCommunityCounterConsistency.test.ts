import assert from 'node:assert/strict';
import { likeCommunityShare, reportCommunityShare } from '../cloudflare/pages-functions/data.js';

const baseShareRow = {
  id: 'cs_1',
  status: 'active',
  type: 'contact',
  name: '测试分享',
  description: '',
  avatar: '',
  cover_image: '',
  author_name: '作者',
  is_anonymous: 0,
  is_encrypted: 0,
  like_count: 3,
  download_count: 5,
  report_count: 1,
  created_at: 1710000000000
};

const createTxDb = (failingSql: string, insertSql: string) => ({
  tx: [] as string[],
  executed: [] as string[],
  prepare(sql: string) {
    const self = this as any;
    return {
      bind(...params: any[]) {
        return {
          async first() {
            if (sql.includes('SELECT * FROM community_shares WHERE id = ? LIMIT 1')) {
              return baseShareRow;
            }
            if (sql.includes(insertSql)) {
              self.executed.push(`${insertSql} :: ${JSON.stringify(params)}`);
              return { post_id: 'cs_1' };
            }
            if (sql.includes(failingSql)) {
              self.executed.push(`${failingSql} :: ${JSON.stringify(params)}`);
              throw new Error(`${failingSql} failed`);
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
  },
  async exec(sql: string) {
    this.tx.push(sql);
    return [{ columns: [], values: [] }];
  }
});

{
  const db = createTxDb(
    'UPDATE community_shares SET like_count = like_count + 1',
    'INSERT INTO community_share_likes'
  );

  await assert.rejects(
    () => likeCommunityShare({ APP_DB: db } as any, 'cs_1', 'client-1', 'like'),
    /UPDATE community_shares SET like_count = like_count \+ 1 failed/,
    '点赞计数更新失败时应直接中断，避免 silently 留下关系表与主表计数漂移'
  );

  assert.equal(db.executed.length, 2, '点赞失败前应正好执行关系表写入和主表计数更新两步');
}

{
  const db = createTxDb(
    'UPDATE community_shares SET report_count = report_count + 1',
    'INSERT INTO community_share_reports'
  );

  await assert.rejects(
    () => reportCommunityShare({ APP_DB: db } as any, 'cs_1', 'client-1'),
    /UPDATE community_shares SET report_count = report_count \+ 1 failed/,
    '举报计数更新失败时应直接中断，避免 silently 留下举报关系表与主表计数漂移'
  );

  assert.equal(db.executed.length, 2, '举报失败前应正好执行关系表写入和主表计数更新两步');
}

{
  const db = {
    tx: [] as string[],
    executed: [] as string[],
    prepare(sql: string) {
      const self = this as any;
      return {
        bind(...params: any[]) {
          return {
            async first() {
              if (sql.includes('SELECT * FROM community_shares WHERE id = ? LIMIT 1')) {
                return baseShareRow;
              }
              if (sql.includes('INSERT INTO community_share_likes')) {
                self.executed.push(`INSERT INTO community_share_likes :: ${JSON.stringify(params)}`);
                return { post_id: 'cs_1' };
              }
              if (sql.includes('UPDATE community_shares SET like_count = like_count + 1')) {
                self.executed.push(`UPDATE community_shares SET like_count = like_count + 1 :: ${JSON.stringify(params)}`);
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
    },
    async exec(sql: string) {
      this.tx.push(sql);
      return [{ columns: [], values: [] }];
    }
  };

  const result = await likeCommunityShare({ APP_DB: db } as any, 'cs_1', 'client-1', 'like');
  assert.equal(result, null, '点赞主表在并发中已不存在或失活时，应按未找到处理');
  assert.equal(db.executed.length, 2, '点赞并发失活前应正好尝试关系表写入和主表计数更新两步');
}

{
  const db = {
    tx: [] as string[],
    executed: [] as string[],
    prepare(sql: string) {
      const self = this as any;
      return {
        bind(...params: any[]) {
          return {
            async first() {
              if (sql.includes('SELECT * FROM community_shares WHERE id = ? LIMIT 1')) {
                return baseShareRow;
              }
              if (sql.includes('INSERT INTO community_share_reports')) {
                self.executed.push(`INSERT INTO community_share_reports :: ${JSON.stringify(params)}`);
                return { post_id: 'cs_1' };
              }
              if (sql.includes('UPDATE community_shares SET report_count = report_count + 1')) {
                self.executed.push(`UPDATE community_shares SET report_count = report_count + 1 :: ${JSON.stringify(params)}`);
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
    },
    async exec(sql: string) {
      this.tx.push(sql);
      return [{ columns: [], values: [] }];
    }
  };

  const result = await reportCommunityShare({ APP_DB: db } as any, 'cs_1', 'client-1');
  assert.deepEqual(result, { reported: false, report_count: 0, reason: 'not_found' }, '举报主表在并发中已不存在或失活时，应按未找到处理');
  assert.equal(db.executed.length, 2, '举报并发失活前应正好尝试关系表写入和主表计数更新两步');
}

console.log('测试通过：社区点赞与举报在计数更新失败时会整体回滚，避免关系表与主表计数漂移。');
