import assert from 'node:assert/strict';
import { downloadCommunityShare } from '../cloudflare/pages-functions/data.js';

const baseShareRow = {
  id: 'cs_1',
  status: 'active',
  type: 'contact',
  name: '测试分享',
  description: '测试描述',
  avatar: '',
  cover_image: '',
  author_name: '作者',
  is_anonymous: 0,
  is_encrypted: 0,
  like_count: 2,
  download_count: 5,
  report_count: 0,
  payload: '{"contacts":[],"messages":{}}',
  created_at: 1710000000000
};

{
  const db = {
    prepare(sql: string) {
      return {
        bind(...params: any[]) {
          return {
            async first() {
              if (sql.includes('SELECT * FROM community_shares WHERE id = ? LIMIT 1')) {
                return baseShareRow;
              }
              if (sql.includes('UPDATE community_shares SET download_count = download_count + 1')) {
                return { download_count: 8 };
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
  };

  const result = await downloadCommunityShare({ APP_DB: db } as any, 'cs_1');
  assert.equal(result?.download_count, 8, '下载成功后应返回数据库真实递增后的下载数，而不是本地猜测值');
}

{
  const db = {
    prepare(sql: string) {
      return {
        bind(...params: any[]) {
          return {
            async first() {
              if (sql.includes('SELECT * FROM community_shares WHERE id = ? LIMIT 1')) {
                return baseShareRow;
              }
              if (sql.includes('UPDATE community_shares SET download_count = download_count + 1')) {
                throw new Error(`update failed :: ${JSON.stringify(params)}`);
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
  };

  await assert.rejects(
    () => downloadCommunityShare({ APP_DB: db } as any, 'cs_1'),
    /update failed/,
    '下载计数更新失败时应直接抛错，不能返回伪造的下载数'
  );
}

{
  const db = {
    prepare(sql: string) {
      return {
        bind(...params: any[]) {
          return {
            async first() {
              if (sql.includes('SELECT * FROM community_shares WHERE id = ? LIMIT 1')) {
                return baseShareRow;
              }
              if (sql.includes('UPDATE community_shares SET download_count = download_count + 1')) {
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
  };

  const result = await downloadCommunityShare({ APP_DB: db } as any, 'cs_1');
  assert.equal(result, null, '下载计数更新时若分享已在并发中被删除或失活，应按未找到处理而不是抛 500');
}

console.log('测试通过：社区下载计数只返回数据库真实结果，并在更新失败时直接中断。');
