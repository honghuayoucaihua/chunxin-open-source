import assert from 'node:assert/strict';
import {
  extractHttpStatusFromError,
  shouldRetryApkUpdateCheckError
} from '../src/services/apkUpdateRetryPolicy.ts';

{
  assert.equal(
    shouldRetryApkUpdateCheckError(new Error('HTTP 404: Not Found')),
    false,
    '更新接口返回 404 时不应继续重试，避免白白放大无效请求'
  );
}

{
  assert.equal(
    shouldRetryApkUpdateCheckError(new Error('HTTP 400: Bad Request')),
    false,
    '更新接口返回 400 时不应继续重试'
  );
}

{
  assert.equal(
    shouldRetryApkUpdateCheckError(new Error('HTTP 429: Too Many Requests')),
    true,
    '更新接口命中限流时仍应保留重试能力'
  );
}

{
  assert.equal(
    shouldRetryApkUpdateCheckError(new Error('HTTP 503: Service Unavailable')),
    true,
    '服务端暂时不可用时应允许按退避策略重试'
  );
}

{
  assert.equal(
    shouldRetryApkUpdateCheckError(new SyntaxError('Unexpected token < in JSON at position 0')),
    false,
    '服务端返回非法 JSON 时不应连续重试同一坏响应'
  );
}

{
  assert.equal(
    shouldRetryApkUpdateCheckError(new Error('Failed to fetch')),
    true,
    '网络瞬时失败仍应允许重试'
  );
}

{
  assert.equal(
    extractHttpStatusFromError(new Error('HTTP 502: Bad Gateway')),
    502,
    '应能稳定提取 HTTP 状态码供重试策略判断'
  );
}

console.log('测试通过：APK 更新检查仅会对可恢复错误重试，避免放大无效请求。');
