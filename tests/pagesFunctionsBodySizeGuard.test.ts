import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';

let dbTouched = 0;
const hugeBody = JSON.stringify({
  clientId: 'body-size-guard-client',
  type: 'contact',
  name: '超大正文测试',
  author_name: '作者',
  author_password: '密码',
  payload: {
    contacts: [],
    messages: {},
    filler: 'x'.repeat(530000)
  }
});

const response = await handleApiRequest({
  request: new Request('https://example.com/api/community/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-ID': 'body-size-guard-client'
    },
    body: hugeBody
  }),
  env: {
    APP_DB: {
      prepare() {
        dbTouched += 1;
        throw new Error('DB should not be touched for oversized request body');
      }
    }
  }
} as any);

assert.equal(response.status, 400, '未声明 Content-Length 的超大正文也应在入口被拒绝');
assert.equal(dbTouched, 0, '超大正文不应继续访问 D1');

const deleteResponse = await handleApiRequest({
  request: new Request('https://example.com/api/community/delete/share_to_delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-ID': 'body-size-delete-guard-client'
    },
    body: JSON.stringify({
      author_name: '作者',
      author_password: '密码',
      filler: 'x'.repeat(530000)
    })
  }),
  env: {
    APP_DB: {
      prepare() {
        dbTouched += 1;
        throw new Error('DB should not be touched for oversized delete request body');
      }
    }
  }
} as any);

assert.equal(deleteResponse.status, 400, '删除接口收到超大正文时应在入口拒绝');
assert.equal(dbTouched, 0, '超大删除正文不应继续访问 D1');

console.log('测试通过：Pages Functions 会按实际正文大小拦截超大 JSON 请求。');
