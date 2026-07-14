import assert from 'node:assert/strict';
import { getCommunityAsset } from '../cloudflare/pages-functions/data.js';

const createMockDb = (activeCoverKeys: string[]) => {
  const active = new Set(activeCoverKeys);
  return {
    prepare(sql: string) {
      return {
        bind(...params: any[]) {
          return {
            async run() {
              return { success: true, sql, params };
            },
            async first() {
              if (sql.includes("SELECT id FROM community_shares WHERE cover_object_key = ? AND status = 'active' LIMIT 1")) {
                return active.has(String(params[0])) ? { id: 'share-1' } : null;
              }
              return null;
            },
            async all() {
              return { results: [] };
            }
          };
        },
        async run() {
          return { success: true, sql, params: [] };
        }
      };
    }
  };
};

const createMockBucket = () => {
  const requestedKeys: string[] = [];
  return {
    requestedKeys,
    async get(key: string) {
      requestedKeys.push(key);
      if (key !== 'community/covers/share-1.png') return null;
      return {
        body: 'image-body',
        writeHttpMetadata(headers: Headers) {
          headers.set('Content-Type', 'image/png');
        }
      };
    }
  };
};

{
  const bucket = createMockBucket();
  const asset = await getCommunityAsset({
    APP_DB: createMockDb(['community/covers/share-1.png']),
    COMMUNITY_BUCKET: bucket
  } as any, 'private/secret.txt');

  assert.equal(asset, null, '非社区封面目录的对象键不应被公开读取');
  assert.deepEqual(bucket.requestedKeys, [], '非法前缀应在访问 R2 前就被拦截');
}

{
  const bucket = createMockBucket();
  const asset = await getCommunityAsset({
    APP_DB: createMockDb([]),
    COMMUNITY_BUCKET: bucket
  } as any, 'community/covers/share-1.png');

  assert.equal(asset, null, '未被有效帖子引用的封面对象不应被公开读取');
  assert.deepEqual(bucket.requestedKeys, [], '未绑定到有效帖子的对象不应触发 R2 读取');
}

{
  const bucket = createMockBucket();
  const asset = await getCommunityAsset({
    APP_DB: createMockDb(['community/covers/share-1.png']),
    COMMUNITY_BUCKET: bucket
  } as any, 'community/covers/share-1.png');

  assert.ok(asset, '有效帖子引用的封面对象应可访问');
  assert.equal(asset?.headers.get('Content-Type'), 'image/png');
  assert.deepEqual(bucket.requestedKeys, ['community/covers/share-1.png']);
}

{
  const bucket = createMockBucket();
  const asset = await getCommunityAsset({
    APP_DB: createMockDb(['community/covers/share-1.png']),
    COMMUNITY_BUCKET: bucket
  } as any, '%E0%A4%A');

  assert.equal(asset, null, '非法 URL 编码的对象键不应触发异常');
  assert.deepEqual(bucket.requestedKeys, [], '非法编码应在访问 R2 前就被拦截');
}

console.log('测试通过：社区资源接口只允许访问有效帖子绑定的封面对象。');
