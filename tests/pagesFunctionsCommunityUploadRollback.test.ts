import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';
import { uploadCommunityShare } from '../cloudflare/pages-functions/data.js';

const createMockDb = () => ({
  prepare() {
    return {
      bind() {
        return {
          async run() {
            return { success: true };
          },
          async first() {
            return null;
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
  const writes: string[] = [];
  const bucket = {
    async put(key: string) {
      writes.push(key);
    }
  };

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
        description: '超大内容',
        author_name: '作者',
        author_password: '密码',
        payload: {
          contacts: Array.from({ length: 8 }, (_, index) => ({
            id: `c${index + 1}`,
            name: `联系人${index + 1}`,
            background: 'x'.repeat(15000)
          })),
          messages: {}
        }
      })
    }),
    env: {
      APP_DB: createMockDb(),
      COMMUNITY_BUCKET: bucket
    }
  } as any);

  assert.equal(response.status, 400, '超大内容应直接拒绝上传');
  const body = await response.json();
  assert.match(body.error, /分享内容过大/, '应返回内容过大错误');
  assert.equal(writes.length, 0, '超限时不应先写入 R2 封面');
}

console.log('测试通过：社区上传在超限时不会先占用 R2 资源。');

{
  const uploaded: string[] = [];
  const removed: string[] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...params: any[]) {
          return {
            async run() {
              if (sql.includes('INSERT INTO community_shares')) {
                throw new Error(`insert failed :: ${JSON.stringify(params)}`);
              }
              return { success: true };
            },
            async first() {
              return null;
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
    () => uploadCommunityShare({
      APP_DB: db,
      COMMUNITY_BUCKET: {
        async put(key: string) {
          uploaded.push(key);
        },
        async delete(key: string) {
          removed.push(key);
        }
      }
    } as any, {
      type: 'contact',
      name: '测试分享',
      description: '带封面',
      author_name: '作者',
      author_password: '密码',
      cover_image: 'data:image/png;base64,AAAA',
      payload: { contacts: [], messages: {} }
    }, 'client-1'),
    /insert failed/,
    '数据库写入失败时应把上传中的错误抛出'
  );

  assert.equal(uploaded.length, 1, '数据库插入前应已上传封面到 R2');
  assert.deepEqual(removed, uploaded, '数据库插入失败后应回滚刚上传的新封面，避免留下孤儿对象');
}

console.log('测试通过：社区上传在数据库写入失败时会回滚新封面资源。');
