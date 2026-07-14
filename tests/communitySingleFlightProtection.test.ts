import assert from 'node:assert/strict';
import {
  deleteCommunityShare,
  downloadCommunityShare,
  fetchCommunityDetail,
  fetchCommunityList,
  fetchMyShares
} from '../src/community/communityService.ts';

const originalFetch = globalThis.fetch;

const runSingleFlightCase = async (
  label: string,
  matcher: (url: string) => boolean,
  body: unknown,
  task: () => Promise<unknown[]>,
  options: { expectClientId?: boolean } = {}
) => {
  let calls = 0;
  let clientId = '';
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (!matcher(url)) {
      throw new Error(`Unexpected fetch url for ${label}: ${url}`);
    }
    calls += 1;
    clientId = new Headers(init?.headers).get('X-Client-ID') || '';
    await new Promise((resolve) => setTimeout(resolve, 5));
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  try {
    await task();
    assert.equal(calls, 1, `${label} 同一请求并发执行时应只访问一次后端`);
    if (options.expectClientId) {
      assert.match(clientId, /^client_/, `${label} 应携带本地客户端标识，便于后端按用户限流`);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
};

await runSingleFlightCase(
  '社区列表',
  (url) => url.includes('/api/community/list?') && url.includes('page=1'),
  { items: [], total: 0 },
  () => Promise.all([
    fetchCommunityList('contact', 1, 20, '', 'newest'),
    fetchCommunityList('contact', 1, 20, '', 'newest')
  ])
);

await runSingleFlightCase(
  '社区详情',
  (url) => url.endsWith('/api/community/detail/cs_1'),
  { id: 'cs_1', name: '测试分享' },
  () => Promise.all([
    fetchCommunityDetail('cs_1'),
    fetchCommunityDetail('cs_1')
  ])
);

await runSingleFlightCase(
  '社区下载',
  (url) => url.endsWith('/api/community/download/cs_1'),
  { item: { id: 'cs_1' }, payload: { contacts: [], messages: {} } },
  () => Promise.all([
    downloadCommunityShare('cs_1'),
    downloadCommunityShare('cs_1')
  ]),
  { expectClientId: true }
);

await runSingleFlightCase(
  '我的分享',
  (url) => url.endsWith('/api/community/mine'),
  { items: [] },
  () => Promise.all([
    fetchMyShares('作者', '密码'),
    fetchMyShares('作者', '密码')
  ]),
  { expectClientId: true }
);

await runSingleFlightCase(
  '删除分享',
  (url) => url.endsWith('/api/community/delete/cs_1'),
  { ok: true },
  () => Promise.all([
    deleteCommunityShare('cs_1', '作者', '密码'),
    deleteCommunityShare('cs_1', '作者', '密码')
  ]),
  { expectClientId: true }
);

console.log('测试通过：社区重复读写请求会在本地合并，避免重复占用后端次数。');
