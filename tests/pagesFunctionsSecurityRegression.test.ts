import assert from 'node:assert/strict';
import { handleApiRequest } from '../cloudflare/pages-functions/api-router.js';
import { isValidAdminKey } from '../cloudflare/pages-functions/security.js';

assert.equal(
  isValidAdminKey('xushuo2024', {}),
  false,
  '未配置 ADMIN_KEY 时不应接受公开默认口令'
);

{
  const request = new Request('https://example.com/api/admin/verify-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ adminKey: 'xushuo2024' })
  });

  const response = await handleApiRequest({
    request,
    env: {}
  } as any);

  assert.equal(response.status, 403, '未配置 ADMIN_KEY 时管理接口应拒绝访问');
  const body = await response.json();
  assert.deepEqual(body, { success: false, error: '密钥错误' });
}

{
  const request = new Request('https://example.com/api/admin/verify-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ adminKey: 'custom-secret' })
  });

  const response = await handleApiRequest({
    request,
    env: { ADMIN_KEY: 'custom-secret' }
  } as any);

  assert.equal(response.status, 200, '显式配置 ADMIN_KEY 后应允许正确口令通过');
  const body = await response.json();
  assert.deepEqual(body, { success: true });
}

console.log('测试通过：Pages Functions 管理口令在未配置时会 fail-close，并只接受显式配置值。');
