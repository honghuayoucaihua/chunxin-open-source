import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';

const createThrowingDb = () => ({
  prepare() {
    throw new Error('DB should not be touched by this rate-limit test');
  }
});

const baseCommunityShareRow = {
  id: 'cs_rate_limit',
  status: 'active',
  type: 'contact',
  name: '限流测试分享',
  description: '',
  avatar: '',
  cover_image: '',
  author_name: '作者',
  is_anonymous: 0,
  is_encrypted: 0,
  like_count: 0,
  download_count: 1,
  report_count: 0,
  payload: '{"contacts":[],"messages":{}}',
  created_at: 1710000000000
};

const createCommunityDb = (options: { row?: any; downloadCount?: number } = {}) => {
  let prepareCalls = 0;
  const db = {
    get prepareCalls() {
      return prepareCalls;
    },
    prepare(sql: string) {
      prepareCalls += 1;
      return {
        bind(...params: any[]) {
          return {
            async first() {
              if (sql.includes('SELECT * FROM community_shares WHERE id = ? LIMIT 1')) {
                return options.row ?? null;
              }
              if (sql.includes('UPDATE community_shares SET download_count = download_count + 1')) {
                return { download_count: options.downloadCount ?? 2 };
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
  return db;
};

{
  const originalFetch = globalThis.fetch;
  const clientId = `divination-limit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response(JSON.stringify({ ok: true, data: { text: 'ok' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  try {
    const buildRequest = () => new Request('https://example.com/api/divination', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': clientId
      },
      body: JSON.stringify({
        type: 'liuyao',
        question: '测试问题',
        stream: false,
        debug: false,
        options: {}
      })
    });

    for (let i = 0; i < 6; i += 1) {
      const response = await handleApiRequest({
        request: buildRequest(),
        env: {
          DIVINATION_API_URL: 'https://example.com/divination',
          DIVINATION_API_KEY: 'test-key'
        }
      } as any);
      assert.equal(response.status, 200, '占卜限流窗口内请求应正常透传');
    }

    const limited = await handleApiRequest({
      request: buildRequest(),
      env: {
        DIVINATION_API_URL: 'https://example.com/divination',
        DIVINATION_API_KEY: 'test-key'
      }
    } as any);

    assert.equal(limited.status, 429, '超过占卜频率限制时应返回 429');
    assert.equal(fetchCalls, 6, '被限流的占卜请求不应继续调用上游服务');
    const body = await limited.json();
    assert.equal(body.error.code, 'RATE_LIMITED');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

{
  const clientId = `community-upload-limit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const buildRequest = () => new Request('https://example.com/api/community/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-ID': clientId
    },
    body: JSON.stringify({
      type: 'invalid-type',
      name: '测试分享',
      payload: { contacts: [], messages: {} },
      author_name: '作者',
      author_password: '密码'
    })
  });

  for (let i = 0; i < 3; i += 1) {
    const response = await handleApiRequest({
      request: buildRequest(),
      env: { APP_DB: createThrowingDb() }
    } as any);
    assert.equal(response.status, 400, '上传限流窗口内的非法类型请求应先按参数错误处理');
  }

  const limited = await handleApiRequest({
    request: buildRequest(),
    env: { APP_DB: createThrowingDb() }
  } as any);

  assert.equal(limited.status, 429, '超过社区上传频率限制时应返回 429');
  const body = await limited.json();
  assert.equal(body.code, 'RATE_LIMITED');
}

{
  const clientId = `community-download-limit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const db = createCommunityDb({ row: baseCommunityShareRow, downloadCount: 2 });
  const buildRequest = () => new Request('https://example.com/api/community/download/cs_rate_limit', {
    method: 'GET',
    headers: {
      'X-Client-ID': clientId
    }
  });

  for (let i = 0; i < 30; i += 1) {
    const response = await handleApiRequest({
      request: buildRequest(),
      env: { APP_DB: db }
    } as any);
    assert.equal(response.status, 200, '下载限流窗口内请求应正常处理');
  }

  const prepareCallsBeforeLimit = db.prepareCalls;
  const limited = await handleApiRequest({
    request: buildRequest(),
    env: { APP_DB: db }
  } as any);

  assert.equal(limited.status, 429, '超过社区下载频率限制时应返回 429');
  assert.equal(db.prepareCalls, prepareCallsBeforeLimit, '被限流的下载请求不应继续访问 D1');
  const body = await limited.json();
  assert.equal(body.code, 'RATE_LIMITED');
}

{
  const clientId = `community-mine-limit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const buildRequest = () => new Request('https://example.com/api/community/mine', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-ID': clientId
    },
    body: JSON.stringify({})
  });

  for (let i = 0; i < 20; i += 1) {
    const response = await handleApiRequest({
      request: buildRequest(),
      env: { APP_DB: createThrowingDb() }
    } as any);
    assert.equal(response.status, 400, '我的分享限流窗口内缺少凭据时应按参数错误处理');
  }

  const limited = await handleApiRequest({
    request: buildRequest(),
    env: { APP_DB: createThrowingDb() }
  } as any);

  assert.equal(limited.status, 429, '超过我的分享频率限制时应返回 429');
  const body = await limited.json();
  assert.equal(body.code, 'RATE_LIMITED');
}

{
  const clientId = `community-delete-limit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const db = createCommunityDb();
  const buildRequest = () => new Request('https://example.com/api/community/delete/cs_missing', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-ID': clientId
    },
    body: JSON.stringify({
      author_name: '作者',
      author_password: '密码'
    })
  });

  for (let i = 0; i < 10; i += 1) {
    const response = await handleApiRequest({
      request: buildRequest(),
      env: { APP_DB: db }
    } as any);
    assert.equal(response.status, 404, '删除限流窗口内不存在的分享应按未找到处理');
  }

  const prepareCallsBeforeLimit = db.prepareCalls;
  const limited = await handleApiRequest({
    request: buildRequest(),
    env: { APP_DB: db }
  } as any);

  assert.equal(limited.status, 429, '超过社区删除频率限制时应返回 429');
  assert.equal(db.prepareCalls, prepareCallsBeforeLimit, '被限流的删除请求不应继续访问 D1');
  const body = await limited.json();
  assert.equal(body.code, 'RATE_LIMITED');
}

{
  const baseId = `community-rate-bucket-prune-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const buildRequest = (clientId: string) => new Request('https://example.com/api/community/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-ID': clientId
    },
    body: JSON.stringify({
      type: 'invalid-type',
      name: '测试分享',
      payload: { contacts: [], messages: {} },
      author_name: '作者',
      author_password: '密码'
    })
  });

  for (let i = 0; i < 3; i += 1) {
    const response = await handleApiRequest({
      request: buildRequest(baseId),
      env: { APP_DB: createThrowingDb() }
    } as any);
    assert.equal(response.status, 400, '待淘汰桶在限流前应正常进入参数校验');
  }

  for (let i = 0; i < 10020; i += 1) {
    const response = await handleApiRequest({
      request: buildRequest(`${baseId}-filler-${i}`),
      env: { APP_DB: createThrowingDb() }
    } as any);
    assert.equal(response.status, 400, '填充限流桶时不应访问数据库');
  }

  const afterPrune = await handleApiRequest({
    request: buildRequest(baseId),
    env: { APP_DB: createThrowingDb() }
  } as any);

  assert.equal(afterPrune.status, 400, '限流桶超过上限后应淘汰最旧项，避免内存无限增长');
}

console.log('测试通过：关键免费接口的内存限流会在超限后阻断后续消耗。');
