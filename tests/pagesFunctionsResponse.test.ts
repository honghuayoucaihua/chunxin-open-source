import assert from 'node:assert/strict';
import { createResponseHeaders, optionsResponse } from '../cloudflare/pages-functions/response.js';

{
  const request = new Request('https://example.com/api/admin/versions', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://app.example.com',
      'Access-Control-Request-Headers': 'content-type,x-admin-key'
    }
  });

  const response = optionsResponse(request, { ALLOWED_ORIGINS: 'https://app.example.com' }, 'GET,PUT,DELETE,OPTIONS');
  assert.equal(response.status, 204, '预检请求应返回 204');
  assert.equal(
    response.headers.get('Access-Control-Allow-Methods'),
    'GET,PUT,DELETE,OPTIONS',
    '预检响应应暴露当前接口允许的方法'
  );
  assert.equal(
    response.headers.get('Access-Control-Allow-Headers'),
    'content-type,x-admin-key',
    '预检响应应回显浏览器请求的自定义头'
  );
}

{
  const request = new Request('https://example.com/api/proxy', {
    headers: {
      Origin: 'https://app.example.com'
    }
  });

  const headers = createResponseHeaders(request, { ALLOWED_ORIGINS: 'https://app.example.com' });
  const allowHeaders = headers.get('Access-Control-Allow-Headers') || '';
  assert.match(allowHeaders, /X-Admin-Key/i, '默认允许头应包含管理员密钥');
  assert.match(allowHeaders, /X-Premium-Token/i, '默认允许头应包含高级令牌');
}

console.log('测试通过：Pages Functions 响应头会正确暴露管理接口方法与自定义鉴权头。');
